import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  type AccountSession,type CloudConfig,type CloudConflict,
  CloudAuthError,UsernameTakenError,claimUsername,clearLocalGameData,getCachedSession,initialSync,
  loadCloudConfig,loginEmail,logoutAccount,parseAuthCallback,resendVerification,resolveConflict,
  sendPasswordReset,signUpEmail,syncCurrent,updatePassword,validateEmail,validatePassword,validateSession,validateUsername,
} from './cloudClient';

type Mode='login'|'signup'|'recover';
type Gate='boot'|'auth'|'verify'|'username'|'reset'|'ready'|'offline'|'conflict';

export default function AccountGate({children}:{children:ReactNode}){
  const audit=new URLSearchParams(window.location.search).get('auditoria')==='1';
  const [gate,setGate]=useState<Gate>(audit?'ready':'boot');
  const [mode,setMode]=useState<Mode>('login');
  const [cfg,setCfg]=useState<CloudConfig|null>(null);
  const [session,setSession]=useState<AccountSession|null>(audit?null:getCachedSession());
  const [conflict,setConflict]=useState<CloudConflict|null>(null);
  const [message,setMessage]=useState('');
  const [emailInput,setEmailInput]=useState('');
  const [passwordInput,setPasswordInput]=useState('');
  const [usernameInput,setUsernameInput]=useState('');
  const [suggestions,setSuggestions]=useState<string[]>([]);
  const [showPassword,setShowPassword]=useState(false);
  const [resendWait,setResendWait]=useState(0);
  const [busy,setBusy]=useState(false);
  const [menu,setMenu]=useState(false);
  const syncTimer=useRef<number>(0);
  const saveDebounce=useRef<number>(0);
  const syncInFlight=useRef<Promise<boolean>|null>(null);

  useEffect(()=>{
    if(resendWait<=0)return;
    const id=window.setInterval(()=>setResendWait(v=>Math.max(0,v-1)),1000);
    return()=>window.clearInterval(id);
  },[resendWait]);

  const enterGame=useCallback(async(c:CloudConfig,s:AccountSession)=>{
    const checked=await validateSession(c,s);
    if(!checked)throw new Error('Tu sesión venció. Inicia sesión otra vez.');
    setSession(checked);
    setEmailInput(checked.email);
    if(!checked.username){setGate('username');setMessage('Correo verificado. Ahora elige tu nombre dentro de Velcore Games.');return checked;}
    const result=await initialSync(c,checked);
    if(result.kind==='conflict'){setConflict(result.conflict);setGate('conflict');return checked;}
    setGate(result.kind==='offline'?'offline':'ready');
    setMessage(result.kind==='offline'?'Sin conexión: jugando con copia local.':'');
    return checked;
  },[]);

  useEffect(()=>{
    if(audit)return;
    let alive=true;
    void (async()=>{
      const c=await loadCloudConfig();if(!alive)return;
      setCfg(c);
      if(!c){setGate('auth');setMessage('La cuenta en la nube no está disponible.');return;}
      try{
        const callback=await parseAuthCallback(c);
        if(callback){
          setSession(callback.session);setEmailInput(callback.session.email);
          if(callback.type==='recovery'){setGate('reset');setMessage('Elige una nueva contraseña.');return;}
          await enterGame(c,callback.session);return;
        }
        const cached=getCachedSession();
        if(!cached){setGate('auth');return;}
        await enterGame(c,cached);
      }catch(e){
        setSession(null);setGate('auth');
        setMessage(e instanceof Error?e.message:'Inicia sesión otra vez.');
      }
    })();
    return()=>{alive=false;};
  },[audit,enterGame]);

  const doSync=useCallback(async()=>{
    if(!cfg||!session||gate==='conflict'||gate==='auth'||gate==='boot'||gate==='verify'||gate==='username'||gate==='reset')return false;
    if(syncInFlight.current)return syncInFlight.current;
    const task=(async()=>{
      try{
        const active=getCachedSession()||session;
        const result=await syncCurrent(cfg,active);
        const cached=getCachedSession();if(cached)setSession(cached);
        if(result.kind==='conflict'){
          window.dispatchEvent(new Event('blur'));setConflict(result.conflict);setGate('conflict');setMessage('Hay progreso distinto en otro equipo.');
          return false;
        }
        if(result.kind==='offline'){setGate('offline');setMessage('Sin conexión: los cambios quedan guardados en este equipo.');return false;}
        setGate('ready');setMessage('Guardado en la nube.');return true;
      }catch(e){setGate('offline');setMessage(e instanceof Error?e.message:'Sin conexión');return false;}
    })();
    syncInFlight.current=task;
    try{return await task;}finally{if(syncInFlight.current===task)syncInFlight.current=null;}
  },[cfg,session,gate]);

  useEffect(()=>{
    if(audit||!session||!cfg||(gate!=='ready'&&gate!=='offline'))return;
    syncTimer.current=window.setInterval(()=>{void doSync();},12000);
    const onHide=()=>{if(document.visibilityState==='hidden')void doSync();};
    const onOnline=()=>{void doSync();};
    const onGameSave=()=>{window.clearTimeout(saveDebounce.current);saveDebounce.current=window.setTimeout(()=>{void doSync();},700);};
    document.addEventListener('visibilitychange',onHide);
    window.addEventListener('online',onOnline);
    window.addEventListener('duckheist:save',onGameSave);
    return()=>{
      window.clearInterval(syncTimer.current);window.clearTimeout(saveDebounce.current);
      document.removeEventListener('visibilitychange',onHide);window.removeEventListener('online',onOnline);window.removeEventListener('duckheist:save',onGameSave);
    };
  },[audit,cfg,session,gate,doSync]);

  const submitAuth=async(ev:FormEvent<HTMLFormElement>)=>{
    ev.preventDefault();if(!cfg){setMessage('La nube no está configurada todavía.');return;}
    const ee=validateEmail(emailInput);if(ee){setMessage(ee);return;}
    if(mode==='recover'){
      setBusy(true);setMessage('');
      try{await sendPasswordReset(cfg,emailInput);setMessage('Te enviamos un correo para restablecer tu contraseña. Revisa también spam.');}
      catch(e){setMessage(e instanceof Error?e.message:'No se pudo enviar el correo.');}
      finally{setBusy(false);}
      return;
    }
    const pe=validatePassword(passwordInput);if(pe){setMessage(pe);return;}
    setBusy(true);setMessage('');
    try{
      if(mode==='signup'){
        const created=await signUpEmail(cfg,emailInput,passwordInput);
        if(created.session&&created.verified){await enterGame(cfg,created.session);}
        else {setResendWait(60);setGate('verify');setMessage('Te enviamos un enlace de verificación. Ábrelo y vuelve aquí.');}
      }else{
        try{
          const s=await loginEmail(cfg,emailInput,passwordInput);await enterGame(cfg,s);
        }catch(e){
          const unverified=e instanceof CloudAuthError&&(e.code==='email_not_confirmed'||/confirm/i.test(e.message));
          if(unverified){setResendWait(30);setGate('verify');setMessage('Ese correo todavía no está verificado. Revisa tu bandeja de entrada.');}
          else throw e;
        }
      }
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo acceder a la cuenta.');}
    finally{setBusy(false);}
  };

  const checkVerification=async()=>{
    if(!cfg)return;setBusy(true);setMessage('Comprobando correo…');
    try{const s=await loginEmail(cfg,emailInput,passwordInput);await enterGame(cfg,s);}
    catch(e){
      const unverified=e instanceof CloudAuthError&&(e.code==='email_not_confirmed'||/confirm/i.test(e.message));
      setMessage(unverified?'Todavía no aparece como verificado. Abre el enlace del correo y vuelve a intentar.':e instanceof Error?e.message:'No se pudo verificar.');
    }finally{setBusy(false);}
  };
  useEffect(()=>{
    if(audit||gate!=='verify'||!cfg||!emailInput||!passwordInput)return;
    const onReturn=()=>{
      if(document.visibilityState==='visible'&&!busy)void checkVerification();
    };
    window.addEventListener('focus',onReturn);
    document.addEventListener('visibilitychange',onReturn);
    return()=>{
      window.removeEventListener('focus',onReturn);
      document.removeEventListener('visibilitychange',onReturn);
    };
  },[audit,gate,cfg,emailInput,passwordInput,busy]);

  const resend=async()=>{
    if(!cfg||resendWait>0)return;setBusy(true);
    try{await resendVerification(cfg,emailInput);setResendWait(60);setMessage('Correo de verificación reenviado. Revisa también spam.');}
    catch(e){setMessage(e instanceof Error?e.message:'No se pudo reenviar.');}
    finally{setBusy(false);}
  };
  const submitUsername=async(ev:FormEvent<HTMLFormElement>)=>{
    ev.preventDefault();if(!cfg||!session)return;
    const ue=validateUsername(usernameInput);if(ue){setMessage(ue);return;}
    setBusy(true);setMessage('');
    try{
      const next=await claimUsername(cfg,getCachedSession()||session,usernameInput);
      setSession(next);setSuggestions([]);await enterGame(cfg,next);
    }catch(e){
      if(e instanceof UsernameTakenError){setSuggestions(e.suggestions);setMessage(e.message);}
      else setMessage(e instanceof Error?e.message:'No se pudo guardar el usuario.');
    }finally{setBusy(false);}
  };
  const submitReset=async(ev:FormEvent<HTMLFormElement>)=>{
    ev.preventDefault();if(!cfg||!session)return;
    const pe=validatePassword(passwordInput);if(pe){setMessage(pe);return;}
    setBusy(true);
    try{await updatePassword(cfg,session,passwordInput);setMessage('Contraseña actualizada.');await enterGame(cfg,session);}
    catch(e){setMessage(e instanceof Error?e.message:'No se pudo actualizar la contraseña.');}
    finally{setBusy(false);}
  };

  const choose=async(choice:'remote'|'local')=>{
    if(!cfg||!session||!conflict)return;setBusy(true);
    try{await resolveConflict(cfg,getCachedSession()||session,conflict,choice);setConflict(null);setGate('ready');setMessage(choice==='remote'?'Partida de la nube cargada.':'Este equipo reemplazó la copia de la nube.');}
    catch(e){setMessage(e instanceof Error?e.message:'No se pudo resolver el conflicto.');}
    finally{setBusy(false);}
  };
  const signOut=async()=>{
    if(!cfg||!session)return;
    setBusy(true);setMessage('Sincronizando antes de cerrar sesión…');
    const ok=await doSync();if(!ok){setBusy(false);setMessage('No cerré la sesión para evitar perder cambios sin sincronizar.');return;}
    try{
      await logoutAccount(cfg,getCachedSession()||session);clearLocalGameData();
      setSession(null);setMenu(false);setGate('auth');setMode('login');setEmailInput('');setPasswordInput('');setUsernameInput('');setSuggestions([]);setMessage('Sesión cerrada.');
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo cerrar sesión.');}
    finally{setBusy(false);}
  };

  if(audit)return <>{children}</>;
  if(gate==='boot')return <AccountShell title="ABRIENDO LA BÓVEDA" subtitle="Preparando tu cuenta Velcore Games…"><div className="vg-account-loader" /></AccountShell>;

  if(gate==='auth')return (
    <AccountShell
      title={mode==='signup'?'CREA TU CUENTA':mode==='recover'?'RECUPERA TU CUENTA':'IDENTIFÍCATE'}
      subtitle={mode==='signup'?'Primero verificamos tu correo. Después eliges tu nombre de jugador.':'Tu progreso, logros y colección viajan contigo entre equipos.'}
    >
      <div className="vg-account-tabs">
        <button className={mode==='login'?'is-active':''} onClick={()=>{setMode('login');setMessage('');}}>ENTRAR</button>
        <button className={mode==='signup'?'is-active':''} onClick={()=>{setMode('signup');setMessage('');}}>CREAR CUENTA</button>
        <button className={mode==='recover'?'is-active':''} onClick={()=>{setMode('recover');setMessage('');}}>RECUPERAR</button>
      </div>
      <form className="vg-account-form" onSubmit={submitAuth}>
        <label>CORREO ELECTRÓNICO<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="tu@correo.com" value={emailInput} onChange={e=>setEmailInput(e.target.value)} required /></label>
        {mode!=='recover'&&<PasswordField value={passwordInput} onChange={setPasswordInput} show={showPassword} onToggle={()=>setShowPassword(v=>!v)} autoComplete={mode==='login'?'current-password':'new-password'} />}
        <button className="vg-account-primary" disabled={busy||!cfg}>{busy?'PROCESANDO…':mode==='signup'?'ENVIAR VERIFICACIÓN':mode==='recover'?'ENVIAR CORREO DE RECUPERACIÓN':'ENTRAR AL ATRACO'}</button>
      </form>
      <p className="vg-account-note">{mode==='signup'?'No podrás elegir usuario ni jugar hasta verificar el correo.':mode==='recover'?'Recibirás un enlace seguro para cambiar tu contraseña.':'Usa tu correo y contraseña para entrar desde cualquier PC.'}</p>
      {message&&<p className="vg-account-message">{message}</p>}
    </AccountShell>
  );

  if(gate==='verify')return (
    <AccountShell title="VERIFICA TU CORREO" subtitle={<>Enviamos un enlace a <strong>{emailInput}</strong>. Verifica el correo antes de elegir tu usuario.</>}>
      <div className="vg-verify-mark" aria-hidden="true">✉</div>
      <p className="vg-account-note vg-verify-help">Abre el enlace del correo. Al volver a esta pestaña lo comprobaré automáticamente; también puedes usar el botón.</p>
      <button className="vg-account-primary" disabled={busy} onClick={()=>void checkVerification()}>{busy?'COMPROBANDO…':'YA VERIFIQUÉ MI CORREO'}</button>
      <button className="vg-account-secondary" disabled={busy||resendWait>0} onClick={()=>void resend()}>{resendWait>0?`REENVIAR EN ${resendWait}s`:'REENVIAR CORREO'}</button>
      <button className="vg-account-link" onClick={()=>{setGate('auth');setMode('login');setMessage('');}}>USAR OTRO CORREO</button>
      {message&&<p className="vg-account-message">{message}</p>}
    </AccountShell>
  );

  if(gate==='username')return (
    <AccountShell title="ELIGE TU USUARIO" subtitle="Tu correo ya está verificado. Este nombre será tu identidad visible en Velcore Games.">
      <div className="vg-verified-email"><span>✓ CORREO VERIFICADO</span><strong>{session?.email}</strong></div>
      <form className="vg-account-form" onSubmit={submitUsername}>
        <label>NOMBRE DE USUARIO<input name="username" autoComplete="username" maxLength={20} placeholder="PatoLadron" value={usernameInput} onChange={e=>{setUsernameInput(e.target.value);setSuggestions([]);}} required /></label>
        {suggestions.length>0&&<div className="vg-username-suggestions"><span>ESTOS ESTÁN DISPONIBLES:</span>{suggestions.map(name=><button type="button" key={name} onClick={()=>{setUsernameInput(name);setSuggestions([]);setMessage('Nombre disponible sugerido.');}}>{name}</button>)}</div>}
        <button className="vg-account-primary" disabled={busy}>{busy?'GUARDANDO…':'CONFIRMAR USUARIO'}</button>
      </form>
      <p className="vg-account-note">Los usuarios son únicos. Si el nombre está ocupado te propondré alternativas con número.</p>
      {message&&<p className="vg-account-message">{message}</p>}
    </AccountShell>
  );

  if(gate==='reset')return (
    <AccountShell title="NUEVA CONTRASEÑA" subtitle="El enlace de recuperación ya fue validado. Elige una contraseña nueva.">
      <form className="vg-account-form" onSubmit={submitReset}>
        <PasswordField value={passwordInput} onChange={setPasswordInput} show={showPassword} onToggle={()=>setShowPassword(v=>!v)} autoComplete="new-password" label="NUEVA CONTRASEÑA" />
        <button className="vg-account-primary" disabled={busy}>{busy?'ACTUALIZANDO…':'GUARDAR NUEVA CONTRASEÑA'}</button>
      </form>
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
        <strong>{session.username}</strong><small>{gate==='offline'?'LOCAL':'NUBE'}</small>
      </button>
      {menu&&<div className="vg-account-menu">
        <div><b>CUENTA VELCORE GAMES</b><span>{session.username}</span><small>{session.email}</small></div>
        <button disabled={busy} onClick={()=>void doSync()}>SINCRONIZAR AHORA</button>
        <button disabled={busy||gate==='offline'} onClick={()=>void signOut()}>CERRAR SESIÓN</button>
        {message&&<p>{message}</p>}
      </div>}
    </div>}
  </>;
}

function PasswordField({value,onChange,show,onToggle,autoComplete,label='CONTRASEÑA'}:{value:string;onChange:(v:string)=>void;show:boolean;onToggle:()=>void;autoComplete:string;label?:string}){
  return <label>{label}<span className="vg-password-field"><input name="password" type={show?'text':'password'} autoComplete={autoComplete} minLength={10} maxLength={128} value={value} onChange={e=>onChange(e.target.value)} required /><button type="button" className="vg-password-toggle" onClick={onToggle} aria-label={show?'Ocultar contraseña':'Ver contraseña'}>{show?'OCULTAR':'VER'}</button></span></label>;
}
function AccountShell({title,subtitle,children}:{title:string;subtitle:ReactNode;children:ReactNode}){
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
