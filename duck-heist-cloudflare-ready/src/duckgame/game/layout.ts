// Shared drawing and hit-test geometry. No duplicated menu rectangles.
export const MAIN_MENU = { x:31, y:130, w:164, h:23, gap:5, count:6 };
export const PAUSE_MENU={y:66,h:20,gap:4,w:202,count:6};
export const SWAP_LAYOUT = { x:35, y:51, w:410, h:250, cardsY:171, cardW:185, cardH:84, gap:8 };
export const WARDROBE = { x:203,y:70,w:252,h:228,cols:3,cellW:76,cellH:94,gap:6 };
export const WARDROBE_ACTION = { x:43,y:276,w:135,h:23 };
export const SETTINGS = { x:62,y:63,w:356,h:18,gap:3 };
export const SETTINGS_MUTE={x:390,y:35,w:28,h:18};
export const COLLECTION = { x:200,y:89,w:251,h:217,cols:4,cellW:53,cellH:56,gap:8 };
export const inside = (x:number,y:number,r:{x:number;y:number;w:number;h:number}) => x>=r.x && y>=r.y && x<=r.x+r.w && y<=r.y+r.h;
export function mainMenuHit(x:number,y:number) {
  return Array.from({length:MAIN_MENU.count},(_,i)=>i).find(i=>inside(x,y,{...MAIN_MENU,y:MAIN_MENU.y+i*(MAIN_MENU.h+MAIN_MENU.gap)})) ?? -1;
}
export function wardrobeHit(x:number,y:number,scroll:number,count:number) {
  if(!inside(x,y,WARDROBE)) return -1;
  for(let i=0;i<count;i++) if(inside(x,y,{x:WARDROBE.x+(i%3)*(WARDROBE.cellW+WARDROBE.gap),y:WARDROBE.y+Math.floor(i/3)*(WARDROBE.cellH+WARDROBE.gap)-scroll,w:WARDROBE.cellW,h:WARDROBE.cellH})) return i;
  return -1;
}
export function swapHit(x:number,y:number) {
  for(let i=0;i<2;i++) if(inside(x,y,{x:SWAP_LAYOUT.x+16+i*(SWAP_LAYOUT.cardW+SWAP_LAYOUT.gap),y:SWAP_LAYOUT.cardsY,w:SWAP_LAYOUT.cardW,h:SWAP_LAYOUT.cardH})) return i;
  return -1;
}
export const ACTIVE_SWAP = { x: 95, y: 78, w: 290, h: 196, confirm:{x:118,y:228,w:110,h:28}, cancel:{x:252,y:228,w:110,h:28} };
export function activeSwapHit(x:number,y:number): 'confirm' | 'cancel' | -1 {
  if (inside(x,y,ACTIVE_SWAP.confirm)) return 'confirm';
  if (inside(x,y,ACTIVE_SWAP.cancel)) return 'cancel';
  return -1;
}