import { useEffect,useState,type ComponentType } from 'react';
import * as ReactNS from 'react';
import * as JSXRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import { unzipSync,strFromU8 } from 'fflate';

type ModuleRecord={exports:Record<string,unknown>};
type ModuleFn=(module:ModuleRecord,exports:Record<string,unknown>,require:(spec:string)=>unknown)=>void;

const ZIP_URL='./resources/duck-heist-source.zip';

function normalizePath(value:string){const parts:string[]=[];for(const p of value.replace(/\\/g,'/').split('/')){if(!p||p==='.')continue;if(p==='..')parts.pop();else parts.push(p);}return '/'+parts.join('/');}

function canonicalZipPath(name:string){const n=name.replace(/\\/g,'/');const src=n.indexOf('src/');if(src>=0)return '/'+n.slice(src);return '/'+n.replace(/^\/+/, '');}

function patchGameSource(id:string,source:string){
  if(id.endsWith('/game/audio.ts')&&!source.includes('__duckDeathMusic')){
    source=source
      .replace(/'menu'\s*\|\s*'run'\s*\|\s*'boss'\s*\|\s*'off'/g,"'menu' | 'run' | 'boss' | 'death' | 'off'")
      .replace("const BOSS_BASS = [65.41, 77.78, 65.41, 55, 65.41, 87.31, 77.78, 55];","const BOSS_BASS = [65.41, 77.78, 65.41, 55, 65.41, 87.31, 77.78, 55];\nconst DEATH_BASS = [146.83, 130.81, 123.47, 110, 98, 0, 87.31, 0];")
      .replace("const bpm = mood === 'boss' ? 138 : mood === 'run' ? 112 : 86;","const bpm = mood === 'death' ? 58 : mood === 'boss' ? 138 : mood === 'run' ? 112 : 86;")
      .replace("function tickMusic(mood: 'menu' | 'run' | 'boss', beat: number) {","function tickMusic(mood: 'menu' | 'run' | 'boss' | 'death', beat: number) {")
      .replace("const seq = mood === 'menu' ? MENU_BASS : mood === 'run' ? RUN_BASS : BOSS_BASS;","const seq = mood === 'death' ? DEATH_BASS : mood === 'menu' ? MENU_BASS : mood === 'run' ? RUN_BASS : BOSS_BASS;")
      .replace("if (f > 0) { oscTone(mood === 'boss' ? 'sawtooth' : 'triangle', f * 2, f, sec * .82, mood === 'menu' ? .025 : .03, 0, 'music'); if (mood !== 'menu') oscTone('sine', f * 4, f * 3.96, sec * .28, .012, .018, 'music'); }","if (f > 0) { if (mood === 'death') { oscTone('triangle', f, f * .985, sec * 1.75, .028, 0, 'music'); oscTone('sine', f / 2, f * .495, sec * 1.9, .018, 0, 'music'); if (s % 4 === 0) metallic(f * 2, .35, .006, .08, 'music'); } else { oscTone(mood === 'boss' ? 'sawtooth' : 'triangle', f * 2, f, sec * .82, mood === 'menu' ? .025 : .03, 0, 'music'); if (mood !== 'menu') oscTone('sine', f * 4, f * 3.96, sec * .28, .012, 'music'); } }")
      .replace("if (mood !== 'menu' && s % 2 === 1) filteredNoise(.028, mood === 'boss' ? .020 : .012, 0, 3000, 11000, .6, .06, 'music');","if (mood === 'death') { if (s === 0 || s === 4) thump(48, .22, .014, 0, 'music'); } else if (mood !== 'menu' && s % 2 === 1) filteredNoise(.028, mood === 'boss' ? .020 : .012, 0, 3000, 11000, .6, .06, 'music');")
      .replace("export function stopMusic() { setMusic('off'); }","export function playDeathMusic() { setMusic('death', musicFloor); }\n;(globalThis as any).__duckDeathMusic = playDeathMusic;\nexport function stopMusic() { setMusic('off'); }");
  }
  if(id==='/src/App.tsx'&&!source.includes('__duckDeathMusic?.')){
    source=source.replace(/setScreen\((['\"])gameover\1\)/g,"((globalThis as any).__duckDeathMusic?.(),setScreen('gameover'))");
  }
  return source;
}

async function compileGame():Promise<ComponentType>{
  const response=await fetch(ZIP_URL,{cache:'no-store'});
  if(!response.ok)throw new Error(`No se pudo cargar el ZIP del juego (${response.status}).`);
  const zipped=new Uint8Array(await response.arrayBuffer());
  const archive=unzipSync(zipped);
  const modules=new Map<string,ModuleFn>();
  for(const [rawName,bytes] of Object.entries(archive)){
    const id=canonicalZipPath(rawName);
    if(!/\.(ts|tsx)$/.test(id)||id.endsWith('/main.tsx'))continue;
    const source=patchGameSource(id,strFromU8(bytes));
    const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,removeComments:true},reportDiagnostics:true,fileName:id});
    const fatal=result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[];
    if(fatal.length){const msg=fatal.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('\n');throw new Error(`Error compilando ${id}: ${msg}`);}
    modules.set(id,new Function('module','exports','require',result.outputText) as ModuleFn);
  }
  if(!modules.has('/src/App.tsx'))throw new Error('El ZIP no contiene src/App.tsx.');
  const cache=new Map<string,ModuleRecord>();
  const resolve=(from:string,spec:string)=>{
    if(spec==='react'||spec==='react/jsx-runtime')return spec;
    if(!spec.startsWith('.'))return spec;
    const base=from.slice(0,from.lastIndexOf('/'));
    const raw=normalizePath(base+'/'+spec);
    const tries=[raw,raw+'.ts',raw+'.tsx',raw+'.js',raw+'/index.ts',raw+'/index.tsx'];
    for(const t of tries)if(modules.has(t))return t;
    throw new Error(`No se pudo resolver ${spec} desde ${from}`);
  };
  const requireModule=(id:string):unknown=>{
    if(id==='react')return ReactNS;
    if(id==='react/jsx-runtime')return JSXRuntime;
    if(id==='clsx'||id==='tailwind-merge')throw new Error(`Módulo externo no usado en el juego: ${id}`);
    const cached=cache.get(id);if(cached)return cached.exports;
    const fn=modules.get(id);if(!fn)throw new Error(`Falta el módulo ${id}`);
    const rec:ModuleRecord={exports:{}};cache.set(id,rec);
    fn(rec,rec.exports,(spec)=>requireModule(resolve(id,spec)));
    return rec.exports;
  };
  const entry=requireModule('/src/App.tsx') as {default?:ComponentType};
  if(!entry.default)throw new Error('src/App.tsx no exporta el juego correctamente.');
  return entry.default;
}

export default function ZipGame(){
  const [Game,setGame]=useState<ComponentType|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let alive=true;compileGame().then(Component=>{if(alive)setGame(()=>Component);}).catch(err=>{if(alive)setError(err instanceof Error?err.message:String(err));});return()=>{alive=false;};},[]);
  if(error)return <div className="duck-loader"><div><h1>DUCK HEIST</h1><p>No se pudo iniciar el atraco.</p><div className="error">{error}</div></div></div>;
  if(!Game)return <div className="duck-loader"><div><h1>DUCK HEIST</h1><p>Cargando El Banco del Pan…</p><p>Preparando salas, patos y migajas.</p></div></div>;
  return <Game/>;
}