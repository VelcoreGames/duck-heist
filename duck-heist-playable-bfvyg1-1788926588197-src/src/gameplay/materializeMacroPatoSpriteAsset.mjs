import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const MARKER='MACRO_PATO_APPROVED_SPRITE_V1';

export function applyDuckMacroPatoSpriteAsset(gameDir){
  const file=path.join(gameDir,'game','sprites.ts');
  let src=readFileSync(file,'utf8');
  if(src.includes(MARKER))return;

  const loader=`\n// ${MARKER}\nconst MACRO_PATO_SHEET_SRC='./assets/macro-pato-final-sprites.png';\nlet macroPatoSheet: HTMLImageElement | null = null;\nfunction getMacroPatoSheet(){\n  if(typeof Image==='undefined')return null;\n  if(!macroPatoSheet){\n    macroPatoSheet=new Image();\n    macroPatoSheet.src=MACRO_PATO_SHEET_SRC;\n  }\n  return macroPatoSheet;\n}\nfunction drawMacroPatoApprovedSprite(ctx:Ctx,x:number,y:number,frame:number,dir:DuckDir='down',moving=false,hurt=false,dashing=false,shooting=false,dead=false){\n  const img=getMacroPatoSheet();\n  if(!img||!img.complete||img.naturalWidth<384)return false;\n  const cellW=48,cellH=56;\n  let index=dir==='up'?1:dir==='left'?2:dir==='right'?3:0;\n  if(dir==='down'&&moving)index=4+(Math.floor(frame/5)%4);\n  const bob=moving?Math.round(Math.sin(frame*.34)):0;\n  const bx=Math.floor(x),by=Math.floor(y);\n  const dx=bx+8-24;\n  const dy=by+20-56+bob;\n  ctx.save();\n  ctx.imageSmoothingEnabled=false;\n  if(hurt&&Math.floor(frame*.5)%2===0)ctx.globalAlpha=.5;\n  if(dashing)ctx.globalAlpha=.8;\n  if(dead){ctx.translate(bx+8,by+9);ctx.rotate(Math.PI/2);ctx.translate(-(bx+8),-(by+9));}\n  ctx.drawImage(img,index*cellW,0,cellW,cellH,dx,dy,cellW,cellH);\n  if(shooting){\n    const mx=dir==='left'?bx-18:dir==='right'?bx+34:bx+8;\n    const my=dir==='up'?by-35:dir==='down'?by+21:by-2;\n    ctx.fillStyle='#fff4cf';ctx.fillRect(mx-3,my-3,6,6);\n    ctx.fillStyle='#f4d03f';ctx.fillRect(mx-1,my-1,2,2);\n  }\n  ctx.restore();\n  return true;\n}\n\n`;

  const duckSkinAnchor='export function drawDuckSkin(';
  const anchorAt=src.indexOf(duckSkinAnchor);
  if(anchorAt<0)throw new Error('Macro Pato approved sprite patch: drawDuckSkin anchor not found');
  src=src.slice(0,anchorAt)+loader+src.slice(anchorAt);

  const old="  if(skin?.overlay==='macro_pato'){drawMacroPato(ctx,x,y,frame,dir,moving,hurt,dashing,shooting,dead);return;}";
  const replacement="  if(skin?.overlay==='macro_pato'){if(drawMacroPatoApprovedSprite(ctx,x,y,frame,dir,moving,hurt,dashing,shooting,dead))return;drawMacroPato(ctx,x,y,frame,dir,moving,hurt,dashing,shooting,dead);return;}";
  if(!src.includes(old))throw new Error('Macro Pato approved sprite patch: standalone render hook not found');
  src=src.replace(old,replacement);
  writeFileSync(file,src);
}
