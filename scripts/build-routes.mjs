import { mkdir, copyFile, readFile, writeFile, cp, access } from 'node:fs/promises';
import { join } from 'node:path';

const dist='dist';
const source=join(dist,'index.html');
const routes=['duck-heist','duck-heist-movil','eca'];

await readFile(source,'utf8');
for(const route of routes){
  const dir=join(dist,route);
  await mkdir(dir,{recursive:true});
  await copyFile(source,join(dir,'index.html'));
}

// Useful fallback on static hosting: unknown paths can still render the router.
await copyFile(source,join(dist,'404.html'));

// Sitio de Velcore Games (página principal de velcoregames.com).
// Todo lo que está en sitio/ se copia a la raíz del build y reemplaza la portada "/".
// Las rutas del juego (/duck-heist, /duck-heist-movil, /eca) ya se generaron arriba y no se tocan.
const site='sitio';
let hasSite=true;
try{await access(join(site,'index.html'));}catch{hasSite=false;}
if(hasSite){
  await cp(site,dist,{recursive:true,force:true});
}

const manifest={
  generatedAt:new Date().toISOString(),
  home:hasSite?'sitio':'game-portal',
  routes:['/',...routes.map(route=>`/${route}`)],
};
await writeFile(join(dist,'routes.json'),JSON.stringify(manifest,null,2)+'\n','utf8');

console.log('Generated game routes:',manifest.routes.join(', '));
console.log(hasSite?'Home page: sitio/ (Velcore Games website)':'Home page: game portal');
