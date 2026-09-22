import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  type AccountSession,type CloudConfig,type CloudConflict,
  cacheSession,clearLocalGameData,createAccount,getCachedSession,initialSync,loadCloudConfig,loginAccount,logoutAccount,
  recoverAccount,resolveConflict,syncCurrent,validatePassword,validateUsername,
} from './cloudClient';

type Mode='login'|'signup'|'recover';
type Gate='boot'|'auth'|'ready'|'offline'|'conflict'|'recovery';

export default function AccountGate({children}:{children:ReactNode}){
  const audit=new URLSearchParams(window.location.search).get('auditoria')==='1';
  const [gate,setGate]=useState<Gate>(audit?'ready':'boot');
  const [mode,setMode]=useState<Mode>('login');
  const [cfg,setCfg]=useState<CloudConfig|null>(null);
  const [session,setSession]=useState<AccountSession|null>(audit?null:getCachedSession());
  const [conflict,setConflict]=useState<CloudConflict|null>(null);
  const [recoveryCode,setRecoveryCode]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [menu,setMenu]=useState(false);
  const syncTimer=useRef<number>(0);

  const finishInitial=useCallback(async(c:CloudConfig,s:AccountSession)=>{
    const result=await initialSync(c,s);
    setSession(s);
    if(result.kind==='conflict'){setConflict(result.conflict);setGate('conflict');return result;}
    setGate(result.kind==='offline'?'offline':'ready');
    setMessage(result.kind==='offline'?'Sin conexión: jugando con copia local.':'');
    return result;
  },[]);

  useEffect(()=>{
    if(audit)return;
    let alive=true;
    void (async()=>{
      const c=await loadCloudConfig();if(!alive)return;
      setCfg(c);
      const cached=getCachedSession();
      if(!c){
        if(cached){setSession(cached);setGate('offline');setMessage('Servicio de nube no disponible. Tu copia local sigue protegida.');}
        else {setGate('auth');setMessage('La cuenta en la nube aún no está configurada.');}
        return;
      }
      if(!cached){setGate('auth');return;}
      try{await finishInitial(c,cached);}catch(e){cacheSession(null);setSession(null);setGate('auth');setMessage(e instanceof Error?e.message:'Inicia sesión otra vez.');}
    })();
    return()=>{alive=false;};
  },[audit,finishInitial]);

  const doSync=useCallback(async()=>{
    if(!cfg||!session||gate==='conflict'||gate==='auth'||gate==='boot')return false;
    try{
      const result=await syncCurrent(cfg,session);
      if(result.kind==='conflict'){
        window.dispatchEvent(new Event('blur'));setConflict(result.conflict);setGate('conflict');setMessage('Hay progreso distinto en otro equipo.');
        return false;
      }
      if(result.kind==='offline'){setGate('offline');setMessage('Sin conexión: los cambios quedan guardados en este equipo.');return false;}
      setGate('ready');setMessage('Guardado en la nube.');return true;
    }catch(e){setGate('offline');setMessage(e instanceof Error?e.message:'Sin conexión');return false;}
  },[cfg,session,gate]);

  useEffect(()=>{
    if(audit||!session||!cfg||(gate!=='ready'&&gate!=='offline'))return;
    syncTimer.current=window.setInterval(()=>{void doSync();},12000);
    const onHide=()=>{if(document.visibilityState==='hidden')void doSync();};
    const onOnline=()=>{void doSync();};
    document.addEventListener('visibilitychange',onHide);window.addEventListener('online',onOnline);
    return()=>{window.clearInterval(syncTimer.current);document.removeEventListener('visibilitychange',onHide);window.removeEventListener('online',onOnline);};
  },[audit,cfg,session,gate,doSync]);

  const submit=async(ev:FormEvent<HTMLFormElement>)=>{
    ev.preventDefault();if(!cfg){setMessage('La nube no está configurada todavía.');return;}
    const fd=new FormData(ev.currentTarget),username=String(fd.get('username')||''),password=String(fd.get('password')||'');
    const u=validateUsername(username);if(u){setMessage(u);return;}
    if(mode!=='login'){const p=validatePassword(password);if(p){setMessage(p);return;}}
    setBusy(true);setMessage('');
    try{
      if(mode==='signup'){
        const created=await createAccount(cfg,username,password);setSession(created.session);setRecoveryCode(created.recoveryCode);
        const result=await initialSync(cfg,created.session);
        if(result.kind==='conflict'){setConflict(result.conflict);setGate('conflict');}
        else setGate('recovery');
      }else if(mode==='login'){
        const s=await loginAccount(cfg,username,password);await finishInitial(cfg,s);
      }else{
        const recovery=String(fd.get('recovery')||'');
        const recovered=await recoverAccount(cfg,username,recovery,password);setSession(recovered.session);setRecoveryCode(recovered.recoveryCode);
        const result=await finishInitial(cfg,recovered.session);if(result.kind!=='conflict')setGate('recovery');
      }
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo acceder a la cuenta.');}
    finally{setBusy(false);}
  };

  const choose=async(choice:'remote'|'local')=>{
    if(!cfg||!session||!conflict)return;setBusy(true);
    try{await resolveConflict(cfg,session,conflict,choice);setConflict(null);setGate('ready');setMessage(choice==='remote'?'Partida de la nube cargada.':'Este equipo reemplazó la copia de la nube.');}
    catch(e){setMessage(e instanceof Error?e.message:'No se pudo resolver el conflicto.');}
    finally{setBusy(false);}
  };

  const signOut=async()=>{
    if(!cfg||!session)return;
    setBusy(true);setMessage('Sincronizando antes de cerrar sesión…');
    const ok=await doSync();
    if(!ok){setBusy(false);setMessage('No cerré la sesión para evitar perder cambios sin sincronizar.');return;}
    try{await logoutAccount(cfg,session);clearLocalGameData();setSession(null);setMenu(false);setGate('auth');setMode('login');setMessage('Sesión cerrada.');}
    catch(e){setMessage(e instanceof Error?e.message:'No se pudo cerrar sesión.');}
    finally{setBusy(false);}
  };

  if(audit)return <>{children}</>;

  if(gate==='boot')return <AccountShell title="ABRIENDO LA BÓVEDA" subtitle="Preparando tu cuenta Velcore Games…"><div className="vg-account-loader" /></AccountShell>;

  if(gate==='auth')return (
    <AccountShell title={mode==='signup'?'CREA TU IDENTIDAD':mode==='recover'?'RECUPERA TU CUENTA':'IDENTIFÍCATE'} subtitle="Tu progreso, logros y colección viajan contigo entre equipos.">
      <div className="vg-account-tabs">
        <button className={mode==='login'?'is-active':''} onClick={()=>{setMode('login');setMessage('');}}>ENTRAR</button>
        <button className={mode==='signup'?'is-active':''} onClick={()=>{setMode('signup');setMessage('');}}>CREAR CUENTA</button>
        <button className={mode==='recover'?'is-active':''} onClick={()=>{setMode('recover');setMessage('');}}>RECUPERAR</button>
      </div>
      <form className="vg-account-form" onSubmit={submit}>
        <label>NOMBRE DE USUARIO<input name="username" autoComplete="username" maxLength={20} placeholder="PatoLadron" required /></label>
        {mode==='recover'&&<label>CÓDIGO DE RECUPERACIÓN<input name="recovery" autoComplete="off" placeholder="DH-XXXX-XXXX-XXXX-XXXX" required /></label>}
        <label>{mode==='recover'?'NUEVA CONTRASEÑA':'CONTRASEÑA'}<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:10} maxLength={128} required /></label>
        <button className="vg-account-primary" disabled={busy||!cfg}>{busy?'PROCESANDO…':mode==='signup'?'CREAR CUENTA':mode==='recover'?'RECUPERAR CUENTA':'ENTRAR AL ATRACO'}</button>
      </form>
      <p className="vg-account-note">{mode==='signup'?'No pedimos correo. Recibirás un código de recuperación que debes guardar.':'La contraseña nunca se guarda dentro del juego.'}</p>
      {message&&<p className="vg-account-message">{message}</p>}
    </AccountShell>
  );

  if(gate==='recovery')return (
    <AccountShell title="GUARDA ESTE CÓDIGO" subtitle="Es la única forma de recuperar tu cuenta si olvidas la contraseña.">
      <div className="vg-recovery-code">{recoveryCode||'CÓDIGO NO DISPONIBLE'}</div>
      <button className="vg-account-primary" onClick={()=>{void navigator.clipboard?.writeText(recoveryCode);setMessage('Código copiado.');}}>COPIAR CÓDIGO</button>
      <button className="vg-account-secondary" onClick={()=>setGate('ready')}>YA LO GUARDÉ · JUGAR</button>
      {message&&<p className="vg-account-message">{message}</p>}
    </AccountShell>
  );

  if(gate==='conflict'&&conflict)return (
    <AccountShell title="DOS VERSIONES DEL ATRACO" subtitle="Hay progreso distinto en este equipo y en la nube. No sobrescribiré nada sin que elijas.">
      <div className="vg-conflict-grid">
        <button disabled={busy} onClick={()=>void choose('remote')}><strong>USAR NUBE</strong><span>Recomendado al cambiar de PC.</span><small>{conflict.remoteUpdatedAt?new Date(conflict.remoteUpdatedAt).toLocaleString():'Guardado remoto'}</small></button>
        <button disabled={busy} onClick={()=>void choose('local')}><strong>USAR ESTE EQUIPO</strong><span>Reemplaza la nube con esta copia.</span><small>{conflict.local.savedAt?new Date(conflict.local.savedAt).toLocaleString():'Guardado local'}</small></button>
      </div>
      {message&&<p className="vg-account-message">{message}</p>}
    </AccountShell>
  );

  return <>
    {children}
    {session&&<div className="vg-account-hud">
      <button className="vg-account-chip" onClick={()=>setMenu(v=>!v)} aria-expanded={menu}>
        <span className={'vg-cloud-dot '+(gate==='offline'?'is-offline':'')} />
        <strong>{session.username}</strong>
        <small>{gate==='offline'?'LOCAL':'NUBE'}</small>
      </button>
      {menu&&<div className="vg-account-menu">
        <div><b>CUENTA VELCORE GAMES</b><span>{session.username}</span></div>
        <button disabled={busy} onClick={()=>void doSync()}>SINCRONIZAR AHORA</button>
        <button disabled={busy||gate==='offline'} onClick={()=>void signOut()}>CERRAR SESIÓN</button>
        {message&&<p>{message}</p>}
      </div>}
    </div>}
  </>;
}

function AccountShell({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){
  return <main className="vg-account-page">
    <div className="vg-account-noise" aria-hidden="true" />
    <section className="vg-account-card">
      <a className="vg-account-brand" href="/"><span>V</span><div><b>VELCORE</b><small>GAMES ID</small></div></a>
      <div className="vg-account-kicker">DUCK HEIST · CUENTA EN LA NUBE</div>
      <h1>{title}</h1><p className="vg-account-sub">{subtitle}</p>
      {children}
      <p className="vg-account-version">DUCK HEIST v0.8.0</p>
    </section>
  </main>;
}
