// Armas kawaii que el pato sostiene. Los datos vienen de tools/armas_gen.py:
// vista lateral apuntando a la derecha, con puntos de empuñadura, mano de
// apoyo y boca del cañón marcados para cada arma.
import { HELD_WEAPONS, HELD_WEAPON_PALETTE, type HeldWeaponSprite } from './heldWeaponData';

export const HELD_WEAPON_OUTLINE='#2b1d2e';
const cache=new Map<string,HTMLCanvasElement|null>();

export function heldWeapon(id:string):HeldWeaponSprite{
  return HELD_WEAPONS[id]??HELD_WEAPONS.quack_blaster;
}
export function hasHeldWeapon(id:string){return !!HELD_WEAPONS[id];}

function weaponCanvas(id:string){
  if(cache.has(id))return cache.get(id)??null;
  let canvas:HTMLCanvasElement|null=null;
  try{
    const w=heldWeapon(id);
    canvas=document.createElement('canvas');
    canvas.width=w.rows[0].length;canvas.height=w.rows.length;
    const c=canvas.getContext('2d');
    if(!c)throw new Error('sin contexto 2d');
    w.rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){
      const ch=row[x];if(ch==='.')continue;
      c.fillStyle=HELD_WEAPON_PALETTE[ch.charCodeAt(0)-48];c.fillRect(x,y,1,1);
    }});
  }catch{canvas=null;}
  cache.set(id,canvas);
  return canvas;
}

/** Dibuja el arma con su empuñadura en el (0,0) del contexto actual. */
export function drawHeldWeapon(ctx:CanvasRenderingContext2D,id:string){
  const w=heldWeapon(id),cv=weaponCanvas(id);
  if(!cv)return;
  const prev=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(cv,-w.grip[0],-w.grip[1]);
  ctx.imageSmoothingEnabled=prev;
}

/** Pixeles 24×24 (sin contorno) para los iconos del HUD, la tienda y el suelo. */
export function heldWeaponIconPixels(id:string):(string|undefined)[]|null{
  const w=HELD_WEAPONS[id];
  if(!w)return null;
  const px:(string|undefined)[]=Array(24*24);
  const h=w.rows.length,wd=w.rows[0].length;
  const ox=Math.floor((24-wd)/2),oy=Math.floor((24-h)/2)+1;
  w.rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){
    const ch=row[x];if(ch==='.')continue;
    const col=HELD_WEAPON_PALETTE[ch.charCodeAt(0)-48];
    if(col===HELD_WEAPON_OUTLINE)continue;
    const xx=ox+x,yy=oy+y;
    if(xx>=0&&yy>=0&&xx<24&&yy<24)px[yy*24+xx]=col;
  }});
  return px;
}
