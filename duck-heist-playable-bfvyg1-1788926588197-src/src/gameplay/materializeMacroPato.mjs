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

const MACRO_RENDERER=`function drawMacroPato(
  ctx: Ctx, x:number, y:number, frame:number,
  dir:DuckDir='down', moving=false, hurt=false, dashing=false,
  shooting=false, dead=false,
){
  const bx=Math.floor(x),by=Math.floor(y);
  const bob=moving?Math.round(Math.sin(frame*.35)):0;
  const step=moving?Math.sin(frame*.35):0;
  const X=bx-4,Y=by-9+bob;
  const ink='#090c12',hair='#141923',hair2='#202734',hairHi='#4a535f';
  const cream='#f5e4bf',cream2='#e6cd9d',cream3='#d2af77',light='#fff2d2';
  const beak='#f2a33b',beak2='#c97a23';
  const glass='#b9ccd6',glassDark='#6c7d88',frameCol='#2f3c49',frameHi='#64717f';
  ctx.save();
  if(hurt&&Math.floor(frame*.5)%2===0)ctx.globalAlpha=.48;
  if(dashing)ctx.globalAlpha=.78;

  // Shadow and feet stay anchored to the original player footprint/hitbox.
  ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(bx-3,by+16,22,3);ctx.fillRect(bx,by+19,16,1);
  const foot=step>0?1:step<0?-1:0;
  rect(ctx,bx+1-foot,by+14,6,4,beak);rect(ctx,bx,by+17,7,2,beak2);
  rect(ctx,bx+9+foot,by+14,6,4,beak);rect(ctx,bx+9,by+17,7,2,beak2);

  if(dead){
    rect(ctx,bx-3,by+6,22,9,cream);rect(ctx,bx-1,by+11,18,5,cream2);
    rect(ctx,bx+8,by+3,8,6,hair);rect(ctx,bx+15,by+7,6,3,beak);
    rect(ctx,bx+10,by+5,2,2,ink);rect(ctx,bx+13,by+5,2,2,ink);
    ctx.restore();return;
  }

  // Fluffy chibi body: visibly wider/taller than the legacy duck, but collision is untouched.
  rect(ctx,X+3,Y+14,18,11,ink);
  rect(ctx,X+2,Y+16,20,7,cream3);
  rect(ctx,X+3,Y+14,18,9,cream);
  rect(ctx,X+1,Y+17,4,5,cream);rect(ctx,X+20,Y+17,4,5,cream);
  rect(ctx,X+3,Y+21,3,3,cream2);rect(ctx,X+18,Y+21,3,3,cream2);
  rect(ctx,X+7,Y+22,10,3,cream2);rect(ctx,X+8,Y+22,8,1,light);
  rect(ctx,X+7,Y+17,3,1,cream2);rect(ctx,X+13,Y+19,3,1,cream3);

  if(dir==='up'){
    // Back view: large rounded hair mass and visible cream body below it.
    rect(ctx,X+3,Y+3,18,12,ink);rect(ctx,X+2,Y+6,20,8,hair);
    rect(ctx,X+5,Y+1,14,4,hair2);rect(ctx,X+8,Y,8,3,hair2);
    rect(ctx,X+3,Y+12,3,5,ink);rect(ctx,X+8,Y+13,3,5,hair);rect(ctx,X+14,Y+13,3,5,hair);rect(ctx,X+19,Y+12,3,5,ink);
    rect(ctx,X+6,Y+4,5,1,hairHi);rect(ctx,X+15,Y+6,4,1,hairHi);
  }else if(dir==='left'){
    rect(ctx,X+4,Y+3,17,11,ink);rect(ctx,X+3,Y+5,17,8,hair);rect(ctx,X+6,Y+1,12,4,hair2);
    rect(ctx,X+3,Y+12,5,5,ink);rect(ctx,X+7,Y+3,5,1,hairHi);
    // one oversized rectangular lens in profile
    rect(ctx,X+5,Y+10,10,7,frameCol);rect(ctx,X+6,Y+11,8,5,glassDark);rect(ctx,X+7,Y+11,5,2,glass);
    rect(ctx,X+5,Y+10,10,1,frameHi);rect(ctx,X+3,Y+12,3,1,frameCol);
    rect(ctx,X-1,Y+14,8,4,beak);rect(ctx,X-1,Y+17,7,2,beak2);
    px(ctx,X+11,Y+14,ink,2);
  }else if(dir==='right'){
    rect(ctx,X+3,Y+3,17,11,ink);rect(ctx,X+4,Y+5,17,8,hair);rect(ctx,X+6,Y+1,12,4,hair2);
    rect(ctx,X+18,Y+12,5,5,ink);rect(ctx,X+12,Y+3,5,1,hairHi);
    rect(ctx,X+10,Y+10,10,7,frameCol);rect(ctx,X+11,Y+11,8,5,glassDark);rect(ctx,X+13,Y+11,5,2,glass);
    rect(ctx,X+10,Y+10,10,1,frameHi);rect(ctx,X+19,Y+12,3,1,frameCol);
    rect(ctx,X+18,Y+14,8,4,beak);rect(ctx,X+19,Y+17,7,2,beak2);
    px(ctx,X+12,Y+14,ink,2);
  }else{
    // Front view: the golden sample from the approved concept art.
    rect(ctx,X+3,Y+3,18,12,ink);rect(ctx,X+2,Y+6,20,8,hair);
    rect(ctx,X+5,Y+1,6,4,hair2);rect(ctx,X+10,Y,9,5,hair2);
    rect(ctx,X+2,Y+11,4,6,ink);rect(ctx,X+18,Y+11,4,6,ink);
    rect(ctx,X+6,Y+4,4,1,hairHi);rect(ctx,X+15,Y+3,4,1,hairHi);
    // oversized glasses
    rect(ctx,X+4,Y+10,8,7,frameCol);rect(ctx,X+13,Y+10,8,7,frameCol);rect(ctx,X+11,Y+12,3,2,frameCol);
    rect(ctx,X+5,Y+11,6,5,glassDark);rect(ctx,X+14,Y+11,6,5,glassDark);
    rect(ctx,X+6,Y+11,4,2,glass);rect(ctx,X+15,Y+11,4,2,glass);
    rect(ctx,X+4,Y+10,8,1,frameHi);rect(ctx,X+13,Y+10,8,1,frameHi);
    rect(ctx,X+2,Y+12,3,1,frameCol);rect(ctx,X+20,Y+12,3,1,frameCol);
    px(ctx,X+9,Y+14,ink,2);px(ctx,X+15,Y+14,ink,2);
    px(ctx,X+6,Y+11,'#ffffff',1);px(ctx,X+15,Y+11,'#ffffff',1);
    // heavy fringe crossing the top of the glasses
    rect(ctx,X+8,Y+7,2,5,ink);rect(ctx,X+12,Y+6,2,6,ink);rect(ctx,X+17,Y+7,2,4,ink);
    // broad duck bill
    rect(ctx,X+8,Y+16,9,4,beak);rect(ctx,X+6,Y+17,13,3,beak);rect(ctx,X+8,Y+20,9,2,beak2);
    px(ctx,X+10,Y+17,'#8d541b',1);px(ctx,X+15,Y+17,'#8d541b',1);
  }

  if(shooting){
    const mx=dir==='left'?bx-8:dir==='right'?bx+23:bx+8;
    const my=dir==='up'?by-10:dir==='down'?by+20:by+6;
    rect(ctx,mx-3,my-3,6,6,'#fff4cf');rect(ctx,mx-1,my-1,2,2,'#f4d03f');
  }
  if(dashing){ctx.globalAlpha=.22;rect(ctx,bx-5,by-4,26,20,'#fff4d6');}
  ctx.restore();
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
  if(!s.includes('function drawMacroPato(')){
    s=once(s,'export function drawDuckSkin(',MACRO_RENDERER+'export function drawDuckSkin(','macro renderer');
  }
  s=once(
    s,
    "  const pal: DuckPaletteLike = skin?.palette ?? DEFAULT_DUCK;\n  drawDuck(ctx, x, y, frame, dir, moving, hurt, dashing, shooting, dead, pal);",
    "  const pal: DuckPaletteLike = skin?.palette ?? DEFAULT_DUCK;\n  if(skin?.overlay==='macro_pato'){drawMacroPato(ctx,x,y,frame,dir,moving,hurt,dashing,shooting,dead);return;}\n  drawDuck(ctx, x, y, frame, dir, moving, hurt, dashing, shooting, dead, pal);",
    'standalone Macro Pato render path'
  );
  writeFileSync(sprites,s);

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
