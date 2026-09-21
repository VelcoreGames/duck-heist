// Shared drawing and hit-test geometry. Every visible mouse control uses these exact rectangles.
export type Rect={x:number;y:number;w:number;h:number};
export const inside = (x:number,y:number,r:Rect) => x>=r.x && y>=r.y && x<=r.x+r.w && y<=r.y+r.h;

export const MAIN_MENU={x:26,y:74,w:182,h:27,gap:2,count:8};
export const mainMenuRect=(i:number):Rect=>({...MAIN_MENU,y:MAIN_MENU.y+i*(MAIN_MENU.h+MAIN_MENU.gap)});
export const MAIN_OPEN:Rect={x:234,y:274,w:204,h:20};
export function mainMenuHit(x:number,y:number){for(let i=0;i<MAIN_MENU.count;i++)if(inside(x,y,mainMenuRect(i)))return i;return -1;}

export const DIFFICULTY_GRID={x:46,y:82,w:186,h:78,gapX:14,gapY:12,cols:2,count:4};
export const difficultyRect=(i:number):Rect=>({x:DIFFICULTY_GRID.x+(i%2)*(DIFFICULTY_GRID.w+DIFFICULTY_GRID.gapX),y:DIFFICULTY_GRID.y+Math.floor(i/2)*(DIFFICULTY_GRID.h+DIFFICULTY_GRID.gapY),w:DIFFICULTY_GRID.w,h:DIFFICULTY_GRID.h});
export const DIFFICULTY_START:Rect={x:306,y:318,w:128,h:22};

export const PAUSE_MENU={x:44,y:74,w:188,h:35,gapX:12,gapY:8,cols:2,count:7};
export const pauseRect=(i:number):Rect=>({x:PAUSE_MENU.x+(i%2)*(PAUSE_MENU.w+PAUSE_MENU.gapX),y:PAUSE_MENU.y+Math.floor(i/2)*(PAUSE_MENU.h+PAUSE_MENU.gapY),w:PAUSE_MENU.w,h:PAUSE_MENU.h});

export const CONFIRM_RECTS:[Rect,Rect]=[
  {x:250,y:230,w:150,h:34}, // confirmar
  {x:80,y:230,w:150,h:34},  // cancelar
];

export const BACK_BUTTON:Rect={x:28,y:318,w:92,h:22};
export const PRIMARY_BUTTON:Rect={x:326,y:318,w:126,h:22};
export const CONTROLS_RESET:Rect={x:326,y:318,w:126,h:22};
export const MAP_CLOSE:Rect={x:356,y:318,w:96,h:22};
export const HUD_MENU:Rect={x:354,y:6,w:40,h:17};
export const SWAP_CANCEL:Rect={x:176,y:309,w:128,h:24};

export const RESULT_BUTTONS={x:140,y:286,w:200,h:22,gap:4,count:2};
export const resultButtonRect=(i:number):Rect=>({...RESULT_BUTTONS,y:RESULT_BUTTONS.y+i*(RESULT_BUTTONS.h+RESULT_BUTTONS.gap)});
export function resultButtonHit(x:number,y:number){for(let i=0;i<RESULT_BUTTONS.count;i++)if(inside(x,y,resultButtonRect(i)))return i;return -1;}

export const SETTINGS={x:34,y:82,w:202,h:26,gapX:8,gapY:6,cols:2,rows:6};
export const settingsRect=(i:number):Rect=>({x:SETTINGS.x+(i>=SETTINGS.rows?SETTINGS.w+SETTINGS.gapX:0),y:SETTINGS.y+(i%SETTINGS.rows)*(SETTINGS.h+SETTINGS.gapY),w:SETTINGS.w,h:SETTINGS.h});
export const settingsMinusRect=(i:number):Rect=>{const r=settingsRect(i);return{x:r.x+r.w-78,y:r.y+3,w:22,h:r.h-6};};
export const settingsPlusRect=(i:number):Rect=>{const r=settingsRect(i);return{x:r.x+r.w-24,y:r.y+3,w:22,h:r.h-6};};
export const settingsActionRect=(i:number):Rect=>{const r=settingsRect(i);return{x:r.x+r.w-88,y:r.y+3,w:84,h:r.h-6};};

export const UPGRADE_CARD={x:38,y:76,w:404,h:50,gap:6,count:4};
export const upgradeRect=(i:number):Rect=>({x:UPGRADE_CARD.x,y:UPGRADE_CARD.y+i*(UPGRADE_CARD.h+UPGRADE_CARD.gap),w:UPGRADE_CARD.w,h:UPGRADE_CARD.h});
export const upgradeActionRect=(i:number):Rect=>{const r=upgradeRect(i);return{x:r.x+r.w-118,y:r.y+9,w:104,h:32};};

export const ENDLESS_RESUME={x:85,y:150,w:310,h:42,gap:10,count:2};
export const endlessResumeRect=(i:number):Rect=>({x:ENDLESS_RESUME.x,y:ENDLESS_RESUME.y+i*(ENDLESS_RESUME.h+ENDLESS_RESUME.gap),w:ENDLESS_RESUME.w,h:ENDLESS_RESUME.h});

export const ENDLESS_REWARD={y:118,h:112,w:122,gap:12,startX:45};
export function endlessRewardHit(x:number,y:number,count:number){for(let i=0;i<count;i++)if(inside(x,y,{x:ENDLESS_REWARD.startX+i*(ENDLESS_REWARD.w+ENDLESS_REWARD.gap),y:ENDLESS_REWARD.y,w:ENDLESS_REWARD.w,h:ENDLESS_REWARD.h}))return i;return -1;}
export const ENDLESS_SECONDARY:Rect={x:148,y:268,w:184,h:28};

export const SWAP_LAYOUT={x:35,y:51,w:410,h:250,cardsY:171,cardW:185,cardH:84,gap:8};
export function swapHit(x:number,y:number){for(let i=0;i<2;i++)if(inside(x,y,{x:SWAP_LAYOUT.x+16+i*(SWAP_LAYOUT.cardW+SWAP_LAYOUT.gap),y:SWAP_LAYOUT.cardsY,w:SWAP_LAYOUT.cardW,h:SWAP_LAYOUT.cardH}))return i;return -1;}
export const ACTIVE_SWAP={x:95,y:78,w:290,h:196,confirm:{x:118,y:228,w:110,h:28},cancel:{x:252,y:228,w:110,h:28}};
export function activeSwapHit(x:number,y:number):'confirm'|'cancel'|-1{if(inside(x,y,ACTIVE_SWAP.confirm))return'confirm';if(inside(x,y,ACTIVE_SWAP.cancel))return'cancel';return-1;}

export const WARDROBE={x:203,y:70,w:252,h:228,cols:3,cellW:76,cellH:94,gap:6};
export const WARDROBE_ACTION={x:43,y:276,w:135,h:23};
export function wardrobeHit(x:number,y:number,scroll:number,count:number){if(!inside(x,y,WARDROBE))return-1;for(let i=0;i<count;i++)if(inside(x,y,{x:WARDROBE.x+(i%3)*(WARDROBE.cellW+WARDROBE.gap),y:WARDROBE.y+Math.floor(i/3)*(WARDROBE.cellH+WARDROBE.gap)-scroll,w:WARDROBE.cellW,h:WARDROBE.cellH}))return i;return-1;}

export const COLLECTION={x:200,y:106,w:251,h:200,cols:4,cellW:53,cellH:56,gap:8};
export const COLLECTION_FILTER:Rect={x:196,y:81,w:78,h:20};
export const COLLECTION_SORT:Rect={x:279,y:81,w:78,h:20};
export const COLLECTION_CAREER:Rect={x:362,y:81,w:90,h:20};
