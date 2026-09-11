import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const MARKER='DUCK_BASE_SPRITESHEET_V4';
const PARTS=['part00.txt','part01.txt','part02.txt','part03.txt','part04.txt','part05.txt'];

function rebuildApprovedAtlas(gameDir){
  const dataDir=path.resolve(process.cwd(),'src/visual-v2/atlas-data-v4');
  const base64=PARTS.map(name=>readFileSync(path.join(dataDir,name),'utf8').trim()).join('');
  const png=Buffer.from(base64,'base64');
  if(png.length<1024||png[0]!==0x89||png[1]!==0x50||png[2]!==0x4e||png[3]!==0x47){
    throw new Error('Base duck V4 atlas decode failed');
  }
  const targetDir=path.join(gameDir,'assets-v2');
  mkdirSync(targetDir,{recursive:true});
  writeFileSync(path.join(targetDir,'base-duck-approved-atlas.png'),png);
}

const RENDERER=`// ${MARKER}\nconst BASE_DUCK_V4_ATLAS_SRC=new URL('../assets-v2/base-duck-approved-atlas.png',import.meta.url).href;\nconst BASE_DUCK_V4_FRAME_W=20;\nconst BASE_DUCK_V4_FRAME_H=30;\nconst BASE_DUCK_V4_COLS=30;\nconst BASE_DUCK_V4_ROWS=4;\nconst BASE_DUCK_V4_STATE_START:Record<BaseDuckAnimState,number>={idle:0,walk:4,shoot:16,pickup:22};\nconst BASE_DUCK_V4_ROW:Record<DuckDir,number>={down:0,up:1,left:2,right:3};\nfunction drawBaseDuckV4Frame(ctx:Ctx,img:HTMLImageElement,x:number,y:number,dir:DuckDir,state:BaseDuckAnimState,index:number,alpha:number,dead:boolean){\n  const bx=Math.floor(x),by=Math.floor(y),cx=bx+8,footY=by+20;\n  const sx=(BASE_DUCK_V4_STATE_START[state]+index)*BASE_DUCK_V4_FRAME_W;\n  const sy=BASE_DUCK_V4_ROW[dir]*BASE_DUCK_V4_FRAME_H;\n  const rw=20,rh=30,dx=Math.round(cx-rw/2),dy=Math.round(footY-rh);\n  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;\n  if(dead){ctx.translate(cx,by+10);ctx.rotate(Math.PI/2);ctx.translate(-cx,-(by+10));}\n  ctx.drawImage(img,sx,sy,BASE_DUCK_V4_FRAME_W,BASE_DUCK_V4_FRAME_H,dx,dy,rw,rh);\n  ctx.restore();\n}\nfunction drawBaseDuckV2(ctx:Ctx,x:number,y:number,frame:number,dir:DuckDir='down',moving=false,hurt=false,dashing=false,shooting=false,dead=false,pickupTimer=0,pickupMax=0,pickupItem:string|null=null){\n  const img=getV2Image(BASE_DUCK_V4_ATLAS_SRC);\n  if(!img||!img.complete||img.naturalWidth<BASE_DUCK_V4_FRAME_W*BASE_DUCK_V4_COLS||img.naturalHeight<BASE_DUCK_V4_FRAME_H*BASE_DUCK_V4_ROWS)return true;\n  const state=baseDuckAnimState(moving,shooting,pickupTimer);\n  const index=baseDuckAnimIndex(state,frame,pickupTimer,pickupMax);\n  const alpha=hurt&&Math.floor(frame*.5)%2===0?.48:dashing?.82:1;\n  const bx=Math.floor(x),by=Math.floor(y),cx=bx+8;\n  if(!dead){\n    ctx.save();ctx.globalAlpha=state==='walk'?.15:.12;ctx.fillStyle='#080b10';\n    const sw=state==='walk'?[10,9,8,8,9,10,10,9,8,8,9,10][index]??9:9;\n    ctx.beginPath();ctx.ellipse(cx,by+19,sw/2,1.5,0,0,Math.PI*2);ctx.fill();ctx.restore();\n  }\n  drawBaseDuckV4Frame(ctx,img,x,y,dir,state,index,alpha,dead);\n  if(dashing){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#fff1cf';ctx.beginPath();ctx.ellipse(cx,by+18,12,4,0,0,Math.PI*2);ctx.fill();ctx.restore();}\n  return true;\n}\n`;

export function applyDuckBaseSpriteSheetV4(gameDir){
  rebuildApprovedAtlas(gameDir);

  const spritesFile=path.join(gameDir,'game','sprites.ts');
  let sprites=readFileSync(spritesFile,'utf8');
  if(!sprites.includes(MARKER)){
    const start=sprites.indexOf('function drawBaseDuckV2(');
    const end=sprites.indexOf('\n\nexport function drawDuckSkin(',start);
    if(start<0||end<0)throw new Error('Base duck V4: renderer block not found');
    sprites=sprites.slice(0,start)+RENDERER+sprites.slice(end);
    writeFileSync(spritesFile,sprites,'utf8');
  }

  const renderFile=path.join(gameDir,'game','render.ts');
  let render=readFileSync(renderFile,'utf8');
  if(!render.includes(MARKER)){
    const heldDecl='const heldAim=aimVector(engine),heldBehind=heldAim.y<-.2;';
    const heldDeclV4=`const heldAim=aimVector(engine),heldBehind=heldAim.y<-.2,hideHeldForBaseV4=engine.equippedSkin==='robber'&&(p.shootFlash>0||p.pickupAnimTimer>0); /* ${MARKER} */`;
    if(!render.includes(heldDecl))throw new Error('Base duck V4: held weapon declaration not found');
    render=render.replace(heldDecl,heldDeclV4);
    render=render.replace('if(heldBehind){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}','if(heldBehind&&!hideHeldForBaseV4){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}');
    render=render.replace('if(!heldBehind){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}','if(!heldBehind&&!hideHeldForBaseV4){drawHeldWeapon(ctx,engine);drawGunfeelMuzzle(ctx,engine);}');
    writeFileSync(renderFile,render,'utf8');
  }

  const engineFile=path.join(gameDir,'game','engine.ts');
  let engine=readFileSync(engineFile,'utf8');
  if(!engine.includes('DUCK_BASE_SPRITESHEET_V4_SHOOT')){
    engine=engine.replace('p.shootFlash=Math.max(p.shootFlash,w?.continuous?2:4);',"p.shootFlash=Math.max(p.shootFlash,w?.continuous?6:12); /* DUCK_BASE_SPRITESHEET_V4_SHOOT */");
    engine=engine.replace('player.shootFlash = 4;','player.shootFlash = 12;');
    writeFileSync(engineFile,engine,'utf8');
  }
}
