import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const MARKER='DUCK_BASE_PNG_FRAMES_V5';
const ASSET_NAME='base-duck-final-atlas.png';

const RENDERER=`// ${MARKER}\nconst BASE_DUCK_V5_ATLAS_SRC=new URL('../assets-v2/${ASSET_NAME}',import.meta.url).href;\nconst BASE_DUCK_V5_FRAME_W=52;\nconst BASE_DUCK_V5_FRAME_H=52;\nconst BASE_DUCK_V5_COLS=20;\nconst BASE_DUCK_V5_ROWS=4;\nconst BASE_DUCK_V5_STATE_START:Record<BaseDuckAnimState,number>={idle:0,walk:4,shoot:10,pickup:14};\nconst BASE_DUCK_V5_STATE_COUNT:Record<BaseDuckAnimState,number>={idle:4,walk:6,shoot:4,pickup:6};\nconst BASE_DUCK_V5_ROW:Record<DuckDir,number>={down:0,left:1,right:2,up:3};\nfunction baseDuckV5Index(state:BaseDuckAnimState,frame:number,pickupTimer:number,pickupMax:number){\n  if(state==='idle')return Math.floor(frame/12)%BASE_DUCK_V5_STATE_COUNT.idle;\n  if(state==='walk')return Math.floor(frame/4)%BASE_DUCK_V5_STATE_COUNT.walk;\n  if(state==='shoot')return Math.floor(frame/2)%BASE_DUCK_V5_STATE_COUNT.shoot;\n  const max=Math.max(1,pickupMax||32),elapsed=Math.max(0,max-pickupTimer);\n  return Math.min(BASE_DUCK_V5_STATE_COUNT.pickup-1,Math.floor((elapsed/max)*BASE_DUCK_V5_STATE_COUNT.pickup));\n}\nfunction drawBaseDuckV5Frame(ctx:Ctx,img:HTMLImageElement,x:number,y:number,dir:DuckDir,state:BaseDuckAnimState,index:number,alpha:number,dead:boolean){\n  const bx=Math.floor(x),by=Math.floor(y),cx=bx+8,footY=by+20;\n  const sx=(BASE_DUCK_V5_STATE_START[state]+index)*BASE_DUCK_V5_FRAME_W;\n  const sy=BASE_DUCK_V5_ROW[dir]*BASE_DUCK_V5_FRAME_H;\n  const rw=46,rh=46;\n  const dx=Math.round(cx-rw/2);\n  const dy=Math.round(footY-(47/52)*rh);\n  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;\n  if(dead){ctx.translate(cx,by+10);ctx.rotate(Math.PI/2);ctx.translate(-cx,-(by+10));}\n  ctx.drawImage(img,sx,sy,BASE_DUCK_V5_FRAME_W,BASE_DUCK_V5_FRAME_H,dx,dy,rw,rh);\n  ctx.restore();\n}\nfunction drawBaseDuckV2(ctx:Ctx,x:number,y:number,frame:number,dir:DuckDir='down',moving=false,hurt=false,dashing=false,shooting=false,dead=false,pickupTimer=0,pickupMax=0,pickupItem:string|null=null){\n  const img=getV2Image(BASE_DUCK_V5_ATLAS_SRC);\n  if(!img||!img.complete||img.naturalWidth<BASE_DUCK_V5_FRAME_W*BASE_DUCK_V5_COLS||img.naturalHeight<BASE_DUCK_V5_FRAME_H*BASE_DUCK_V5_ROWS)return true;\n  const state=baseDuckAnimState(moving,shooting,pickupTimer);\n  const index=baseDuckV5Index(state,frame,pickupTimer,pickupMax);\n  const alpha=hurt&&Math.floor(frame*.5)%2===0?.48:dashing?.82:1;\n  const bx=Math.floor(x),by=Math.floor(y),cx=bx+8;\n  if(!dead){ctx.save();ctx.globalAlpha=state==='walk'?.15:.12;ctx.fillStyle='#080b10';ctx.beginPath();ctx.ellipse(cx,by+19,state==='walk'?5.4:4.8,1.5,0,0,Math.PI*2);ctx.fill();ctx.restore();}\n  drawBaseDuckV5Frame(ctx,img,x,y,dir,state,index,alpha,dead);\n  if(dashing){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#fff1cf';ctx.beginPath();ctx.ellipse(cx,by+18,12,4,0,0,Math.PI*2);ctx.fill();ctx.restore();}\n  return true;\n}\n`;

export function applyDuckBaseSpriteSheetV4(gameDir){
  const sourceAsset=path.resolve(process.cwd(),'public','assets-v2',ASSET_NAME);
  if(!existsSync(sourceAsset))throw new Error('Base duck V5 PNG atlas missing.');
  const targetDir=path.join(gameDir,'assets-v2');
  mkdirSync(targetDir,{recursive:true});
  copyFileSync(sourceAsset,path.join(targetDir,ASSET_NAME));

  const spritesFile=path.join(gameDir,'game','sprites.ts');
  let sprites=readFileSync(spritesFile,'utf8');
  const start=sprites.indexOf('function drawBaseDuckV2(');
  const end=sprites.indexOf('\n\nexport function drawDuckSkin(',start);
  if(start<0||end<0)throw new Error('Base duck V5: renderer block not found');
  sprites=sprites.slice(0,start)+RENDERER+sprites.slice(end);
  writeFileSync(spritesFile,sprites,'utf8');

  const renderFile=path.join(gameDir,'game','render.ts');
  let render=readFileSync(renderFile,'utf8');
  if(!render.includes(MARKER)){
    const heldDecl='const heldAim=aimVector(engine),heldBehind=heldAim.y<-.2;';
    const legacyDecl="const heldAim=aimVector(engine),heldBehind=heldAim.y<-.2,hideHeldForBaseV4=engine.equippedSkin==='robber'&&(p.shootFlash>0||p.pickupAnimTimer>0); /* DUCK_BASE_SPRITESHEET_V4 */";
    const nextDecl=`const heldAim=aimVector(engine),heldBehind=heldAim.y<-.2,hideHeldForBaseV5=engine.equippedSkin==='robber'&&(p.shootFlash>0||p.pickupAnimTimer>0); /* ${MARKER} */`;
    if(render.includes(legacyDecl))render=render.replace(legacyDecl,nextDecl);
    else if(render.includes(heldDecl))render=render.replace(heldDecl,nextDecl);
    else throw new Error('Base duck V5: held weapon declaration not found');
    render=render.replace(/!hideHeldForBaseV4/g,'!hideHeldForBaseV5');
    render=render.replace('if(heldBehind){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}','if(heldBehind&&!hideHeldForBaseV5){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}');
    render=render.replace('if(!heldBehind){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}','if(!heldBehind&&!hideHeldForBaseV5){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}');
    writeFileSync(renderFile,render,'utf8');
  }

  const engineFile=path.join(gameDir,'game','engine.ts');
  let engine=readFileSync(engineFile,'utf8');
  engine=engine.replace('p.shootFlash=Math.max(p.shootFlash,w?.continuous?2:4);',"p.shootFlash=Math.max(p.shootFlash,w?.continuous?6:12); /* ${MARKER}_SHOOT */");
  engine=engine.replace('player.shootFlash = 4;','player.shootFlash = 12;');
  writeFileSync(engineFile,engine,'utf8');
}
