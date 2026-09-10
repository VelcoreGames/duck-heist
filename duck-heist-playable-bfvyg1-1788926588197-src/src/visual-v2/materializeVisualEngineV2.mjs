import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const MARKER='DUCK_VISUAL_ENGINE_V2_BASE_DUCK';
const once=(s,from,to,label)=>{
  if(!s.includes(from)) throw new Error(`Visual Engine V2 patch failed: ${label}`);
  return s.replace(from,to);
};

const SPRITE_RUNTIME=`\n// ${MARKER}\n// Visual Engine V2 keeps gameplay in the original 480x352 logical coordinate space,\n// while art assets are bundled by Vite from higher-density source pixels. Hitboxes stay unchanged.\ntype V2SpriteDef={src:string;frameW:number;frameH:number;logicalW:number;logicalH:number;anchorX:number;footY:number};\ntype V2DrawOpts={flipX?:boolean;alpha?:number;dead?:boolean;bob?:number;offsetX?:number;renderW?:number;renderH?:number};\nconst V2_BASE_DUCK:V2SpriteDef={\n  src:new URL('../assets-v2/base-duck-v2.png',import.meta.url).href,frameW:112,frameH:112,\n  // Gameplay size is intentionally compact. Source art stays high density; only the\n  // logical footprint is reduced so the duck reads like a character, not a giant prop.\n  logicalW:28,logicalH:28,anchorX:8,footY:20,\n};\nconst v2Images=new Map<string,HTMLImageElement>();\nfunction getV2Image(src:string){\n  if(typeof Image==='undefined')return null;\n  let img=v2Images.get(src);\n  if(!img){\n    img=new Image();\n    img.decoding='async';\n    img.src=src;\n    v2Images.set(src,img);\n  }\n  return img;\n}\nfunction drawV2Asset(ctx:Ctx,def:V2SpriteDef,x:number,y:number,opts:V2DrawOpts={}){\n  const img=getV2Image(def.src);\n  if(!img||!img.complete||img.naturalWidth<def.frameW)return false;\n  const bx=Math.floor(x),by=Math.floor(y);\n  const bob=opts.bob??0,offsetX=opts.offsetX??0;\n  const rw=opts.renderW??def.logicalW,rh=opts.renderH??def.logicalH;\n  const dx=Math.round(bx+def.anchorX-rw/2+offsetX);\n  const dy=Math.round(by+def.footY-rh+bob);\n  ctx.save();\n  ctx.imageSmoothingEnabled=false;\n  if(opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;\n  if(opts.dead){\n    ctx.translate(bx+def.anchorX,by+10);\n    ctx.rotate(Math.PI/2);\n    ctx.translate(-(bx+def.anchorX),-(by+10));\n  }\n  if(opts.flipX){\n    ctx.translate(dx+rw,0);\n    ctx.scale(-1,1);\n    ctx.drawImage(img,0,0,def.frameW,def.frameH,0,dy,rw,rh);\n  }else{\n    ctx.drawImage(img,0,0,def.frameW,def.frameH,dx,dy,rw,rh);\n  }\n  ctx.restore();\n  return true;\n}\nfunction drawBaseDuckV2(ctx:Ctx,x:number,y:number,frame:number,dir:DuckDir='down',moving=false,hurt=false,dashing=false,shooting=false,dead=false){\n  const walkStep=Math.floor(frame/4)%4;\n  const idleStep=Math.floor(frame/12)%4;\n  // The approved art is one pose, so animation is performed in-engine without altering\n  // the approved image: four-step bounce/squash while moving + subtle breathing at idle.\n  const walkBob=[0,-2,0,1],walkSway=[-1,0,1,0],walkW=[29,27,29,28],walkH=[27,30,27,29];\n  const idleBob=[0,-1,0,0],idleW=[28,29,28,28],idleH=[28,28,29,28];\n  const bob=moving?walkBob[walkStep]:idleBob[idleStep];\n  let offsetX=moving?walkSway[walkStep]:0;\n  if(dir==='left')offsetX-=1;else if(dir==='right')offsetX+=1;\n  const renderW=moving?walkW[walkStep]:idleW[idleStep];\n  const renderH=moving?walkH[walkStep]:idleH[idleStep];\n  const alpha=hurt&&Math.floor(frame*.5)%2===0?.48:dashing?.8:1;\n  const flipX=dir==='left';\n  const ok=drawV2Asset(ctx,V2_BASE_DUCK,x,y,{flipX,alpha,dead,bob,offsetX,renderW,renderH});\n  // Do not flash the legacy base duck while the bundled PNG decodes.\n  if(!ok)return true;\n  // A tiny contact shadow makes the vertical walk cycle read clearly without changing hitboxes.\n  if(!dead){\n    ctx.save();ctx.globalAlpha=moving?.18:.13;ctx.fillStyle='#080b10';\n    const sw=moving?(walkStep%2===0?11:9):10;ctx.fillRect(Math.floor(x)+8-Math.floor(sw/2),Math.floor(y)+19,sw,2);ctx.restore();\n  }\n  if(dashing){\n    ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#fff1cf';\n    ctx.beginPath();ctx.ellipse(Math.floor(x)+8,Math.floor(y)+18,13,4,0,0,Math.PI*2);ctx.fill();ctx.restore();\n  }\n  return true;\n}\n\n`;

export function applyDuckVisualEngineV2(gameDir){
  const sourceAsset=path.resolve(process.cwd(),'public/assets-v2/base-duck-v2.png');
  if(!existsSync(sourceAsset))throw new Error('Visual Engine V2 missing base duck asset.');
  const targetAssetDir=path.join(gameDir,'assets-v2');
  mkdirSync(targetAssetDir,{recursive:true});
  copyFileSync(sourceAsset,path.join(targetAssetDir,'base-duck-v2.png'));

  const appFile=path.join(gameDir,'App.tsx');
  let app=readFileSync(appFile,'utf8');
  if(!app.includes(MARKER)){
    app=once(app,
`  const computeScale = useCallback(() => {`,
`  // ${MARKER}\n  // 3x internal world resolution: game physics remain 480x352 logical pixels.\n  const WORLD_RENDER_SCALE = 3;\n\n  const computeScale = useCallback(() => {`,
'world render scale constant');

    app=once(app,
`    wc.width = CANVAS_WIDTH;\n    wc.height = CANVAS_HEIGHT;\n    const wctx = wc.getContext('2d', { alpha: false })!;`,
`    wc.width = CANVAS_WIDTH * WORLD_RENDER_SCALE;\n    wc.height = CANVAS_HEIGHT * WORLD_RENDER_SCALE;\n    const wctx = wc.getContext('2d', { alpha: false })!;\n    wctx.setTransform(WORLD_RENDER_SCALE, 0, 0, WORLD_RENDER_SCALE, 0, 0);`,
'world canvas supersampling');

    app=once(app,
`      const wctx2 = engine.ctx;\n      wctx2.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);`,
`      const wctx2 = engine.ctx;\n      // Reassert the V2 logical-to-device transform every frame.\n      wctx2.setTransform(WORLD_RENDER_SCALE, 0, 0, WORLD_RENDER_SCALE, 0, 0);\n      wctx2.imageSmoothingEnabled = false;\n      wctx2.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);`,
'world frame transform');
    writeFileSync(appFile,app,'utf8');
  }

  const spritesFile=path.join(gameDir,'game','sprites.ts');
  let sprites=readFileSync(spritesFile,'utf8');
  if(!sprites.includes(MARKER)){
    const anchor='export function drawDuckSkin(';
    const at=sprites.indexOf(anchor);
    if(at<0)throw new Error('Visual Engine V2 patch failed: drawDuckSkin anchor');
    sprites=sprites.slice(0,at)+SPRITE_RUNTIME+sprites.slice(at);

    const hook=`) {\n  const skin = getSkin(skinId);`;
    const hookReplacement=`) {\n  // Only the base robber is migrated to Visual Engine V2 right now. Other skins keep\n  // their own renderer until their V2 assets are individually approved and migrated.\n  if(skinId==='robber'&&drawBaseDuckV2(ctx,x,y,frame,dir,moving,hurt,dashing,shooting,dead))return;\n  const skin = getSkin(skinId);`;
    sprites=once(sprites,hook,hookReplacement,'base duck render hook');
    writeFileSync(spritesFile,sprites,'utf8');
  }
}
