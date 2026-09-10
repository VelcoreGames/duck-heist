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
  description:'Golden sample del nuevo estilo chibi: cabello negro, lentes gruesos y plumaje crema.',
  cost:0,
  palette:{...DEFAULT_PALETTE,body:'#f5e4bf',dark:'#e6cd9d',shade:'#d2af77',beak:'#f2a33b',beakDark:'#c97a23',mask:'#f5e4bf',pack:'#e6cd9d',strap:'#e6cd9d'},
  overlay:'macro_pato'
});

`;

const MACRO_OVERLAY=`    case 'macro_pato': {
      // Macro Pato — golden sample del nuevo estilo chibi/noir.
      // Mantiene la misma hitbox pero empuja la silueta con cabello, lentes y plumaje premium.
      const hy = by + 2 + (moving ? Math.round(Math.sin(frame * .35)) : 0);
      const hair = '#141923';
      const hairMid = '#202734';
      const hairHi = '#49515d';
      const hairLo = '#090c12';
      const frameCol = '#2f3c49';
      const frameHi = '#566372';
      const lens = 'rgba(196,208,218,.42)';
      const lensDark = 'rgba(86,102,114,.22)';
      const shine = '#f6fbff';
      const fluff = '#f5e4bf';
      const fluffDark = '#e6cd9d';
      const fluffShade = '#d2af77';
      const flash = Math.floor(frame * 0.55) % 90 < 7;

      // Silueta chibi más esponjosa sin tocar la caja de colisión.
      rect(ctx, bx + 1, by + 7, 2, 6, fluff);
      rect(ctx, bx + 13, by + 7, 2, 6, fluff);
      rect(ctx, bx, by + 9, 2, 2, fluffDark);
      rect(ctx, bx + 14, by + 9, 2, 2, fluffDark);
      rect(ctx, bx + 2, by + 13, 2, 2, fluffDark);
      rect(ctx, bx + 12, by + 13, 2, 2, fluffDark);
      rect(ctx, bx + 5, by + 14, 6, 1, '#fbf0d6');
      rect(ctx, bx + 5, by + 10, 1, 3, fluffShade);
      rect(ctx, bx + 10, by + 10, 1, 2, fluffShade);

      if (dir === 'up') {
        // Vista trasera: melena protagonista con caída pesada y puntas desordenadas.
        rect(ctx, bx + 2, hy - 6, 12, 5, hairMid);
        rect(ctx, bx + 1, hy - 2, 14, 6, hair);
        rect(ctx, bx + 3, hy - 8, 9, 3, hairMid);
        rect(ctx, bx + 5, hy - 9, 6, 2, hairMid);
        rect(ctx, bx + 2, hy + 2, 2, 3, hairLo);
        rect(ctx, bx + 4, hy + 3, 2, 3, hair);
        rect(ctx, bx + 7, hy + 3, 2, 3, hair);
        rect(ctx, bx + 10, hy + 3, 2, 3, hair);
        rect(ctx, bx + 12, hy + 2, 2, 3, hairLo);
        rect(ctx, bx + 3, hy - 5, 3, 1, hairHi);
        rect(ctx, bx + 9, hy - 4, 3, 1, hairHi);
      } else if (dir === 'left') {
        // Perfil izquierdo: flequillo pesado, patilla amplia y lente lateral.
        rect(ctx, bx + 2, hy - 6, 11, 5, hairMid);
        rect(ctx, bx + 1, hy - 2, 12, 4, hair);
        rect(ctx, bx + 1, hy + 1, 5, 5, hairLo);
        rect(ctx, bx + 4, hy + 3, 2, 3, hair);
        rect(ctx, bx + 4, hy - 5, 4, 1, hairHi);
        rect(ctx, bx + 3, hy + 1, 6, 5, frameCol);
        rect(ctx, bx + 4, hy + 2, 4, 3, lens);
        rect(ctx, bx + 5, hy + 4, 2, 1, lensDark);
        rect(ctx, bx + 1, hy + 2, 3, 1, frameCol);
        rect(ctx, bx + 3, hy + 1, 6, 1, frameHi);
        rect(ctx, bx + 5, hy + 2, 2, 1, shine);
        if (flash) rect(ctx, bx + 6, hy + 2, 1, 3, '#ffffff');
      } else if (dir === 'right') {
        // Perfil derecho, espejado manualmente para que no se suavicen los píxeles.
        rect(ctx, bx + 3, hy - 6, 11, 5, hairMid);
        rect(ctx, bx + 3, hy - 2, 12, 4, hair);
        rect(ctx, bx + 10, hy + 1, 5, 5, hairLo);
        rect(ctx, bx + 10, hy + 3, 2, 3, hair);
        rect(ctx, bx + 8, hy - 5, 4, 1, hairHi);
        rect(ctx, bx + 7, hy + 1, 6, 5, frameCol);
        rect(ctx, bx + 8, hy + 2, 4, 3, lens);
        rect(ctx, bx + 9, hy + 4, 2, 1, lensDark);
        rect(ctx, bx + 12, hy + 2, 3, 1, frameCol);
        rect(ctx, bx + 7, hy + 1, 6, 1, frameHi);
        rect(ctx, bx + 9, hy + 2, 2, 1, shine);
        if (flash) rect(ctx, bx + 9, hy + 2, 1, 3, '#ffffff');
      } else {
        // Frente: cabeza grande, melena asimétrica y lentes como rasgo dominante.
        rect(ctx, bx + 2, hy - 6, 12, 5, hairMid);
        rect(ctx, bx + 1, hy - 2, 14, 4, hair);
        rect(ctx, bx + 1, hy + 1, 4, 5, hairLo);
        rect(ctx, bx + 11, hy + 1, 4, 5, hairLo);
        rect(ctx, bx + 3, hy - 8, 4, 3, hairMid);
        rect(ctx, bx + 7, hy - 9, 5, 4, hairMid);
        rect(ctx, bx + 2, hy, 3, 3, hair);
        rect(ctx, bx + 6, hy - 1, 2, 3, hair);
        rect(ctx, bx + 11, hy - 1, 3, 3, hair);
        rect(ctx, bx + 4, hy - 5, 3, 1, hairHi);
        rect(ctx, bx + 9, hy - 6, 3, 1, hairHi);

        // Lentes rectangulares premium con armazón grueso y brillo.
        rect(ctx, bx + 2, hy + 1, 6, 5, frameCol);
        rect(ctx, bx + 8, hy + 1, 6, 5, frameCol);
        rect(ctx, bx + 3, hy + 2, 4, 3, lens);
        rect(ctx, bx + 9, hy + 2, 4, 3, lens);
        rect(ctx, bx + 7, hy + 2, 2, 1, frameCol);
        rect(ctx, bx + 1, hy + 2, 2, 1, frameCol);
        rect(ctx, bx + 14, hy + 2, 2, 1, frameCol);
        rect(ctx, bx + 2, hy + 1, 6, 1, frameHi);
        rect(ctx, bx + 8, hy + 1, 6, 1, frameHi);
        rect(ctx, bx + 4, hy + 2, 2, 1, shine);
        rect(ctx, bx + 10, hy + 2, 2, 1, shine);
        rect(ctx, bx + 4, hy + 4, 2, 1, lensDark);
        rect(ctx, bx + 10, hy + 4, 2, 1, lensDark);
        px(ctx, bx + 6, hy + 4, '#11151a');
        px(ctx, bx + 10, hy + 4, '#11151a');
        if (flash) {
          rect(ctx, bx + 5, hy + 2, 1, 3, '#ffffff');
          rect(ctx, bx + 11, hy + 2, 1, 2, '#ffffff');
        }

        // Mechones frontales sobre los lentes para dar más volumen.
        rect(ctx, bx + 5, hy - 1, 1, 5, hairLo);
        rect(ctx, bx + 8, hy - 1, 1, 6, hairLo);
      }

      // Pliegues del pecho para que combine mejor con el sheet de referencia.
      rect(ctx, bx + 6, by + 9, 3, 1, fluffDark);
      rect(ctx, bx + 5, by + 11, 1, 2, fluffShade);
      rect(ctx, bx + 10, by + 11, 1, 2, fluffShade);
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
