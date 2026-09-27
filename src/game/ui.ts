// Componentes de interfaz + escena del menú principal.
// CAPA DE UI  -> tipografía nítida (Bungee para títulos, Chakra Petch para texto)
// CAPA MUNDO  -> pixel art; si lleva texto, usa una fuente monoespaciada diminuta.
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_BASE_WIDTH } from './constants';

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
  x: Math.random() * UI_BASE_WIDTH,
  y: Math.random() * CANVAS_HEIGHT,
  s: 0.15 + Math.random() * 0.35,
  ph: Math.random() * Math.PI * 2,
}));

function drawKawaiiHeistDuck(ctx:Ctx,x:number,y:number,frame:number,scale=1){
  const bob=Math.sin(frame*.045)*1.5;
  ctx.save();ctx.translate(x,y+bob);ctx.scale(scale,scale);

  // Sombra.
  ctx.globalAlpha=.18;ctx.fillStyle='#554769';ctx.beginPath();ctx.ellipse(0,31,31,8,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  // Cuerpo redondo.
  ctx.fillStyle='#fff6e9';ctx.beginPath();ctx.ellipse(0,12,27,31,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#4a3c60';ctx.lineWidth=2.2;ctx.stroke();

  // Cabeza grande chibi.
  ctx.fillStyle='#fffaf2';ctx.beginPath();ctx.arc(-2,-17,28,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4a3c60';ctx.lineWidth=2.2;ctx.stroke();

  // Gorro suave, no bloque rectangular.
  ctx.fillStyle='#39334f';ctx.beginPath();
  ctx.moveTo(-28,-22);ctx.quadraticCurveTo(-24,-49,-2,-51);ctx.quadraticCurveTo(23,-49,28,-25);
  ctx.quadraticCurveTo(16,-31,-1,-31);ctx.quadraticCurveTo(-17,-31,-28,-22);ctx.fill();
  ctx.strokeStyle='#29263c';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#514866';ctx.beginPath();ctx.ellipse(-2,-30,26,7,0,0,Math.PI*2);ctx.fill();

  // Parche de patito.
  ctx.fillStyle='#ffc95f';ctx.beginPath();ctx.arc(1,-41,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f49a52';ctx.fillRect(4,-41,4,2);
  ctx.fillStyle='#443a57';ctx.fillRect(-1,-43,1.5,1.5);

  // Antifaz.
  ctx.fillStyle='#342d46';ctx.beginPath();
  ctx.ellipse(-11,-18,11,8,-.08,0,Math.PI*2);ctx.ellipse(10,-18,11,8,.08,0,Math.PI*2);ctx.fill();
  ctx.fillRect(-12,-23,23,8);

  // Ojos grandes y brillo.
  const blink=frame%220<7;
  if(blink){
    ctx.strokeStyle='#191622';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-16,-17);ctx.lineTo(-7,-17);ctx.moveTo(5,-17);ctx.lineTo(14,-17);ctx.stroke();
  }else{
    for(const ex of [-11,10]){
      ctx.fillStyle='#211b2b';ctx.beginPath();ctx.ellipse(ex,-17,6.6,8.3,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex-2,-20,2.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#b68572';ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(ex+2,-13,2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    }
  }

  // Mejillas.
  ctx.fillStyle='#ff9bb6';ctx.globalAlpha=.72;ctx.beginPath();ctx.ellipse(-22,-6,6,3.5,0,0,Math.PI*2);ctx.ellipse(19,-6,6,3.5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  // Pico sonriente.
  ctx.fillStyle='#ffad4f';ctx.beginPath();ctx.ellipse(1,-8,10,5.5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#b86d37';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-5,-8);ctx.quadraticCurveTo(1,-4,7,-8);ctx.stroke();

  // Alas abrazando el botín.
  ctx.fillStyle='#fff5e5';ctx.beginPath();ctx.ellipse(-18,11,10,18,.65,0,Math.PI*2);ctx.ellipse(19,11,10,18,-.65,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#4a3c60';ctx.lineWidth=1.6;ctx.stroke();

  // Saco de botín.
  ctx.fillStyle='#d9b17f';ctx.beginPath();ctx.ellipse(9,23,18,22,-.12,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#7e5d63';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#b88a65';ctx.fillRect(-2,3,19,5);
  ctx.fillStyle='#704d5e';ctx.font='700 15px sans-serif';ctx.textAlign='center';ctx.fillText('$',9,29);

  // Patitas.
  ctx.fillStyle='#ffad4f';ctx.beginPath();ctx.ellipse(-13,37,10,6,-.35,0,Math.PI*2);ctx.ellipse(13,37,10,6,.35,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawKawaiiMiniDuck(ctx:Ctx,x:number,y:number,frame:number,phase:number,police=false){
  const bob=Math.sin(frame*.06+phase)*1.6;
  ctx.save();ctx.translate(x,y+bob);
  ctx.globalAlpha=.16;ctx.fillStyle='#4e486d';ctx.beginPath();ctx.ellipse(0,16,15,4,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#fff8ec';ctx.beginPath();ctx.ellipse(0,4,12,15,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#51486d';ctx.lineWidth=1.4;ctx.stroke();
  ctx.fillStyle='#fffaf2';ctx.beginPath();ctx.arc(0,-8,12,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle=police?'#608fd6':'#3b334d';ctx.beginPath();ctx.ellipse(0,-15,12,5,0,Math.PI*2);ctx.fill();
  if(police){ctx.fillStyle='#ffd15e';ctx.fillRect(-2,-17,4,3);}
  else {ctx.fillStyle='#2c263c';ctx.fillRect(-10,-9,20,4);}
  ctx.fillStyle='#201b29';ctx.fillRect(-5,-9,2,2);ctx.fillRect(4,-9,2,2);
  ctx.fillStyle='#ffab4d';ctx.fillRect(7,-6,7,3);
  ctx.fillStyle='#ff9db5';ctx.globalAlpha=.65;ctx.fillRect(-9,-4,3,2);ctx.globalAlpha=1;
  ctx.restore();
}

function drawKawaiiHelicopter(ctx:Ctx,x:number,y:number,frame:number){
  ctx.save();ctx.translate(x,y+Math.sin(frame*.035)*2);
  ctx.globalAlpha=.15;ctx.fillStyle='#56608a';ctx.beginPath();ctx.ellipse(0,24,25,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#5d6fa5';ctx.beginPath();ctx.ellipse(0,4,24,14,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#a8dbf2';ctx.beginPath();ctx.ellipse(-4,1,13,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff7ec';ctx.beginPath();ctx.arc(-5,2,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#33304d';ctx.fillRect(-10,-1,4,3);ctx.fillRect(-1,-1,4,3);
  ctx.fillStyle='#ffad4e';ctx.fillRect(2,3,7,3);
  ctx.fillStyle='#ff91ae';ctx.globalAlpha=.55;ctx.fillRect(-12,5,3,2);ctx.globalAlpha=1;
  ctx.fillStyle='#53628d';ctx.fillRect(21,1,24,5);
  ctx.fillStyle='#445377';ctx.beginPath();ctx.moveTo(40,3);ctx.lineTo(49,-5);ctx.lineTo(49,11);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#37405f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,17);ctx.lineTo(-10,23);ctx.lineTo(14,23);ctx.moveTo(8,17);ctx.lineTo(13,23);ctx.stroke();
  ctx.save();ctx.translate(0,-13);ctx.rotate(frame*.18);ctx.strokeStyle='#454b70';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(28,0);ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();ctx.restore();
  const pulse=.12+.04*Math.sin(frame*.08);
  ctx.globalAlpha=pulse;ctx.fillStyle='#fff4b8';ctx.beginPath();ctx.moveTo(8,13);ctx.lineTo(23,74);ctx.lineTo(-6,74);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  ctx.restore();
}

export function drawMenuScene(ctx:Ctx,frame:number){
  ctx.save();
  const sky=ctx.createLinearGradient(0,0,0,CANVAS_HEIGHT);
  sky.addColorStop(0,'#69cfff');sky.addColorStop(.42,'#a8e3ff');sky.addColorStop(.72,'#ffd8df');sky.addColorStop(1,'#ffd0aa');
  ctx.fillStyle=sky;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

  const ox=Math.floor((CANVAS_WIDTH-UI_BASE_WIDTH)/2),W=UI_BASE_WIDTH;
  ctx.save();ctx.translate(ox,0);

  // Sol y nubes estilizadas.
  ctx.globalAlpha=.30;ctx.fillStyle='#fff4b0';ctx.beginPath();ctx.arc(401,46,34,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  for(const [x,y,s] of [[45,44,1],[181,32,.82],[355,64,.9]] as const){
    ctx.fillStyle='rgba(255,252,248,.86)';ctx.beginPath();
    ctx.arc(x,y,15*s,0,Math.PI*2);ctx.arc(x+15*s,y-4*s,11*s,0,Math.PI*2);ctx.arc(x+28*s,y+1*s,14*s,0,Math.PI*2);ctx.fill();
  }
  drawKawaiiHelicopter(ctx,78,63,frame);

  // Skyline de cuento.
  const buildings=['#748fc4','#7ca6d4','#8c86c4','#699ac5','#a37daf'];
  for(let i=0;i<9;i++){
    const bw=39+(i%3)*9,bh=67+(i%4)*19,x=i*57-18,y=228-bh;
    ctx.fillStyle=buildings[i%buildings.length];ctx.fillRect(x,y,bw,bh);
    ctx.fillStyle='rgba(255,241,180,.72)';
    for(let yy=y+11;yy<y+bh-7;yy+=15)for(let xx=x+8;xx<x+bw-6;xx+=13)ctx.fillRect(xx,yy,5,6);
  }

  // Banco central con silueta más clara y menos bloqueada.
  const bx=250,by=93;
  ctx.shadowColor='rgba(83,55,97,.18)';ctx.shadowBlur=12;
  roundedFill(ctx,bx-99,by,198,143,17,'#f2c8b6');ctx.shadowBlur=0;
  roundedFill(ctx,bx-91,by+8,182,132,14,'#fff0dd');
  ctx.fillStyle='#e58c85';ctx.fillRect(bx-98,by+37,196,8);
  roundedFill(ctx,bx-71,by-18,142,33,15,'#fff8e8');
  pixelText(ctx,'BANCO DEL PAN',bx,by+4,'#7b4f68');

  for(const cx of [bx-65,bx-22,bx+22,bx+65]){
    roundedFill(ctx,cx-8,by+51,16,70,7,'#f0b6ad');
    ctx.fillStyle='#fff8eb';ctx.fillRect(cx-4,by+54,8,64);
  }

  // Entrada luminosa con monedas detrás.
  roundedFill(ctx,bx-54,by+72,108,66,12,'#655378');
  roundedFill(ctx,bx-47,by+79,94,59,10,'#342f52');
  const glow=.62+.16*Math.sin(frame*.04);
  ctx.globalAlpha=glow;roundedFill(ctx,bx-39,by+88,78,50,8,'#ffcf68');ctx.globalAlpha=1;
  for(let i=0;i<9;i++){
    const xx=bx-29+(i*13)%59,yy=by+111-(i%3)*7;
    ctx.fillStyle='#f5b940';ctx.beginPath();ctx.ellipse(xx,yy,6,3,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff1a0';ctx.fillRect(xx-3,yy-1,4,1);
  }

  // Emblema del banco.
  ctx.fillStyle='#ffc95f';ctx.beginPath();ctx.arc(bx,by-32,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff9f4e';ctx.fillRect(bx+8,by-32,7,3);
  ctx.fillStyle='#443b5d';ctx.fillRect(bx-4,by-35,2,2);ctx.fillRect(bx+3,by-35,2,2);

  // Alfombra y profundidad.
  ctx.fillStyle='#d86f92';ctx.beginPath();ctx.moveTo(bx-34,by+138);ctx.lineTo(bx+34,by+138);ctx.lineTo(bx+74,CANVAS_HEIGHT);ctx.lineTo(bx-76,CANVAS_HEIGHT);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.2;ctx.fillStyle='#fff8e9';
  for(let yy=by+149;yy<CANVAS_HEIGHT;yy+=15)ctx.fillRect(bx-43-(yy-by)*.08,yy,86+(yy-by)*.16,2);
  ctx.globalAlpha=1;

  // Protagonista vectorial chibi.
  drawKawaiiHeistDuck(ctx,96,224,frame,1.28);

  // Cómplices y policía al fondo.
  drawKawaiiMiniDuck(ctx,35,289,frame,.3,false);
  drawKawaiiMiniDuck(ctx,195,297,frame,1.7,false);
  drawKawaiiMiniDuck(ctx,21,201,frame,2.6,true);

  // Auto/patrulla simplificado.
  roundedFill(ctx,7,213,77,29,10,'#507dc5');roundedFill(ctx,18,204,39,15,7,'#75a7df');
  ctx.fillStyle='#24314f';ctx.beginPath();ctx.arc(25,242,8,0,Math.PI*2);ctx.arc(67,242,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=frame%36<18?'#ff7595':'#6dd8ff';ctx.fillRect(33,201,11,4);
  ctx.fillStyle=frame%36<18?'#6dd8ff':'#ff7595';ctx.fillRect(44,201,11,4);

  // Dinero, monedas y estrellas con trayectoria lenta.
  for(let i=0;i<crumbs.length;i++){
    const p=crumbs[i],x=(p.x+frame*p.s*.42)%W,y=45+((p.y+Math.sin(frame*.018+p.ph)*18)%275);
    if(i%4===0){
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(frame*.018+p.ph)*.22);
      roundedFill(ctx,-7,-4,14,8,2,'#7fd5a4');ctx.fillStyle='#4c9a77';ctx.fillRect(-2,-2,4,4);ctx.restore();
    }else if(i%4===1){
      ctx.fillStyle='#ffc84f';ctx.beginPath();ctx.arc(x,y,4.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff3a8';ctx.fillRect(x-1,y-3,1,5);
    }else if(i%4===2)kawaiiSparkle(ctx,x,y,3,'#fff7b6',.82);
    else {ctx.globalAlpha=.66;pixelText(ctx,'♥',x,y,MENU_THEME.pink);ctx.globalAlpha=1;}
  }

  // Posters tiernos y cámara para mantener el tema de atraco.
  drawWantedPoster(ctx,17,82,frame,0);
  drawSecurityCam(ctx,W-19,75,frame,-1);

  // Oscurecido localizado detrás de la zona de botones, no sobre toda la escena.
  const panelFade=ctx.createLinearGradient(250,0,W,0);
  panelFade.addColorStop(0,'rgba(255,255,255,0)');
  panelFade.addColorStop(.35,'rgba(255,245,251,.16)');
  panelFade.addColorStop(1,'rgba(255,245,251,.34)');
  ctx.fillStyle=panelFade;ctx.fillRect(235,0,W-235,CANVAS_HEIGHT);

  ctx.restore();

  if(ox>0){
    const left=ctx.createLinearGradient(0,0,ox,0);left.addColorStop(0,'rgba(87,126,196,.18)');left.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=left;ctx.fillRect(0,0,ox,CANVAS_HEIGHT);
    const right=ctx.createLinearGradient(CANVAS_WIDTH-ox,0,CANVAS_WIDTH,0);right.addColorStop(0,'rgba(255,255,255,0)');right.addColorStop(1,'rgba(255,124,177,.18)');
    ctx.fillStyle=right;ctx.fillRect(CANVAS_WIDTH-ox,0,ox,CANVAS_HEIGHT);
  }
  ctx.restore();
}

function drawWantedPoster(ctx:Ctx,x:number,y:number,frame:number,phase:number){
  const sway=Math.sin(frame*.018+phase)*.025;
  ctx.save();ctx.translate(x+18,y+2);ctx.rotate(sway);ctx.translate(-18,0);
  ctx.shadowColor='rgba(71,48,81,.18)';ctx.shadowBlur=5;ctx.shadowOffsetY=2;
  roundedFill(ctx,0,0,36,45,6,'#fff7e9');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  roundedPath(ctx,.5,.5,35,44,6);ctx.strokeStyle='#ffb4c7';ctx.lineWidth=1.5;ctx.stroke();
  roundedFill(ctx,5,5,26,9,4,'#ffd36c');pixelText(ctx,'BUSCADO',18,12,'#66485e');
  ctx.fillStyle='#fff3d9';ctx.beginPath();ctx.arc(18,25,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3b314e';ctx.fillRect(10,21,16,4);
  ctx.fillStyle='#242033';ctx.fillRect(13,22,2,2);ctx.fillRect(21,22,2,2);
  ctx.fillStyle='#f5a150';ctx.fillRect(23,26,6,2);
  ctx.fillStyle='#ff91ae';ctx.globalAlpha=.55;ctx.fillRect(9,27,3,2);ctx.globalAlpha=1;
  pixelText(ctx,'♥ $9999',18,40,'#b36a83');
  ctx.restore();
}

function drawSecurityCam(ctx:Ctx,x:number,y:number,frame:number,dir:number){
  const swing=Math.sin(frame*.018)*.25;
  ctx.save();ctx.translate(x,y);
  roundedFill(ctx,-7,-9,14,5,2,'#8ca4c9');ctx.fillStyle='#6c789c';ctx.fillRect(-2,-5,4,7);
  ctx.rotate(swing*dir);
  roundedFill(ctx,dir>0?-3:-18,0,21,9,4,'#fff7f4');
  ctx.fillStyle='#788ab4';ctx.fillRect(dir>0?9:-15,2,6,5);
  ctx.fillStyle=frame%70<38?'#ff7898':'#a9aec9';ctx.beginPath();ctx.arc(dir>0?11:-11,4,1.5,0,Math.PI*2);ctx.fill();
  if(frame%70<38){
    ctx.globalAlpha=.055;ctx.fillStyle='#ff7898';ctx.beginPath();
    ctx.moveTo(dir>0?15:-15,5);ctx.lineTo(62*dir,42);ctx.lineTo(62*dir,-20);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  }
  ctx.restore();
}

/** Logotipo del juego (capa de UI, tipografía display) */
export function drawTitleLogo(ctx:Ctx,cx:number,y:number,frame:number){
  ctx.save();
  const bob=Math.sin(frame*.04)*.7,w=118,h=90,x=cx-w/2,top=y-42+bob;
  ctx.shadowColor='rgba(55,40,83,.28)';ctx.shadowBlur=9;ctx.shadowOffsetY=4;
  roundedFill(ctx,x,top,w,h,19,'#4b3c70');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  roundedFill(ctx,x+4,top+4,w-8,h-8,16,'#fffdf8');
  roundedFill(ctx,x+8,top+8,w-16,h-16,14,'#59477e');

  ctx.save();ctx.translate(x+7,top+48);ctx.rotate(-.30);roundedFill(ctx,-11,-6,23,12,3,'#77d6ae');ctx.fillStyle='#4b9c7e';ctx.fillRect(-2,-3,5,6);ctx.restore();
  ctx.save();ctx.translate(x+w-7,top+48);ctx.rotate(.30);roundedFill(ctx,-12,-6,23,12,3,'#77d6ae');ctx.fillStyle='#4b9c7e';ctx.fillRect(-3,-3,5,6);ctx.restore();

  ctx.fillStyle='#ffc84f';ctx.beginPath();
  ctx.moveTo(cx-16,top+12);ctx.lineTo(cx-10,top+1);ctx.lineTo(cx,top+9);ctx.lineTo(cx+10,top+1);ctx.lineTo(cx+16,top+12);ctx.lineTo(cx+13,top+19);ctx.lineTo(cx-13,top+19);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#6a4d67';ctx.lineWidth=1.5;ctx.stroke();

  ctx.font=`20px ${FONT_TITLE}`;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
  ctx.lineWidth=5;ctx.strokeStyle='#fffdf8';ctx.strokeText('DUCK',cx,top+45);
  ctx.fillStyle='#ffbd50';ctx.fillText('DUCK',cx,top+45);
  ctx.lineWidth=5;ctx.strokeStyle='#fffdf8';ctx.strokeText('HEIST',cx,top+69);
  ctx.fillStyle='#ff82ad';ctx.fillText('HEIST',cx,top+69);

  ctx.fillStyle='#fff2d7';ctx.beginPath();ctx.arc(cx,top+48,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3b3152';ctx.fillRect(cx-5,top+46,10,3);
  ctx.fillStyle='#f5a14d';ctx.fillRect(cx+3,top+49,5,2);

  kawaiiSparkle(ctx,x+10,top+18,3.5,'#70d8ef',.9);
  kawaiiSparkle(ctx,x+w-10,top+22,4,'#ffc95f',.9);
  kawaiiSparkle(ctx,x+w-15,top+h-12,3,'#ff8fbd',.72);
  ctx.restore();
}
