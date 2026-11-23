import { useState, type ReactNode } from 'react';
import { GAME_VERSION_LABEL } from './game/version';

// Duck Heist se juega con teclado y mouse o con control. En celulares y tabletas
// sin puntero fino mostramos un aviso antes de cargar la cuenta y el juego.
const DISMISS_KEY='vg_touch_notice_dismissed';
const GAME_LINK='https://velcoregames.com/duck-heist';

function isTouchOnly(){
  try{
    const coarse=window.matchMedia('(pointer: coarse)').matches;
    const fine=window.matchMedia('(any-pointer: fine)').matches;
    return coarse&&!fine;
  }catch{return false;}
}
function wasDismissed(){try{return sessionStorage.getItem(DISMISS_KEY)==='1';}catch{return false;}}

export default function TouchNotice({children}:{children:ReactNode}){
  const [show,setShow]=useState(()=>isTouchOnly()&&!wasDismissed()&&!new URLSearchParams(window.location.search).has('auditoria'));
  const [status,setStatus]=useState('');
  if(!show)return <>{children}</>;

  const share=async()=>{
    try{
      if(navigator.share){await navigator.share({title:'Duck Heist · Velcore Games',text:'Juega Duck Heist en tu computadora:',url:GAME_LINK});return;}
      await navigator.clipboard.writeText(GAME_LINK);setStatus('Enlace copiado. Ábrelo en tu computadora.');
    }catch{setStatus(GAME_LINK);}
  };
  const playAnyway=()=>{try{sessionStorage.setItem(DISMISS_KEY,'1');}catch{/* opcional */}setShow(false);};

  return <main className="vg-account-page">
    <div className="vg-account-noise" aria-hidden="true" />
    <div className="vg-account-vault-lines" aria-hidden="true" />
    <section className="vg-account-card">
      <a className="vg-account-brand" href="/">
        <span className="vg-account-duck-mark">DH</span>
        <div><b>DUCK HEIST</b><small>VELCORE GAMES</small></div>
      </a>
      <div className="vg-account-kicker">BANCO DEL PAN · VERSIÓN PARA COMPUTADORA</div>
      <h1>JUÉGALO EN TU PC</h1>
      <p className="vg-account-sub">Duck Heist se juega con teclado y mouse o con control. En el celular todavía no hay controles táctiles: estamos preparando Duck Heist Móvil.</p>
      <button type="button" className="vg-account-primary" onClick={()=>void share()}>ENVIAR EL ENLACE A MI COMPUTADORA</button>
      <a className="vg-account-secondary vg-touch-link" href="/">VER VELCORE GAMES</a>
      {status&&<p className="vg-account-message">{status}</p>}
      <button type="button" className="vg-account-link" onClick={playAnyway}>Abrir el juego de todos modos</button>
      <p className="vg-account-version">BANCO DEL PAN // DUCK HEIST {GAME_VERSION_LABEL}</p>
    </section>
  </main>;
}
