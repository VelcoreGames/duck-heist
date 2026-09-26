import { TILE_SIZE, ROOM_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_DOOR } from './constants';
import type { FloorTheme } from './constants';

const T = TILE_SIZE;

function hash(x: number, y: number, s = 0) {
  return Math.abs((x * 73 + y * 37 + s * 19) * 2654435761) >>> 0;
}

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

function decoMetal(deco:string){
  return deco==='security'?'#8faeb7':
    deco==='storage'?'#b89562':
    deco==='bakery'?'#bd835c':
    deco==='vault'?'#c9ad62':
    deco==='golden'?'#e6c56f':
    '#c6a866';
}

function decoVein(deco:string){
  return deco==='security'?'rgba(126,177,194,.11)':
    deco==='storage'?'rgba(203,173,126,.10)':
    deco==='bakery'?'rgba(211,143,104,.10)':
    deco==='vault'?'rgba(215,202,163,.09)':
    deco==='golden'?'rgba(255,230,156,.12)':
    'rgba(220,229,225,.11)';
}

export function drawRichTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, wall: boolean,
  theme: FloorTheme, gx: number, gy: number, frame: number,
  wallProps = true,
) {
  const px=x*T,py=y*T;
  const h=hash(x+gx*ROOM_WIDTH,y+gy*11,theme.deco.charCodeAt(0));
  const metal=decoMetal(theme.deco);

  if(wall){
    // Arquitectura bancaria continua: piedra/panel principal, moldura superior,
    // panel empotrado y zócalo oscuro. El tile se lee como una sección de muro,
    // no como un bloque independiente.
    r(ctx,px,py,T,T,'#090d10');
    r(ctx,px+1,py+1,T-2,T-2,theme.wall[(Math.floor(x/2)+Math.floor(y/2))%2]);
    r(ctx,px+2,py+2,T-4,3,'rgba(255,255,255,.075)');
    r(ctx,px+3,py+5,T-6,1,'rgba(0,0,0,.34)');

    // Panel empotrado.
    r(ctx,px+4,py+7,T-8,15,'rgba(4,8,10,.20)');
    r(ctx,px+5,py+8,T-10,13,'rgba(255,255,255,.025)');
    r(ctx,px+5,py+8,T-10,1,'rgba(255,255,255,.07)');
    r(ctx,px+5,py+20,T-10,1,'rgba(0,0,0,.30)');

    // Cornisa / filete metálico y zócalo.
    r(ctx,px+2,py+4,T-4,1,metal);
    ctx.globalAlpha=.28;r(ctx,px+2,py+5,T-4,1,metal);ctx.globalAlpha=1;
    r(ctx,px+1,py+24,T-2,7,'rgba(4,8,10,.38)');
    r(ctx,px+2,py+24,T-4,1,'rgba(255,255,255,.055)');
    r(ctx,px+2,py+29,T-4,2,'rgba(0,0,0,.42)');

    // Juntas verticales muy discretas: panelería grande, no mosaico.
    if(x%2===0)r(ctx,px+1,py+6,1,18,'rgba(0,0,0,.28)');
    if(x%2===1)r(ctx,px+T-2,py+6,1,18,'rgba(255,255,255,.025)');

    // Herrajes mínimos y caros.
    if(h%7===0){r(ctx,px+7,py+12,2,2,'rgba(220,225,220,.12)');r(ctx,px+T-9,py+12,2,2,'rgba(0,0,0,.20)');}
    if(wallProps)drawWallProp(ctx,px,py,theme.deco,h,frame,y===0,x===0||x===ROOM_WIDTH-1);
    return;
  }

  // Losas grandes de piedra/mármol. Se agrupan visualmente en bloques 2x2
  // para evitar el aspecto de tablero barato.
  const slab=((Math.floor(x/2)+Math.floor(y/2))&1);
  const base=slab?theme.floor[1]:theme.floor[0];
  r(ctx,px,py,T,T,base);

  // Juntas principales sólo cada dos tiles.
  if(x%2===0)r(ctx,px,py,1,T,theme.floor[2]);
  else r(ctx,px,py,1,T,'rgba(0,0,0,.045)');
  if(y%2===0)r(ctx,px,py,T,1,theme.floor[2]);
  else r(ctx,px,py,T,1,'rgba(0,0,0,.045)');

  // Bisel y reflejo de piedra pulida.
  r(ctx,px+1,py+1,T-2,1,'rgba(255,255,255,.055)');
  r(ctx,px+1,py+2,1,T-3,'rgba(255,255,255,.025)');
  r(ctx,px+1,py+T-2,T-2,1,'rgba(0,0,0,.09)');
  r(ctx,px+T-2,py+1,1,T-2,'rgba(0,0,0,.075)');

  // Vetas y reflejos específicos por sector.
  const vein=decoVein(theme.deco);
  if(theme.deco==='lobby'||theme.deco==='vault'||theme.deco==='golden'){
    if(h%3===0){r(ctx,px+3,py+8,10,1,vein);r(ctx,px+12,py+9,9,1,vein);r(ctx,px+20,py+10,7,1,vein);}
    if(h%5===0){r(ctx,px+7,py+22,8,1,vein);r(ctx,px+14,py+21,11,1,vein);}
    if(h%11===0){ctx.globalAlpha=.18;r(ctx,px+5,py+4,18,2,metal);ctx.globalAlpha=1;}
  }else if(theme.deco==='security'){
    if(h%4===0){r(ctx,px+4,py+6,T-8,1,'rgba(126,177,194,.085)');r(ctx,px+8,py+18,T-14,1,'rgba(255,255,255,.035)');}
    if((x+y)%5===0){ctx.globalAlpha=.18;r(ctx,px+T-4,py+3,1,T-6,metal);ctx.globalAlpha=1;}
  }else if(theme.deco==='storage'){
    if(h%4===0){r(ctx,px+4,py+11,22,1,vein);r(ctx,px+9,py+12,12,1,vein);}
    if((x%4===0)&&(y%2===0)){ctx.globalAlpha=.20;r(ctx,px+2,py+T-4,T-4,1,metal);ctx.globalAlpha=1;}
  }else if(theme.deco==='bakery'){
    if(h%4===0){r(ctx,px+5,py+8,17,1,vein);r(ctx,px+12,py+9,12,1,vein);}
    if(h%9===0){ctx.globalAlpha=.15;r(ctx,px+5,py+23,20,1,metal);ctx.globalAlpha=1;}
  }

  // Brillo especular controlado: transmite pulido sin convertir el suelo en espejo.
  if(h%13===0){r(ctx,px+6,py+5,13,1,'rgba(255,255,255,.075)');r(ctx,px+8,py+6,8,1,'rgba(255,255,255,.03)');}
}

function drawWallProp(ctx: CanvasRenderingContext2D, px: number, py: number, deco: string, h: number, f: number, north: boolean, side: boolean) {
  if (!north && !side && h % 4 !== 0) return;
  const seed = h % 12;
  if (deco === 'lobby') {
    if (seed === 0) { // ATM
      r(ctx, px + 5, py + 6, 22, 22, '#2a3140'); r(ctx, px + 7, py + 8, 18, 9, '#0c1220');
      r(ctx, px + 8, py + 9, 16, 6, (f + px) % 80 < 50 ? '#3ad36a' : '#1a5a32');
      r(ctx, px + 8, py + 19, 16, 5, '#8d98a6'); r(ctx, px + 10, py + 20, 4, 3, '#f4d03f');
    } else if (seed === 1) { // bank sign
      r(ctx, px + 3, py + 8, 26, 13, '#7a5a10'); r(ctx, px + 4, py + 9, 24, 11, '#f4d03f');
      r(ctx, px + 7, py + 12, 18, 4, '#5a4208');
    } else if (seed === 2) { // velvet rope hook
      r(ctx, px + 14, py + 18, 4, 10, '#c9a227'); r(ctx, px + 8, py + 20, 16, 3, '#7a1f2b');
    } else if (seed === 3) { // wanted poster
      r(ctx, px + 8, py + 8, 16, 18, '#e8d5a3'); r(ctx, px + 10, py + 10, 12, 8, '#f9e547');
      r(ctx, px + 10, py + 20, 12, 3, '#8a2c2c');
    } else if (north && seed === 4) { // camera
      r(ctx, px + 12, py + 4, 8, 5, '#4a5564'); r(ctx, px + 18, py + 5, 6, 4, '#1b2430');
      r(ctx, px + 22, py + 6, 2, 2, f % 50 < 25 ? '#ef7768' : '#6a3038');
    }
  } else if (deco === 'security') {
    if (seed % 3 === 0) {
      r(ctx, px + 5, py + 7, 22, 16, '#0b1018'); r(ctx, px + 7, py + 9, 18, 12, '#12314f');
      r(ctx, px + 8, py + 10 + ((f >> 3) % 8), 16, 1, '#4f9dd8');
      r(ctx, px + 24, py + 8, 2, 2, f % 70 < 35 ? '#ff5b4f' : '#3a1a18');
    } else if (seed % 3 === 1) {
      r(ctx, px + 8, py + 8, 16, 18, '#1a2436'); r(ctx, px + 10, py + 10, 12, 3, '#4f7ad4');
      r(ctx, px + 10, py + 15, 12, 8, '#0e1624');
    }
  } else if (deco === 'storage') {
    if (seed % 3 === 0) { r(ctx, px + 6, py + 10, 20, 16, '#8B5A2B'); r(ctx, px + 8, py + 6, 8, 6, '#e8c99b'); r(ctx, px + 16, py + 7, 7, 5, '#d4a574'); }
    else { r(ctx, px + 8, py + 12, 16, 12, '#d9cba6'); r(ctx, px + 8, py + 12, 16, 3, '#b8a882'); }
  } else if (deco === 'bakery') {
    if (seed % 4 === 0) {
      r(ctx, px + 5, py + 8, 22, 18, '#3a2418');
      const glow = .45 + Math.sin(f * .1 + px) * .25;
      ctx.fillStyle = `rgba(255,120,40,${glow})`; ctx.fillRect(px + 8, py + 11, 16, 10);
      r(ctx, px + 10, py + 14, 12, 3, '#ffd08a');
    } else if (seed % 4 === 1) {
      r(ctx, px + 10, py + 4, 4, 20, '#6c5344'); r(ctx, px + 8, py + 6, 8, 3, '#8a94a0');
      ctx.globalAlpha = .25 + Math.sin(f * .08 + px) * .1; r(ctx, px + 12, py + 8, 6, 10, '#dfe6ee'); ctx.globalAlpha = 1;
    }
  } else if (deco === 'vault') {
    if (seed % 5 === 0) {
      r(ctx, px + 8, py + 5, 16, 5, '#4c5666');
      if (Math.sin(f * .05 + px) > 0) { ctx.fillStyle = 'rgba(255,59,48,.5)'; ctx.fillRect(px + 14, py + 10, 2, T - 10); }
    } else if (seed % 5 === 2) {
      r(ctx, px + 7, py + 9, 18, 14, '#f4d03f'); r(ctx, px + 9, py + 11, 14, 10, '#8a6a10');
    }
  } else if (deco === 'golden') {
    r(ctx, px + 6, py + 7, 20, 16, '#ffe066'); r(ctx, px + 9, py + 10, 14, 10, '#8a6a10');
    r(ctx, px + 12, py + 12, 3, 3, '#fff3b0');
  }
}

export function drawRoomAtmosphere(ctx: CanvasRenderingContext2D, deco: string, frame: number, special = false) {
  const accent=decoMetal(deco);
  const baseLights=deco==='lobby'?[[120,48],[360,48]]:
    deco==='security'?[[80,42],[240,38],[400,42]]:
    deco==='bakery'?[[100,48],[380,48]]:
    deco==='vault'?[[160,42],[320,42]]:
    deco==='golden'?[[150,42],[330,42]]:
    [[140,48],[340,48]];
  const lights=baseLights.map(([x,y])=>[x/480*CANVAS_WIDTH,y] as [number,number]);

  // Iluminación arquitectónica: luminarias de pared que bañan piedra y metal.
  for(const [lx,ly] of lights){
    const g=ctx.createRadialGradient(lx,ly,3,lx,ly+44,108);
    const col=deco==='bakery'?'226,164,111':
      deco==='golden'?'255,229,154':
      deco==='vault'?'230,208,131':
      deco==='security'?'116,183,208':
      deco==='storage'?'217,196,157':
      '216,229,228';
    const base=deco==='golden'?.22:deco==='lobby'?.18:.16;
    g.addColorStop(0,'rgba('+col+','+(base+.025*Math.sin(frame*.035+lx))+')');
    g.addColorStop(.38,'rgba('+col+','+(base*.42)+')');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(lx-108,ly-12,216,174);

    // Luminaria física empotrada en el muro.
    ctx.globalAlpha=.55;ctx.fillStyle=accent;ctx.fillRect(lx-9,38,18,2);
    ctx.globalAlpha=.18;ctx.fillStyle='#fff8dd';ctx.fillRect(lx-5,40,10,2);
    ctx.globalAlpha=1;
  }

  ctx.save();
  // Marco interior continuo: incrustación que hace que la sala se lea como
  // una estancia bancaria diseñada, no como un conjunto de tiles.
  ctx.globalAlpha=deco==='golden'?.20:.11;
  ctx.strokeStyle=accent;ctx.lineWidth=1;
  ctx.strokeRect(43.5,43.5,CANVAS_WIDTH-87,CANVAS_HEIGHT-87);
  ctx.globalAlpha=deco==='golden'?.10:.055;
  ctx.strokeRect(49.5,49.5,CANVAS_WIDTH-99,CANVAS_HEIGHT-99);

  // Eje central pulido/incrustado según sector.
  if(deco==='lobby'){
    ctx.globalAlpha=.09;ctx.fillStyle=accent;
    ctx.fillRect(CANVAS_WIDTH/2-1,48,2,CANVAS_HEIGHT-96);
    ctx.fillRect(48,CANVAS_HEIGHT/2-1,CANVAS_WIDTH-96,2);
    ctx.globalAlpha=.06;ctx.strokeStyle='#dce7e4';ctx.strokeRect(62.5,57.5,CANVAS_WIDTH-125,CANVAS_HEIGHT-115);
  }else if(deco==='security'){
    const scan=52+(frame*.38)%(CANVAS_HEIGHT-104);
    ctx.globalAlpha=.055;ctx.fillStyle='#74b7d0';ctx.fillRect(46,scan,CANVAS_WIDTH-92,1);
    ctx.globalAlpha=.028;ctx.fillRect(46,scan-4,CANVAS_WIDTH-92,9);
    ctx.globalAlpha=.075;ctx.fillStyle='#ba554d';
    for(const x of [70,CANVAS_WIDTH-74])if(((frame+Math.floor(x))>>4)%2===0)ctx.fillRect(x,47,3,2);
  }else if(deco==='storage'){
    // Archivo de valores: líneas de bronce y zonas de circulación limpias.
    ctx.globalAlpha=.075;ctx.fillStyle=accent;
    for(let x=72;x<CANVAS_WIDTH-64;x+=112)ctx.fillRect(x,54,1,CANVAS_HEIGHT-108);
    ctx.globalAlpha=.035;ctx.fillStyle='#050708';
    for(let y=88;y<CANVAS_HEIGHT-64;y+=76)ctx.fillRect(54,y,CANVAS_WIDTH-108,2);
  }else if(deco==='bakery'){
    // Servicios privados: calor contenido en líneas de cobre, sin suciedad visual.
    const heat=.045+.014*Math.sin(frame*.05);
    ctx.globalAlpha=heat;ctx.fillStyle=accent;
    ctx.fillRect(42,50,3,CANVAS_HEIGHT-100);ctx.fillRect(CANVAS_WIDTH-45,50,3,CANVAS_HEIGHT-100);
    ctx.globalAlpha=.032;ctx.fillStyle='#f0c39a';
    for(let y=78;y<CANVAS_HEIGHT-62;y+=58)ctx.fillRect(58,y,CANVAS_WIDTH-116,1);
  }else if(deco==='vault'){
    ctx.globalAlpha=.075;ctx.strokeStyle=accent;
    for(let i=0;i<3;i++)ctx.strokeRect(54+i*16+.5,51+i*11+.5,CANVAS_WIDTH-109-i*32,CANVAS_HEIGHT-103-i*22);
    ctx.globalAlpha=.035;ctx.fillStyle='#d7ddd8';
    for(let x=74;x<CANVAS_WIDTH-68;x+=64)ctx.fillRect(x,54,1,CANVAS_HEIGHT-108);
  }else if(deco==='golden'){
    // Cámara principal: geometría simétrica y reflejos de oro muy controlados.
    const shimmer=.06+.022*Math.sin(frame*.045);
    ctx.globalAlpha=shimmer;ctx.strokeStyle=accent;
    ctx.strokeRect(52.5,50.5,CANVAS_WIDTH-105,CANVAS_HEIGHT-101);
    ctx.strokeRect(68.5,63.5,CANVAS_WIDTH-137,CANVAS_HEIGHT-127);
    ctx.globalAlpha=.045;ctx.fillStyle='#ffe59a';
    ctx.fillRect(CANVAS_WIDTH/2-1,52,2,CANVAS_HEIGHT-104);
    for(let i=0;i<6;i++){
      const x=78+(i*79)%Math.max(90,CANVAS_WIDTH-156),y=72+((i*41+Math.floor(frame*.1))%(CANVAS_HEIGHT-144));
      ctx.fillRect(x,y,i%2?1:2,1);
    }
  }
  ctx.restore();

  // Reflejo central tenue sobre el piso pulido.
  const reflection=ctx.createLinearGradient(0,62,0,CANVAS_HEIGHT-56);
  reflection.addColorStop(0,'rgba(255,255,255,0)');
  reflection.addColorStop(.48,'rgba(255,255,255,.018)');
  reflection.addColorStop(.55,'rgba(255,255,255,.032)');
  reflection.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=reflection;ctx.fillRect(54,54,CANVAS_WIDTH-108,CANVAS_HEIGHT-108);

  const vignette=ctx.createRadialGradient(CANVAS_WIDTH/2,CANVAS_HEIGHT/2,126,CANVAS_WIDTH/2,CANVAS_HEIGHT/2,Math.max(CANVAS_WIDTH,CANVAS_HEIGHT)*.72);
  vignette.addColorStop(0,'rgba(0,0,0,0)');
  vignette.addColorStop(1,'rgba(1,6,9,.14)');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

  if(special){
    const g=ctx.createRadialGradient(CANVAS_WIDTH/2,176,18,CANVAS_WIDTH/2,176,180);
    g.addColorStop(0,'rgba(198,168,102,.10)');
    g.addColorStop(.55,'rgba(86,55,70,.055)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  }
}

export function drawInnerWallShadow(ctx: CanvasRenderingContext2D) {
  // Profundidad de muro + zócalo interior.
  ctx.fillStyle='rgba(0,0,0,.24)';
  ctx.fillRect(T,T,CANVAS_WIDTH-T*2,5);
  ctx.fillRect(T,T,5,CANVAS_HEIGHT-T*2);
  ctx.fillRect(CANVAS_WIDTH-T-5,T,5,CANVAS_HEIGHT-T*2);
  ctx.fillStyle='rgba(255,255,255,.032)';
  ctx.fillRect(T+5,T+5,CANVAS_WIDTH-T*2-10,1);
  ctx.fillStyle='rgba(0,0,0,.16)';
  ctx.fillRect(T+5,CANVAS_HEIGHT-T-5,CANVAS_WIDTH-T*2-10,4);
}

export { TILE_DOOR };
