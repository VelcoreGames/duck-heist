// Componentes de interfaz + escena del menú principal.
// CAPA DE UI  -> tipografía nítida (Bungee para títulos, Chakra Petch para texto)
// CAPA MUNDO  -> pixel art; si lleva texto, usa una fuente monoespaciada diminuta.
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_BASE_WIDTH } from './constants';
import { drawDuck } from './sprites';
import { drawPixelLogo } from './titleScene';

type Ctx = CanvasRenderingContext2D;

function softPanelPath(ctx:Ctx,x:number,y:number,w:number,h:number,r=4){
  const rr=Math.max(2,Math.min(r,Math.floor(Math.min(w,h)/3)));
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.lineTo(x+w-rr,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);
  ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);
  ctx.quadraticCurveTo(x,y,x+rr,y);
  ctx.closePath();
}


// ---------------------------------------------------------------------------
// Estilo kawaii de la interfaz: paneles redondos color ciruela, contorno
// oscuro grueso, sombra sólida tipo caricatura y acentos pastel.
export const UI_INK='#130f24';
function lum(c:string){
  const m=c.match(/rgba?\(([^)]+)\)/);let r=0,g=0,b=0;
  if(m){[r,g,b]=m[1].split(',').map(v=>parseFloat(v));}
  else if(c.startsWith('#')){const h=c.slice(1);r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);}
  return (r*.299+g*.587+b*.114)/255;
}
function alphaOf(c:string){const m=c.match(/rgba\([^)]*,\s*([\d.]+)\)/);return m?parseFloat(m[1]):1;}
/** Los fondos oscuros heredados (azul petróleo) pasan a ciruela; los claros se respetan. */
export function plumFill(fill:string,tone=0){
  if(lum(fill)>.22)return fill;
  const base=tone>0?[52,42,87]:tone<0?[33,26,58]:[42,34,71];
  return `rgba(${base[0]},${base[1]},${base[2]},${Math.max(.9,alphaOf(fill))})`;
}
function cartoonBox(ctx:Ctx,x:number,y:number,w:number,h:number,r:number,fill:string,shadow=3){
  ctx.fillStyle='rgba(11,8,24,.55)';softPanelPath(ctx,x,y+shadow,w,h,r);ctx.fill();
  ctx.fillStyle=UI_INK;softPanelPath(ctx,x-1,y-1,w+2,h+2,r+1);ctx.fill();
  ctx.fillStyle=fill;softPanelPath(ctx,x+1,y+1,w-2,h-2,Math.max(2,r-1));ctx.fill();
}

export const FONT_TITLE = "'Bungee', 'Chakra Petch', monospace";
export const FONT_UI = "'Chakra Petch', 'Trebuchet MS', sans-serif";

/** Texto nítido de interfaz */
export function text(
  ctx: Ctx, str: string, x: number, y: number,
  size = 10, color = '#ecf0f1', align: CanvasTextAlign = 'center',
  strong = false, shadow = true,
) {
  ctx.save();
  ctx.font = `${strong ? '700' : '600'} ${size}px ${FONT_UI}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = true;
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(str, x + Math.max(1, size * 0.09), y + Math.max(1, size * 0.09));
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Título con la tipografía display */
export function titleText(
  ctx: Ctx, str: string, x: number, y: number,
  size = 16, color = '#f4d03f', align: CanvasTextAlign = 'center', shadow = true,
) {
  ctx.save();
  ctx.font = `${size}px ${FONT_TITLE}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillText(str, x + Math.max(1, size * 0.07), y + Math.max(1, size * 0.07));
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function wrappedText(ctx:Ctx,str:string,x:number,y:number,width:number,size=8,lineHeight=11,maxLines=2,color='#c3cbd9',strong=false) {
  ctx.save();ctx.font=`${strong?700:500} ${size}px ${FONT_UI}`;
  const words=str.split(/\s+/), lines:string[]=[];
  let line='';
  for(const word of words) {
    if(line && ctx.measureText(`${line} ${word}`).width>width) { lines.push(line);line=word; }
    else line=line?`${line} ${word}`:word;
  }
  if(line) lines.push(line);
  if(lines.length>maxLines) {
    lines.length=maxLines;
    let last=lines[maxLines-1];
    while(last && ctx.measureText(`${last}…`).width>width) last=last.slice(0,-1);
    lines[maxLines-1]=`${last}…`;
  }
  lines.forEach((l,i)=>text(ctx,l,x,y+i*lineHeight,size,color,'left',strong,false));ctx.restore();
  return lines.length*lineHeight;
}

/** Texto diminuto para la capa de mundo pixelada (etiquetas dentro del mundo) */
export function pixelText(ctx: Ctx, str: string, x: number, y: number, color = '#fff') {
  ctx.save();
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Panel limpio con borde suave y sin esquinas técnicas. */
export function drawPanel(
  ctx: Ctx, x: number, y: number, w: number, h: number,
  fill = 'rgba(42,34,71,0.97)', border = '#ffd45e', accent = '#6b5fa0',
) {
  ctx.save();
  cartoonBox(ctx,x,y,w,h,7,plumFill(fill));
  // brillo superior pastel y cinta de acento
  ctx.globalAlpha=.16;ctx.fillStyle='#ffffff';softPanelPath(ctx,x+3,y+2,w-6,Math.min(10,h/3),5);ctx.fill();
  ctx.globalAlpha=.9;ctx.fillStyle=border;
  ctx.fillRect(x+10,y+1,Math.min(w-20,Math.max(30,w*.3)),2);
  ctx.globalAlpha=.35;ctx.strokeStyle=accent;ctx.lineWidth=1;softPanelPath(ctx,x+3.5,y+3.5,w-7,h-7,5);ctx.stroke();
  ctx.globalAlpha=1;
  ctx.restore();
}

export interface MenuButton {
  label: string;
  hint?: string;
  disabled?: boolean;
  color?: string;
}

/** Lista de botones con marco, selección animada y flechas */
export function drawButtons(
  ctx: Ctx, buttons: MenuButton[], selected: number,
  cx: number, top: number, frame: number, width = 170, height = 24, gap = 6,
) {
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    const y = top + i * (height + gap);
    const on = i === selected;
    const x = cx - width / 2;
    const col = b.disabled ? '#6e6696' : (b.color ?? MENU_THEME.gold);
    const lift = on ? Math.round(Math.sin(frame * .15)) - 1 : 0;
    cartoonBox(ctx, x, y + lift, width, height, Math.min(10, height / 2), on ? col : '#342a57', on ? 4 : 3);
    const textCol = b.disabled ? '#8f88b3' : on ? UI_INK : MENU_THEME.paper;
    titleText(ctx, b.label, cx, y + lift + height / 2 + height * .28, on ? 11 : 10, textCol, 'center', !on);
    if (on) text(ctx, '★', x + 12, y + lift + height / 2 + 4, 8, UI_INK, 'center', true);
    if (b.hint) text(ctx, b.hint, x + width - 12, y + lift + height / 2 + 4, 8, on ? UI_INK : MENU_THEME.muted, 'right');
  }
}

/** Barra de valor (volumen, vibración...) */
export function drawBar(ctx: Ctx, x: number, y: number, w: number, value: number, color = '#ffd45e') {
  const v=Math.max(0,Math.min(1,value));
  ctx.save();
  ctx.fillStyle=UI_INK;softPanelPath(ctx,x-1,y-1,w+2,10,4);ctx.fill();
  ctx.fillStyle='#3a3060';softPanelPath(ctx,x,y,w,8,3);ctx.fill();
  if(v>0){ctx.fillStyle=color;softPanelPath(ctx,x+1,y+1,Math.max(4,(w-2)*v),6,3);ctx.fill();
    ctx.globalAlpha=.45;ctx.fillStyle='#ffffff';ctx.fillRect(x+3,y+2,Math.max(1,(w-6)*v),1);ctx.globalAlpha=1;}
  ctx.restore();
}

export const MENU_THEME = {
  ink:'#130f24',
  ink2:'#1b1533',
  panel:'#2a2247',
  panel2:'#342a57',
  steel:'#4a3f73',
  steel2:'#6e62a0',
  line:'#6b5fa0',
  lineSoft:'rgba(200,180,255,.18)',
  muted:'#b3a9d6',
  text:'#fff6ea',
  gold:'#ffd45e',
  goldBright:'#fff0a3',
  gold2:'#e09a2e',
  paper:'#fff1d6',
  cyan:'#8ff0e6',
  red:'#ff6b7f',
  green:'#8fe8b0',
};

/** Fondo común para pantallas de menú: limpio, sin marco perimetral rígido. */
export function drawMenuBackdrop(ctx:Ctx,frame:number,opacity=.82,accent=MENU_THEME.gold) {
  ctx.save();
  const g=ctx.createLinearGradient(0,0,0,CANVAS_HEIGHT);
  g.addColorStop(0,`rgba(27,21,51,${Math.min(.98,opacity+.06)})`);g.addColorStop(1,`rgba(42,26,64,${Math.min(.98,opacity+.06)})`);
  ctx.fillStyle=g;ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);
  // lunares suaves y estrellitas que titilan
  ctx.fillStyle='#ffffff';
  for(let y=14,row=0;y<CANVAS_HEIGHT;y+=28,row++)for(let x=(row%2)*20+10;x<UI_BASE_WIDTH;x+=40){ctx.globalAlpha=.035;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<14;i++){
    const x=(i*97+31)%(UI_BASE_WIDTH-20)+10,y=(i*53+17)%(CANVAS_HEIGHT-20)+10,t=(frame*.05+i*1.7);
    ctx.globalAlpha=.15+.25*Math.max(0,Math.sin(t));ctx.fillStyle=i%3?accent:'#ffc2d4';
    ctx.fillRect(x,y-1,1,3);ctx.fillRect(x-1,y,3,1);
  }
  ctx.restore();
}

/** Encabezado común: placa suave, sin borde rectangular dominante. */
export function drawMenuHeader(
  ctx:Ctx,title:string,subtitle:string,frame:number,
  accent=MENU_THEME.gold,eyebrow='EXPEDIENTE DEL ATRACO',
) {
  ctx.save();
  const x=22,y=15,w=UI_BASE_WIDTH-44,h=46;
  cartoonBox(ctx,x,y,w,h,8,'#2a2247');
  ctx.globalAlpha=.14;ctx.fillStyle='#ffffff';softPanelPath(ctx,x+3,y+2,w-6,10,6);ctx.fill();ctx.globalAlpha=1;
  // listón de acento con el rótulo
  const tagW=Math.min(170,eyebrow.length*4.4+20);
  ctx.fillStyle=UI_INK;softPanelPath(ctx,x+11,y-6,tagW+2,13,6);ctx.fill();
  ctx.fillStyle=accent;softPanelPath(ctx,x+12,y-5,tagW,11,5);ctx.fill();
  text(ctx,eyebrow,x+20,y+3,4.8,UI_INK,'left',true,false);
  const titleSize=title.length>22?11.7:title.length>17?13.0:14.7;
  ctx.save();
  ctx.beginPath();ctx.rect(x+12,y+12,258,30);ctx.clip();
  titleText(ctx,title,x+16,y+36,titleSize,MENU_THEME.paper,'left',false);
  ctx.restore();
  const maxSub=subtitle.length>49?subtitle.slice(0,48)+'…':subtitle;
  text(ctx,'BANCO DEL PAN',x+w-14,y+14,4.0,'#8f84bd','right',true,false);
  text(ctx,maxSub,x+w-14,y+35,4.9,MENU_THEME.muted,'right',false,false);
  for(let i=0;i<3;i++){
    const on=i===Math.floor(frame/24)%3;
    ctx.fillStyle=on?accent:'#5a4f88';
    ctx.beginPath();ctx.arc(x+w-44+i*10,y+24,on?2.2:1.6,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

/** Tarjeta de menú con borde suave y selección limpia. */
export function drawMenuCard(
  ctx:Ctx,x:number,y:number,w:number,h:number,
  selected=false,accent=MENU_THEME.gold,fill='rgba(42,34,71,.97)',
) {
  ctx.save();
  cartoonBox(ctx,x,y,w,h,7,plumFill(fill,selected?1:0),selected?3:2);
  ctx.globalAlpha=.12;ctx.fillStyle='#ffffff';softPanelPath(ctx,x+3,y+2,w-6,Math.min(8,h/3),5);ctx.fill();ctx.globalAlpha=1;
  if(selected){
    ctx.strokeStyle=accent;ctx.lineWidth=2;softPanelPath(ctx,x+2,y+2,w-4,h-4,6);ctx.stroke();
    ctx.globalAlpha=.12;ctx.fillStyle=accent;softPanelPath(ctx,x+3,y+3,w-6,h-6,5);ctx.fill();ctx.globalAlpha=1;
    // estrellita en la esquina
    ctx.fillStyle=accent;ctx.fillRect(x+w-9,y+3,1,5);ctx.fillRect(x+w-11,y+5,5,1);
  }
  ctx.restore();
}

/** Opción principal pensada para hover + clic. Sin numeración decorativa. */
export function drawMenuChoice(
  ctx:Ctx,_index:number,label:string,description:string,
  x:number,y:number,w:number,h:number,selected:boolean,frame:number,
  accent=MENU_THEME.gold,
) {
  drawMenuCard(ctx,x,y,w,h,selected,accent,selected?'rgba(36,39,29,.96)':'rgba(11,25,31,.93)');
  text(ctx,label,x+13,y+13,7.5,selected?'#fff3c4':MENU_THEME.text,'left',true,false);
  if(description) text(ctx,description,x+13,y+h-5,4.6,selected?'#c9b978':MENU_THEME.muted,'left',false,false);
  if(selected){
    const sx=x+w-13+Math.sin(frame*.12)*1.2;
    text(ctx,'›',sx,y+h/2+4,12,accent,'center',true,false);
  }
}

export function drawMouseButton(ctx:Ctx,label:string,x:number,y:number,w:number,h:number,hover=false,accent=MENU_THEME.gold,danger=false,disabled=false){
  const col=disabled?'#6e6696':danger?MENU_THEME.red:accent;
  ctx.save();
  const r=Math.min(9,h/2);
  cartoonBox(ctx,x,y-(hover&&!disabled?1:0),w,h,r,disabled?'#2a2440':hover?col:'#342a57',hover&&!disabled?4:3);
  if(!disabled){ctx.globalAlpha=hover?.35:.12;ctx.fillStyle='#ffffff';softPanelPath(ctx,x+3,y+2-(hover?1:0),w-6,Math.min(6,h/3),4);ctx.fill();ctx.globalAlpha=1;}
  text(ctx,label,x+w/2,y+h/2+3.5-(hover&&!disabled?1:0),6.2,disabled?'#8f88b3':hover?UI_INK:MENU_THEME.paper,'center',true,false);
  ctx.restore();
}

/** Pie consistente de controles. */
export function drawMenuFooter(ctx:Ctx,left:string,right='',accent=MENU_THEME.gold) {
  ctx.save();
  const x=22,y=CANVAS_HEIGHT-29,w=UI_BASE_WIDTH-44,h=19;
  cartoonBox(ctx,x,y,w,h,9,'#221b3d',2);
  text(ctx,left,x+12,y+13,5.7,MENU_THEME.muted,'left',true,false);
  if(right) text(ctx,right,x+w-10,y+13,5.7,accent,'right',true,false);
  ctx.restore();
}

/** Etiqueta de sección tipo sello. */
export function drawSectionLabel(ctx:Ctx,label:string,x:number,y:number,accent=MENU_THEME.gold) {
  ctx.save();
  const w=label.length*4.6+14;
  ctx.fillStyle=UI_INK;softPanelPath(ctx,x-1,y-9,w+2,13,6);ctx.fill();
  ctx.fillStyle=accent;softPanelPath(ctx,x,y-8,w,11,5);ctx.fill();
  text(ctx,label,x+7,y,5.0,UI_INK,'left',true,false);
  ctx.restore();
}

/** Chip de control para teclas/botones. */
export function drawKeyChip(ctx:Ctx,key:string,x:number,y:number,w=34,active=true) {
  ctx.save();
  ctx.fillStyle=UI_INK;softPanelPath(ctx,x-1,y-1,w+2,16,4);ctx.fill();
  ctx.fillStyle=active?'#c9b8f0':'#5a4f88';softPanelPath(ctx,x,y+1,w,14,3);ctx.fill();
  ctx.fillStyle=active?'#fff6ea':'#7a6fae';softPanelPath(ctx,x,y,w,12,3);ctx.fill();
  text(ctx,key,x+w/2,y+9,5.6,active?UI_INK:'#d8d0f0','center',true,false);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ESCENA DEL MENÚ PRINCIPAL (se dibuja en la capa de mundo pixelada)
// ---------------------------------------------------------------------------

interface Crumb { x: number; y: number; s: number; ph: number; }
const crumbs: Crumb[] = Array.from({ length: 26 }, () => ({
  x: Math.random() * CANVAS_WIDTH,
  y: Math.random() * CANVAS_HEIGHT,
  s: 0.15 + Math.random() * 0.35,
  ph: Math.random() * Math.PI * 2,
}));

export function drawMenuScene(ctx: Ctx, frame: number) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  g.addColorStop(0, '#0a0e1e');
  g.addColorStop(0.55, '#121728');
  g.addColorStop(1, '#080a14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Suelo de mármol del vestíbulo
  ctx.fillStyle = '#161b2c';
  ctx.fillRect(0, 235, CANVAS_WIDTH, CANVAS_HEIGHT - 235);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1b2136' : '#141a2b';
    ctx.fillRect(i * 32, 235, 32, 6);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 64 + 10, 241, 2, CANVAS_HEIGHT - 241);

  // Pared con paneles
  ctx.fillStyle = '#0e1322';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 235);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#131a2c';
    ctx.fillRect(8 + i * 82, 20, 60, 200);
    ctx.fillStyle = '#0c1120';
    ctx.fillRect(11 + i * 82, 23, 54, 194);
  }

  const vx = CANVAS_WIDTH / 2;
  const vaultY = 132;

  // Luz dorada de la bóveda
  const lightPulse = 0.55 + Math.sin(frame * 0.035) * 0.18;
  const lg = ctx.createRadialGradient(vx, vaultY, 6, vx, vaultY, 132);
  lg.addColorStop(0, `rgba(255,214,102,${0.42 * lightPulse})`);
  lg.addColorStop(0.45, `rgba(244,208,63,${0.16 * lightPulse})`);
  lg.addColorStop(1, 'rgba(244,208,63,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Haz de luz proyectado en el suelo
  ctx.globalAlpha = 0.14 * lightPulse;
  ctx.fillStyle = '#f4d03f';
  ctx.beginPath();
  ctx.moveTo(vx - 42, 200);
  ctx.lineTo(vx + 42, 200);
  ctx.lineTo(vx + 96, CANVAS_HEIGHT);
  ctx.lineTo(vx - 96, CANVAS_HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Estructura de la bóveda
  ctx.fillStyle = '#0a0d18';
  ctx.fillRect(vx - 84, vaultY - 78, 168, 150);
  ctx.fillStyle = '#2b323f';
  ctx.fillRect(vx - 80, vaultY - 74, 160, 142);
  ctx.fillStyle = '#1d2330';
  ctx.fillRect(vx - 74, vaultY - 68, 148, 130);
  ctx.fillStyle = '#8a94a0';
  for (let i = 0; i < 9; i++) {
    ctx.fillRect(vx - 78 + i * 19, vaultY - 72, 3, 3);
    ctx.fillRect(vx - 78 + i * 19, vaultY + 62, 3, 3);
  }
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(vx - 78, vaultY - 66 + i * 19, 3, 3);
    ctx.fillRect(vx + 75, vaultY - 66 + i * 19, 3, 3);
  }

  // Puerta con forma de hogaza
  const r = 58;
  ctx.fillStyle = '#a9752f';
  ctx.beginPath();
  ctx.arc(vx, vaultY - 6, r, Math.PI, 0);
  ctx.rect(vx - r, vaultY - 6, r * 2, 46);
  ctx.fill();
  ctx.fillStyle = '#d9a24a';
  ctx.beginPath();
  ctx.arc(vx, vaultY - 6, r - 7, Math.PI, 0);
  ctx.rect(vx - (r - 7), vaultY - 6, (r - 7) * 2, 39);
  ctx.fill();
  ctx.fillStyle = '#e8c07a';
  ctx.beginPath();
  ctx.arc(vx, vaultY - 6, r - 15, Math.PI, 0);
  ctx.rect(vx - (r - 15), vaultY - 6, (r - 15) * 2, 32);
  ctx.fill();

  ctx.strokeStyle = '#8a5a1f';
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(vx + i * 26 - 9, vaultY - 46);
    ctx.lineTo(vx + i * 26 + 5, vaultY - 30);
    ctx.stroke();
  }

  ctx.fillStyle = '#6c7684';
  ctx.fillRect(vx - r, vaultY + 22, r * 2, 5);
  ctx.fillStyle = '#98a2ae';
  ctx.fillRect(vx - r, vaultY + 22, r * 2, 2);

  const wheelSpin = frame * 0.006;
  ctx.save();
  ctx.translate(vx, vaultY);
  ctx.rotate(wheelSpin);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#f4d03f';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
    ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath(); ctx.arc(vx, vaultY, 5, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = lightPulse;
  ctx.fillStyle = '#ffe89a';
  ctx.fillRect(vx - 2, vaultY - 60, 4, 96);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#2b323f';
  ctx.fillRect(vx + 64, vaultY + 4, 14, 20);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = (frame + i * 11) % 90 < 12 ? '#39d353' : '#4c5666';
    ctx.fillRect(vx + 66 + (i % 2) * 5, vaultY + 7 + Math.floor(i / 2) * 5, 4, 4);
  }

  drawWantedPoster(ctx, 34, 52, frame, 0);
  drawWantedPoster(ctx, CANVAS_WIDTH - 66, 64, frame, 1.7);
  drawSecurityCam(ctx, 96, 26, frame, 1);
  drawSecurityCam(ctx, CANVAS_WIDTH - 106, 26, frame, -1);
  drawCoinPile(ctx, vx - 118, 246, frame, 5);
  drawCoinPile(ctx, vx + 92, 252, frame, 4);
  drawCoinPile(ctx, vx + 128, 240, frame, 3);

  for (const c of crumbs) {
    c.y -= c.s;
    if (c.y < -4) { c.y = CANVAS_HEIGHT + 4; c.x = Math.random() * CANVAS_WIDTH; }
    const sway = Math.sin(frame * 0.02 + c.ph) * 6;
    const a = 0.25 + Math.sin(frame * 0.05 + c.ph) * 0.2;
    ctx.globalAlpha = Math.max(0.08, a);
    ctx.fillStyle = '#e8c99b';
    ctx.fillRect(Math.floor(c.x + sway), Math.floor(c.y), 2, 2);
  }
  ctx.globalAlpha = 1;

  // El pato criminal
  const duckBob = Math.round(Math.sin(frame * 0.045));
  const dx = vx - 14;
  const dy = 196 + duckBob;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(dx + 14, dy + 36, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.scale(1.75, 1.75);
  drawDuck(ctx, dx / 1.75, dy / 1.75, frame, 'down', false, false, false);
  ctx.restore();

  if (frame % 420 < 90) {
    const bubX = dx + 62;
    const bubY = dy - 6;
    ctx.fillStyle = 'rgba(12,14,26,0.92)';
    ctx.fillRect(bubX - 24, bubY - 12, 50, 16);
    ctx.fillStyle = '#f4d03f';
    ctx.fillRect(bubX - 24, bubY - 12, 50, 1);
    ctx.fillRect(bubX - 24, bubY + 3, 50, 1);
    ctx.fillRect(bubX - 27, bubY - 3, 3, 3);
    pixelText(ctx, '¡CUAC!', bubX + 1, bubY + 1, '#fff6c9');
  }

  // Viñeta
  const vg = ctx.createRadialGradient(vx, CANVAS_HEIGHT / 2, 90, vx, CANVAS_HEIGHT / 2, 330);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawWantedPoster(ctx: Ctx, x: number, y: number, frame: number, phase: number) {
  const sway = Math.sin(frame * 0.02 + phase) * 0.6;
  ctx.save();
  ctx.translate(x + 16, y);
  ctx.rotate(sway * 0.02);
  ctx.translate(-16, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(2, 2, 32, 42);
  ctx.fillStyle = '#d9cba6';
  ctx.fillRect(0, 0, 32, 42);
  ctx.fillStyle = '#b8a882';
  ctx.fillRect(0, 0, 32, 2);
  ctx.fillRect(0, 40, 32, 2);
  pixelText(ctx, 'SE BUSCA', 16, 9, '#4a3a22');
  ctx.fillStyle = '#b8a882';
  ctx.fillRect(6, 12, 20, 16);
  ctx.fillStyle = '#f9e547';
  ctx.fillRect(9, 16, 14, 11);
  ctx.fillStyle = '#15151f';
  ctx.fillRect(9, 18, 14, 4);
  ctx.fillStyle = '#f0912b';
  ctx.fillRect(22, 23, 4, 2);
  pixelText(ctx, '$9999', 16, 36, '#8a2c2c');
  ctx.restore();
}

function drawSecurityCam(ctx: Ctx, x: number, y: number, frame: number, dir: number) {
  const swing = Math.sin(frame * 0.018) * 0.42;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#39404f';
  ctx.fillRect(-2, -6, 4, 8);
  ctx.fillStyle = '#4c5666';
  ctx.fillRect(-6, -8, 12, 3);
  ctx.rotate(swing * dir);
  ctx.fillStyle = '#39404f';
  ctx.fillRect(-4, 0, 16 * dir, 8);
  ctx.fillStyle = '#586274';
  ctx.fillRect(-3, 1, 14 * dir, 3);
  ctx.fillStyle = '#12161f';
  ctx.fillRect(10 * dir, 1, 4 * dir, 6);
  const on = Math.floor(frame * 0.05) % 2 === 0;
  ctx.fillStyle = on ? '#ff3b30' : '#5a1f1c';
  ctx.fillRect(-3 * dir, 2, 3, 3);
  if (on) {
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.moveTo(12 * dir, 4);
    ctx.lineTo(70 * dir, 40);
    ctx.lineTo(70 * dir, -22);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCoinPile(ctx: Ctx, x: number, y: number, frame: number, rows: number) {
  for (let r = 0; r < rows; r++) {
    const count = rows - r;
    for (let i = 0; i < count; i++) {
      const cx = x + i * 9 + r * 4;
      const cy = y - r * 4;
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(cx, cy, 8, 4);
      ctx.fillStyle = '#f4d03f';
      ctx.fillRect(cx, cy, 8, 2);
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(cx + 1, cy, 3, 1);
    }
  }
  const t = (frame * 0.03) % 6;
  if (t < 1) {
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(x + 6, y - rows * 4 - 3, 2, 2);
    ctx.fillRect(x + 5, y - rows * 4 - 2, 4, 1);
  }
}

/** Logotipo del juego (capa de UI, tipografía display) */
export function drawTitleLogo(ctx: Ctx, cx: number, y: number, frame: number) {
  drawPixelLogo(ctx);
  text(ctx,'E L   B A N C O   D E L   P A N',cx,83,10,'#c4cfb2','center',true);
  ctx.fillStyle='#6b6850';ctx.fillRect(cx-109,88,218,1);
  void y; void frame;
}
