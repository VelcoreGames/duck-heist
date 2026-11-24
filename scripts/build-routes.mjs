import { mkdir, readFile, writeFile, cp, access } from 'node:fs/promises';
import { join } from 'node:path';

const dist='dist';
const source=join(dist,'index.html');
const SITE='https://velcoregames.com';

// Cada ruta del juego recibe su propio título, descripción e imagen para redes
// (lo que se ve al compartir el enlace por WhatsApp, Facebook, etc.).
const routes=[
  {
    slug:'duck-heist',
    title:'Duck Heist: El Banco del Pan · Velcore Games',
    description:'Roguelite de acción en tu navegador: entra al Banco del Pan, arma tu build y roba los seis pisos antes de que la seguridad te cierre el paso.',
    image:'/media/og-duck-heist-v3.jpg',
  },
  {
    slug:'duck-heist-movil',
    title:'Duck Heist Móvil · Velcore Games',
    description:'Juega Duck Heist en tu celular: el mismo atraco con sticks y botones táctiles, puntería asistida y disparo automático.',
    image:'/media/og-velcoregames-v3.jpg',
  },
  {
    slug:'eca',
    title:'ECA · Velcore Games',
    description:'El siguiente universo de Velcore Games. Próximamente.',
    image:'/media/og-velcoregames-v3.jpg',
  },
];

const esc=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function withMeta(html,{title,description,url,image,noindex=false}){
  const tags=[
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noindex?'<meta name="robots" content="noindex" />':`<link rel="canonical" href="${url}" />`,
    '<meta name="theme-color" content="#071216" />',
    '<link rel="icon" type="image/png" href="/media/favicon.png" />',
    '<link rel="apple-touch-icon" href="/media/favicon.png" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="es_MX" />',
    '<meta property="og:site_name" content="Velcore Games" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}${image}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
  const out=html
    .replace(/<title>[\s\S]*?<\/title>/,'')
    .replace(/<meta name="description"[^>]*>/,'')
    .replace(/<meta name="viewport"[^>]*>/,m=>`${m}\n    ${tags}`);
  if(!out.includes('<link rel="icon"'))throw new Error('No se pudieron agregar las etiquetas de la página');
  return out;
}

const rawGame=await readFile(source,'utf8');
// Red de seguridad: si una página vieja quedó guardada y pide un archivo del juego que ya
// no existe (después de publicar una versión nueva), recarga una vez con la versión actual.
const RELOAD_GUARD=`<script>addEventListener('error',function(e){var t=e.target;if(!t||!(t.tagName==='SCRIPT'||t.tagName==='LINK'))return;try{if(sessionStorage.getItem('vg_asset_reload'))return;sessionStorage.setItem('vg_asset_reload','1')}catch(_){return}location.replace(location.pathname+'?v='+Date.now()+location.hash)},true);addEventListener('load',function(){try{sessionStorage.removeItem('vg_asset_reload')}catch(_){}})</script>`;
const game=rawGame.replace('<head>',`<head>\n    ${RELOAD_GUARD}`);
// Archivos pesados del juego (JS y CSS con huella) para precargarlos desde la portada.
const gameAssets=[...rawGame.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(m=>m[1]);
for(const route of routes){
  const dir=join(dist,route.slug);
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'index.html'),withMeta(game,{...route,url:`${SITE}/${route.slug}`}),'utf8');
}

// Useful fallback on static hosting: unknown paths can still render the router.
await writeFile(join(dist,'404.html'),withMeta(game,{
  title:'Página no encontrada · Velcore Games',
  description:'Esta dirección no existe. Vuelve a Velcore Games.',
  url:`${SITE}/`,image:'/media/og-velcoregames-v3.jpg',noindex:true,
}),'utf8');

// Sitio de Velcore Games (página principal de velcoregames.com).
// Todo lo que está en sitio/ se copia a la raíz del build y reemplaza la portada "/".
// Las rutas del juego (/duck-heist, /duck-heist-movil, /eca) ya se generaron arriba y no se tocan.
const site='sitio';
let hasSite=true;
try{await access(join(site,'index.html'));}catch{hasSite=false;}
if(hasSite){
  await cp(site,dist,{recursive:true,force:true});
  // La portada precarga el juego en segundo plano: al dar clic en "Jugar" ya está guardado.
  if(gameAssets.length){
    const home=join(dist,'index.html');
    const html=await readFile(home,'utf8');
    const links=gameAssets.map(a=>`<link rel="prefetch" href="${a}"${a.endsWith('.js')?' as="script" crossorigin':' as="style"'}>`).join('\n');
    await writeFile(home,html.replace('</head>',`${links}\n</head>`),'utf8');
  }
}

const manifest={
  generatedAt:new Date().toISOString(),
  home:hasSite?'sitio':'game-portal',
  routes:['/',...routes.map(route=>`/${route.slug}`)],
};
await writeFile(join(dist,'routes.json'),JSON.stringify(manifest,null,2)+'\n','utf8');

console.log('Generated game routes:',manifest.routes.join(', '));
console.log(hasSite?'Home page: sitio/ (Velcore Games website)':'Home page: game portal');
