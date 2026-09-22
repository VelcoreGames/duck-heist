export const GAME_SLUG='duck-heist';

export interface CloudConfig { supabaseUrl:string; anonKey:string; }
export interface AccountSession { userId:string; username:string; token:string; expiresAt:string; }
export interface CloudPayload {
  schemaVersion:1;
  gameVersion:'0.8.0';
  savedAt:string;
  deviceId:string;
  storage:Record<string,string>;
}
export interface CloudMeta { userId:string; revision:number; hash:string; updatedAt:string; }
export interface CloudConflict { local:CloudPayload; localHash:string; remote:CloudPayload; remoteRevision:number; remoteUpdatedAt:string; }
export type InitialSync =
  | {kind:'ready';revision:number}
  | {kind:'conflict';conflict:CloudConflict}
  | {kind:'offline';reason:string};

const SESSION_KEY='vg_account_session';
const OWNER_KEY='vg_local_owner_'+GAME_SLUG;
const META_KEY='vg_cloud_meta_'+GAME_SLUG;
const DEVICE_KEY='vg_device_id';
const CLOUD_KEYS=new Set([SESSION_KEY,OWNER_KEY,META_KEY,DEVICE_KEY]);
let configPromise:Promise<CloudConfig|null>|null=null;

const env=()=>((import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env??{});
const cleanUrl=(v:string)=>v.replace(/\/+$/,'');

export function validateUsername(v:string){
  const value=v.trim();
  if(!/^[A-Za-z0-9_]{3,20}$/.test(value))return 'Usa de 3 a 20 caracteres: letras, números o _.';
  if(['admin','administrator','mod','moderator','soporte','support','velcore','velcoregames','duckheist'].includes(value.toLowerCase()))return 'Ese nombre está reservado.';
  return '';
}
export function validatePassword(v:string){
  if(v.length<10)return 'La contraseña debe tener al menos 10 caracteres.';
  if(v.length>128)return 'La contraseña es demasiado larga.';
  return '';
}

export async function loadCloudConfig():Promise<CloudConfig|null>{
  if(configPromise)return configPromise;
  configPromise=(async()=>{
    const e=env();
    let supabaseUrl=e.VITE_SUPABASE_URL?.trim()||'';
    let anonKey=e.VITE_SUPABASE_ANON_KEY?.trim()||'';
    try{
      const res=await fetch('/velcore-cloud.json',{cache:'no-store'});
      if(res.ok){
        const json=await res.json() as Partial<CloudConfig>;
        supabaseUrl=json.supabaseUrl?.trim()||supabaseUrl;
        anonKey=json.anonKey?.trim()||anonKey;
      }
    }catch{}
    if(!/^https:\/\//.test(supabaseUrl)||anonKey.length<20)return null;
    return {supabaseUrl:cleanUrl(supabaseUrl),anonKey};
  })();
  return configPromise;
}

async function rpc<T>(cfg:CloudConfig,name:string,args:Record<string,unknown>):Promise<T>{
  const res=await fetch(cfg.supabaseUrl+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.anonKey,'Authorization':'Bearer '+cfg.anonKey},
    body:JSON.stringify(args),
  });
  let body:unknown=null;
  try{body=await res.json();}catch{}
  if(!res.ok){
    const msg=body&&typeof body==='object'&&'message'in body?String((body as {message?:unknown}).message):'Error de conexión';
    throw new Error(msg);
  }
  return body as T;
}

function safeJson<T>(raw:string|null):T|null{try{return raw?JSON.parse(raw) as T:null;}catch{return null;}}
function deviceId(){
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){id=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id);}
  return id;
}
export function getCachedSession(){return safeJson<AccountSession>(localStorage.getItem(SESSION_KEY));}
export function cacheSession(s:AccountSession|null){
  if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);
}
export function localOwner(){return localStorage.getItem(OWNER_KEY)||'';}
export function clearLocalGameData(){
  const remove:string[]=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k?.startsWith('duckheist_'))remove.push(k);
  }
  for(const k of remove)localStorage.removeItem(k);
  localStorage.removeItem(OWNER_KEY);localStorage.removeItem(META_KEY);
}
export function captureLocalGameSave():CloudPayload{
  const storage:Record<string,string>={};
  const keys:string[]=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k?.startsWith('duckheist_')&&!CLOUD_KEYS.has(k))keys.push(k);
  }
  keys.sort();
  for(const k of keys){const v=localStorage.getItem(k);if(v!==null)storage[k]=v;}
  return {schemaVersion:1,gameVersion:'0.8.0',savedAt:new Date().toISOString(),deviceId:deviceId(),storage};
}
export function restoreLocalGameSave(payload:CloudPayload){
  const remove:string[]=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('duckheist_'))remove.push(k);}
  for(const k of remove)localStorage.removeItem(k);
  for(const [k,v] of Object.entries(payload.storage||{}))if(k.startsWith('duckheist_'))localStorage.setItem(k,String(v));
}
export function hasMeaningfulLocalProgress(payload=captureLocalGameSave()){
  const get=(k:string)=>safeJson<Record<string,unknown>>(payload.storage[k]??null);
  const save=get('duckheist_save');
  if(save){
    if(Number(save.totalGoldenCrumbs||0)>0||Number(save.bestFloor||0)>0)return true;
    if(Array.isArray(save.unlockedSkins)&&save.unlockedSkins.length>1)return true;
    const d=save.discovered as Record<string,unknown>|undefined;
    if(d&&Object.values(d).some(v=>Array.isArray(v)&&v.length>1))return true;
  }
  const career=get('duckheist_career');
  if(career&&Number(career.runs||0)>0)return true;
  const history=safeJson<unknown[]>(payload.storage.duckheist_history??null);
  if(history?.length)return true;
  const daily=get('duckheist_daily');
  if(daily&&(Number(daily.totalCompleted||0)>0||Number((daily.current as Record<string,unknown>|undefined)?.attempts||0)>0))return true;
  const endless=get('duckheist_endless_records');
  if(endless&&Object.values(endless).some(v=>Number((v as Record<string,unknown>)?.round||0)>0))return true;
  return false;
}
async function sha256(text:string){
  const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function hashPayload(payload:CloudPayload){
  return sha256(JSON.stringify(payload.storage,Object.keys(payload.storage).sort()));
}
function getMeta(){return safeJson<CloudMeta>(localStorage.getItem(META_KEY));}
function setMeta(session:AccountSession,revision:number,hash:string,updatedAt=new Date().toISOString()){
  const meta:CloudMeta={userId:session.userId,revision,hash,updatedAt};
  localStorage.setItem(META_KEY,JSON.stringify(meta));localStorage.setItem(OWNER_KEY,session.userId);
}

interface AuthReply {ok:boolean;code:string;user_id?:string;username?:string;session_token?:string;expires_at?:string;recovery_code?:string;}
interface LoadReply {ok:boolean;code:string;revision?:number;payload?:CloudPayload;updated_at?:string;}
interface SaveReply extends LoadReply {}

function accountFromReply(r:AuthReply):AccountSession{
  if(!r.ok||!r.user_id||!r.username||!r.session_token||!r.expires_at)throw new Error('Respuesta de cuenta incompleta.');
  return {userId:r.user_id,username:r.username,token:r.session_token,expiresAt:r.expires_at};
}
export async function createAccount(cfg:CloudConfig,username:string,password:string){
  const ue=validateUsername(username),pe=validatePassword(password);if(ue||pe)throw new Error(ue||pe);
  const r=await rpc<AuthReply>(cfg,'vg_create_account',{p_username:username.trim(),p_password:password,p_device_id:deviceId()});
  if(!r.ok)throw new Error(accountMessage(r.code));
  const session=accountFromReply(r);cacheSession(session);
  return {session,recoveryCode:r.recovery_code||''};
}
export async function loginAccount(cfg:CloudConfig,username:string,password:string){
  const r=await rpc<AuthReply>(cfg,'vg_login',{p_username:username.trim(),p_password:password,p_device_id:deviceId()});
  if(!r.ok)throw new Error(accountMessage(r.code));
  const session=accountFromReply(r);cacheSession(session);return session;
}
export async function recoverAccount(cfg:CloudConfig,username:string,recoveryCode:string,newPassword:string){
  const pe=validatePassword(newPassword);if(pe)throw new Error(pe);
  const r=await rpc<AuthReply>(cfg,'vg_recover_account',{p_username:username.trim(),p_recovery_code:recoveryCode.trim(),p_new_password:newPassword,p_device_id:deviceId()});
  if(!r.ok)throw new Error(accountMessage(r.code));
  const session=accountFromReply(r);cacheSession(session);
  return {session,recoveryCode:r.recovery_code||''};
}
export async function logoutAccount(cfg:CloudConfig,session:AccountSession){
  try{await rpc<{ok:boolean}>(cfg,'vg_logout',{p_session_token:session.token});}finally{cacheSession(null);}
}
export async function validateSession(cfg:CloudConfig,session:AccountSession){
  const r=await rpc<AuthReply>(cfg,'vg_validate_session',{p_session_token:session.token});
  if(!r.ok)return null;
  const next:AccountSession={...session,userId:r.user_id||session.userId,username:r.username||session.username,expiresAt:r.expires_at||session.expiresAt};
  cacheSession(next);return next;
}
async function loadRemote(cfg:CloudConfig,session:AccountSession){
  return rpc<LoadReply>(cfg,'vg_load_game_save',{p_session_token:session.token,p_game_slug:GAME_SLUG});
}
async function saveRemote(cfg:CloudConfig,session:AccountSession,payload:CloudPayload,expectedRevision:number,force=false){
  return rpc<SaveReply>(cfg,'vg_save_game_save',{p_session_token:session.token,p_game_slug:GAME_SLUG,p_expected_revision:expectedRevision,p_payload:payload,p_device_id:deviceId(),p_force:force});
}

export async function initialSync(cfg:CloudConfig,session:AccountSession):Promise<InitialSync>{
  try{
    const verified=await validateSession(cfg,session);
    if(!verified){cacheSession(null);throw new Error('Sesión vencida.');}
    const local=captureLocalGameSave(),localHash=await hashPayload(local),owner=localOwner(),meta=getMeta();
    const remote=await loadRemote(cfg,verified);
    if(!remote.ok&&remote.code!=='not_found')throw new Error(accountMessage(remote.code));
    if(!remote.ok&&remote.code==='not_found'){
      if(owner&&owner!==verified.userId){clearLocalGameData();}
      const fresh=captureLocalGameSave(),freshHash=await hashPayload(fresh);
      const saved=await saveRemote(cfg,verified,fresh,0,false);
      if(!saved.ok)throw new Error(accountMessage(saved.code));
      setMeta(verified,saved.revision||1,freshHash,saved.updated_at);
      return {kind:'ready',revision:saved.revision||1};
    }
    if(!remote.payload||!remote.revision)throw new Error('Guardado remoto inválido.');
    if(owner&&owner!==verified.userId){
      restoreLocalGameSave(remote.payload);const h=await hashPayload(remote.payload);setMeta(verified,remote.revision,h,remote.updated_at);
      return {kind:'ready',revision:remote.revision};
    }
    if(!hasMeaningfulLocalProgress(local)){
      restoreLocalGameSave(remote.payload);const h=await hashPayload(remote.payload);setMeta(verified,remote.revision,h,remote.updated_at);
      return {kind:'ready',revision:remote.revision};
    }
    if(meta?.userId===verified.userId){
      if(localHash===meta.hash){
        if(remote.revision!==meta.revision){restoreLocalGameSave(remote.payload);const h=await hashPayload(remote.payload);setMeta(verified,remote.revision,h,remote.updated_at);}
        else localStorage.setItem(OWNER_KEY,verified.userId);
        return {kind:'ready',revision:remote.revision};
      }
      if(remote.revision===meta.revision){
        const saved=await saveRemote(cfg,verified,local,meta.revision,false);
        if(saved.ok){setMeta(verified,saved.revision||meta.revision+1,localHash,saved.updated_at);return {kind:'ready',revision:saved.revision||meta.revision+1};}
      }
    }
    return {kind:'conflict',conflict:{local,localHash,remote:remote.payload,remoteRevision:remote.revision,remoteUpdatedAt:remote.updated_at||''}};
  }catch(e){
    const cached=getCachedSession(),owner=localOwner();
    if(cached?.userId===session.userId&&owner===session.userId)return {kind:'offline',reason:e instanceof Error?e.message:'Sin conexión'};
    throw e;
  }
}

export async function resolveConflict(cfg:CloudConfig,session:AccountSession,conflict:CloudConflict,choice:'remote'|'local'){
  if(choice==='remote'){
    restoreLocalGameSave(conflict.remote);const h=await hashPayload(conflict.remote);setMeta(session,conflict.remoteRevision,h,conflict.remoteUpdatedAt);
    return conflict.remoteRevision;
  }
  const saved=await saveRemote(cfg,session,conflict.local,conflict.remoteRevision,true);
  if(!saved.ok)throw new Error(accountMessage(saved.code));
  setMeta(session,saved.revision||conflict.remoteRevision+1,conflict.localHash,saved.updated_at);
  return saved.revision||conflict.remoteRevision+1;
}

export async function syncCurrent(cfg:CloudConfig,session:AccountSession){
  const meta=getMeta();if(!meta||meta.userId!==session.userId)return initialSync(cfg,session);
  const payload=captureLocalGameSave(),hash=await hashPayload(payload);
  if(hash===meta.hash)return {kind:'ready',revision:meta.revision} as InitialSync;
  const saved=await saveRemote(cfg,session,payload,meta.revision,false);
  if(saved.ok){setMeta(session,saved.revision||meta.revision+1,hash,saved.updated_at);return {kind:'ready',revision:saved.revision||meta.revision+1} as InitialSync;}
  if(saved.code==='conflict'&&saved.payload&&saved.revision){
    return {kind:'conflict',conflict:{local:payload,localHash:hash,remote:saved.payload,remoteRevision:saved.revision,remoteUpdatedAt:saved.updated_at||''}} as InitialSync;
  }
  throw new Error(accountMessage(saved.code));
}

export function accountMessage(code:string){
  const map:Record<string,string>={
    invalid_username:'Nombre de usuario inválido.',reserved_username:'Ese nombre está reservado.',username_taken:'Ese nombre ya existe.',
    weak_password:'La contraseña debe tener al menos 10 caracteres.',invalid_credentials:'Usuario o contraseña incorrectos.',
    locked:'Demasiados intentos. Prueba de nuevo en 15 minutos.',invalid_session:'La sesión venció. Inicia sesión otra vez.',
    invalid_recovery:'Usuario o código de recuperación incorrectos.',not_found:'No existe un guardado en la nube.',
    conflict:'Tu partida cambió en otro equipo.',payload_too_large:'El guardado supera el tamaño permitido.',
  };
  return map[code]||'No se pudo completar la operación ('+code+').';
}
