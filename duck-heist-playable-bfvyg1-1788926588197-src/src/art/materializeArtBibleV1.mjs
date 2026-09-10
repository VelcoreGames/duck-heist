import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const once=(s,re,to,label)=>{const n=s.replace(re,to);if(n===s)throw new Error('Art Bible v1 patch failed: '+label);return n;};

const ART_BIBLE=`export const DUCK_ART_BIBLE_VERSION='1.0';

export const ART_PALETTE={
  ink:'#11151c', inkSoft:'#27313a', inkBlue:'#18222d',
  cream:'#f4e7c5', creamMid:'#dfc28d', creamShade:'#bd9d6a', creamLight:'#fff4d6',
  beak:'#e99532', beakDark:'#bd6d20',
  gold:'#f4d03f', goldDark:'#9f7617',
  noir:'#091018', noirSoft:'#121a24',
  security:'#5f8fae', danger:'#d95555', success:'#62c981', glass:'#b9d0d8',
  warmLight:'rgba(255,226,173,.07)', coolEdge:'rgba(18,38,56,.10)',
} as const;

export const ART_RULES={
  style:'chibi-premium-pixel', tone:'cute-noir',
  headRatio:.48, bodyRatio:.39, feetRatio:.13,
  outlinePx:1, shadowAlpha:.30,
  materialTones:{min:2,max:4},
  preserveGameplayHitboxes:true,
  worldReadabilityFirst:true,
} as const;

export function applyArtBibleContext(ctx:CanvasRenderingContext2D){
  ctx.imageSmoothingEnabled=false;
  ctx.lineCap='butt';
  ctx.lineJoin='miter';
  ctx.globalCompositeOperation='source-over';
}

export function drawChibiGroundShadow(ctx:CanvasRenderingContext2D,x:number,y:number,w=14,h=4,alpha=ART_RULES.shadowAlpha){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=ART_PALETTE.ink;
  ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),w/2,h/2,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

export function drawCuteNoirWorldGrade(ctx:CanvasRenderingContext2D,w:number,h:number,frame:number,floorIndex:number){
  ctx.save();
  // Warm focal light keeps characters/loot inviting while cool edges preserve the heist/noir tone.
  const warm=ctx.createRadialGradient(w*.5,h*.47,18,w*.5,h*.47,Math.max(w,h)*.55);
  const pulse=.006*Math.sin(frame*.025);
  warm.addColorStop(0,`rgba(255,229,184,${.045+pulse})`);
  warm.addColorStop(.58,'rgba(255,218,166,.018)');
  warm.addColorStop(1,'rgba(255,218,166,0)');
  ctx.fillStyle=warm;ctx.fillRect(0,0,w,h);

  const cool=ctx.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.28,w*.5,h*.5,Math.max(w,h)*.72);
  const edge=floorIndex>=4?.09:.065;
  cool.addColorStop(0,'rgba(10,20,30,0)');
  cool.addColorStop(1,`rgba(8,19,29,${edge})`);
  ctx.fillStyle=cool;ctx.fillRect(0,0,w,h);
  ctx.restore();
}
`;

export function applyDuckArtBibleV1(gameDir){
  const artFile=path.join(gameDir,'game','artBible.ts');
  writeFileSync(artFile,ART_BIBLE,'utf8');

  const renderFile=path.join(gameDir,'game','render.ts');
  let r=readFileSync(renderFile,'utf8');
  r=once(r,/import type \{ GameEngine, Enemy, RoomContent, Pedestal \} from '\.\/types';/,"import { applyArtBibleContext, drawCuteNoirWorldGrade } from './artBible';\nimport type { GameEngine, Enemy, RoomContent, Pedestal } from './types';",'art bible import');
  r=once(r,/export function renderWorld\(engine: GameEngine\) \{\n  updateBankProps\(engine\);/,"export function renderWorld(engine: GameEngine) {\n  applyArtBibleContext(engine.ctx);\n  updateBankProps(engine);",'world context');
  r=once(r,/  ctx\.restore\(\);\n\n  \/\/ flash rojo al recibir daño/,"  ctx.restore();\n  drawCuteNoirWorldGrade(ctx,CANVAS_WIDTH,CANVAS_HEIGHT,engine.frame,engine.map.floorIndex);\n\n  // flash rojo al recibir daño",'world grade');
  r=once(r,/  ctx\.scale\(engine\.uiScale, engine\.uiScale\);\n  ctx\.imageSmoothingEnabled = true;/,"  ctx.scale(engine.uiScale, engine.uiScale);\n  applyArtBibleContext(ctx);",'crisp ui context');
  writeFileSync(renderFile,r,'utf8');
}
