import {
  KAWAII_DUCK_DEFAULT, KAWAII_DUCK_EYES, KAWAII_DUCK_FRAMES, KAWAII_DUCK_SIZE, KAWAII_DUCK_SLOTS,
  type KawaiiDuckPose, type KawaiiDuckSlot,
} from './kawaiiDuckData';

export type { KawaiiDuckPose } from './kawaiiDuckData';
export type KawaiiDuckColors=Record<KawaiiDuckSlot,string>;
export type KawaiiFace='open'|'blink'|'hurt'|'dizzy';

const INK='#20172b';
const LETTERS='abcdefghijklmnopqrstuvwxyz';
const cache=new Map<string,HTMLCanvasElement|null>();

function isDark(hex:string){
  const h=hex.replace('#','');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (r*.299+g*.587+b*.114)/255<.36;
}
function paletteKey(colors:KawaiiDuckColors){return KAWAII_DUCK_SLOTS.map(s=>colors[s]).join('');}

/** Convierte un frame (letras = ranuras de color) en un canvas pequeño reutilizable. */
function frameCanvas(pose:KawaiiDuckPose,index:number,colors:KawaiiDuckColors){
  const key=`${pose}|${index}|${paletteKey(colors)}`;
  if(cache.has(key))return cache.get(key)??null;
  let canvas:HTMLCanvasElement|null=null;
  try{
    canvas=document.createElement('canvas');
    canvas.width=canvas.height=KAWAII_DUCK_SIZE;
    const c=canvas.getContext('2d');
    if(!c)throw new Error('sin contexto 2d');
    const rows=KAWAII_DUCK_FRAMES[pose][index];
    for(let y=0;y<rows.length;y++){
      const row=rows[y];
      for(let x=0;x<row.length;x++){
        const ch=row[x];
        if(ch==='.')continue;
        c.fillStyle=colors[KAWAII_DUCK_SLOTS[LETTERS.indexOf(ch)]];
        c.fillRect(x,y,1,1);
      }
    }
  }catch{canvas=null;}
  if(cache.size>600)cache.clear();
  cache.set(key,canvas);
  return canvas;
}

function drawEye(ctx:CanvasRenderingContext2D,x:number,y:number,side:'L'|'R',face:KawaiiFace){
  ctx.fillStyle=INK;
  switch(face){
    case 'blink':
      ctx.fillRect(x,y+2,2,1);
      break;
    case 'hurt':
      // ">" para el ojo izquierdo y "<" para el derecho.
      if(side==='L'){ctx.fillRect(x,y,1,1);ctx.fillRect(x+1,y+1,1,1);ctx.fillRect(x,y+2,1,1);}
      else{ctx.fillRect(x+1,y,1,1);ctx.fillRect(x,y+1,1,1);ctx.fillRect(x+1,y+2,1,1);}
      break;
    case 'dizzy':
      ctx.fillRect(x-.5,y,1,1);ctx.fillRect(x+1.5,y,1,1);ctx.fillRect(x+.5,y+1,1,1);
      ctx.fillRect(x-.5,y+2,1,1);ctx.fillRect(x+1.5,y+2,1,1);
      break;
    default:
      ctx.fillRect(x,y,2,3);
      ctx.fillStyle='#ffffff';ctx.fillRect(x,y,1,1);
      ctx.globalAlpha*=.75;ctx.fillRect(x+1,y+2,.5,.5);
  }
}

export interface KawaiiDuckDrawOptions{
  moving?:boolean;
  face?:KawaiiFace;
  colors?:KawaiiDuckColors;
}

/**
 * Dibuja al pato con su esquina superior izquierda en (x, y), en píxeles lógicos (30x30).
 * El ciclo de caminata va al mismo ritmo que el resto del juego (frame * 0.38).
 */
export function drawKawaiiDuck(ctx:CanvasRenderingContext2D,x:number,y:number,frame:number,pose:KawaiiDuckPose,opts:KawaiiDuckDrawOptions={}){
  const colors=opts.colors??KAWAII_DUCK_DEFAULT;
  const step=opts.moving?1+(((Math.floor(frame*.38/(Math.PI/2))%4)+4)%4):0;
  const canvas=frameCanvas(pose,step,colors);
  if(!canvas)return;
  ctx.save();
  const smooth=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(canvas,x,y,KAWAII_DUCK_SIZE,KAWAII_DUCK_SIZE);
  ctx.imageSmoothingEnabled=smooth;
  ctx.translate(x,y);
  // En plumajes oscuros (ninja, gánster) los ojos llevan un borde claro para leerse.
  const rim=isDark(colors.Y1)&&opts.face!=='dizzy';
  for(const [ex,ey,side] of KAWAII_DUCK_EYES[pose][step]){
    ctx.save();
    if(rim){ctx.globalAlpha*=.85;ctx.fillStyle='#efe9ff';ctx.fillRect(ex-.5,ey-.5,3,4);ctx.globalAlpha/=.85;}
    drawEye(ctx,ex,ey,side,opts.face??'open');
    ctx.restore();
  }
  ctx.restore();
}

export { KAWAII_DUCK_DEFAULT, KAWAII_DUCK_SIZE };
