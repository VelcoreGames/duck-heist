// Componentes de interfaz + escena del menú principal.
// CAPA DE UI  -> tipografía nítida (Bungee para títulos, Chakra Petch para texto)
// CAPA MUNDO  -> pixel art; si lleva texto, usa una fuente monoespaciada diminuta.
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_BASE_WIDTH } from './constants';
import { drawDuck } from './sprites';

type Ctx = CanvasRenderingContext2D;

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

/** Panel con marco pixel-art de doble borde */
export function drawPanel(
  ctx: Ctx, x: number, y: number, w: number, h: number,
  fill = 'rgba(10,13,24,0.94)', border = '#f4d03f', accent = '#39414f',
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x + 3, y + 3, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  // sutil degradado interior
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.045)');
  g.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y + 2, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
  ctx.fillRect(x + 2, y + 2, 1, h - 4);
  ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
  for (const [cx, cy] of [[x, y], [x + w - 4, y], [x, y + h - 4], [x + w - 4, y + h - 4]]) {
    ctx.fillRect(cx, cy, 4, 4);
  }
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
    const pulse = on ? Math.sin(frame * 0.14) * 1.1 : 0;

    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(x + 2, y + 2, width, height);
    const g = ctx.createLinearGradient(x, y, x, y + height);
    if (on) { g.addColorStop(0, '#d9bc70'); g.addColorStop(.5, '#b8943e'); g.addColorStop(1, '#8c6b28'); }
    else { g.addColorStop(0, '#24343c'); g.addColorStop(1, '#15242c'); }
    ctx.fillStyle = g;
    ctx.fillRect(x + pulse, y, width, height);
    ctx.strokeStyle = on ? '#fff0b0' : '#3b5355';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5 + pulse, y + .5, width - 1, height - 1);
    ctx.fillStyle = on ? 'rgba(255,255,220,.18)' : 'rgba(255,255,255,.05)';
    ctx.fillRect(x + 3 + pulse, y + 2, width - 6, 1);
    if (on) {
      ctx.fillStyle = 'rgba(255,255,220,.12)';
      ctx.fillRect(x + 4 + (frame * .7) % (width - 20) + pulse, y + 3, 16, height - 6);
    }

    const col = b.disabled ? '#5c6472' : on ? '#17262a' : (b.color ?? '#c3cbd9');
    titleText(ctx, b.label, cx + (on ? pulse : 0), y + height / 2 + (height * 0.28), on ? 11 : 10, col, 'center', true);

    if (on) {
      text(ctx, '\u25B8', x - 12 + pulse, y + height / 2 + 4, 11, '#f4d03f', 'center');
      text(ctx, '\u25C2', x + width + 12 + pulse, y + height / 2 + 4, 11, '#f4d03f', 'center');
    }
    if (b.hint) {
      text(ctx, b.hint, x + width - 6, y + height / 2 + 4, 9, on ? '#f4d03f' : '#7c8494', 'right');
    }
  }
}

/** Barra de valor (volumen, vibración...) */
export function drawBar(ctx: Ctx, x: number, y: number, w: number, value: number, color = '#f4d03f') {
  ctx.fillStyle = '#1a1f2b';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = '#2f3644';
  ctx.fillRect(x + 1, y + 1, w - 2, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * Math.max(0, Math.min(1, value))), 6);
  // segmentos
  ctx.fillStyle = 'rgba(10,13,24,0.8)';
  for (let i = 1; i < 10; i++) ctx.fillRect(x + (w / 10) * i, y + 1, 1, 6);
}

export const MENU_THEME = {
  // Paleta kawaii/chibi: brillante, suave y contrastada sin perder lectura.
  ink:'#2d3158',
  ink2:'#3b3f6b',
  panel:'#fff8f2',
  panel2:'#f6f0ff',
  steel:'#80d6ef',
  steel2:'#a8b8ee',
  line:'#ffffff',
  lineSoft:'rgba(77,76,126,.16)',
  muted:'#6f7398',
  text:'#40436d',
  gold:'#ffc95f',
  goldBright:'#fff0a8',
  gold2:'#e8a84c',
  paper:'#fffaf2',
  cyan:'#66d9ee',
  red:'#ff7396',
  green:'#75ddb8',
  pink:'#ff8fbd',
  lavender:'#b99cff',
  peach:'#ffae79',
};

function roundedPath(ctx:Ctx,x:number,y:number,w:number,h:number,radius:number){
  const rr=Math.max(0,Math.min(radius,w/2,h/2));
  ctx.beginPath();
  ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();
}
function roundedFill(ctx:Ctx,x:number,y:number,w:number,h:number,radius:number,color:string){
  roundedPath(ctx,x,y,w,h,radius);ctx.fillStyle=color;ctx.fill();
}
function kawaiiSparkle(ctx:Ctx,x:number,y:number,size:number,color:string,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(x,y-size);ctx.lineTo(x+size*.28,y-size*.28);ctx.lineTo(x+size,y);
  ctx.lineTo(x+size*.28,y+size*.28);ctx.lineTo(x,y+size);ctx.lineTo(x-size*.28,y+size*.28);
  ctx.lineTo(x-size,y);ctx.lineTo(x-size*.28,y-size*.28);ctx.closePath();ctx.fill();ctx.restore();
}

/** Fondo común para pantallas de menú: oscurece el mundo sin borrar su contexto. */
export function drawMenuBackdrop(ctx:Ctx,frame:number,opacity=.82,accent=MENU_THEME.gold) {
  ctx.save();
  // Velo luminoso y lechoso: mantiene contexto del fondo pero elimina el aspecto industrial oscuro.
  const bg=ctx.createLinearGradient(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);
  bg.addColorStop(0,`rgba(255,239,247,${Math.min(.92,opacity)})`);
  bg.addColorStop(.48,`rgba(235,247,255,${Math.min(.90,opacity)})`);
  bg.addColorStop(1,`rgba(244,238,255,${Math.min(.92,opacity)})`);
  ctx.fillStyle=bg;ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);

  // Burbujas y estrellitas de baja intensidad dan vida sin competir con el texto.
  for(let i=0;i<9;i++){
    const x=24+(i*59)%438,y=72+(i*37)%224;
    ctx.globalAlpha=.07+(i%3)*.025;ctx.fillStyle=i%2?MENU_THEME.pink:MENU_THEME.cyan;
    ctx.beginPath();ctx.arc(x,y,7+(i%4)*3,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<7;i++){
    const x=30+(i*71+frame*.08)%430,y=46+(i*43)%260;
    kawaiiSparkle(ctx,x,y,2+(i%2),i%3===0?MENU_THEME.gold:accent,.12+.05*Math.sin(frame*.035+i));
  }
  ctx.globalAlpha=1;

  // Marco suave tipo sticker.
  roundedPath(ctx,12,10,UI_BASE_WIDTH-24,CANVAS_HEIGHT-20,18);
  ctx.strokeStyle='rgba(255,255,255,.70)';ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}

/** Encabezado tipo expediente bancario para todos los menús. */
export function drawMenuHeader(
  ctx:Ctx,title:string,subtitle:string,frame:number,
  accent=MENU_THEME.gold,eyebrow='DUCK HEIST',
) {
  ctx.save();
  const x=22,y=14,w=UI_BASE_WIDTH-44,h=48;
  ctx.shadowColor='rgba(72,55,103,.16)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
  roundedFill(ctx,x,y,w,h,15,'rgba(255,250,248,.96)');
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  roundedPath(ctx,x+.5,y+.5,w-1,h-1,15);ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=2;ctx.stroke();

  // Insignia redonda con cara de pato simplificada.
  ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x+22,y+24,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff8ed';ctx.beginPath();ctx.arc(x+22,y+22,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=MENU_THEME.ink;ctx.fillRect(x+18,y+20,2,2);ctx.fillRect(x+24,y+20,2,2);
  ctx.fillStyle='#ffad62';ctx.fillRect(x+20,y+24,5,2);
  ctx.fillStyle=MENU_THEME.pink;ctx.globalAlpha=.45;ctx.fillRect(x+16,y+23,2,2);ctx.fillRect(x+27,y+23,2,2);ctx.globalAlpha=1;

  text(ctx,eyebrow,x+43,y+15,5.1,accent,'left',true,false);
  titleText(ctx,title,x+43,y+35,14.2,MENU_THEME.ink,'left',false);
  const maxSub=subtitle.length>47?subtitle.slice(0,46)+'…':subtitle;
  text(ctx,maxSub,x+w-16,y+34,5.0,MENU_THEME.muted,'right',false,false);

  kawaiiSparkle(ctx,x+w-24,y+13,4,accent,.55+.18*Math.sin(frame*.07));
  kawaiiSparkle(ctx,x+w-40,y+18,2,MENU_THEME.pink,.5);
  ctx.restore();
}

/** Tarjeta de menú coherente con bordes recortados y jerarquía fuerte. */
export function drawMenuCard(
  ctx:Ctx,x:number,y:number,w:number,h:number,
  selected=false,accent=MENU_THEME.gold,fill='rgba(255,250,247,.94)',
) {
  ctx.save();
  const lift=selected?1:0;
  ctx.shadowColor=selected?accent+'66':'rgba(66,51,93,.14)';
  ctx.shadowBlur=selected?10:6;ctx.shadowOffsetY=4;
  roundedFill(ctx,x,y-lift,w,h,Math.min(13,h*.35),fill);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;

  roundedPath(ctx,x+.5,y-lift+.5,w-1,h-1,Math.min(13,h*.35));
  ctx.strokeStyle=selected?'#ffffff':MENU_THEME.line;ctx.lineWidth=selected?2:1.5;ctx.stroke();

  // Banda pastel y brillo superior tipo sticker.
  ctx.save();roundedPath(ctx,x+2,y-lift+2,w-4,h-4,Math.min(11,h*.32));ctx.clip();
  ctx.globalAlpha=selected?.20:.08;ctx.fillStyle=accent;ctx.fillRect(x+2,y-lift+2,w-4,h-4);
  const shine=ctx.createLinearGradient(x,y-lift,x,y-lift+h);
  shine.addColorStop(0,'rgba(255,255,255,.65)');shine.addColorStop(.45,'rgba(255,255,255,.04)');shine.addColorStop(1,'rgba(104,80,124,.05)');
  ctx.fillStyle=shine;ctx.fillRect(x+3,y-lift+2,w-6,h-4);ctx.restore();

  ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x+10,y-lift+h/2,3.2,0,Math.PI*2);ctx.fill();
  if(selected){
    kawaiiSparkle(ctx,x+w-12,y-lift+8,3,accent,.86);
    ctx.globalAlpha=.55;ctx.fillStyle=accent;roundedFill(ctx,x+18,y-lift+h-4,Math.max(15,w*.26),2,1,accent);ctx.globalAlpha=1;
  }
  ctx.restore();
}

/** Opción principal pensada para hover + clic. Sin numeración decorativa. */
export function drawMenuChoice(
  ctx:Ctx,_index:number,label:string,description:string,
  x:number,y:number,w:number,h:number,selected:boolean,frame:number,
  accent=MENU_THEME.gold,
) {
  drawMenuCard(ctx,x,y,w,h,selected,accent,selected?'rgba(255,250,244,.98)':'rgba(252,249,255,.94)');
  text(ctx,label,x+17,y+13,7.2,selected?MENU_THEME.ink:MENU_THEME.text,'left',true,false);
  if(description)text(ctx,description,x+17,y+h-5,4.5,selected?MENU_THEME.muted:'#898caf','left',false,false);
  if(selected){
    const pulse=1+Math.sin(frame*.12)*.08;
    ctx.save();ctx.translate(x+w-14,y+h/2);ctx.scale(pulse,pulse);
    text(ctx,'♥',0,3,7,accent,'center',true,false);ctx.restore();
  }
}

export function drawMouseButton(ctx:Ctx,label:string,x:number,y:number,w:number,h:number,hover=false,accent=MENU_THEME.gold,danger=false,disabled=false){
  const col=disabled?'#aeb3c8':danger?MENU_THEME.red:accent;
  const fill=disabled?'rgba(235,235,242,.92)':danger?'rgba(255,232,238,.98)':'rgba(255,250,246,.97)';
  ctx.save();
  if(hover&&!disabled){ctx.translate(0,-1);ctx.shadowColor=col+'70';ctx.shadowBlur=9;}
  roundedFill(ctx,x,y,w,h,Math.min(12,h*.46),fill);
  ctx.shadowBlur=0;
  roundedPath(ctx,x+.5,y+.5,w-1,h-1,Math.min(12,h*.46));ctx.strokeStyle=hover&&!disabled?'#ffffff':col;ctx.lineWidth=hover&&!disabled?2:1.5;ctx.stroke();
  ctx.globalAlpha=hover&&!disabled?.20:.09;ctx.fillStyle=col;roundedFill(ctx,x+3,y+3,w-6,h-6,Math.min(10,h*.38),col);ctx.globalAlpha=1;
  if(!disabled){
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(x+10,y+h/2,3,0,Math.PI*2);ctx.fill();
    if(hover){kawaiiSparkle(ctx,x+w-11,y+7,3,col,.8);text(ctx,'♥',x+w-12,y+h/2+4,6,col,'center',true,false);}
  }
  text(ctx,label,x+w/2-(hover&&!disabled?2:0),y+h/2+3.5,6.1,disabled?'#9699aa':MENU_THEME.ink,'center',true,false);
  ctx.restore();
}

/** Pie consistente de controles. */
export function drawMenuFooter(ctx:Ctx,left:string,right='',accent=MENU_THEME.gold) {
  ctx.save();
  roundedFill(ctx,22,CANVAS_HEIGHT-29,UI_BASE_WIDTH-44,19,9,'rgba(255,250,247,.92)');
  ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=1.5;roundedPath(ctx,22.5,CANVAS_HEIGHT-28.5,UI_BASE_WIDTH-45,18,9);ctx.stroke();
  ctx.fillStyle=accent;ctx.beginPath();ctx.arc(31,CANVAS_HEIGHT-19.5,3,0,Math.PI*2);ctx.fill();
  text(ctx,left,39,CANVAS_HEIGHT-16,5.5,MENU_THEME.muted,'left',true,false);
  if(right)text(ctx,right,UI_BASE_WIDTH-32,CANVAS_HEIGHT-16,5.5,accent,'right',true,false);
  ctx.restore();
}

/** Etiqueta de sección tipo sello. */
export function drawSectionLabel(ctx:Ctx,label:string,x:number,y:number,accent=MENU_THEME.gold) {
  ctx.save();
  roundedFill(ctx,x-3,y-9,Math.max(58,label.length*3.7+12),14,7,accent+'24');
  text(ctx,label,x+4,y,5.15,accent,'left',true,false);
  kawaiiSparkle(ctx,x-1,y-3,2,accent,.65);
  ctx.restore();
}

/** Chip de control para teclas/botones. */
export function drawKeyChip(ctx:Ctx,key:string,x:number,y:number,w=34,active=true) {
  ctx.save();
  const col=active?MENU_THEME.cyan:'#b9bfd0';
  roundedFill(ctx,x,y,w,14,6,active?'rgba(236,251,255,.96)':'rgba(239,239,245,.94)');
  roundedPath(ctx,x+.5,y+.5,w-1,13,6);ctx.strokeStyle=col;ctx.lineWidth=1.2;ctx.stroke();
  text(ctx,key,x+w/2,y+10,5.5,active?MENU_THEME.ink:'#8b8fa4','center',true,false);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ESCENA DEL MENÚ PRINCIPAL// ---------------------------------------------------------------------------
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
  ctx.save();
  // Cielo brillante y ciudad pastel.
  const sky=ctx.createLinearGradient(0,0,0,CANVAS_HEIGHT);
  sky.addColorStop(0,'#82d9ff');sky.addColorStop(.46,'#c7eaff');sky.addColorStop(1,'#ffe1d1');
  ctx.fillStyle=sky;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

  // Nubes suaves.
  ctx.globalAlpha=.72;
  for(const [x,y,s] of [[44,50,1],[188,35,.8],[395,60,1.2]] as const){
    ctx.fillStyle='#fff8f4';
    ctx.beginPath();ctx.arc(x,y,16*s,0,Math.PI*2);ctx.arc(x+17*s,y-4*s,12*s,0,Math.PI*2);ctx.arc(x+31*s,y+2*s,15*s,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;

  // Skyline juguetón.
  const buildings=['#7aa9d8','#8297cf','#6e91be','#9b8ec6','#6ba5c8'];
  for(let i=0;i<8;i++){
    const bw=42+(i%3)*10,bh=75+(i%4)*24,x=i*65-18,y=228-bh;
    ctx.fillStyle=buildings[i%buildings.length];ctx.fillRect(x,y,bw,bh);
    ctx.fillStyle='rgba(255,244,190,.62)';
    for(let yy=y+12;yy<y+bh-8;yy+=16)for(let xx=x+9;xx<x+bw-7;xx+=14)ctx.fillRect(xx,yy,5,7);
  }

  // Banco central kawaii.
  const bankX=CANVAS_WIDTH*.52,bankY=92;
  ctx.shadowColor='rgba(69,64,109,.18)';ctx.shadowBlur=10;
  roundedFill(ctx,bankX-104,bankY,208,147,16,'#f7d7bd');ctx.shadowBlur=0;
  roundedFill(ctx,bankX-92,bankY+12,184,126,12,'#fff1dc');
  ctx.fillStyle='#e8a67e';ctx.fillRect(bankX-101,bankY+40,202,8);
  for(const bx of [bankX-72,bankX-28,bankX+28,bankX+72]){
    roundedFill(ctx,bx-9,bankY+53,18,75,8,'#f3cab4');ctx.fillStyle='#fff7e8';ctx.fillRect(bx-5,bankY+55,10,68);
  }
  roundedFill(ctx,bankX-56,bankY+80,112,60,12,'#6f5f87');
  roundedFill(ctx,bankX-48,bankY+87,96,53,10,'#3f446b');
  const glow=.55+.15*Math.sin(frame*.035);
  ctx.globalAlpha=glow;roundedFill(ctx,bankX-39,bankY+95,78,45,8,'#ffd66b');ctx.globalAlpha=1;
  roundedFill(ctx,bankX-72,bankY-12,144,35,14,'#fff6df');
  pixelText(ctx,'BANCO DEL PAN',bankX,bankY+10,'#7c4d68');

  // Patito emblema sobre el banco.
  ctx.fillStyle='#ffc85f';ctx.beginPath();ctx.arc(bankX,bankY-27,12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff9e54';ctx.fillRect(bankX+8,bankY-27,7,3);
  ctx.fillStyle='#39385b';ctx.fillRect(bankX-4,bankY-30,2,2);ctx.fillRect(bankX+3,bankY-30,2,2);

  // Entrada roja/rosa y alfombra.
  ctx.fillStyle='#dc708e';ctx.beginPath();ctx.moveTo(bankX-36,bankY+138);ctx.lineTo(bankX+36,bankY+138);ctx.lineTo(bankX+72,CANVAS_HEIGHT);ctx.lineTo(bankX-74,CANVAS_HEIGHT);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.25;ctx.fillStyle='#fff1dc';for(let y=bankY+148;y<CANVAS_HEIGHT;y+=16)ctx.fillRect(bankX-44-(y-bankY)*.08,y,88+(y-bankY)*.16,2);ctx.globalAlpha=1;

  // Mascota ladrón chibi en primer plano.
  const bob=Math.round(Math.sin(frame*.045)*2);
  ctx.save();ctx.translate(95,203+bob);ctx.scale(6.1,6.1);
  drawDuck(ctx,-8,-8,frame,'down',frame%220>170,false,false,false,false);ctx.restore();
  // Gorro/antifaz y mejillas encima del sprite para reforzar el estilo.
  ctx.fillStyle='#34334f';roundedFill(ctx,49,153+bob,91,28,12,'#34334f');
  ctx.fillStyle='#24243a';ctx.fillRect(57,177+bob,76,13);
  ctx.fillStyle='#ff8fae';ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(70,213+bob,5,0,Math.PI*2);ctx.arc(121,213+bob,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  // Saco de botín.
  ctx.fillStyle='#d9b17f';ctx.beginPath();ctx.ellipse(146,243+bob,30,36,-.25,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#b88a65';ctx.fillRect(133,211+bob,21,6);pixelText(ctx,'$',146,249+bob,'#674a53');

  // Patitos secundarios en persecución.
  for(const [x,y,scale,phase] of [[28,282,2.2,0],[188,292,2.45,1.7]] as const){
    const yy=y+Math.sin(frame*.06+phase)*2;ctx.save();ctx.translate(x,yy);ctx.scale(scale,scale);
    drawDuck(ctx,-8,-8,frame+phase*40,'right',true,false,false,false,false);ctx.restore();
  }

  // Monedas, billetes, corazones y destellos animados.
  for(let i=0;i<crumbs.length;i++){
    const p=crumbs[i],x=(p.x+frame*p.s*.55)%CANVAS_WIDTH,y=58+((p.y+Math.sin(frame*.018+p.ph)*20)%270);
    if(i%4===0){
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(frame*.02+p.ph)*.25);
      ctx.fillStyle='#86d5aa';roundedFill(ctx,-7,-4,14,8,2,'#86d5aa');ctx.fillStyle='#4b9d7c';ctx.fillRect(-2,-2,4,4);ctx.restore();
    }else if(i%4===1){
      ctx.fillStyle='#ffc64f';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff1a5';ctx.fillRect(x-1,y-3,1,5);
    }else if(i%4===2)kawaiiSparkle(ctx,x,y,3,'#fff9c4',.72);
    else {ctx.globalAlpha=.65;pixelText(ctx,'♥',x,y,MENU_THEME.pink);ctx.globalAlpha=1;}
  }

  // Cute security details as background easter eggs.
  drawWantedPoster(ctx,18,88,frame,0);
  drawSecurityCam(ctx,CANVAS_WIDTH-25,82,frame,-1);

  // Viñeta muy ligera sólo para separar UI.
  const vg=ctx.createLinearGradient(0,0,CANVAS_WIDTH,0);
  vg.addColorStop(0,'rgba(75,53,103,.06)');vg.addColorStop(.52,'rgba(255,255,255,0)');vg.addColorStop(1,'rgba(75,53,103,.10)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  ctx.restore();
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
  ctx.save();
  const bounce=Math.sin(frame*.045)*1.2,w=148,h=66,x=cx-w/2,top=y-34+bounce;
  ctx.shadowColor='rgba(69,48,96,.22)';ctx.shadowBlur=9;ctx.shadowOffsetY=4;
  roundedFill(ctx,x,top,w,h,17,'#fffdf9');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  roundedPath(ctx,x+.5,top+.5,w-1,h-1,17);ctx.strokeStyle='#5c4b86';ctx.lineWidth=2.5;ctx.stroke();

  // Corona pequeña y compacta.
  ctx.fillStyle='#ffc955';ctx.beginPath();ctx.moveTo(cx-15,top+5);ctx.lineTo(cx-9,top-3);ctx.lineTo(cx,top+4);ctx.lineTo(cx+9,top-3);ctx.lineTo(cx+15,top+5);ctx.lineTo(cx+12,top+12);ctx.lineTo(cx-12,top+12);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff2a2';ctx.fillRect(cx-10,top+7,20,2);

  titleText(ctx,'DUCK',cx,top+30,20,'#ffba4d','center',true);
  titleText(ctx,'HEIST',cx,top+52,20,'#ff7eae','center',true);
  // Patito ladrón mínimo en el centro.
  ctx.fillStyle='#fff4d6';ctx.beginPath();ctx.arc(cx,top+31,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3a3155';ctx.fillRect(cx-5,top+29,10,3);
  ctx.fillStyle='#f29d54';ctx.fillRect(cx+3,top+32,5,2);

  kawaiiSparkle(ctx,x+12,top+14,4,MENU_THEME.cyan,.85);
  kawaiiSparkle(ctx,x+w-12,top+19,4,MENU_THEME.gold,.85);
  kawaiiSparkle(ctx,x+w-20,top+h-9,3,MENU_THEME.pink,.65);
  ctx.restore();
}
