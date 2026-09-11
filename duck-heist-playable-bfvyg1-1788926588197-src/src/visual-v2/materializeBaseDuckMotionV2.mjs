import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const MARKER='DUCK_PLAYER_ANIMATION_V3';
const once=(src,from,to,label)=>{
  if(!src.includes(from)) throw new Error(`Player animation V3 patch failed: ${label}`);
  return src.replace(from,to);
};

const RENDERER=`// ${MARKER}
type BaseDuckAnimState='idle'|'walk'|'shoot'|'pickup';
type BaseDuckPose={dx:number;dy:number;w:number;h:number;rot:number};
const BASE_DUCK_ANIM_FRAMES={idle:4,walk:12,shoot:6,pickup:8} as const;
const BASE_DUCK_POSES:{idle:BaseDuckPose[];walk:BaseDuckPose[];shoot:BaseDuckPose[];pickup:BaseDuckPose[]}={
  idle:[
    {dx:0,dy:0,w:28,h:28,rot:0},{dx:0,dy:-1,w:28,h:29,rot:0},
    {dx:0,dy:0,w:28,h:28,rot:0},{dx:0,dy:0,w:29,h:28,rot:0},
  ],
  walk:[
    {dx:-1,dy:0,w:28,h:28,rot:-.035},{dx:-1,dy:-1,w:28,h:29,rot:-.028},
    {dx:0,dy:-2,w:27,h:30,rot:-.016},{dx:0,dy:-1,w:28,h:29,rot:-.008},
    {dx:1,dy:0,w:29,h:28,rot:.012},{dx:1,dy:1,w:29,h:27,rot:.024},
    {dx:1,dy:0,w:28,h:28,rot:.035},{dx:1,dy:-1,w:28,h:29,rot:.026},
    {dx:0,dy:-2,w:27,h:30,rot:.014},{dx:0,dy:-1,w:28,h:29,rot:.006},
    {dx:-1,dy:0,w:29,h:28,rot:-.014},{dx:-1,dy:1,w:29,h:27,rot:-.026},
  ],
  shoot:[
    {dx:0,dy:0,w:28,h:28,rot:0},{dx:-1,dy:0,w:29,h:28,rot:-.035},
    {dx:-2,dy:0,w:29,h:27,rot:-.055},{dx:-1,dy:-1,w:28,h:29,rot:-.03},
    {dx:0,dy:0,w:28,h:28,rot:-.012},{dx:0,dy:0,w:28,h:28,rot:0},
  ],
  pickup:[
    {dx:0,dy:0,w:28,h:28,rot:0},{dx:0,dy:-1,w:29,h:29,rot:-.018},
    {dx:0,dy:-2,w:29,h:30,rot:.018},{dx:0,dy:-3,w:28,h:31,rot:0},
    {dx:0,dy:-3,w:28,h:31,rot:0},{dx:0,dy:-2,w:29,h:30,rot:-.018},
    {dx:0,dy:-1,w:29,h:29,rot:.018},{dx:0,dy:0,w:28,h:28,rot:0},
  ],
};
function baseDuckAnimState(moving:boolean,shooting:boolean,pickupTimer:number):BaseDuckAnimState{
  if(shooting)return 'shoot';
  if(pickupTimer>0)return 'pickup';
  if(moving)return 'walk';
  return 'idle';
}
function baseDuckAnimIndex(state:BaseDuckAnimState,frame:number,pickupTimer:number,pickupMax:number){
  if(state==='idle')return Math.floor(frame/14)%BASE_DUCK_ANIM_FRAMES.idle;
  if(state==='walk')return Math.floor(frame/3)%BASE_DUCK_ANIM_FRAMES.walk;
  if(state==='shoot')return Math.floor(frame/2)%BASE_DUCK_ANIM_FRAMES.shoot;
  const max=Math.max(1,pickupMax||32),elapsed=Math.max(0,max-pickupTimer);
  return Math.min(BASE_DUCK_ANIM_FRAMES.pickup-1,Math.floor(elapsed/max*BASE_DUCK_ANIM_FRAMES.pickup));
}
function drawDuckAngryFaceV3(ctx:Ctx,x:number,y:number,dir:DuckDir='down'){
  const bx=Math.floor(x),by=Math.floor(y),ink='#1b130f',dark='#5a2c0d';
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle=ink;
  if(dir==='left'){
    ctx.fillRect(bx+1,by+1,4,1);ctx.fillRect(bx+2,by+2,3,1);
    ctx.fillRect(bx+6,by+2,3,1);ctx.fillRect(bx+6,by+1,4,1);
    ctx.fillRect(bx+2,by+4,2,1);ctx.fillRect(bx+7,by+4,2,1);
  }else{
    ctx.fillRect(bx+7,by+2,4,1);ctx.fillRect(bx+8,by+1,3,1);
    ctx.fillRect(bx+12,by+1,4,1);ctx.fillRect(bx+13,by+2,3,1);
    ctx.fillRect(bx+8,by+4,2,1);ctx.fillRect(bx+13,by+4,2,1);
  }
  ctx.fillStyle=dark;
  if(dir==='left')ctx.fillRect(bx+3,by+9,4,1);else ctx.fillRect(bx+10,by+9,4,1);
  ctx.restore();
}
function drawBaseDuckPoseV3(ctx:Ctx,img:HTMLImageElement,x:number,y:number,dir:DuckDir,pose:BaseDuckPose,alpha:number,dead:boolean){
  const bx=Math.floor(x),by=Math.floor(y),cx=bx+8,footY=by+20;
  const directionalX=dir==='left'?-1:dir==='right'?1:0;
  const directionalY=dir==='up'?-1:0;
  const dx=Math.round(cx-pose.w/2+pose.dx+directionalX);
  const dy=Math.round(footY-pose.h+pose.dy+directionalY);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;
  if(dead){ctx.translate(cx,by+10);ctx.rotate(Math.PI/2);ctx.translate(-cx,-(by+10));}
  ctx.translate(cx,footY);ctx.rotate((dir==='left'?-1:1)*pose.rot);ctx.translate(-cx,-footY);
  if(dir==='left'){
    ctx.translate(dx+pose.w,0);ctx.scale(-1,1);
    ctx.drawImage(img,0,0,112,112,0,dy,pose.w,pose.h);
  }else{
    ctx.drawImage(img,0,0,112,112,dx,dy,pose.w,pose.h);
  }
  ctx.restore();
}
function drawPickupItemV3(ctx:Ctx,itemId:string|null,x:number,y:number,index:number){
  if(!itemId)return;
  const lift=[0,-3,-7,-11,-12,-9,-5,-1][index]??0;
  const scale=[12,13,14,16,16,15,13,12][index]??12;
  const ix=Math.floor(x)+8-scale/2,iy=Math.floor(y)-8+lift;
  ctx.save();ctx.globalAlpha=index===0||index===7?.72:1;
  drawItemIcon(ctx,ix,iy,itemId,scale,'#f4d03f');
  if(index>=2&&index<=5){ctx.fillStyle='#fff3b0';ctx.fillRect(Math.floor(x)-2,iy+3,1,1);ctx.fillRect(Math.floor(x)+18,iy+6,1,1);}
  ctx.restore();
}
function drawBaseDuckV2(ctx:Ctx,x:number,y:number,frame:number,dir:DuckDir='down',moving=false,hurt=false,dashing=false,shooting=false,dead=false,pickupTimer=0,pickupMax=0,pickupItem:string|null=null){
  const img=getV2Image(V2_BASE_DUCK.src);
  if(!img||!img.complete||img.naturalWidth<V2_BASE_DUCK.frameW)return true;
  const state=baseDuckAnimState(moving,shooting,pickupTimer);
  const index=baseDuckAnimIndex(state,frame,pickupTimer,pickupMax);
  const pose=BASE_DUCK_POSES[state][index];
  const alpha=hurt&&Math.floor(frame*.5)%2===0?.48:dashing?.82:1;
  const bx=Math.floor(x),by=Math.floor(y),cx=bx+8;
  if(!dead){
    ctx.save();ctx.globalAlpha=state==='walk'?.16:.13;ctx.fillStyle='#080b10';
    const shadowW=state==='walk'?[10,9,8,9,10,11,10,9,8,9,10,11][index]:9;
    ctx.beginPath();ctx.ellipse(cx,by+19,shadowW/2,1.7,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  drawBaseDuckPoseV3(ctx,img,x,y,dir,pose,alpha,dead);
  if(state==='shoot'&&!dead)drawDuckAngryFaceV3(ctx,x+pose.dx,y+pose.dy,dir);
  if(state==='pickup'&&!dead)drawPickupItemV3(ctx,pickupItem,x,y,index);
  if(dashing){ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#fff1cf';ctx.beginPath();ctx.ellipse(cx,by+18,13,4,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  return true;
}
`;

export function applyDuckBaseMotionV2(gameDir){
  const typesFile=path.join(gameDir,'game','types.ts');
  let types=readFileSync(typesFile,'utf8');
  if(!types.includes(MARKER)){
    types=once(types,
      '    dir: DuckDir; moving: boolean; shootFlash: number;',
      `    dir: DuckDir; moving: boolean; shootFlash: number;\n    pickupAnimTimer:number; pickupAnimMax:number; pickupAnimItem:string|null; // ${MARKER}`,
      'player animation fields');
    writeFileSync(typesFile,types,'utf8');
  }

  const engineFile=path.join(gameDir,'game','engine.ts');
  let engine=readFileSync(engineFile,'utf8');
  if(!engine.includes(MARKER)){
    engine=once(engine,
      "    dir: 'down' as DuckDir, moving: false, shootFlash: 0,",
      `    dir: 'down' as DuckDir, moving: false, shootFlash: 0,\n    pickupAnimTimer:0,pickupAnimMax:0,pickupAnimItem:null as string|null, // ${MARKER}`,
      'player animation init');
    engine=once(engine,
      '  if (player.shootFlash > 0) player.shootFlash--;',
      `  if (player.shootFlash > 0) player.shootFlash--;\n  if(player.pickupAnimTimer>0){player.pickupAnimTimer--;if(player.pickupAnimTimer<=0)player.pickupAnimItem=null;}`,
      'animation timer update');
    engine=once(engine,
      '// ---------------------------------------------------------------------------\n// ARMAS: inventario de dos huecos\n// ---------------------------------------------------------------------------',
      `// ---------------------------------------------------------------------------\n// ARMAS: inventario de dos huecos\n// ---------------------------------------------------------------------------\nfunction triggerPlayerPickupAnim(engine:GameEngine,itemId:string){\n  const p=engine.player;p.pickupAnimMax=32;p.pickupAnimTimer=32;p.pickupAnimItem=itemId;\n}`,
      'pickup trigger helper');
    engine=once(engine,
      '    showPickupCard(engine, itemId, true);\n    playEquip();\n    return true;',
      '    showPickupCard(engine, itemId, true);\n    triggerPlayerPickupAnim(engine,itemId);\n    playEquip();\n    return true;',
      'weapon pickup trigger');
    engine=once(engine,
      '  showPickupCard(engine, req.itemId, true);\n  spawn(engine, p.x + 7, p.y + 8, \'spark\', 12, \'#f4d03f\');',
      '  showPickupCard(engine, req.itemId, true);\n  triggerPlayerPickupAnim(engine,req.itemId);\n  spawn(engine, p.x + 7, p.y + 8, \'spark\', 12, \'#f4d03f\');',
      'weapon swap pickup trigger');
    engine=once(engine,
      '  showPickupCard(engine, itemId, false);\n  playRarityPickup((ITEMS[itemId]??ACTIVE_ITEMS[itemId]).rarity);',
      '  showPickupCard(engine, itemId, false);\n  triggerPlayerPickupAnim(engine,itemId);\n  playRarityPickup((ITEMS[itemId]??ACTIVE_ITEMS[itemId]).rarity);',
      'item pickup trigger');
    writeFileSync(engineFile,engine,'utf8');
  }

  const renderFile=path.join(gameDir,'game','render.ts');
  let render=readFileSync(renderFile,'utf8');
  if(!render.includes(MARKER)){
    render=once(render,
      `    drawDuckSkin(ctx, p.x, p.y, f, engine.equippedSkin, p.dir, p.moving,\n      p.hurtTimer > 0, p.dashTimer > 0, p.shootFlash > 0);`,
      `    drawDuckSkin(ctx, p.x, p.y, f, engine.equippedSkin, p.dir, p.moving,\n      p.hurtTimer > 0, p.dashTimer > 0, p.shootFlash > 0, false,\n      p.pickupAnimTimer, p.pickupAnimMax, p.pickupAnimItem); // ${MARKER}`,
      'gameplay render animation args');
    writeFileSync(renderFile,render,'utf8');
  }

  const spritesFile=path.join(gameDir,'game','sprites.ts');
  let sprites=readFileSync(spritesFile,'utf8');
  if(!sprites.includes(MARKER)){
    const start=sprites.indexOf('function drawBaseDuckV2(');
    const end=sprites.indexOf('\n\nexport function drawDuckSkin(',start);
    if(start<0||end<0)throw new Error('Player animation V3 patch failed: base renderer block');
    sprites=sprites.slice(0,start)+RENDERER+sprites.slice(end);

    const sigOld=`  dashing = false, shooting = false, dead = false,\n) {`;
    const sigNew=`  dashing = false, shooting = false, dead = false,\n  pickupTimer = 0, pickupMax = 0, pickupItem: string | null = null,\n) {`;
    const skinAt=sprites.indexOf('export function drawDuckSkin(');
    if(skinAt<0)throw new Error('Player animation V3 patch failed: drawDuckSkin');
    const prefix=sprites.slice(0,skinAt),tail=sprites.slice(skinAt);
    if(!tail.includes(sigOld))throw new Error('Player animation V3 patch failed: drawDuckSkin signature');
    sprites=prefix+tail.replace(sigOld,sigNew);
    sprites=once(sprites,
      "if(skinId==='robber'&&drawBaseDuckV2(ctx,x,y,frame,dir,moving,hurt,dashing,shooting,dead))return;",
      "if(skinId==='robber'&&drawBaseDuckV2(ctx,x,y,frame,dir,moving,hurt,dashing,shooting,dead,pickupTimer,pickupMax,pickupItem))return;",
      'base duck animation hook');
    writeFileSync(spritesFile,sprites,'utf8');
  }
}
