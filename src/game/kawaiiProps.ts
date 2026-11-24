// Objetos destructibles kawaii (datos de tools/props_gen.py). Cada piso tiñe
// los objetos con su color principal y su acento; los daños se dibujan como
// grietas sólo sobre el objeto (no sobre el piso).
import {
  KAWAII_PROP_CHARS, KAWAII_PROP_FAMILIES, KAWAII_PROP_LUXURY, KAWAII_PROP_LUXURY_KEYS, KAWAII_PROP_PALETTE,
} from './kawaiiPropData';

const INK='#25203a';
const TIERS:[string,string][]=[
  ['#b9c4e0','#ffd45e'],['#e3bf9c','#f0c27a'],['#b98a62','#ffd45e'],
  ['#efe3d4','#ffd45e'],['#5b5288','#ffd45e'],['#3a4a7a','#8ff0e6'],
];
function hexToRgb(hx:string){const s=hx.replace('#','');return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];}
function mix(a:string,b:string,t:number){const A=hexToRgb(a),B=hexToRgb(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function ramp(base:string){return [mix(base,'#fff6e8',.45),base,mix(base,'#3a3470',.3),mix(base,'#25203a',.52)];}

const cache=new Map<string,HTMLCanvasElement|null>();
function spriteRows(kind:number){
  const tier=Math.max(0,Math.min(5,Math.floor(kind/20))),family=((kind%20)+20)%20;
  const lux=KAWAII_PROP_LUXURY_KEYS[tier*20+family];
  return {tier,family,rows:lux?KAWAII_PROP_LUXURY[lux]:KAWAII_PROP_FAMILIES[family],key:lux??`f${family}`};
}
function crack(c:CanvasRenderingContext2D,stage:number,seed:number){
  c.globalCompositeOperation='source-atop';
  c.fillStyle=INK;
  const lines=stage>=2?3:1;
  for(let l=0;l<lines;l++){
    let x=9+((seed*7+l*11)%14),y=8+((seed*5+l*9)%10);
    for(let i=0;i<9;i++){c.fillRect(x,y,1,1);x+=((seed+i+l)%3)-1;y+=1;if(i%3===2)c.fillRect(x+1,y,1,1);}
  }
  if(stage>=2){c.globalAlpha=.28;c.fillRect(0,0,32,32);c.globalAlpha=1;}
  c.globalCompositeOperation='source-over';
}
function canvasFor(kind:number,stage:number){
  const {tier,rows,key}=spriteRows(kind);
  const ck=`${key}|${tier}|${stage}`;
  if(cache.has(ck))return cache.get(ck)??null;
  let cv:HTMLCanvasElement|null=null;
  try{
    cv=document.createElement('canvas');cv.width=cv.height=32;
    const c=cv.getContext('2d');if(!c)throw new Error('2d');
    const m=ramp(TIERS[tier][0]),a=ramp(TIERS[tier][1]);
    rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){
      const ch=row[x];if(ch==='.')continue;
      const k='ABCDEFGH'.indexOf(ch);
      c.fillStyle=k>=0?(k<4?m[k]:a[k-4]):KAWAII_PROP_PALETTE[KAWAII_PROP_CHARS.indexOf(ch)];
      c.fillRect(x,y,1,1);
    }});
    if(stage>0)crack(c,stage,kind);
  }catch{cv=null;}
  cache.set(ck,cv);return cv;
}

/** Dibuja un objeto destructible en su baldosa. Devuelve false si no hay arte. */
export function drawKawaiiObstacle(ctx:CanvasRenderingContext2D,x:number,y:number,kind:number,frame:number,integrity=1){
  const stage=integrity<.38?2:integrity<.7?1:0;
  const cv=canvasFor(kind,stage);
  if(!cv)return false;
  const {family,key}=spriteRows(kind);
  const bx=Math.floor(x),by=Math.floor(y);
  ctx.save();
  ctx.globalAlpha*=.24;ctx.fillStyle='#0b0f1a';ctx.beginPath();ctx.ellipse(bx+16,by+30,13,2.6,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  const prev=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(cv,bx,by);
  ctx.imageSmoothingEnabled=prev;
  // Pequeños detalles vivos.
  if(stage<2){
    if(key==='f7'&&Math.floor(frame/18)%2===0){ctx.save();ctx.globalAlpha*=.35;ctx.fillStyle='#ff6b7f';ctx.beginPath();ctx.arc(bx+16,by+7,7,0,Math.PI*2);ctx.fill();ctx.restore();}
    if(key==='f19'){const k=Math.floor(frame/9+kind)%5;ctx.fillStyle='#ffffff';ctx.fillRect(bx+9,by+4+k*5,2,2);}
    if(key==='f0'&&Math.floor(frame/30+kind)%4===0){ctx.fillStyle='#dcfff4';ctx.fillRect(bx+9,by+13,6,1);}
    if(key==='fountain'){ctx.fillStyle='#ffffff';const t=frame%24;ctx.fillRect(bx+16-Math.round(t/5),by+8+Math.round(t/3),1,1);ctx.fillRect(bx+16+Math.round(t/5),by+8+Math.round(t/3),1,1);}
  }
  if(stage===2&&(frame+kind*7)%40<20){ctx.save();ctx.globalAlpha*=.3;ctx.fillStyle='#9a94b8';ctx.fillRect(bx+14+((frame>>3)%3),by+4-((frame>>2)%6),3,3);ctx.restore();}
  void family;
  return true;
}
