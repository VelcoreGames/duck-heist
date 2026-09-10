import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const once=(src,from,to,label)=>{
  const next=src.replace(from,to);
  if(next===src)throw new Error('Macro Pato patch failed: '+label);
  return next;
};

const MACRO_SKIN=`SKINS.push({
  id:'macro_pato',
  name:'MACRO PATO',
  description:'Cabello negro, lentes gruesos y cero discreción.',
  cost:0,
  palette:{...DEFAULT_PALETTE,body:'#f1ddb0',dark:'#dfc28d',shade:'#cba36f',beak:'#e99a2f',beakDark:'#b9691d',mask:'#f1ddb0',pack:'#d8b982',strap:'#d8b982'},
  overlay:'macro_pato'
});

`;

const MACRO_OVERLAY=`    case 'macro_pato': {
      // Macro Pato: cabello negro despeinado, lentes grandes y plumaje crema.
      // Todo se dibuja con píxeles de Canvas para conservar el lenguaje visual del juego.
      const hy=by+2+(moving?Math.round(Math.sin(frame*.35)):0);
      const hair='#171b22',hair2='#222831',hairHi='#3a414b',frameCol='#2d3945',lens='rgba(183,199,207,.34)',shine='#eef6f6';

      // Plumaje extra: silueta más esponjosa sin tocar la caja de colisión.
      rect(ctx,bx+1,by+8,2,5,'#f1ddb0'); rect(ctx,bx+13,by+8,2,5,'#f1ddb0');
      rect(ctx,bx,by+10,2,2,'#dfc28d'); rect(ctx,bx+14,by+10,2,2,'#dfc28d');
      rect(ctx,bx+2,by+13,2,2,'#dfc28d'); rect(ctx,bx+12,by+13,2,2,'#dfc28d');
      rect(ctx,bx+5,by+14,6,1,'#f7e9c7');

      if(dir==='up'){
        // Vista trasera: volumen completo del cabello y mechones inferiores.
        rect(ctx,bx+2,hy-5,12,6,hair); rect(ctx,bx+1,hy-2,14,5,hair);
        rect(ctx,bx+3,hy-7,9,3,hair2); rect(ctx,bx+5,hy-8,6,2,hair2);
        rect(ctx,bx+2,hy+2,3,3,hair); rect(ctx,bx+6,hy+2,2,4,hair); rect(ctx,bx+10,hy+2,3,3,hair);
        rect(ctx,bx+4,hy-5,4,1,hairHi); rect(ctx,bx+10,hy-3,3,1,hairHi);
      }else if(dir==='left'){
        // Perfil izquierdo: flequillo, patilla y un lente visible.
        rect(ctx,bx+2,hy-5,11,5,hair); rect(ctx,bx+1,hy-2,12,4,hair2);
        rect(ctx,bx+2,hy+1,4,5,hair); rect(ctx,bx+5,hy,3,3,hair);
        rect(ctx,bx+4,hy-4,4,1,hairHi);
        rect(ctx,bx+3,hy+1,6,5,frameCol); rect(ctx,bx+4,hy+2,4,3,lens);
        rect(ctx,bx+1,hy+2,3,1,frameCol); rect(ctx,bx+5,hy+2,2,1,shine);
      }else if(dir==='right'){
        // Perfil derecho, reflejado manualmente para mantener píxeles nítidos.
        rect(ctx,bx+3,hy-5,11,5,hair); rect(ctx,bx+3,hy-2,12,4,hair2);
        rect(ctx,bx+10,hy+1,4,5,hair); rect(ctx,bx+8,hy,3,3,hair);
        rect(ctx,bx+8,hy-4,4,1,hairHi);
        rect(ctx,bx+7,hy+1,6,5,frameCol); rect(ctx,bx+8,hy+2,4,3,lens);
        rect(ctx,bx+12,hy+2,3,1,frameCol); rect(ctx,bx+9,hy+2,2,1,shine);
      }else{
        // Frente: melena asimétrica y lentes rectangulares protagonistas.
        rect(ctx,bx+2,hy-5,12,5,hair); rect(ctx,bx+1,hy-2,14,4,hair2);
        rect(ctx,bx+1,hy+1,4,4,hair); rect(ctx,bx+12,hy+1,3,4,hair);
        rect(ctx,bx+3,hy-7,4,3,hair2); rect(ctx,bx+7,hy-8,5,4,hair2);
        rect(ctx,bx+2,hy,3,3,hair); rect(ctx,bx+6,hy-1,2,3,hair); rect(ctx,bx+11,hy-1,3,3,hair);
        rect(ctx,bx+4,hy-5,3,1,hairHi); rect(ctx,bx+9,hy-6,3,1,hairHi);

        // Armazón grueso, dos cristales y puente central.
        rect(ctx,bx+2,hy+1,6,5,frameCol); rect(ctx,bx+8,hy+1,6,5,frameCol);
        rect(ctx,bx+3,hy+2,4,3,lens); rect(ctx,bx+9,hy+2,4,3,lens);
        rect(ctx,bx+7,hy+2,2,1,frameCol); rect(ctx,bx+1,hy+2,2,1,frameCol); rect(ctx,bx+14,hy+2,2,1,frameCol);
        rect(ctx,bx+4,hy+2,2,1,shine); rect(ctx,bx+10,hy+2,2,1,shine);
        px(ctx,bx+6,hy+4,'#11151a'); px(ctx,bx+10,hy+4,'#11151a');
      }
      break;
    }
`;

export function applyDuckMacroPato(gameDir){
  const data=path.join(gameDir,'game','data.ts');
  let d=readFileSync(data,'utf8');
  if(!d.includes("id:'macro_pato'")){
    d=once(d,"'space_green';","'space_green' | 'macro_pato';",'skin overlay type');
    d=once(d,'export function getSkin(id: string): DuckSkin {',MACRO_SKIN+'export function getSkin(id: string): DuckSkin {','skin registry');
    writeFileSync(data,d);
  }

  const sprites=path.join(gameDir,'game','sprites.ts');
  let s=readFileSync(sprites,'utf8');
  if(!s.includes("case 'macro_pato':")){
    const start=s.indexOf("    case 'space_green':");
    const at=start<0?-1:s.indexOf('    default: break;',start);
    if(at<0)throw new Error('Macro Pato patch failed: sprite overlay anchor');
    s=s.slice(0,at)+MACRO_OVERLAY+s.slice(at);
    writeFileSync(sprites,s);
  }

  const progress=path.join(gameDir,'game','progress.ts');
  let p=readFileSync(progress,'utf8');
  p=once(p,"skins:['robber']","skins:['robber','macro_pato']",'discover Macro Pato');
  p=once(p,"new Set(['robber',...","new Set(['robber','macro_pato',...",'unlock Macro Pato in saves');
  writeFileSync(progress,p);

  const engine=path.join(gameDir,'game','engine.ts');
  let e=readFileSync(engine,'utf8');
  e=once(e,"let unlockedSkins: string[] = ['robber'];","let unlockedSkins: string[] = ['robber','macro_pato'];",'new game unlock');
  e=once(e,"unlockedSkins = d.unlockedSkins ?? ['robber'];","unlockedSkins = d.unlockedSkins ?? ['robber','macro_pato'];",'loaded game unlock fallback');
  writeFileSync(engine,e);

  const selftest=path.join(gameDir,'game','selftest.ts');
  let q=readFileSync(selftest,'utf8');
  q=once(q,"check('Exactly twelve cosmetic skins',()=>assert(SKINS.length===12 && SKINS.every(s=>!('hp' in s)&&!('damage' in s)),'invalid cosmetics'));","check('Exactly thirteen cosmetic skins',()=>assert(SKINS.length===13 && SKINS.every(s=>!('hp' in s)&&!('damage' in s)),'invalid cosmetics'));\n    check('Macro Pato is playable and stat-free',()=>{const m=SKINS.find(s=>s.id==='macro_pato');assert(!!m&&m.cost===0&&m.overlay==='macro_pato','Macro Pato missing');});",'skin self-test');
  writeFileSync(selftest,q);
}
