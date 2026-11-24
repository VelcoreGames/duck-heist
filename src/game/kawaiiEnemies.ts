// Enemigos kawaii (mismo estilo que el Pollito ladrón). Los sprites vienen de
// tools/enemigos_gen.py; aquí se convierten en canvas reutilizables y se les
// dibujan los ojos según el estado: enojados, parpadeo, daño o mareo.
import {
  KAWAII_ENEMIES, KAWAII_ENEMY_CHARS, KAWAII_ENEMY_GROUND, KAWAII_ENEMY_PALETTE, KAWAII_ENEMY_SIZE,
} from './kawaiiEnemyData';

const INK='#20172b';
const cache=new Map<string,{img:HTMLCanvasElement;flash:HTMLCanvasElement;top:number}|null>();

export function hasKawaiiEnemy(type:string){return !!KAWAII_ENEMIES[type];}

function frameCanvas(type:string,index:number){
  const key=`${type}|${index}`;
  if(cache.has(key))return cache.get(key)??null;
  let out:{img:HTMLCanvasElement;flash:HTMLCanvasElement;top:number}|null=null;
  try{
    const rows=KAWAII_ENEMIES[type].frames[index];
    const mk=()=>{const c=document.createElement('canvas');c.width=c.height=KAWAII_ENEMY_SIZE;return c;};
    const img=mk(),flash=mk();
    const a=img.getContext('2d'),b=flash.getContext('2d');
    if(!a||!b)throw new Error('sin contexto 2d');
    let top=KAWAII_ENEMY_SIZE;
    rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){
      const ch=row[x];if(ch==='.')continue;
      a.fillStyle=KAWAII_ENEMY_PALETTE[KAWAII_ENEMY_CHARS.indexOf(ch)];a.fillRect(x,y,1,1);
      b.fillStyle='#fff6f8';b.fillRect(x,y,1,1);
      if(y<top)top=y;
    }});
    out={img,flash,top};
  }catch{out=null;}
  cache.set(key,out);
  return out;
}

export type KawaiiEnemyOpts={
  moving?:boolean; dead?:boolean; telegraph?:number;
  shield?:{x:number;y:number}; charging?:boolean; seed?:number;
};

function px(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,c:string){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}

function drawEyes(ctx:CanvasRenderingContext2D,type:string,eyes:[number,number][],f:number,hurt:boolean,dead:boolean,seed:number){
  const style=KAWAII_ENEMIES[type].style;
  if(style==='none')return;
  const blink=!hurt&&!dead&&((f+seed*37)%210)<7;
  eyes.forEach(([x,y],i)=>{
    const left=i===0;
    if(dead){ // ojos en "x"
      px(ctx,x-.5,y,1,1,INK);px(ctx,x+1.5,y,1,1,INK);px(ctx,x+.5,y+1,1,1,INK);px(ctx,x-.5,y+2,1,1,INK);px(ctx,x+1.5,y+2,1,1,INK);
      return;
    }
    if(style==='led'){
      const c=hurt?'#fff0a3':'#ff5a72';
      if(blink){px(ctx,x,y+1,2,1,c);return;}
      // LED enojado: escalón inclinado hacia el centro.
      if(left){px(ctx,x,y,1,1,c);px(ctx,x+1,y+1,1,1,c);px(ctx,x,y+1,1,1,c);}
      else{px(ctx,x+1,y,1,1,c);px(ctx,x,y+1,1,1,c);px(ctx,x+1,y+1,1,1,c);}
      ctx.globalAlpha*=.35;px(ctx,x-.5,y-.5,3,3,c);ctx.globalAlpha/=.35;
      return;
    }
    if(style==='shades'){
      if(hurt){px(ctx,x,y-1,1,1,'#fff');} // destello en los lentes
      else if(((f+seed*13)%120)<10)px(ctx,x+((f%10)>>2),y-1,1,1,'#ffffff');
      return;
    }
    if(hurt){ // ">" y "<"
      if(left){px(ctx,x,y-1,1,1,INK);px(ctx,x+1,y,1,1,INK);px(ctx,x,y+1,1,1,INK);}
      else{px(ctx,x+1,y-1,1,1,INK);px(ctx,x,y,1,1,INK);px(ctx,x+1,y+1,1,1,INK);}
      return;
    }
    if(blink){px(ctx,x,y+1,2,1,INK);}
    else{px(ctx,x,y,2,2,INK);px(ctx,x,y,1,1,'#ffffff');}
    if(style==='angry'){ // ceja inclinada hacia el pico
      if(left){px(ctx,x-1,y-2,1,1,INK);px(ctx,x,y-2,1,1,INK);px(ctx,x+1,y-1,1,1,INK);}
      else{px(ctx,x+1,y-2,1,1,INK);px(ctx,x+2,y-2,1,1,INK);px(ctx,x,y-1,1,1,INK);}
    }else if(style==='friendly'&&!blink){
      px(ctx,x-1,y+2,1,1,'rgba(255,140,170,.75)');
    }
  });
}

/** Dibuja un enemigo kawaii con la base de su caja (x,y,size) como apoyo. */
export function drawKawaiiEnemy(ctx:CanvasRenderingContext2D,type:string,x:number,y:number,size:number,f:number,
  hurt:boolean,dirX:number,opts:KawaiiEnemyOpts={}){
  const def=KAWAII_ENEMIES[type];
  if(!def)return false;
  const seed=opts.seed??0;
  const step=opts.dead?0:opts.moving?Math.floor((f+seed*7)*.2)%4:(Math.floor((f+seed*11)*.045)%2);
  const fr=frameCanvas(type,step);
  if(!fr)return false;
  const ax=x+size/2,ay=y+size+1;
  const shield=opts.shield;
  const shieldBehind=shield&&shield.y<-.3;
  if(shield&&shieldBehind)drawRiotShield(ctx,ax,ay-size*.55,shield,f);
  ctx.save();
  ctx.translate(Math.round(ax),Math.round(ay));
  if(dirX<0)ctx.scale(-1,1);
  ctx.translate(-16,-KAWAII_ENEMY_GROUND);
  const prev=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(fr.img,0,0);
  drawEyes(ctx,type,def.eyes[step],f,hurt,!!opts.dead,seed);
  if(hurt&&!opts.dead&&Math.floor(f*.5)%2===0){
    const a=ctx.globalAlpha;ctx.globalAlpha=a*.7;ctx.drawImage(fr.flash,0,0);ctx.globalAlpha=a;
  }
  ctx.imageSmoothingEnabled=prev;
  ctx.restore();
  const topY=Math.round(ay)-(KAWAII_ENEMY_GROUND-fr.top);
  // Aviso de ataque: burbuja con "!" sobre la cabeza.
  const tele=opts.telegraph??0;
  if(tele>.3&&!opts.dead){
    const bx=Math.round(ax),by=topY-9-Math.round(Math.sin(f*.4));
    ctx.save();
    px(ctx,bx-2,by,5,7,'#fff7fb');px(ctx,bx-3,by+1,7,5,'#fff7fb');
    px(ctx,bx,by+1,1,3,'#ff4f6d');px(ctx,bx,by+5,1,1,'#ff4f6d');
    ctx.restore();
  }
  if(opts.charging&&!opts.dead){
    ctx.save();ctx.globalAlpha*=.6;
    for(let i=0;i<3;i++)px(ctx,ax-dirX*(10+((f+i*5)%9)),topY+8+i*4,5,1,'#fff7fb');
    ctx.restore();
  }
  if(shield&&!shieldBehind)drawRiotShield(ctx,ax,ay-size*.55,shield,f);
  return true;
}

function drawRiotShield(ctx:CanvasRenderingContext2D,cx:number,cy:number,dir:{x:number;y:number},f:number){
  const a=Math.atan2(dir.y,dir.x);
  ctx.save();
  ctx.translate(cx+dir.x*9,cy+dir.y*8);
  ctx.rotate(a);
  px(ctx,-2,-8,4,16,'#25203a');
  px(ctx,-1,-7,2,14,'#bdeaf7');
  ctx.globalAlpha*=.9;px(ctx,-1,-7,1,14,'#e8fbff');
  px(ctx,0,-2,1,4,'#ffd45e');
  ctx.globalAlpha*=.5+.5*Math.sin(f*.12);px(ctx,-1,-6,1,3,'#ffffff');
  ctx.restore();
}
