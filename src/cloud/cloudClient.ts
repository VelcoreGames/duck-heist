export const GAME_SLUG='duck-heist';

export interface CloudConfig { supabaseUrl:string; anonKey:string; }
export interface AccountSession {
  userId:string;
  email:string;
  username:string;
  accessToken:string;
  refreshToken:string;
  expiresAt:number;
}
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

interface AuthUser { id:string; email?:string; email_confirmed_at?:string|null; confirmed_at?:string|null; }
interface AuthTokenReply {
  access_token?:string;refresh_token?:string;expires_in?:number;expires_at?:number;token_type?:string;
  user?:AuthUser;id?:string;email?:string;email_confirmed_at?:string|null;confirmed_at?:string|null;
}
interface UsernameLoginReply extends AuthTokenReply { ok?:boolean;code?:string;username?:string;
interface ProfileReply {ok:boolean;code:string;username?:string;suggestions?:string[];}
interface LoadReply {ok:boolean;code:string;revision?:number;payload?:CloudPayload;updated_at?:string;}
interface SaveReply extends LoadReply {}

const SESSION_KEY='vg_account_session_v2';
const LEGACY_SESSION_KEY='vg_account_session';
const OWNER_KEY='vg_local_owner_'+GAME_SLUG;
const META_KEY='vg_cloud_meta_'+GAME_SLUG;
const DEVICE_KEY='vg_device_id';
const CLOUD_KEYS=new Set([SESSION_KEY,LEGACY_SESSION_KEY,OWNER_KEY,META_KEY,DEVICE_KEY]);
let configPromise:Promise<CloudConfig|null>|null=null;

const env=()=>((import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env??{});
const cleanUrl=(v:string)=>v.replace(/\/+$/,'');
const isBrowser=()=>typeof window!=='undefined';

export class CloudAuthError extends Error {
  constructor(public code:string,message:string,public status=400){super(message);this.name='CloudAuthError';}
}
export class UsernameTakenError extends Error {
  code='username_taken' as const;
  constructor(public suggestions:string[]){
    super('Ese nombre ya existe. Elige una opción disponible.');
    this.name='UsernameTakenError';
  }
}

export function validateEmail(v:string){
  const value=v.trim();
  if(value.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return 'Escribe un correo válido.';
  return '';
}
export function validateUsername(v:string){
  const value=v.trim();
  if(!/^[A-Za-z0-9_]{3,20}$/.test(value))return 'Usa de 3 a 20 caracteres: letras, números o _.';
  if(['administrator','mod','moderator','soporte','support','velcore','velcoregames','duckheist'].includes(value.toLowerCase()))return 'Ese nombre está reservado.';
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

function safeJson<T>(raw:string|null):T|null{try{return raw?JSON.parse(raw) as T:null;}catch{return null;}}
function deviceId(){
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){id=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id);}
  return id;
}
function confirmationRedirect(){return isBrowser()?window.location.origin+'/duck-heist':'https://velcoregames.com/duck-heist';}

async function decodeBody(res:Response){
  const text=await res.text();
  if(!text)return {};
  try{return JSON.parse(text) as Record<string,unknown>;}catch{return {message:text};}
}
function authError(body:Record<string,unknown>,status:number){
  const code=String(body.error_code||body.code||body.error||'auth_error');
  const translated=accountMessage(code);
  const raw=String(body.msg||body.message||body.error_description||'');
  const message=translated.startsWith('No se pudo completar la operación')?(raw||translated):translated;
  return new CloudAuthError(code,message,status);
}
async function authRequest<T>(cfg:CloudConfig,path:string,init:RequestInit={}):Promise<T>{
  const headers=new Headers(init.headers);
  headers.set('apikey',cfg.anonKey);
  if(!headers.has('Content-Type')&&init.body)headers.set('Content-Type','application/json');
  const res=await fetch(cfg.supabaseUrl+'/auth/v1'+path,{...init,headers});
  const body=await decodeBody(res);
  if(!res.ok)throw authError(body,res.status);
  return body as T;
}
async function rpc<T>(cfg:CloudConfig,name:string,args:Record<string,unknown>,accessToken:string):Promise<T>{
  const res=await fetch(cfg.supabaseUrl+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.anonKey,'Authorization':'Bearer '+accessToken},
    body:JSON.stringify(args),
  });
  const body=await decodeBody(res);
  if(!res.ok)throw new CloudAuthError(String(body.code||'rpc_error'),String(body.message||'Error de conexión'),res.status);
  return body as T;
}

function authUserFrom(body:AuthTokenReply):AuthUser|null{
  if(body.user?.id)return body.user;
  if(body.id)return {id:body.id,email:body.email,email_confirmed_at:body.email_confirmed_at,confirmed_at:body.confirmed_at};
  return null;
}
function emailVerified(user:AuthUser|null){return !!(user?.email_confirmed_at||user?.confirmed_at);}
function sessionFromToken(body:AuthTokenReply,username=''):AccountSession{
  const user=authUserFrom(body);
  if(!body.access_token||!body.refresh_token||!user?.id)throw new Error('La sesión recibida está incompleta.');
  const expiresAt=body.expires_at?body.expires_at*1000:Date.now()+Math.max(60,Number(body.expires_in||3600))*1000;
  return {
    userId:user.id,email:user.email||'',username,
    accessToken:body.access_token,refreshToken:body.refresh_token,expiresAt,
  };
}

export function getCachedSession(){
  const session=safeJson<AccountSession>(localStorage.getItem(SESSION_KEY));
  return session?.accessToken&&session?.refreshToken?session:null;
}
export function cacheSession(s:AccountSession|null){
  if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
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
  const storage:Record<string,string>={},keys:string[]=[];
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
  if(safeJson<unknown[]>(payload.storage.duckheist_history??null)?.length)return true;
  const daily=get('duckheist_daily');
  if(daily&&(Number(daily.totalCompleted||0)>0||Number((daily.current as Record<string,unknown>|undefined)?.attempts||0)>0))return true;
  const endless=get('duckheist_endless_records');
  return !!(endless&&Object.values(endless).some(v=>Number((v as Record<string,unknown>)?.round||0)>0));
}
async function sha256(text:string){
  const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function hashPayload(payload:CloudPayload){return sha256(JSON.stringify(payload.storage,Object.keys(payload.storage).sort()));}
function getMeta(){return safeJson<CloudMeta>(localStorage.getItem(META_KEY));}
function setMeta(session:AccountSession,revision:number,hash:string,updatedAt=new Date().toISOString()){
  localStorage.setItem(META_KEY,JSON.stringify({userId:session.userId,revision,hash,updatedAt} satisfies CloudMeta));
  localStorage.setItem(OWNER_KEY,session.userId);
}

export async function signUpEmail(cfg:CloudConfig,email:string,password:string){
  const ee=validateEmail(email),pe=validatePassword(password);if(ee||pe)throw new Error(ee||pe);
  const target=encodeURIComponent(confirmationRedirect());
  const body=await authRequest<AuthTokenReply>(cfg,'/signup?redirect_to='+target,{
    method:'POST',body:JSON.stringify({email:email.trim().toLowerCase(),password}),
  });
  const user=authUserFrom(body);
  const session=body.access_token?sessionFromToken(body):null;
  if(session)cacheSession(session);
  return {user,session,verified:emailVerified(user)};
}
export async function resendVerification(cfg:CloudConfig,email:string){
  const target=encodeURIComponent(confirmationRedirect());
  await authRequest(cfg,'/resend?redirect_to='+target,{
    method:'POST',body:JSON.stringify({type:'signup',email:email.trim().toLowerCase()}),
  });
}
export async function loginEmail(cfg:CloudConfig,email:string,password:string){
  const ee=validateEmail(email);if(ee)throw new Error(ee);
  const body=await authRequest<AuthTokenReply>(cfg,'/token?grant_type=password',{
    method:'POST',body:JSON.stringify({email:email.trim().toLowerCase(),password}),
  });
  const session=sessionFromToken(body);cacheSession(session);return session;
}
export async function loginUsername(cfg:CloudConfig,username:string,password:string){
  const ue=validateUsername(username),pe=validatePassword(password);if(ue||pe)throw new Error(ue||pe);
  const res=await fetch(cfg.supabaseUrl+'/functions/v1/vg-login',{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.anonKey},
    body:JSON.stringify({username:username.trim(),password}),
  });
  const body=await decodeBody(res) as UsernameLoginReply & Record<string,unknown>;
  if(!res.ok||body.ok===false)throw authError(body,res.status);
  const session=sessionFromToken(body,body.username||username.trim());
  cacheSession(session);return session;
}
export async function sendPasswordReset(cfg:CloudConfig,email:string){
  const ee=validateEmail(email);if(ee)throw new Error(ee);
  const target=encodeURIComponent(confirmationRedirect());
  await authRequest(cfg,'/recover?redirect_to='+target,{
    method:'POST',body:JSON.stringify({email:email.trim().toLowerCase()}),
  });
}
export async function updatePassword(cfg:CloudConfig,session:AccountSession,password:string){
  const pe=validatePassword(password);if(pe)throw new Error(pe);
  await authRequest(cfg,'/user',{method:'PUT',headers:{Authorization:'Bearer '+session.accessToken},body:JSON.stringify({password})});
}
export async function refreshSession(cfg:CloudConfig,session:AccountSession){
  const body=await authRequest<AuthTokenReply>(cfg,'/token?grant_type=refresh_token',{
    method:'POST',body:JSON.stringify({refresh_token:session.refreshToken}),
  });
  const next=sessionFromToken(body,session.username);cacheSession(next);return next;
}
async function fetchAuthUser(cfg:CloudConfig,session:AccountSession){
  return authRequest<AuthUser>(cfg,'/user',{headers:{Authorization:'Bearer '+session.accessToken}});
}
async function loadProfile(cfg:CloudConfig,session:AccountSession){
  const r=await rpc<ProfileReply>(cfg,'vg_auth_get_profile',{},session.accessToken);
  if(!r.ok&&r.code!=='not_found')throw new Error(accountMessage(r.code));
  return r.ok&&r.username?r.username:'';
}
export async function validateSession(cfg:CloudConfig,session:AccountSession){
  let current=session;
  if(current.expiresAt-Date.now()<90_000){
    try{current=await refreshSession(cfg,current);}catch{return null;}
  }
  try{
    const user=await fetchAuthUser(cfg,current);
    if(!emailVerified(user))return null;
    const username=await loadProfile(cfg,current);
    const next={...current,userId:user.id,email:user.email||current.email,username};
    cacheSession(next);return next;
  }catch{return null;}
}
export async function parseAuthCallback(cfg:CloudConfig){
  if(!isBrowser()||!window.location.hash.includes('access_token='))return null;
  const params=new URLSearchParams(window.location.hash.slice(1));
  const accessToken=params.get('access_token')||'',refreshToken=params.get('refresh_token')||'';
  if(!accessToken||!refreshToken)return null;
  const temp:AccountSession={
    userId:'',email:'',username:'',accessToken,refreshToken,
    expiresAt:Number(params.get('expires_at')||0)*1000||Date.now()+Number(params.get('expires_in')||3600)*1000,
  };
  const user=await fetchAuthUser(cfg,temp);
  temp.userId=user.id;temp.email=user.email||'';
  temp.username=await loadProfile(cfg,temp);
  cacheSession(temp);
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  return {session:temp,type:params.get('type')||''};
}
export async function claimUsername(cfg:CloudConfig,session:AccountSession,username:string){
  const ue=validateUsername(username);if(ue)throw new Error(ue);
  const r=await rpc<ProfileReply>(cfg,'vg_auth_claim_username',{p_username:username.trim()},session.accessToken);
  if(!r.ok){
    if(r.code==='username_taken')throw new UsernameTakenError(Array.isArray(r.suggestions)?r.suggestions.slice(0,3):[]);
    throw new Error(accountMessage(r.code));
  }
  const next={...session,username:r.username||username.trim()};cacheSession(next);return next;
}
export async function logoutAccount(cfg:CloudConfig,session:AccountSession){
  try{await authRequest(cfg,'/logout',{method:'POST',headers:{Authorization:'Bearer '+session.accessToken}});}finally{cacheSession(null);}
}

async function loadRemote(cfg:CloudConfig,session:AccountSession){
  return rpc<LoadReply>(cfg,'vg_auth_load_game_save',{p_game_slug:GAME_SLUG},session.accessToken);
}
async function saveRemote(cfg:CloudConfig,session:AccountSession,payload:CloudPayload,expectedRevision:number,force=false){
  return rpc<SaveReply>(cfg,'vg_auth_save_game_save',{
    p_game_slug:GAME_SLUG,p_expected_revision:expectedRevision,p_payload:payload,p_device_id:deviceId(),p_force:force,
  },session.accessToken);
}

export async function initialSync(cfg:CloudConfig,session:AccountSession):Promise<InitialSync>{
  try{
    const verified=await validateSession(cfg,session);
    if(!verified){cacheSession(null);throw new Error('Sesión vencida.');}
    if(!verified.username)throw new Error('Falta elegir tu nombre de usuario.');
    const local=captureLocalGameSave(),localHash=await hashPayload(local),owner=localOwner(),meta=getMeta();
    const remote=await loadRemote(cfg,verified);
    if(!remote.ok&&remote.code!=='not_found')throw new Error(accountMessage(remote.code));
    if(!remote.ok&&remote.code==='not_found'){
      if(owner&&owner!==verified.userId)clearLocalGameData();
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
    if(!hasMeaningfulLocalProgress(local)){
      restoreLocalGameSave(remote.payload);const h=await hashPayload(remote.payload);setMeta(verified,remote.revision,h,remote.updated_at);
      return {kind:'ready',revision:remote.revision};
    }
    return {kind:'conflict',conflict:{local,localHash,remote:remote.payload,remoteRevision:remote.revision,remoteUpdatedAt:remote.updated_at||''}};
  }catch(e){
    const cached=getCachedSession(),owner=localOwner();
    if(cached?.userId===session.userId&&owner===session.userId)return {kind:'offline',reason:e instanceof Error?e.message:'Sin conexión'};
    throw e;
  }
}

export async function resolveConflict(cfg:CloudConfig,session:AccountSession,conflict:CloudConflict,choice:'remote'|'local'){
  const verified=await validateSession(cfg,session);
  if(!verified)throw new Error('Sesión vencida. Inicia sesión otra vez.');
  if(choice==='remote'){
    restoreLocalGameSave(conflict.remote);const h=await hashPayload(conflict.remote);setMeta(verified,conflict.remoteRevision,h,conflict.remoteUpdatedAt);
    return conflict.remoteRevision;
  }
  const saved=await saveRemote(cfg,verified,conflict.local,conflict.remoteRevision,true);
  if(!saved.ok)throw new Error(accountMessage(saved.code));
  setMeta(verified,saved.revision||conflict.remoteRevision+1,conflict.localHash,saved.updated_at);
  return saved.revision||conflict.remoteRevision+1;
}
export async function syncCurrent(cfg:CloudConfig,session:AccountSession){
  const verified=await validateSession(cfg,session);
  if(!verified)throw new Error('Sesión vencida. Inicia sesión otra vez.');
  const meta=getMeta();if(!meta||meta.userId!==verified.userId)return initialSync(cfg,verified);
  const payload=captureLocalGameSave(),hash=await hashPayload(payload);
  if(hash===meta.hash)return {kind:'ready',revision:meta.revision} as InitialSync;
  const saved=await saveRemote(cfg,verified,payload,meta.revision,false);
  if(saved.ok){setMeta(verified,saved.revision||meta.revision+1,hash,saved.updated_at);return {kind:'ready',revision:saved.revision||meta.revision+1} as InitialSync;}
  if(saved.code==='conflict'&&saved.payload&&saved.revision){
    return {kind:'conflict',conflict:{local:payload,localHash:hash,remote:saved.payload,remoteRevision:saved.revision,remoteUpdatedAt:saved.updated_at||''}} as InitialSync;
  }
  throw new Error(accountMessage(saved.code));
}

export function accountMessage(code:string){
  const map:Record<string,string>={
    invalid_username:'Nombre de usuario inválido.',reserved_username:'Ese nombre está reservado.',username_taken:'Ese nombre ya existe.',
    email_not_verified:'Primero verifica tu correo.',profile_exists:'Tu cuenta ya tiene nombre de usuario.',
    email_not_confirmed:'Primero verifica tu correo.',invalid_credentials:'Usuario o contraseña incorrectos.',
    invalid_grant:'Datos de acceso incorrectos.',too_many_attempts:'Demasiados intentos fallidos. Espera 15 minutos antes de volver a intentar.',
    invalid_client:'No se pudo validar el cliente del juego.',over_email_send_rate_limit:'Se enviaron demasiados correos en poco tiempo. Espera unos minutos antes de volver a intentarlo.',
    email_address_not_authorized:'Ese correo no está autorizado por el servicio de correo.',invalid_session:'La sesión venció. Inicia sesión otra vez.',
    not_found:'No existe un guardado en la nube.',conflict:'Tu partida cambió en otro equipo.',
    payload_too_large:'El guardado supera el tamaño permitido.',weak_password:'La contraseña debe tener al menos 10 caracteres.',
  };
  return map[code]||'No se pudo completar la operación ('+code+').';
}
