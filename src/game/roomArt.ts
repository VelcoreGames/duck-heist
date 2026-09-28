import { TILE_SIZE, ROOM_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_DOOR, ART_SCALE, ART_PIXEL } from './constants';
import type { FloorTheme } from './constants';

const T = TILE_SIZE;

function hash(x: number, y: number, s = 0) {
  return Math.abs((x * 73 + y * 37 + s * 19) * 2654435761) >>> 0;
}

const artSnap=(v:number)=>Math.round(v*ART_SCALE)/ART_SCALE;
const artSpan=(v:number)=>Math.max(ART_PIXEL,Math.round(v*ART_SCALE)/ART_SCALE);
function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(artSnap(x), artSnap(y), artSpan(w), artSpan(h));
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

function drawHazardBand(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,accent:string,vertical=false){
  r(ctx,x,y,w,h,'#17191a');
  ctx.save();ctx.globalAlpha=.82;ctx.fillStyle=accent;
  const step=7;
  if(vertical){
    for(let yy=y-4;yy<y+h+4;yy+=step){
      ctx.beginPath();ctx.moveTo(x,yy+4);ctx.lineTo(x+w,yy);ctx.lineTo(x+w,yy+3);ctx.lineTo(x,yy+7);ctx.closePath();ctx.fill();
    }
  }else{
    for(let xx=x-4;xx<x+w+4;xx+=step){
      ctx.beginPath();ctx.moveTo(xx,y+h);ctx.lineTo(xx+4,y);ctx.lineTo(xx+7,y);ctx.lineTo(xx+3,y+h);ctx.closePath();ctx.fill();
    }
  }
  ctx.restore();
}

function drawFloorPlateDetail(
  ctx:CanvasRenderingContext2D,px:number,py:number,h:number,theme:FloorTheme,frame:number,
){
  const metal=decoMetal(theme.deco),variant=h%9;
  if(variant===0){
    // rejilla industrial hundida
    r(ctx,px+6,py+6,20,20,'rgba(3,7,9,.28)');
    r(ctx,px+7,py+7,18,18,'rgba(255,255,255,.018)');
    ctx.globalAlpha=.24;ctx.fillStyle='#05090b';
    for(let yy=py+9;yy<py+24;yy+=4)ctx.fillRect(px+9,yy,14,2);
    ctx.globalAlpha=.20;ctx.fillStyle=metal;ctx.fillRect(px+8,py+7,16,1);ctx.globalAlpha=1;
  }else if(variant===1){
    // tapa de mantenimiento con tornillos
    ctx.strokeStyle='rgba(255,255,255,.09)';ctx.lineWidth=1;ctx.strokeRect(px+6.5,py+6.5,19,19);
    r(ctx,px+9,py+10,14,1,'rgba(0,0,0,.20)');
    for(const [ox,oy] of [[8,8],[23,8],[8,23],[23,23]] as const)r(ctx,px+ox,py+oy,1,1,'rgba(210,220,220,.20)');
  }else if(variant===2){
    // canal técnico con luz
    r(ctx,px+4,py+15,24,3,'rgba(2,6,8,.34)');
    r(ctx,px+5,py+16,22,1,'rgba(255,255,255,.04)');
    ctx.globalAlpha=.24+.08*Math.sin(frame*.035+h);r(ctx,px+9,py+16,8,1,metal);ctx.globalAlpha=1;
  }else if(variant===3){
    // placa perforada
    r(ctx,px+5,py+7,22,18,'rgba(4,8,10,.18)');
    ctx.globalAlpha=.22;
    for(let yy=py+10;yy<=py+22;yy+=4)for(let xx=px+8;xx<=px+23;xx+=5)r(ctx,xx,yy,1,1,'#05090b');
    ctx.globalAlpha=1;
  }else if(variant===4){
    // esquinas de advertencia, sin forma de flecha
    ctx.globalAlpha=.38;
    drawHazardBand(ctx,px+3,py+3,12,3,metal);
    drawHazardBand(ctx,px+17,py+26,12,3,metal);
    ctx.globalAlpha=1;
  }else if(variant===5){
    // desgaste / arañazos
    ctx.globalAlpha=.15;ctx.fillStyle='#a9b3b2';
    r(ctx,px+6,py+11,11,1,'rgba(190,201,200,.16)');
    r(ctx,px+14,py+14,9,1,'rgba(190,201,200,.11)');
    r(ctx,px+9,py+21,7,1,'rgba(190,201,200,.09)');
    ctx.globalAlpha=1;
  }else if(variant===6){
    // inserto de señalización
    r(ctx,px+5,py+25,22,2,'rgba(4,8,10,.30)');
    ctx.globalAlpha=.42;r(ctx,px+8,py+25,8,1,metal);ctx.globalAlpha=1;
  }else if(variant===7){
    // doble carril metálico
    ctx.globalAlpha=.16;r(ctx,px+9,py+4,1,24,metal);r(ctx,px+22,py+4,1,24,metal);ctx.globalAlpha=1;
  }else{
    // panel limpio premium con herrajes
    ctx.globalAlpha=.16;
    for(const [ox,oy] of [[6,6],[25,6],[6,25],[25,25]] as const)r(ctx,px+ox,py+oy,1,1,metal);
    ctx.globalAlpha=1;
  }
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
    // Pared reforzada: tres profundidades visuales + bastidor estructural.
    r(ctx,px,py,T,T,'#060a0d');
    r(ctx,px+1,py+1,T-2,T-2,theme.wall[(x+y+h)%2]);
    r(ctx,px+2,py+2,T-4,2,'rgba(255,255,255,.075)');
    r(ctx,px+2,py+4,T-4,2,'rgba(0,0,0,.34)');

    // Bastidor vertical y zócalo grueso.
    if(x%2===0){
      r(ctx,px+1,py+4,3,T-8,'rgba(3,6,8,.38)');
      r(ctx,px+3,py+5,1,T-10,'rgba(255,255,255,.055)');
    }else{
      r(ctx,px+T-4,py+4,3,T-8,'rgba(3,6,8,.38)');
      r(ctx,px+T-4,py+5,1,T-10,'rgba(255,255,255,.035)');
    }
    r(ctx,px+2,py+25,T-4,6,'rgba(2,5,7,.52)');
    r(ctx,px+3,py+25,T-6,1,'rgba(255,255,255,.045)');

    // Panel central hundido.
    r(ctx,px+5,py+7,T-10,16,'rgba(3,7,10,.30)');
    r(ctx,px+6,py+8,T-12,14,'rgba(255,255,255,.025)');
    r(ctx,px+6,py+8,T-12,1,'rgba(255,255,255,.075)');
    r(ctx,px+6,py+21,T-12,1,'rgba(0,0,0,.38)');

    // Carril de sector y herrajes.
    r(ctx,px+3,py+5,T-6,1,metal);
    ctx.globalAlpha=.28;r(ctx,px+4,py+6,T-8,1,metal);ctx.globalAlpha=1;
    for(const [ox,oy] of [[6,9],[T-7,9],[6,21],[T-7,21]] as const)r(ctx,px+ox,py+oy,1,1,'rgba(215,224,223,.13)');

    // Variación arquitectónica grande: vents / luces / placas / franjas.
    const variant=h%6;
    if(variant===0){
      r(ctx,px+8,py+11,16,8,'#0a1013');
      ctx.globalAlpha=.45;for(let yy=py+12;yy<py+19;yy+=2)r(ctx,px+10,yy,12,1,'#27333a');ctx.globalAlpha=1;
    }else if(variant===1){
      r(ctx,px+8,py+10,16,9,'#091217');
      r(ctx,px+9,py+11,14,7,theme.deco==='security'?'#0f3446':'#1f3332');
      ctx.globalAlpha=.55;r(ctx,px+11,py+13,8,1,metal);r(ctx,px+11,py+15,5,1,metal);ctx.globalAlpha=1;
    }else if(variant===2){
      r(ctx,px+8,py+13,16,5,'#11181b');
      ctx.globalAlpha=.72+.18*Math.sin(frame*.045+h);r(ctx,px+10,py+14,12,2,theme.glow);ctx.globalAlpha=1;
    }else if(variant===3){
      ctx.strokeStyle='rgba(225,232,230,.10)';ctx.strokeRect(px+9.5,py+10.5,13,10);
      r(ctx,px+12,py+13,7,1,metal);r(ctx,px+12,py+16,4,1,'rgba(210,220,220,.20)');
    }else if(variant===4&&(north||side)){
      ctx.globalAlpha=.38;drawHazardBand(ctx,px+8,py+11,16,4,metal);ctx.globalAlpha=1;
    }

    if(wallProps)drawWallProp(ctx,px,py,theme.deco,h,frame,y===0,x===0||x===ROOM_WIDTH-1);
    return;
  }

  // Suelo de panel industrial. Sigue alineado con el tilemap pero deja de verse
  // como una cuadrícula plana: macroplacas, biseles, módulos y desgaste.
  const macro=((Math.floor(x/2)+Math.floor(y/2))&1);
  const base=macro?theme.floor[1]:theme.floor[0];
  r(ctx,px,py,T,T,base);

  // Juntas de macroplaca más profundas; juntas internas más finas.
  if(x%2===0){r(ctx,px,py,2,T,theme.floor[2]);r(ctx,px+2,py,1,T,'rgba(255,255,255,.035)');}
  else r(ctx,px,py,1,T,'rgba(0,0,0,.11)');
  if(y%2===0){r(ctx,px,py,T,2,theme.floor[2]);r(ctx,px,py+2,T,1,'rgba(255,255,255,.03)');}
  else r(ctx,px,py,T,1,'rgba(0,0,0,.11)');

  // Bisel metálico y manchas tonales amplias.
  r(ctx,px+2,py+2,T-4,1,'rgba(255,255,255,.055)');
  r(ctx,px+2,py+T-3,T-4,1,'rgba(0,0,0,.16)');
  if(h%4===0){ctx.globalAlpha=.07;r(ctx,px+4,py+4,T-8,T-8,'#000');ctx.globalAlpha=1;}
  if(h%7===0){ctx.globalAlpha=.035;r(ctx,px+3,py+3,T-6,T-6,'#d7e1df');ctx.globalAlpha=1;}

  drawFloorPlateDetail(ctx,px,py,h,theme,frame);

  // Identidad sectorial visible en el propio material.
  if(theme.deco==='security'&&(x+y)%5===0){
    ctx.globalAlpha=.30;r(ctx,px+26,py+5,2,12,'#55b8da');ctx.globalAlpha=1;
  }else if(theme.deco==='storage'&&h%5===0){
    ctx.globalAlpha=.30;r(ctx,px+5,py+26,16,2,'#b48b50');ctx.globalAlpha=1;
  }else if(theme.deco==='bakery'&&h%5===0){
    ctx.globalAlpha=.28;r(ctx,px+5,py+5,2,18,'#bd6f3f');ctx.globalAlpha=1;
  }else if(theme.deco==='vault'&&h%4===0){
    ctx.globalAlpha=.30;r(ctx,px+24,py+7,2,18,'#c9ad62');ctx.globalAlpha=1;
  }else if(theme.deco==='golden'&&h%3===0){
    ctx.globalAlpha=.34;r(ctx,px+6,py+24,20,2,'#e6bd4f');ctx.globalAlpha=1;
  }

  // Desgaste lineal corto: nunca apunta a pickups ni crea flechas.
  const vein=decoVein(theme.deco);
  if(h%3===0){r(ctx,px+5,py+10,8,1,vein);r(ctx,px+15,py+10,6,1,vein);}
  if(h%5===0){r(ctx,px+10,py+21,9,1,vein);r(ctx,px+20,py+20,5,1,vein);}
}

function drawWallProp(ctx: CanvasRenderingContext2D, px: number, py: number, deco: string, h: number, f: number, north: boolean, side: boolean) {
  // Props arquitectónicos sólo donde se leen como parte del muro. Más grandes y
  // con siluetas distintas para que la pared tenga profundidad real.
  if(!north&&!side&&h%4!==0)return;
  const seed=h%8,metal=decoMetal(deco),pulse=.5+.5*Math.sin(f*.06+h);

  if(deco==='lobby'){
    if(seed===0||seed===5){ // cajero / terminal de banco
      r(ctx,px+4,py+7,24,20,'#11191d');r(ctx,px+6,py+8,20,18,'#435159');
      r(ctx,px+8,py+10,16,8,'#071116');r(ctx,px+9,py+11,14,6,'#113a47');
      ctx.globalAlpha=.75;r(ctx,px+11,py+13,8,1,'#58c6df');r(ctx,px+11,py+15,5,1,'#58c6df');ctx.globalAlpha=1;
      r(ctx,px+8,py+20,16,4,'#8d9898');r(ctx,px+10,py+21,5,2,'#d5ae55');r(ctx,px+19,py+21,3,2,pulse>.5?'#79d79a':'#355b45');
      r(ctx,px+4,py+6,24,1,metal);
    }else if(seed===1){ // panel de marca / información
      r(ctx,px+5,py+8,22,15,'#12191d');r(ctx,px+7,py+9,18,13,'#26333a');
      r(ctx,px+9,py+11,14,9,'#101b21');
      ctx.globalAlpha=.78;r(ctx,px+11,py+13,10,2,metal);r(ctx,px+13,py+16,6,1,'#d7c582');ctx.globalAlpha=1;
    }else if(seed===2){ // luminaria vertical
      r(ctx,px+12,py+6,8,18,'#171e21');r(ctx,px+13,py+7,6,16,'#403a28');
      ctx.globalAlpha=.75+.18*pulse;r(ctx,px+14,py+8,4,14,'#f1c966');ctx.globalAlpha=1;
    }else if(seed===3){ // rejilla técnica
      r(ctx,px+6,py+9,20,13,'#0a1013');
      for(let yy=py+11;yy<py+21;yy+=3)r(ctx,px+9,yy,14,1,'#39464c');
      r(ctx,px+6,py+8,20,1,metal);
    }else if(seed===4&&north){ // cámara
      r(ctx,px+9,py+6,11,5,'#56656a');r(ctx,px+18,py+7,7,3,'#121b1f');
      r(ctx,px+23,py+7,2,2,pulse>.5?'#ef5a4f':'#6e2c2d');
    }
  }else if(deco==='security'){
    if(seed%4===0){ // videowall
      r(ctx,px+4,py+7,24,17,'#071014');r(ctx,px+6,py+9,20,13,'#17313c');
      r(ctx,px+8,py+11,8,4,'#0d4056');r(ctx,px+18,py+11,6,4,'#123748');
      r(ctx,px+8,py+17,16,3,'#0b2531');
      const scan=py+10+((f>>3)%11);ctx.globalAlpha=.75;r(ctx,px+7,scan,18,1,'#5ad2f2');ctx.globalAlpha=1;
    }else if(seed%4===1){ // biométrico
      r(ctx,px+7,py+8,18,17,'#111d23');r(ctx,px+9,py+10,14,4,'#294956');
      r(ctx,px+10,py+16,12,6,'#091116');r(ctx,px+12,py+18,4,2,'#69bad3');r(ctx,px+19,py+18,2,2,pulse>.45?'#68e09d':'#2c6846');
    }else if(seed%4===2){ // beacon rojo
      r(ctx,px+13,py+8,6,15,'#172025');r(ctx,px+14,py+9,4,5,'#482126');
      ctx.globalAlpha=.55+.35*pulse;r(ctx,px+15,py+10,2,3,'#ff5c55');ctx.globalAlpha=1;
      drawHazardBand(ctx,px+8,py+20,16,3,'#d59a42');
    }else{ // vent de alta seguridad
      r(ctx,px+5,py+9,22,14,'#0a1013');for(let yy=py+11;yy<py+22;yy+=3)r(ctx,px+8,yy,16,1,'#40545d');
    }
  }else if(deco==='storage'){
    if(seed%3===0){ // archivo / cajas de valores
      r(ctx,px+4,py+7,24,19,'#292824');r(ctx,px+6,py+8,20,17,'#555044');
      for(let yy=0;yy<3;yy++)for(let xx=0;xx<2;xx++){
        const bx=px+8+xx*9,by=py+10+yy*5;r(ctx,bx,by,7,4,'#716551');r(ctx,bx+2,by+1,3,1,metal);
      }
    }else if(seed%3===1){ // ducto / soporte bronce
      r(ctx,px+13,py+5,6,20,'#36332d');r(ctx,px+14,py+5,4,20,'#876e4a');
      r(ctx,px+9,py+8,14,3,'#555b5b');r(ctx,px+9,py+20,14,3,'#555b5b');
    }else{
      r(ctx,px+6,py+9,20,14,'#161819');r(ctx,px+8,py+11,16,10,'#3d3d38');r(ctx,px+10,py+13,12,2,metal);r(ctx,px+10,py+17,8,1,'#8f8063');
    }
  }else if(deco==='bakery'){
    if(seed%3===0){ // panel térmico
      r(ctx,px+4,py+7,24,19,'#221a17');r(ctx,px+6,py+9,20,15,'#52362c');
      r(ctx,px+8,py+11,16,9,'#1b1210');ctx.globalAlpha=.35+.15*pulse;r(ctx,px+9,py+12,14,7,'#d56f3d');ctx.globalAlpha=1;
    }else if(seed%3===1){ // tuberías
      for(const ox of [9,16]){r(ctx,px+ox,py+5,4,21,'#5d3f31');r(ctx,px+ox+1,py+5,2,21,'#b66d45');}
      r(ctx,px+7,py+8,14,3,'#4d5659');r(ctx,px+7,py+20,14,3,'#4d5659');
    }else{
      r(ctx,px+6,py+9,20,14,'#211c1a');drawHazardBand(ctx,px+8,py+11,16,4,'#c47d45');r(ctx,px+10,py+18,12,3,'#55423b');
    }
  }else if(deco==='vault'){
    if(seed%3===0){ // caja empotrada reforzada
      r(ctx,px+4,py+7,24,18,'#252c30');r(ctx,px+6,py+9,20,14,'#60686a');
      r(ctx,px+8,py+11,16,10,'#2a3133');ctx.strokeStyle=metal;ctx.strokeRect(px+9.5,py+12.5,13,7);
      r(ctx,px+15,py+14,3,3,metal);
    }else if(seed%3===1){ // emisor de seguridad
      r(ctx,px+8,py+7,16,7,'#4a565b');r(ctx,px+10,py+9,12,2,'#a5b0af');
      ctx.globalAlpha=.40+.28*pulse;r(ctx,px+15,py+14,2,10,'#e45149');ctx.globalAlpha=1;
    }else{
      r(ctx,px+5,py+9,22,14,'#0a1012');for(let yy=py+11;yy<py+22;yy+=3)r(ctx,px+8,yy,16,1,'#445055');r(ctx,px+5,py+8,22,1,metal);
    }
  }else if(deco==='golden'){
    r(ctx,px+4,py+7,24,18,'#25231d');r(ctx,px+6,py+9,20,14,'#5d5239');
    for(let yy=0;yy<2;yy++)for(let xx=0;xx<3;xx++){
      const bx=px+8+xx*6,by=py+11+yy*6;r(ctx,bx,by,5,5,'#826d3d');r(ctx,bx+1,by+1,3,1,'#d6b65d');
    }
    ctx.globalAlpha=.65;r(ctx,px+4,py+6,24,1,metal);ctx.globalAlpha=1;
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

    // El baño de pared ahora alcanza el mármol como una huella elíptica.
    // Se mantiene extremadamente tenue para no competir con balas, loot o telegraphs.
    ctx.save();
    ctx.translate(lx,216);ctx.scale(1,.28);
    const floorPool=ctx.createRadialGradient(0,0,4,0,0,74);
    floorPool.addColorStop(0,'rgba(255,245,214,.055)');
    floorPool.addColorStop(.42,'rgba(255,245,214,.022)');
    floorPool.addColorStop(1,'rgba(255,245,214,0)');
    ctx.fillStyle=floorPool;ctx.beginPath();ctx.arc(0,0,74,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  ctx.save();
  // Marco interior continuo: incrustación que hace que la sala se lea como
  // una estancia bancaria diseñada, no como un conjunto de tiles.
  ctx.globalAlpha=deco==='golden'?.20:.11;
  ctx.strokeStyle=accent;ctx.lineWidth=1;
  ctx.strokeRect(43.5,43.5,CANVAS_WIDTH-87,CANVAS_HEIGHT-87);
  ctx.globalAlpha=deco==='golden'?.10:.055;
  ctx.strokeRect(49.5,49.5,CANVAS_WIDTH-99,CANVAS_HEIGHT-99);

  // Marcas de sector integradas en las cuatro esquinas: arquitectura, no HUD.
  // Cada ala del banco conserva su metal propio y gana una firma reconocible.
  ctx.globalAlpha=.20;ctx.strokeStyle=accent;ctx.lineWidth=1;
  const inset=58,len=13;
  for(const [sx,sy,dx,dy] of [
    [inset,inset,1,1],[CANVAS_WIDTH-inset,inset,-1,1],
    [inset,CANVAS_HEIGHT-inset,1,-1],[CANVAS_WIDTH-inset,CANVAS_HEIGHT-inset,-1,-1],
  ] as const){
    ctx.beginPath();ctx.moveTo(sx+dx*len,sy);ctx.lineTo(sx,sy);ctx.lineTo(sx,sy+dy*len);ctx.stroke();
    ctx.globalAlpha=.08;ctx.fillStyle=accent;ctx.fillRect(sx+dx*4-(dx<0?4:0),sy+dy*4-(dy<0?4:0),4,4);ctx.globalAlpha=.20;
  }

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
  // Infraestructura perimetral visible: canaletas, balizas y luces de piso.
  // Esto da la lectura industrial de la referencia sin invadir la zona de combate.
  ctx.globalAlpha=.34;ctx.fillStyle='#071014';
  ctx.fillRect(42,48,5,CANVAS_HEIGHT-96);
  ctx.fillRect(CANVAS_WIDTH-47,48,5,CANVAS_HEIGHT-96);
  ctx.fillRect(48,42,CANVAS_WIDTH-96,5);
  ctx.fillRect(48,CANVAS_HEIGHT-47,CANVAS_WIDTH-96,5);

  // Balizas laterales cálidas/cian según sector.
  const sideGlow=deco==='security'?'#5ad2f2':
    deco==='bakery'?'#f0a15b':
    deco==='storage'?'#d5ad68':
    deco==='vault'||deco==='golden'?'#f0c65a':'#edc35c';
  for(const yy of [92,176,260]){
    ctx.globalAlpha=.18;ctx.fillStyle=sideGlow;
    ctx.fillRect(43,yy-11,3,22);ctx.fillRect(CANVAS_WIDTH-46,yy-11,3,22);
    ctx.globalAlpha=.68;ctx.fillRect(44,yy-7,1,14);ctx.fillRect(CANVAS_WIDTH-45,yy-7,1,14);
  }

  // Carriles luminosos empotrados: cortos y horizontales para no parecer flechas.
  ctx.globalAlpha=.16+.04*Math.sin(frame*.045);ctx.fillStyle=sideGlow;
  for(const x of [86,170,254,338]){
    ctx.fillRect(x,55,26,2);
    ctx.fillRect(x,CANVAS_HEIGHT-57,26,2);
  }
  ctx.globalAlpha=1;
  ctx.restore();

  // Reflejo central tenue sobre el piso pulido.
  // Un segundo brillo lateral muy fino rompe la simetría perfecta y da
  // profundidad sin introducir decoración que se pueda confundir con pickups.
  ctx.save();
  ctx.globalAlpha=.032;ctx.fillStyle='#ffffff';
  const drift=((frame*.018)%96);
  ctx.fillRect(74+drift,66,1,CANVAS_HEIGHT-132);
  ctx.globalAlpha=.016;ctx.fillRect(CANVAS_WIDTH-92-drift*.55,72,1,CANVAS_HEIGHT-144);
  ctx.restore();

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
  // Umbral físico entre muro y sala: zócalo grueso, sombra y filete de luz.
  ctx.fillStyle='rgba(0,0,0,.36)';
  ctx.fillRect(T,T,CANVAS_WIDTH-T*2,7);
  ctx.fillRect(T,T,7,CANVAS_HEIGHT-T*2);
  ctx.fillRect(CANVAS_WIDTH-T-7,T,7,CANVAS_HEIGHT-T*2);
  ctx.fillRect(T,CANVAS_HEIGHT-T-6,CANVAS_WIDTH-T*2,6);

  ctx.fillStyle='rgba(255,255,255,.045)';
  ctx.fillRect(T+7,T+7,CANVAS_WIDTH-T*2-14,1);
  ctx.fillRect(T+7,T+8,1,CANVAS_HEIGHT-T*2-16);
  ctx.fillStyle='rgba(255,190,80,.045)';
  ctx.fillRect(T+12,CANVAS_HEIGHT-T-7,CANVAS_WIDTH-T*2-24,1);

  // Placas de anclaje en esquinas interiores.
  ctx.fillStyle='rgba(6,10,12,.72)';
  for(const [x,y] of [[T+5,T+5],[CANVAS_WIDTH-T-13,T+5],[T+5,CANVAS_HEIGHT-T-13],[CANVAS_WIDTH-T-13,CANVAS_HEIGHT-T-13]] as const){
    ctx.fillRect(x,y,8,8);
    ctx.fillStyle='rgba(214,177,87,.30)';ctx.fillRect(x+2,y+2,2,2);
    ctx.fillStyle='rgba(6,10,12,.72)';
  }
}

export { TILE_DOOR };
