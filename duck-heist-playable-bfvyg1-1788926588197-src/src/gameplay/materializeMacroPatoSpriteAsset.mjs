import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const MARKER='MACRO_PATO_APPROVED_SPRITE_V1';

export function applyDuckMacroPatoSpriteAsset(gameDir){
  const sourceAsset=path.resolve(process.cwd(),'public/assets/macro-pato-final-sprites.png');
  if(!existsSync(sourceAsset))throw new Error('Macro Pato approved sprite asset missing.');
  const targetAssetDir=path.join(gameDir,'assets-v2');
  mkdirSync(targetAssetDir,{recursive:true});
  copyFileSync(sourceAsset,path.join(targetAssetDir,'macro-pato-final-sprites.png'));

  const file=path.join(gameDir,'game','sprites.ts');
  let src=readFileSync(file,'utf8');
  if(src.includes(MARKER))return;

  const loader=`\n// ${MARKER}\nconst MACRO_PATO_SHEET_SRC=new URL('../assets-v2/macro-pato-final-sprites.png',import.meta.url).href;\nlet macroPatoSheet: HTMLImageElement | null = null;\nfunction getMacroPatoSheet(){\n  if(typeof Image==='undefined')return null;\n  if(!macroPatoSheet){\n    macroPatoSheet=new Image();\n    macroPatoSheet.decoding='async';\n    macroPatoSheet.src=MACRO_PATO_SHEET_SRC;\n  }\n  return macroPatoSheet;\n}\nfunction drawMacroPatoApprovedSprite(ctx:Ctx,x:number,y:number,frame:number,dir:DuckDir='down',moving=false,hurt=false,dashing=false,shooting=false,dead=false){\n  const img=getMacroPatoSheet();\n  if(!img||!img.complete||img.naturalWidth<384)return false;\n  const cellW=48,cellH=56,renderW=34,renderH=40;\n  const moveStep=Math.floor(frame/6)%4;\n  let index=dir==='up'?1:dir==='left'?2:dir==='right'?3:0;\n  if(dir==='down'&&moving)index=4+moveStep;\n  // The current approved sheet only contains a true walk cycle facing down. Until the\n  // full directional sheet is approved, every other direction still gets a deliberate\n  // four-step pixel bob/sway so Macro Pato is never frozen in motion.\n  const idlePhase=Math.floor(frame/24)%4;\n  const bob=moving?[0,-1,0,1][moveStep]:(idlePhase===1?-1:0);\n  const sway=moving?[-1,0,1,0][moveStep]:0;\n  const bx=Math.floor(x),by=Math.floor(y);\n  const dx=Math.round(bx+8-renderW/2+sway);\n  const dy=Math.round(by+20-renderH+bob);\n  ctx.save();\n  ctx.imageSmoothingEnabled=false;\n  if(hurt&&Math.floor(frame*.5)%2===0)ctx.globalAlpha=.5;\n  if(dashing)ctx.globalAlpha=.8;\n  if(dead){ctx.translate(bx+8,by+9);ctx.rotate(Math.PI/2);ctx.translate(-(bx+8),-(by+9));}\n  ctx.drawImage(img,index*cellW,0,cellW,cellH,dx,dy,renderW,renderH);\n  if(shooting){\n    const mx=dir==='left'?bx-10:dir==='right'?bx+26:bx+8;\n    const my=dir==='up'?by-22:dir==='down'?by+20:by;\n    ctx.fillStyle='#fff4cf';ctx.fillRect(mx-2,my-2,4,4);\n    ctx.fillStyle='#f4d03f';ctx.fillRect(mx-1,my-1,2,2);\n  }\n  ctx.restore();\n  return true;\n}\n\n`;

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
