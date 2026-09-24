const games=[
  {
    id:'duck-heist',
    title:'DUCK HEIST',
    subtitle:'EL BANCO DEL PAN',
    href:'/duck-heist',
    status:'JUGAR AHORA',
    live:true,
    className:'duck',
    description:'Atraca el Banco del Pan, construye tu build y sobrevive a una seguridad que escala piso a piso.',
    platform:'PC · WEB',
  },
  {
    id:'duck-heist-movil',
    title:'DUCK HEIST',
    subtitle:'MÓVIL',
    href:'/duck-heist-movil',
    status:'EN DESARROLLO',
    live:false,
    className:'mobile',
    description:'Una versión independiente pensada desde cero para controles táctiles y sesiones móviles.',
    platform:'MÓVIL',
  },
  {
    id:'eca',
    title:'ECA',
    subtitle:'PRÓXIMO PROYECTO',
    href:'/eca',
    status:'EN DESARROLLO',
    live:false,
    className:'eca',
    description:'El siguiente universo de Velcore Games. Su espacio ya está preparado para crecer sin limitar el catálogo.',
    platform:'PRÓXIMAMENTE',
  },
] as const;

export default function GamePortal(){
  const liveCount=games.filter(game=>game.live).length;
  const developmentCount=games.length-liveCount;

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
          <span>{liveCount.toString().padStart(2,'0')} JUGABLE</span>
        </div>
      </header>

      <section className="vg-hero">
        <div className="vg-hero-copy">
          <div className="vg-kicker">VELCORE GAMES · BIBLIOTECA</div>
          <h1>UN LUGAR.<br/><em>MUCHOS JUEGOS.</em></h1>
          <p>Una biblioteca propia para jugar, descubrir proyectos y seguir cómo crece cada universo de Velcore Games.</p>
        </div>
        <div className="vg-hero-stats" aria-label="Estado del catálogo">
          <div><strong>{String(liveCount).padStart(2,'0')}</strong><span>JUGABLE</span></div>
          <div><strong>{String(developmentCount).padStart(2,'0')}</strong><span>EN DESARROLLO</span></div>
          <div><strong>WEB</strong><span>PLATAFORMA</span></div>
        </div>
      </section>

      <section className="vg-library" aria-label="Juegos de Velcore Games">
        {games.map((game,index)=>(
          <a
            key={game.id}
            className={`vg-game-card vg-game-${game.className} ${game.live?'is-live':'is-coming'} ${index===0?'is-featured':'is-secondary'}`}
            href={game.href}
          >
            <div className="vg-card-number">{String(index+1).padStart(2,'0')}</div>
            <div className="vg-card-art" aria-hidden="true">
              <div className="vg-pixel-shape" />
              <div className="vg-card-glow" />
              <div className="vg-art-caption">
                <span>{game.live?'DISPONIBLE AHORA':'EN PRODUCCIÓN'}</span>
                <strong>{game.platform}</strong>
              </div>
            </div>
            <div className="vg-card-meta">
              <div>
                <span className="vg-status"><i />{game.status}</span>
                <h2>{game.title}</h2>
                <h3>{game.subtitle}</h3>
              </div>
              <span className="vg-arrow">↗</span>
            </div>
            <div className="vg-card-footer">
              <p>{game.description}</p>
              <span className="vg-card-cta">{game.live?'ABRIR JUEGO':'VER PROYECTO'}</span>
            </div>
          </a>
        ))}
      </section>

      <footer className="vg-footer">
        <span>VELCORE GAMES</span>
        <span>PLAY · BUILD · EXPAND</span>
        <span>WEB GAME PLATFORM</span>
      </footer>
    </main>
  );
}
