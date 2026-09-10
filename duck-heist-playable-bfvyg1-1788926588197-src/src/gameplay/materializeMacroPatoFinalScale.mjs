import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const RENDERER=`function drawMacroPato(
  ctx: Ctx, x:number, y:number, frame:number,
  dir:DuckDir='down', moving=false, hurt=false, dashing=false,
  shooting=false, dead=false,
){
  const bx=Math.floor(x),by=Math.floor(y);
  const bob=moving?Math.round(Math.sin(frame*.34)):0;
  const phase=moving?Math.sin(frame*.34):0;
  const cx=bx+8;
  const ink='#080b11',hair='#111722',hairMid='#202836',hairHi='#56606d';
  const cream='#f7e7c3',creamMid='#e8cf9f',creamShade='#d4af76',creamHi='#fff4d8';
  const beak='#f3a43c',beakMid='#dc8829',beakDark='#a95c18';
  const frameDark='#273542',frameMid='#40515f',glass='#b9cbd4',glassShade='#71838e',white='#ffffff';
  const footShift=phase>0?1:phase<0?-1:0;
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(hurt&&Math.floor(frame*.5)%2===0)ctx.globalAlpha=.45;
  if(dashing)ctx.globalAlpha=.78;

  // Drop shadow, deliberately larger than the old sprite so the new silhouette reads at gameplay zoom.
  rect(ctx,cx-13,by+17,26,3,'rgba(0,0,0,.30)');
  rect(ctx,cx-9,by+20,18,1,'rgba(0,0,0,.18)');

  // Feet stay on the legacy gameplay baseline: visual size changes, hitbox does not.
  rect(ctx,cx-9-footShift,by+13,7,5,ink);rect(ctx,cx-8-footShift,by+13,6,4,beak);rect(ctx,cx-10-footShift,by+17,8,2,beakDark);
  rect(ctx,cx+2+footShift,by+13,7,5,ink);rect(ctx,cx+3+footShift,by+13,6,4,beak);rect(ctx,cx+2+footShift,by+17,8,2,beakDark);
  rect(ctx,cx-7-footShift,by+13,3,1,'#ffc46b');rect(ctx,cx+4+footShift,by+13,3,1,'#ffc46b');

  if(dead){
    rect(ctx,cx-15,by+5,29,11,ink);rect(ctx,cx-13,by+6,25,9,cream);rect(ctx,cx-10,by+12,20,4,creamMid);
    rect(ctx,cx+7,by+1,10,7,hair);rect(ctx,cx+13,by+6,9,4,beak);rect(ctx,cx+15,by+9,7,2,beakDark);
    px(ctx,cx+10,by+4,ink,2);px(ctx,cx+13,by+4,ink,2);ctx.restore();return;
  }

  const bodyY=by-1+bob;
  // Chibi body: rounded, fluffy and wide, with intentional tufts on both sides.
  rect(ctx,cx-12,bodyY,24,15,ink);
  rect(ctx,cx-14,bodyY+4,4,7,ink);rect(ctx,cx+10,bodyY+4,4,7,ink);
  rect(ctx,cx-11,bodyY+1,22,12,cream);
  rect(ctx,cx-13,bodyY+5,4,5,cream);rect(ctx,cx+9,bodyY+5,4,5,cream);
  rect(ctx,cx-10,bodyY+11,5,4,creamMid);rect(ctx,cx+5,bodyY+11,5,4,creamMid);
  rect(ctx,cx-5,bodyY+12,10,3,creamMid);rect(ctx,cx-4,bodyY+12,8,1,creamHi);
  px(ctx,cx-12,bodyY+4,creamShade,2);px(ctx,cx+11,bodyY+7,creamShade,2);
  rect(ctx,cx-5,bodyY+5,3,1,creamMid);rect(ctx,cx+1,bodyY+7,4,1,creamShade);
  rect(ctx,cx-4,bodyY+8,1,3,creamShade);rect(ctx,cx+4,bodyY+9,1,2,creamShade);

  // Wings get a tiny walk swing, without moving the collision body.
  const wing=phase>0?1:0;
  if(dir==='left'){
    rect(ctx,cx+7,bodyY+5+wing,6,7,ink);rect(ctx,cx+8,bodyY+6+wing,5,5,creamMid);
  }else if(dir==='right'){
    rect(ctx,cx-13,bodyY+5+wing,6,7,ink);rect(ctx,cx-12,bodyY+6+wing,5,5,creamMid);
  }else{
    rect(ctx,cx-13,bodyY+4+wing,5,7,ink);rect(ctx,cx-12,bodyY+5+wing,4,5,creamMid);
    rect(ctx,cx+8,bodyY+4-wing,5,7,ink);rect(ctx,cx+8,bodyY+5-wing,4,5,creamMid);
  }

  const headY=by-17+bob;
  if(dir==='up'){
    // Back: oversized shaggy hair mass, one of Macro Pato's defining silhouettes.
    rect(ctx,cx-14,headY+3,28,18,ink);
    rect(ctx,cx-12,headY+2,24,18,hair);
    rect(ctx,cx-9,headY,18,5,hairMid);rect(ctx,cx-5,headY-2,11,4,hairMid);
    rect(ctx,cx-12,headY+15,4,7,hair);rect(ctx,cx-6,headY+16,4,7,hair);rect(ctx,cx,headY+16,4,7,hair);rect(ctx,cx+6,headY+15,4,7,hair);
    rect(ctx,cx-8,headY+4,6,1,hairHi);rect(ctx,cx+3,headY+6,6,1,hairHi);px(ctx,cx-10,headY+8,hairHi,2);
  }else if(dir==='left'){
    // Cream face patch under a large profile haircut.
    rect(ctx,cx-12,headY+8,22,14,ink);rect(ctx,cx-10,headY+9,19,12,cream);
    rect(ctx,cx-13,headY+2,25,13,ink);rect(ctx,cx-11,headY+1,22,13,hair);rect(ctx,cx-7,headY-1,16,5,hairMid);
    rect(ctx,cx-12,headY+12,7,9,hair);rect(ctx,cx-4,headY+10,4,7,hair);rect(ctx,cx-7,headY+4,6,1,hairHi);
    // One huge rectangular lens with a visible temple arm.
    rect(ctx,cx-10,headY+11,13,9,frameDark);rect(ctx,cx-9,headY+12,11,7,glassShade);rect(ctx,cx-8,headY+12,7,3,glass);
    rect(ctx,cx-10,headY+11,13,1,frameMid);rect(ctx,cx+2,headY+13,6,2,frameDark);px(ctx,cx-7,headY+12,white,2);
    px(ctx,cx-1,headY+16,ink,2);
    // Broad bill projects clearly from the face.
    rect(ctx,cx-18,headY+18,13,5,ink);rect(ctx,cx-17,headY+17,12,5,beak);rect(ctx,cx-18,headY+20,13,3,beakMid);rect(ctx,cx-16,headY+22,10,2,beakDark);
  }else if(dir==='right'){
    rect(ctx,cx-10,headY+8,22,14,ink);rect(ctx,cx-9,headY+9,19,12,cream);
    rect(ctx,cx-12,headY+2,25,13,ink);rect(ctx,cx-11,headY+1,22,13,hair);rect(ctx,cx-9,headY-1,16,5,hairMid);
    rect(ctx,cx+5,headY+12,7,9,hair);rect(ctx,cx,headY+10,4,7,hair);rect(ctx,cx+1,headY+4,6,1,hairHi);
    rect(ctx,cx-3,headY+11,13,9,frameDark);rect(ctx,cx-2,headY+12,11,7,glassShade);rect(ctx,cx+1,headY+12,7,3,glass);
    rect(ctx,cx-3,headY+11,13,1,frameMid);rect(ctx,cx-8,headY+13,6,2,frameDark);px(ctx,cx+5,headY+12,white,2);
    px(ctx,cx-1,headY+16,ink,2);
    rect(ctx,cx+5,headY+18,13,5,ink);rect(ctx,cx+5,headY+17,12,5,beak);rect(ctx,cx+5,headY+20,13,3,beakMid);rect(ctx,cx+6,headY+22,10,2,beakDark);
  }else{
    // Front face: cream cheeks, enormous glasses, thick fringe and a wide duck bill.
    rect(ctx,cx-12,headY+7,24,16,ink);rect(ctx,cx-10,headY+8,20,14,cream);
    rect(ctx,cx-15,headY+2,30,14,ink);rect(ctx,cx-13,headY+1,26,14,hair);
    rect(ctx,cx-10,headY-1,9,5,hairMid);rect(ctx,cx-2,headY-3,13,7,hairMid);rect(ctx,cx+9,headY+4,5,9,hair);
    rect(ctx,cx-14,headY+10,5,10,hair);rect(ctx,cx-8,headY+8,4,7,hair);rect(ctx,cx-1,headY+7,3,8,hair);rect(ctx,cx+7,headY+8,4,7,hair);
    rect(ctx,cx-9,headY+3,6,1,hairHi);rect(ctx,cx+2,headY+2,7,1,hairHi);px(ctx,cx+10,headY+6,hairHi,2);

    // Glasses are intentionally the dominant facial feature.
    rect(ctx,cx-12,headY+12,11,9,frameDark);rect(ctx,cx+1,headY+12,11,9,frameDark);rect(ctx,cx-2,headY+14,4,2,frameDark);
    rect(ctx,cx-11,headY+13,9,7,glassShade);rect(ctx,cx+2,headY+13,9,7,glassShade);
    rect(ctx,cx-10,headY+13,6,3,glass);rect(ctx,cx+3,headY+13,6,3,glass);
    rect(ctx,cx-12,headY+12,11,1,frameMid);rect(ctx,cx+1,headY+12,11,1,frameMid);
    rect(ctx,cx-15,headY+14,4,2,frameDark);rect(ctx,cx+11,headY+14,4,2,frameDark);
    px(ctx,cx-8,headY+13,white,2);px(ctx,cx+4,headY+13,white,2);
    px(ctx,cx-4,headY+17,ink,2);px(ctx,cx+5,headY+17,ink,2);

    // Fringe overlaps the glasses just like the approved concept.
    rect(ctx,cx-7,headY+7,2,7,ink);rect(ctx,cx-2,headY+6,2,9,ink);rect(ctx,cx+5,headY+7,2,7,ink);

    // Big expressive bill, wider than the old character's beak.
    rect(ctx,cx-8,headY+20,16,6,ink);rect(ctx,cx-7,headY+19,14,5,beak);rect(ctx,cx-9,headY+21,18,4,beakMid);rect(ctx,cx-7,headY+24,14,3,beakDark);
    rect(ctx,cx-5,headY+20,10,1,'#ffc46b');px(ctx,cx-4,headY+22,'#8b4e15',1);px(ctx,cx+4,headY+22,'#8b4e15',1);
  }

  if(shooting){
    const mx=dir==='left'?cx-22:dir==='right'?cx+22:cx;
    const my=dir==='up'?headY-2:dir==='down'?by+21:by+4;
    rect(ctx,mx-4,my-4,8,8,'#fff6d8');rect(ctx,mx-2,my-2,4,4,'#f4d03f');px(ctx,mx,my,'#ffffff',1);
  }
  if(dashing){ctx.globalAlpha=.18;rect(ctx,cx-18,headY-2,36,36,'#fff2cf');}
  ctx.restore();
}

`;

export function applyDuckMacroPatoFinalScale(gameDir){
  const file=path.join(gameDir,'game','sprites.ts');
  let src=readFileSync(file,'utf8');
  const start=src.indexOf('function drawMacroPato(');
  const end=src.indexOf('export function drawDuckSkin(',start);
  if(start<0||end<0)throw new Error('Macro Pato final-scale patch: renderer anchors not found');
  src=src.slice(0,start)+RENDERER+src.slice(end);
  writeFileSync(file,src);
}
