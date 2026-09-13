from pathlib import Path

root=Path('.')
render_path=root/'src/game/render.ts'
module_path=root/'src/game/graphics/chibiSupportV3.ts'
index_path=root/'index.html'

module=r'''import { drawChibiBirdEnemyV3 } from './chibiBirdEnemiesV3';

type Ctx = CanvasRenderingContext2D;
const OUTLINE='#352a2b';
const FEATHER='#f7d768';
const FEATHER_LIGHT='#fff0a4';
const ORANGE='#e88c36';
const TEAL='#294c4d';
const BRASS='#d0aa55';

function ellipse(ctx:Ctx,x:number,y:number,rx:number,ry:number,fill:string,stroke=OUTLINE,lw=1.1){
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  if(stroke&&lw){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
}
function shadow(ctx:Ctx,cx:number,y:number,w:number,a=.1){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#231a1b';ctx.beginPath();ctx.ellipse(cx,y,w,2.2,0,0,Math.PI*2);ctx.fill();ctx.restore();}

export function drawChibiCompanionDuckV3(ctx:Ctx,x:number,y:number,frame:number,moving:boolean,guard:boolean,cooldown:number){
  const cx=x+8,feet=y+16;const phase=frame*.16;const step=moving?Math.sin(phase):0;const bob=moving?-Math.abs(step)*1.05:Math.sin(frame*.045)*.2;
  shadow(ctx,cx,feet+1,7.2);
  ctx.save();ctx.translate(cx,feet+bob);ctx.rotate(step*.025);
  ellipse(ctx,-3.5-step,-.8,2.7,1.15,ORANGE,OUTLINE,.8);ellipse(ctx,3.5+step,-.8,2.7,1.15,ORANGE,OUTLINE,.8);
  ellipse(ctx,0,-6.5,6.2,6.4,FEATHER,OUTLINE,1.25);
  if(guard){ctx.beginPath();ctx.moveTo(-5.2,-8);ctx.quadraticCurveTo(0,-5.4,5.2,-8);ctx.lineTo(4.4,-2);ctx.quadraticCurveTo(0,0,-4.4,-2);ctx.closePath();ctx.fillStyle=TEAL;ctx.fill();ctx.strokeStyle=OUTLINE;ctx.lineWidth=1;ctx.stroke();}
  ellipse(ctx,0,-13.6,6.6,6.1,FEATHER,OUTLINE,1.25);
  ctx.globalAlpha=.58;ellipse(ctx,-2.1,-15.7,2.8,1.6,FEATHER_LIGHT,'',0);ctx.globalAlpha=1;
  ellipse(ctx,-2.35,-14.2,1,1.45,'#211b1e','',0);ellipse(ctx,2.35,-14.2,1,1.45,'#211b1e','',0);
  ellipse(ctx,-2.6,-14.65,.3,.38,'#fff8dc','',0);ellipse(ctx,2.1,-14.65,.3,.38,'#fff8dc','',0);
  ctx.beginPath();ctx.moveTo(-3.2,-11.2);ctx.quadraticCurveTo(0,-12.6,3.2,-11.2);ctx.quadraticCurveTo(1.7,-8.8,0,-8.7);ctx.quadraticCurveTo(-1.7,-8.8,-3.2,-11.2);ctx.closePath();ctx.fillStyle=ORANGE;ctx.fill();ctx.strokeStyle=OUTLINE;ctx.lineWidth=.9;ctx.stroke();
  if(guard){
    ctx.fillStyle=cooldown>0?'#637279':'#b7ded9';ctx.strokeStyle=OUTLINE;ctx.lineWidth=.8;ctx.beginPath();ctx.roundRect(4.4,-9,4.5,7.3,1.3);ctx.fill();ctx.stroke();
    ctx.fillStyle=BRASS;ctx.fillRect(-1.1,-5.5,2.2,2.2);
  }
  ctx.restore();
}

export function drawChibiMerchantPigeonV3(ctx:Ctx,x:number,y:number,frame:number){
  const size=22;
  drawChibiBirdEnemyV3({ctx,x,y,size,frame,dirX:0,dirY:1,moving:false,hurt:false,kind:'pigeon'});
  const cx=x+size/2, headY=y+size-20;
  ctx.save();
  // merchant spectacles and warm brass chain; accessories are NPC-only, never player canon.
  ctx.strokeStyle=BRASS;ctx.lineWidth=.9;ctx.globalAlpha=.92;
  for(const sx of [-3.4,3.4]){ctx.beginPath();ctx.arc(cx+sx,headY-1.1,2.35,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(cx-1.1,headY-1.1);ctx.lineTo(cx+1.1,headY-1.1);ctx.stroke();
  ctx.globalAlpha=.75;ctx.strokeStyle='#e5c97f';ctx.beginPath();ctx.moveTo(cx+6,headY);ctx.quadraticCurveTo(cx+8,headY+5,cx+5,headY+9);ctx.stroke();
  ctx.globalAlpha=1;
  ctx.fillStyle='#8c5637';ctx.strokeStyle=OUTLINE;ctx.lineWidth=.9;ctx.beginPath();ctx.roundRect(cx-6,y+size-7,12,5,1.5);ctx.fill();ctx.stroke();
  ctx.fillStyle='#f0d88a';ctx.fillRect(cx-2,y+size-5.8,4,1.2);
  ctx.restore();
}

export function drawChibiInjuredDuckV3(ctx:Ctx,x:number,y:number,frame:number,used:boolean){
  const breathe=used?0:Math.sin(frame*.045)*.3;
  const cx=x+8, cy=y+9+breathe;
  shadow(ctx,cx,y+17,8.5,used?.055:.09);
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.36);ctx.globalAlpha=used?.62:1;
  ellipse(ctx,-1,1.5,7,5.2,FEATHER,OUTLINE,1.2);
  ellipse(ctx,3.7,-3.7,6.1,5.6,FEATHER,OUTLINE,1.2);
  ctx.globalAlpha*=.55;ellipse(ctx,1.7,-5.5,2.6,1.3,FEATHER_LIGHT,'',0);ctx.globalAlpha=used?.62:1;
  ctx.beginPath();ctx.moveTo(7.8,-3);ctx.lineTo(12,-1.2);ctx.lineTo(7.5,.3);ctx.closePath();ctx.fillStyle=ORANGE;ctx.fill();ctx.strokeStyle=OUTLINE;ctx.lineWidth=.8;ctx.stroke();
  ctx.strokeStyle='#211b1e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(4.2,-5.2);ctx.lineTo(6,-4.4);ctx.stroke();
  // bandage immediately reads as injured without changing gameplay state.
  ctx.strokeStyle='#f4ead3';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-4,-.5);ctx.lineTo(3,3.2);ctx.stroke();
  ctx.strokeStyle='#c9bda7';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-1,.3);ctx.lineTo(.8,2.2);ctx.stroke();
  ctx.restore();
}
'''
module_path.write_text(module)

render=render_path.read_text()
marker="import { drawChibiFoodEnemyV3 } from './graphics/chibiFoodEnemiesV3';"
if marker not in render: raise SystemExit('food renderer import missing')
render=render.replace(marker,marker+"\nimport { drawChibiCompanionDuckV3, drawChibiMerchantPigeonV3, drawChibiInjuredDuckV3 } from './graphics/chibiSupportV3';",1)

old_event="if(event.kind==='injured') drawDuckSkin(ctx,event.x,event.y,f,'robber','down',false,false,false,false,!event.used);"
new_event="if(event.kind==='injured') drawChibiInjuredDuckV3(ctx,event.x,event.y,f,event.used);"
if old_event not in render: raise SystemExit('injured event marker missing')
render=render.replace(old_event,new_event,1)
old_shop="drawShopPigeon(ctx, CANVAS_WIDTH / 2 - 8, CANVAS_HEIGHT * 0.22, f);"
new_shop="drawChibiMerchantPigeonV3(ctx, CANVAS_WIDTH / 2 - 11, CANVAS_HEIGHT * 0.22 - 5, f);"
if old_shop not in render: raise SystemExit('merchant marker missing')
render=render.replace(old_shop,new_shop,1)
old_comp="else {drawDuck(ctx,-8,-8,f*.7,'down',p.moving);if(child.kind==='guard'){ctx.fillStyle=p.guardianCooldown>0?'#4a5f6b':'#b3dce0';ctx.fillRect(3,0,7,9);}}"
new_comp="else drawChibiCompanionDuckV3(ctx,-8,-8,f,p.moving,child.kind==='guard',p.guardianCooldown);"
if old_comp not in render: raise SystemExit('companion duck marker missing')
render=render.replace(old_comp,new_comp,1)

# Remove imports whose final world-use paths were replaced; drawDuckSkin remains used by menus/skin previews elsewhere.
render=render.replace("  drawDuck, drawHeart, drawSecurityPigeon,","  drawHeart, drawSecurityPigeon,",1)
render=render.replace("  drawParticle, drawItem, drawWeaponIcon, drawShopPigeon,","  drawParticle, drawItem, drawWeaponIcon,",1)
render_path.write_text(render)

index=index_path.read_text()
if '0.7.19-food-enemies-chibi' not in index: raise SystemExit('v0.7.19 marker missing')
index=index.replace('0.7.19-food-enemies-chibi','0.7.20-support-cast-chibi')
index_path.write_text(index)
print('Applied v0.7.20 chibi support cast pass')
