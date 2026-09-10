import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const once=(s,re,to,label)=>{const n=s.replace(re,to);if(n===s)throw new Error('Aim/held weapon patch failed: '+label);return n;};
const HELD=`function drawHeldWeapon(ctx:CanvasRenderingContext2D,engine:GameEngine){
  const p=engine.player;if(p.hp<=0)return;const w=activeWeapon(p);if(!w)return;const aim=aimVector(engine),ang=Math.atan2(aim.y,aim.x),kick=p.shootFlash>0?2:0;
  ctx.save();ctx.translate(p.x+7+aim.x*(5-kick),p.y+8+aim.y*(4-kick*.5));ctx.rotate(ang);if(Math.cos(ang)<0)ctx.scale(1,-1);
  ctx.fillStyle='#f2cc42';ctx.fillRect(-1,-2,4,4);ctx.fillStyle='#d7a72b';ctx.fillRect(1,1,3,2);ctx.translate(3,-5);ctx.scale(.52,.52);drawWeaponIcon(ctx,0,0,w.id);ctx.restore();
}`;
export function applyDuckAimHeldWeapon(gameDir){
  const engine=path.join(gameDir,'game','engine.ts');let e=readFileSync(engine,'utf8');
  e=once(e,/  if \(Math\.abs\(inX\) > Math\.abs\(inY\)\) \{ if \(inX > 0\) player\.dir = 'right'; else if \(inX < 0\) player\.dir = 'left'; \}\n  else if \(inY !== 0\) player\.dir = inY > 0 \? 'down' : 'up';/,`  if(Math.abs(inX)>Math.abs(inY)){if(inX>0)player.dir='right';else if(inX<0)player.dir='left';}\n  else if(inY!==0)player.dir=inY>0?'down':'up';\n  const visualAim=aimVector(engine),hasVisualAim=engine.lastInput==='gamepad'?Math.hypot(engine.pad.aimX,engine.pad.aimY)>.18:(engine.mouseX!==0||engine.mouseY!==0);\n  if(hasVisualAim){player.facingAngle=Math.atan2(visualAim.y,visualAim.x);if(Math.abs(visualAim.x)>Math.abs(visualAim.y))player.dir=visualAim.x>0?'right':'left';else player.dir=visualAim.y>0?'down':'up';}`,'cursor facing');
  e=once(e,/    if \(empty === 0\) p\.activeWeapon = 0;\n    else p\.switchAnim = 10;   \/\/ la nueva arma se muestra, pero no te la cambia en pleno combate/,"    p.activeWeapon=empty;\n    p.switchAnim=12;   // el arma recién recogida pasa a la mano",'equip new weapon');writeFileSync(engine,e);
  const render=path.join(gameDir,'game','render.ts');let r=readFileSync(render,'utf8');
  r=once(r,/import \{ grenadeLanding \} from '\.\/aim';/,"import { grenadeLanding,aimVector } from './aim';",'aim import');
  r=once(r,/function drawPedestalFull\(ctx: CanvasRenderingContext2D, ped: Pedestal, f: number, engine: GameEngine\) \{/,HELD+'\n\nfunction drawPedestalFull(ctx: CanvasRenderingContext2D, ped: Pedestal, f: number, engine: GameEngine) {','held helper');
  r=once(r,/  if \(p\.hp > 0\) \{\n    drawDuckSkin\(ctx, p\.x, p\.y, f, engine\.equippedSkin, p\.dir, p\.moving,\n      p\.hurtTimer > 0, p\.dashTimer > 0, p\.shootFlash > 0\);/,`  if(p.hp>0){const heldAim=aimVector(engine),heldBehind=heldAim.y<-.2;if(heldBehind)drawHeldWeapon(ctx,engine);\n    drawDuckSkin(ctx,p.x,p.y,f,engine.equippedSkin,p.dir,p.moving,p.hurtTimer>0,p.dashTimer>0,p.shootFlash>0);\n    if(!heldBehind)drawHeldWeapon(ctx,engine);`,'held render');writeFileSync(render,r);
}
