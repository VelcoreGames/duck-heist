import App from './App';
import GamePortal from './GamePortal';
import AccountGate from './cloud/AccountGate';

function normalizePath(pathname:string){
  const clean=pathname.replace(/\/{2,}/g,'/').replace(/\/$/,'')||'/';
  return clean.toLowerCase();
}

function ComingSoon({title,slug}:{title:string;slug:string}){
  return (
    <main className="vg-page vg-coming">
      <a className="vg-back" href="/">← VOLVER A VELCORE GAMES</a>
      <section className="vg-coming-card">
        <div className="vg-kicker">PROYECTO EN DESARROLLO</div>
        <h1>{title}</h1>
        <p>Esta ruta ya está separada del resto de los juegos y lista para recibir su propio build.</p>
        <code>velcoregames.com/{slug}</code>
        <div className="vg-scan" aria-hidden="true" />
      </section>
    </main>
  );
}

function NotFound(){
  return (
    <main className="vg-page vg-coming">
      <section className="vg-coming-card">
        <div className="vg-kicker">RUTA NO ENCONTRADA</div>
        <h1>ESTE JUEGO AÚN NO EXISTE</h1>
        <p>Vuelve al catálogo de Velcore Games.</p>
        <a className="vg-primary-link" href="/">IR AL CATÁLOGO</a>
      </section>
    </main>
  );
}

export default function RouteApp(){
  const path=normalizePath(window.location.pathname);

  if(path==='/duck-heist'){
    document.title='DUCK HEIST · Velcore Games';
    return <AccountGate><App /></AccountGate>;
  }
  if(path==='/duck-heist-movil'){
    document.title='Duck Heist Móvil · Velcore Games';
    return <ComingSoon title="DUCK HEIST MÓVIL" slug="duck-heist-movil" />;
  }
  if(path==='/eca'){
    document.title='ECA · Velcore Games';
    return <ComingSoon title="ECA" slug="eca" />;
  }
  if(path==='/'){
    document.title='Velcore Games';
    return <GamePortal />;
  }
  return <NotFound />;
}
