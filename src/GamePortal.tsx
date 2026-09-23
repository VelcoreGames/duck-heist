const games=[
  {
    id:'duck-heist',
    title:'DUCK HEIST',
    subtitle:'EL BANCO DEL PAN',
    href:'/duck-heist',
    status:'JUGAR AHORA',
    live:true,
    className:'duck',
    description:'El atraco principal de Velcore Games.',
  },
  {
    id:'duck-heist-movil',
    title:'DUCK HEIST',
    subtitle:'MÓVIL',
    href:'/duck-heist-movil',
    status:'EN DESARROLLO',
    live:false,
    className:'mobile',
    description:'Versión independiente preparada para móvil.',
  },
  {
    id:'eca',
    title:'ECA',
    subtitle:'PRÓXIMO PROYECTO',
    href:'/eca',
    status:'EN DESARROLLO',
    live:false,
    className:'eca',
    description:'Nuevo espacio reservado dentro de Velcore Games.',
  },
] as const;

export default function GamePortal(){
  return (
    <main className="vg-page vg-hub">
      <div className="vg-grid-bg" aria-hidden="true" />
      <header className="vg-header">
        <a className="vg-brand" href="/" aria-label="Velcore Games">
          <span className="vg-brand-mark">V</span>
          <span>
            <strong>VELCORE GAMES</strong>
            <small>GAME PLATFORM</small>
          </span>
        </a>
        <div className="vg-header-copy">
          <span>CATÁLOGO</span>
          <span>{games.length.toString().padStart(2,'0')} PROYECTOS</span>
        </div>
      </header>

      <section className="vg-hero">
        <div className="vg-kicker">VELCORE GAMES · BIBLIOTECA</div>
        <h1>UN LUGAR.<br/><em>MUCHOS JUEGOS.</em></h1>
        <p>Elige un proyecto. Cada juego vive en su propia ruta y puede crecer de forma independiente.</p>
      </section>

      <section className="vg-library" aria-label="Juegos de Velcore Games">
        {games.map((game,index)=>(
          <a
            key={game.id}
            className={`vg-game-card vg-game-${game.className} ${game.live?'is-live':'is-coming'}`}
            href={game.href}
          >
            <div className="vg-card-number">{String(index+1).padStart(2,'0')}</div>
            <div className="vg-card-art" aria-hidden="true">
              <div className="vg-pixel-shape" />
              <div className="vg-card-glow" />
            </div>
            <div className="vg-card-meta">
              <div>
                <span className="vg-status">{game.status}</span>
                <h2>{game.title}</h2>
                <h3>{game.subtitle}</h3>
              </div>
              <span className="vg-arrow">↗</span>
            </div>
            <p>{game.description}</p>
          </a>
        ))}
      </section>

      <footer className="vg-footer">
        <span>VELCORE GAMES</span>
        <span>WEB GAME PLATFORM</span>
      </footer>
    </main>
  );
}
