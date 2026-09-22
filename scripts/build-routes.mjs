import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
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

const manifest={
  generatedAt:new Date().toISOString(),
  routes:['/',...routes.map(route=>`/${route}`)],
};
await writeFile(join(dist,'routes.json'),JSON.stringify(manifest,null,2)+'\n','utf8');

console.log('Generated game routes:',manifest.routes.join(', '));
