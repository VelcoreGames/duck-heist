// Componentes de interfaz + escena del menú principal.
// CAPA DE UI  -> tipografía nítida (Bungee para títulos, Chakra Petch para texto)
// CAPA MUNDO  -> pixel art; si lleva texto, usa una fuente monoespaciada diminuta.
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_BASE_WIDTH } from './constants';
import { drawDuck } from './sprites';
import { drawPixelLogo } from './titleScene';

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
  ink:'#071015',
  panel:'#0d1a21',
  panel2:'#12252d',
  line:'#35515a',
  muted:'#789097',
  text:'#dce8df',
  gold:'#e6c56f',
  gold2:'#9d7932',
  paper:'#eadfb9',
  cyan:'#73c7c8',
  red:'#d85d58',
  green:'#6fc18d',
};

/** Fondo común para pantallas de menú: oscurece el mundo sin borrar su contexto. */
export function drawMenuBackdrop(ctx:Ctx,frame:number,opacity=.82,accent=MENU_THEME.gold) {
  ctx.save();
  ctx.fillStyle=`rgba(3,8,12,${opacity})`;
  ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);

  // Luz ambiental suave: aprovecha mejor el tamaño físico actual sin competir
  // con el contenido de cada menú.
  const ambient=ctx.createRadialGradient(UI_BASE_WIDTH*.72,38,8,UI_BASE_WIDTH*.72,38,230);
  ambient.addColorStop(0,'rgba(115,199,200,.055)');
  ambient.addColorStop(.52,'rgba(230,197,111,.018)');
  ambient.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ambient;ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);

  // Retícula/scan muy tenue para que las pantallas grandes no se vean vacías.
  ctx.globalAlpha=.055;ctx.fillStyle=accent;
  for(let x=20;x<UI_BASE_WIDTH-18;x+=46)ctx.fillRect(x,18,1,CANVAS_HEIGHT-36);
  ctx.globalAlpha=.035;
  for(let y=62;y<CANVAS_HEIGHT-24;y+=36)ctx.fillRect(18,y,UI_BASE_WIDTH-36,1);

  const sweep=(frame*.55)%(UI_BASE_WIDTH+120)-60;
  const g=ctx.createLinearGradient(sweep-70,0,sweep+70,0);
  g.addColorStop(0,'rgba(255,255,255,0)');
  g.addColorStop(.5,'rgba(255,255,255,.03)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,0,UI_BASE_WIDTH,CANVAS_HEIGHT);

  ctx.globalAlpha=.16;ctx.fillStyle=accent;
  ctx.fillRect(18,18,2,CANVAS_HEIGHT-36);
  ctx.fillRect(UI_BASE_WIDTH-20,18,2,CANVAS_HEIGHT-36);
  ctx.fillRect(18,CANVAS_HEIGHT-19,UI_BASE_WIDTH-36,1);

  // Viñeta inferior para anclar botones y pies de menú.
  const bottom=ctx.createLinearGradient(0,CANVAS_HEIGHT-92,0,CANVAS_HEIGHT);
  bottom.addColorStop(0,'rgba(2,6,10,0)');
  bottom.addColorStop(1,'rgba(2,6,10,.48)');
  ctx.globalAlpha=1;ctx.fillStyle=bottom;ctx.fillRect(0,CANVAS_HEIGHT-92,UI_BASE_WIDTH,92);
  ctx.restore();
}

/** Encabezado tipo expediente bancario para todos los menús. */
export function drawMenuHeader(
  ctx:Ctx,title:string,subtitle:string,frame:number,
  accent=MENU_THEME.gold,eyebrow='EXPEDIENTE DEL ATRACO',
) {
  ctx.save();
  ctx.fillStyle='rgba(5,13,18,.92)';ctx.fillRect(22,16,UI_BASE_WIDTH-44,44);
  ctx.strokeStyle='rgba(126,157,161,.18)';ctx.strokeRect(22.5,16.5,UI_BASE_WIDTH-45,43);
  ctx.fillStyle=accent;ctx.fillRect(22,16,5,44);
  ctx.globalAlpha=.34;ctx.fillRect(27,16,UI_BASE_WIDTH-49,1);ctx.globalAlpha=1;

  // Identificador del expediente.
  ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(33,22,8,8);
  ctx.fillStyle=accent;ctx.globalAlpha=.75;ctx.fillRect(35,24,4,4);ctx.globalAlpha=1;
  text(ctx,eyebrow,47,30,5.2,accent,'left',true,false);
  titleText(ctx,title,34,50,15.5,MENU_THEME.paper,'left',false);

  // El subtítulo funciona como descripción contextual, no como segundo título.
  text(ctx,subtitle,UI_BASE_WIDTH-34,48,5.5,MENU_THEME.muted,'right',false,false);

  const pulse=.28+.3*Math.sin(frame*.08);
  ctx.globalAlpha=pulse;ctx.fillStyle=accent;
  for(let i=0;i<3;i++)ctx.fillRect(UI_BASE_WIDTH-62+i*9,25,6,2);
  ctx.globalAlpha=.18;ctx.fillRect(31,56,UI_BASE_WIDTH-62,1);
  ctx.restore();
}

/** Tarjeta de menú coherente con bordes recortados y jerarquía fuerte. */
export function drawMenuCard(
  ctx:Ctx,x:number,y:number,w:number,h:number,
  selected=false,accent=MENU_THEME.gold,fill='rgba(12,25,32,.93)',
) {
  ctx.save();
  if(selected){ctx.shadowColor=accent;ctx.shadowBlur=12;}
  ctx.fillStyle='rgba(0,0,0,.52)';ctx.fillRect(x+3,y+4,w,h);
  ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);

  // Capas internas: una tarjeta grande necesita más profundidad que un rectángulo plano.
  const sheen=ctx.createLinearGradient(x,y,x+w,y+h);
  sheen.addColorStop(0,selected?'rgba(255,255,255,.075)':'rgba(255,255,255,.032)');
  sheen.addColorStop(.55,'rgba(255,255,255,0)');
  sheen.addColorStop(1,'rgba(0,0,0,.16)');
  ctx.fillStyle=sheen;ctx.fillRect(x+3,y+2,w-4,h-3);

  ctx.fillStyle=selected?accent:MENU_THEME.line;ctx.fillRect(x,y,4,h);
  ctx.globalAlpha=selected?.72:.24;ctx.fillStyle=accent;ctx.fillRect(x+4,y,w-4,1);ctx.globalAlpha=1;
  ctx.strokeStyle=selected?accent:'#243b43';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);

  // Cortes y marcas técnicas en esquinas.
  ctx.fillStyle=MENU_THEME.ink;
  ctx.fillRect(x+w-7,y,7,3);ctx.fillRect(x+w-3,y,3,7);
  ctx.fillRect(x,y+h-3,7,3);ctx.fillRect(x,y+h-7,3,7);
  ctx.globalAlpha=selected?.6:.22;ctx.fillStyle=accent;
  ctx.fillRect(x+w-14,y+h-4,7,1);ctx.fillRect(x+w-4,y+h-14,1,7);
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
  const col=disabled?'#536067':danger?'#d85d58':accent;
  drawMenuCard(ctx,x,y,w,h,hover&&!disabled,col,disabled?'rgba(12,19,22,.84)':hover?(danger?'rgba(54,26,30,.98)':'rgba(30,40,34,.98)'):'rgba(9,22,28,.96)');
  if(hover&&!disabled){ctx.save();ctx.globalAlpha=.13;ctx.fillStyle=col;ctx.fillRect(x+4,y+3,w-8,h-6);ctx.restore();}
  text(ctx,label,x+w/2,y+h/2+4,6.35,disabled?'#66767a':hover?'#fff5dc':'#cbd6d0','center',true,false);
}

/** Pie consistente de controles. */
export function drawMenuFooter(ctx:Ctx,left:string,right='',accent=MENU_THEME.gold) {
  ctx.save();
  ctx.fillStyle='rgba(5,13,18,.88)';ctx.fillRect(22,CANVAS_HEIGHT-28,UI_BASE_WIDTH-44,18);
  ctx.fillStyle=accent;ctx.fillRect(22,CANVAS_HEIGHT-28,3,18);
  text(ctx,left,32,CANVAS_HEIGHT-16,5.7,'#91a7a5','left',true,false);
  if(right) text(ctx,right,UI_BASE_WIDTH-32,CANVAS_HEIGHT-16,5.7,accent,'right',true,false);
  ctx.restore();
}

/** Etiqueta de sección tipo sello. */
export function drawSectionLabel(ctx:Ctx,label:string,x:number,y:number,accent=MENU_THEME.gold) {
  ctx.save();
  text(ctx,label,x,y,5.3,accent,'left',true,false);
  ctx.fillStyle=accent;ctx.globalAlpha=.45;ctx.fillRect(x,y+4,70,1);
  ctx.restore();
}

/** Chip de control para teclas/botones. */
export function drawKeyChip(ctx:Ctx,key:string,x:number,y:number,w=34,active=true) {
  ctx.save();
  ctx.fillStyle=active?'#1d343b':'#17242a';ctx.fillRect(x,y,w,14);
  ctx.strokeStyle=active?MENU_THEME.gold:'#33464d';ctx.strokeRect(x+.5,y+.5,w-1,13);
  text(ctx,key,x+w/2,y+10,5.6,active?'#f2dea1':'#7d8d91','center',true,false);
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
