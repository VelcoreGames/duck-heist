import { drawDuckSkin, drawSecurityPigeon, drawShopPigeon } from './sprites';

type Ctx = CanvasRenderingContext2D;
const r = (c:Ctx,x:number,y:number,w:number,h:number,color:string) => { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),w,h); };
function disc(c:Ctx,x:number,y:number,radius:number,color:string) {
  c.fillStyle=color;
  for(let j=-radius;j<=radius;j+=2) {
    const half=Math.floor(Math.sqrt(radius*radius-j*j)/2)*2;
    c.fillRect(Math.round(x-half),Math.round(y+j),half*2,2);
  }
}
function bolt(c:Ctx,x:number,y:number) {
  r(c,x-2,y-2,5,5,'#101c27'); r(c,x-1,y-1,3,3,'#829ba0'); r(c,x-1,y-1,2,1,'#c2cebe');
}
function coinPile(c:Ctx,x:number,y:number,count:number,t:number) {
  for(let i=0;i<count;i++) {
    const xx=x+((i*23)%34), yy=y-Math.floor(i/5)*3+(i%2);
    r(c,xx,yy,7,3,'#9c622b'); r(c,xx,yy,7,1,'#f2bf58'); r(c,xx+1,yy,2,1,'#fff0a0');
  }
  if(t%160<15) { r(c,x+12,y-6,1,7,'#fff5bd'); r(c,x+9,y-3,7,1,'#fff5bd'); }
}
function camera(c:Ctx,x:number,y:number,t:number,flip=1) {
  r(c,x-4,y-9,8,3,'#61777b'); r(c,x-1,y-6,3,9,'#32454d');
  c.save(); c.translate(x,y); c.rotate(Math.sin(t*.007)*.2*flip); c.scale(flip,1);
  r(c,-8,0,19,8,'#101e29'); r(c,-7,1,15,5,'#7f9492'); r(c,-6,2,11,2,'#a9b6a7');
  r(c,8,1,4,7,'#354951'); r(c,10,3,3,3,'#75babe'); r(c,-5,6,2,2,t%70<40?'#ea7763':'#763940');
  c.globalAlpha=.035; c.fillStyle='#72b7b6'; c.beginPath(); c.moveTo(12,4); c.lineTo(95,70); c.lineTo(115,15); c.fill(); c.restore();
}

const smooth01=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};

function drawVaultInterior(c:Ctx,vx:number,vy:number,reveal:number,frame:number) {
  c.save();
  c.beginPath();c.arc(vx,vy,58,0,Math.PI*2);c.clip();
  r(c,vx-62,vy-62,124,124,'#061015');

  const inner=c.createRadialGradient(vx,vy,4,vx,vy,66);
  inner.addColorStop(0,`rgba(255,218,123,${.18+reveal*.30})`);
  inner.addColorStop(.58,`rgba(111,87,44,${.16+reveal*.18})`);
  inner.addColorStop(1,'rgba(0,0,0,.72)');
  c.fillStyle=inner;c.fillRect(vx-64,vy-64,128,128);

  // Estantes y cajas de seguridad: el interior se descubre de verdad al correrse la puerta.
  for(let row=0;row<3;row++){
    const y=vy-40+row*27;
    r(c,vx-47,y,94,3,'#695f46');
    for(let col=0;col<5;col++){
      const x=vx-43+col*19;
      r(c,x,y+4,15,18,row===1&&col===2?'#7a5d2f':'#253a3e');
      r(c,x+1,y+5,13,2,row===1&&col===2?'#d2a84f':'#526569');
      r(c,x+6,y+12,3,2,row===1&&col===2?'#f2cf67':'#8ca0a0');
    }
  }

  // Pan dorado como recompensa visual central, nunca como un simple rectángulo de luz.
  const bob=Math.round(Math.sin(frame*.035)*1);
  r(c,vx-13,vy-16+bob,26,18,'#8f6827');
  r(c,vx-11,vy-20+bob,22,7,'#f1cf66');
  r(c,vx-9,vy-17+bob,18,14,'#e7b84d');
  for(let i=0;i<3;i++){r(c,vx-7+i*7,vy-16+bob,2,7,'#98702e');}
  r(c,vx-8,vy-4+bob,16,2,'#c79134');

  for(let i=0;i<8;i++){
    const a=i*.81+frame*.004;
    const rad=31+(i%3)*7;
    const x=vx+Math.cos(a)*rad,y=vy+Math.sin(a)*rad;
    c.globalAlpha=(.10+(i%3)*.06)*reveal;
    r(c,x,y,i%4===0?2:1,1,i%2?'#fff0a0':'#e6c56f');
  }
  c.globalAlpha=1;
  c.restore();
}

function drawVaultClamps(c:Ctx,vx:number,vy:number,release:number) {
  const pull=smooth01(release)*11;
  const clamps=[
    {x:vx-8,y:vy-78,w:16,h:12,dx:0,dy:-pull},
    {x:vx-8,y:vy+66,w:16,h:12,dx:0,dy:pull},
    {x:vx-78,y:vy-8,w:12,h:16,dx:-pull,dy:0},
    {x:vx+66,y:vy-8,w:12,h:16,dx:pull,dy:0},
  ];
  for(const q of clamps){
    const x=q.x+q.dx,y=q.y+q.dy;
    r(c,x+2,y+2,q.w,q.h,'#07131a');
    r(c,x,y,q.w,q.h,'#657b79');
    r(c,x+2,y+2,q.w-4,2,'#aeb9a7');
    r(c,x+3,y+q.h-4,q.w-6,2,'#31474c');
  }
}


export function drawVaultScene(c:Ctx,frame:number,skin='robber',opening=0,mouseX=240,mouseY=176,cinematic=0,accent='#e6c56f') {
  r(c,0,0,480,352,'#10191f');
  const cin=Math.max(0,Math.min(1,cinematic));
  const parallaxMul=cin>0?Math.max(.18,1-cin*.82):1;
  const parX=(mouseX-240)/180*parallaxMul,parY=(mouseY-176)/250*parallaxMul;
  c.save(); c.translate(parX,parY);
  // Deep masonry, steel ribs and a glass security office.
  for(let row=0;row<12;row++) for(let col=0;col<11;col++) {
    const x=col*48-(row%2)*24;
    r(c,x,row*20,47,19,(row+col)%3===0?'#1a2a30':'#17262c');
    r(c,x+2,row*20+2,43,1,'#24353a');
  }
  r(c,8,98,53,126,'#101d25'); r(c,12,103,45,118,'#243841');
  for(let i=0;i<4;i++) r(c,14,108+i*26,40,1,'#476067');
  c.save(); c.beginPath(); c.rect(14,105,39,113); c.clip(); c.globalAlpha=.33;
  const px=12+(frame*.12)%67;
  drawSecurityPigeon(c,px,174,frame,false); c.restore();
  r(c,31,103,3,120,'#18272e');
  const police=cin>0?(cin<.52?'#91433f':'#537f78'):(Math.sin(frame*.045)>0?'#356593':'#91433f');
  if(cin>0 || frame%600>460) {
    c.globalAlpha=cin>0?.07+.09*(1-smooth01((cin-.56)/.24)):.13;
    r(c,10,110,49,107,police);c.globalAlpha=1;
  }
  for(const x of [2,190,464]) {
    r(c,x,0,14,280,'#0c1820'); r(c,x+3,0,8,280,'#30434a'); r(c,x+4,0,2,280,'#526268');
    for(let y=15;y<280;y+=36) bolt(c,x+7,y);
  }
  r(c,0,258,480,94,'#172327');
  for(let j=0;j<6;j++) {
    r(c,0,259+j*j*3,480,1,'#344347');
    for(let i=-3;i<8;i++) {
      const x=240+(i*60-160)*(1+j*.2);
      c.strokeStyle='#25383c'; c.lineWidth=1; c.beginPath(); c.moveTo(x,259+j*j*3); c.lineTo(240+(x-240)*1.12,259+(j+1)**2*3); c.stroke();
    }
  }
  // Vault surround: chamfered, massive and slightly weathered.
  r(c,221,87,231,183,'#07121a'); r(c,225,84,223,178,'#33494e');
  r(c,229,88,215,170,'#455e62'); r(c,234,93,205,160,'#20383e');
  r(c,229,88,215,3,'#7b8d87'); r(c,229,254,215,5,'#10232b');
  for(let x=236;x<441;x+=20) { bolt(c,x,94); bolt(c,x,250); }
  for(let y=110;y<246;y+=20) { bolt(c,233,y); bolt(c,439,y); }
  const vx=336,vy=170;
  const intro=Math.max(0,Math.min(1,opening));
  const glow=c.createRadialGradient(vx,vy,30,vx,vy,154);
  glow.addColorStop(0,`rgba(255,189,64,${.15+intro*.72})`); glow.addColorStop(.52,`rgba(230,181,83,${intro*.10})`); glow.addColorStop(1,'rgba(255,189,64,0)');
  c.fillStyle=glow; c.fillRect(170,20,310,315);
  disc(c,vx,vy,83,'#0c2028'); disc(c,vx,vy,79,'#8c9d91'); disc(c,vx,vy,75,'#364e52');
  disc(c,vx,vy,72,'#172f34'); disc(c,vx,vy,68,'#eeb553'); disc(c,vx,vy,66,'#5b5140');

  // Interior físico detrás de la puerta: estantes, cajas y el botín central.
  drawVaultInterior(c,vx,vy,intro,frame);
  drawVaultClamps(c,vx,vy,Math.max(0,(cin-.16)/.30));

  // Opening is real visual movement of the door, timed by the engine.
  const doorEase=smooth01(intro);
  const heavyKick=cin>0?Math.sin(Math.max(0,Math.min(1,(cin-.24)/.16))*Math.PI)*2:0;
  c.save(); c.translate(doorEase*75+heavyKick,Math.sin(doorEase*Math.PI)*-1); c.scale(1-doorEase*.18,1);
  disc(c,vx,vy,64,'#5c7271'); disc(c,vx,vy,61,'#314c53'); disc(c,vx,vy,57,'#273f45');
  for(let a=0;a<Math.PI*2;a+=Math.PI/8) {
    const xx=vx+Math.cos(a)*72,yy=vy+Math.sin(a)*72; bolt(c,xx,yy);
    const xx2=vx+Math.cos(a+.06)*58,yy2=vy+Math.sin(a+.06)*58;
    r(c,xx2,yy2,3,3,'#526966');
  }
  // Bread engraving in the upper plate.
  r(c,vx-17,vy-44,34,18,'#8c834f'); r(c,vx-14,vy-48,28,6,'#c9b278');
  r(c,vx-14,vy-43,28,13,'#d8c28c');
  for(let i=0;i<3;i++) { r(c,vx-11+i*9,vy-43,3,7,'#887443'); r(c,vx-9+i*9,vy-41,2,6,'#887443'); }
  // Six locking bars meet a rotating wheel.
  const wheelSpin=cin>0?smooth01(Math.max(0,Math.min(1,(cin-.08)/.34))):intro;
  const angle=frame*.0015+wheelSpin*7.1+Math.sin(wheelSpin*Math.PI)*.26;
  for(let i=0;i<6;i++) {
    const a=angle+i*Math.PI/3, x1=vx+Math.cos(a)*15,y1=vy+12+Math.sin(a)*15;
    const x2=vx+Math.cos(a)*43,y2=vy+12+Math.sin(a)*43;
    c.strokeStyle='#0c2028'; c.lineWidth=7; c.beginPath(); c.moveTo(x1+1,y1+2); c.lineTo(x2+1,y2+2); c.stroke();
    c.strokeStyle='#b4b995'; c.lineWidth=4; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
    bolt(c,x2,y2);
  }
  disc(c,vx,vy+12,22,'#172c32'); disc(c,vx,vy+12,19,'#b8a667'); disc(c,vx,vy+12,15,'#4d6260');
  disc(c,vx,vy+12,7,'#d5be78'); r(c,vx-2,vy+8,4,8,'#374b4b');
  r(c,vx+48,vy-21,9,43,'#172c31'); r(c,vx+50,vy-19,4,40,'#698177');
  c.restore();
  if(intro>0) {
    const beam=c.createLinearGradient(vx-12,0,vx+54,0);
    beam.addColorStop(0,'rgba(255,228,163,0)');
    beam.addColorStop(.28,`rgba(255,228,163,${intro*.62})`);
    beam.addColorStop(.72,`rgba(255,244,196,${intro*.82})`);
    beam.addColorStop(1,'rgba(255,228,163,0)');
    c.globalAlpha=.92;c.fillStyle=beam;c.fillRect(vx-18,101,72+intro*20,137);c.globalAlpha=1;

    // Reflejo que cruza el acero al desbloquearse.
    const sweep=Math.max(0,Math.min(1,(intro-.12)/.68));
    const sx=268+sweep*164;
    const shine=c.createLinearGradient(sx-24,0,sx+24,0);
    shine.addColorStop(0,'rgba(255,244,196,0)');
    shine.addColorStop(.5,`rgba(255,244,196,${.22*Math.sin(sweep*Math.PI)})`);
    shine.addColorStop(1,'rgba(255,244,196,0)');
    c.fillStyle=shine;c.fillRect(245,92,206,164);
  }
  // Warm spill reaches the floor, without obscuring menu controls.
  c.globalAlpha=.12+intro*.38; c.fillStyle='#e5b257'; c.beginPath();
  c.moveTo(315,247);c.lineTo(363,247);c.lineTo(440,337);c.lineTo(239,337);c.fill();c.globalAlpha=1;
  r(c,283,77,108,8,'#0f2329');
  for(let i=0;i<5;i++){
    const phase=cin>0?cin:(frame+i*8)%80/80;
    const online=cin>0?phase>(.16+i*.055):(frame+i*8)%80<44;
    r(c,298+i*17,79,8,3,online?(cin>.66?accent:'#b4c88a'):'#4d725c');
  }
  if(cin>0){
    r(c,320,79,28,3,cin<.58?(frame%8<4?'#f07763':'#572e32'):'#78c99a');
  }else if(intro>0) r(c,320,79,28,3,frame%10<5?'#f07763':'#572e32');
  // Keypad and monitor mounted beside the vault.
  r(c,447,145,12,35,'#0d1d25');r(c,449,148,8,8,'#74a88b');
  for(let i=0;i<6;i++) r(c,449+(i%2)*5,160+Math.floor(i/2)*5,3,3,'#778783');
  camera(c,222,77,frame); camera(c,440,57,frame,-1);
  // Wanted poster, clipped to an alcove away from the controls.
  c.save();c.translate(201,203);c.rotate(Math.sin(frame*.012)*.035);
  r(c,-11,-16,24,34,'#0b1920');r(c,-12,-17,22,32,'#c7b283');r(c,-10,-14,18,3,'#795e44');
  r(c,-6,-6,10,10,'#d9b755');r(c,-6,-4,10,3,'#222e32');r(c,-8,9,14,2,'#75503e');c.restore();
  // Sacks, coins and bread crates at the base.
  for(const [x,y] of [[238,268],[397,258],[415,290]]) {
    r(c,x,y,29,21,'#543b2b');r(c,x+1,y+1,27,4,'#966a3d');r(c,x+4,y+9,21,2,'#aa7a41');r(c,x+4,y+2,3,18,'#3b302b');
  }
  coinPile(c,272,278,22,frame);coinPile(c,397,281,32,frame+77);coinPile(c,363,301,18,frame+99);
  if(intro>.28){
    for(let i=0;i<6;i++){
      const phase=(frame*.018+i*.91)%1;
      const xx=278+(i*41)%145;
      const yy=302-phase*38-(i%2)*7;
      c.globalAlpha=(1-phase)*intro*.55;
      r(c,xx,yy,i%3===0?2:1,1,i%2?'#fff0a0':'#e6c56f');
    }
    c.globalAlpha=1;
  }
  // Coreografía del protagonista: entra al cono de luz, observa la bóveda y
  // termina mirando al jugador cuando la infiltración queda autorizada.
  const walk=smooth01(Math.max(0,Math.min(1,(cin-.30)/.28)));
  const ready=smooth01(Math.max(0,Math.min(1,(cin-.68)/.18)));
  const duckX=cin>0?326+walk*5:331;
  const duckY=cin>0?278-walk*8:270;
  const duckBob=cin>0&&cin<.62?Math.round(Math.sin(frame*.42)):Math.round(Math.sin(frame*.036));
  const duckPulse=cin>0?1+Math.sin(ready*Math.PI)*.035:1;
  const duckDir=cin>0?(ready>.55?'down':'up'):(frame%660>520?'left':'down');
  const duckMoving=cin>0&&cin>.30&&cin<.58;

  if(cin>0){
    const spot=c.createRadialGradient(duckX,duckY+7,3,duckX,duckY+7,38);
    spot.addColorStop(0,`rgba(255,222,133,${.11+.16*ready})`);
    spot.addColorStop(1,'rgba(255,222,133,0)');
    c.fillStyle=spot;c.fillRect(duckX-42,duckY-30,84,72);
  }

  c.save();c.translate(duckX,duckY+duckBob);c.scale(2.6*duckPulse,2.6*duckPulse);
  drawDuckSkin(c,-8,-8,frame,skin,duckDir,duckMoving,false,false,false);c.restore();
  const pigeonT=frame%1400;
  if(pigeonT>1040) { const xx=470-Math.min(40,(pigeonT-1040)*.25); drawShopPigeon(c,xx,304,frame); }
  for(let i=0;i<27;i++) {
    const x=230+(i*47)%225+Math.sin(frame*.011+i)*5;
    const speed=cin>0?.12+.13*smooth01((cin-.34)/.34):.12;
    const y=70+((i*39-frame*speed+6000)%260);
    c.globalAlpha=(.12+(i%3)*.09)*(cin>0?.55+.55*intro:1);
    r(c,x,y,i%7===0?2:1,1,i%4===0?'#fff0a0':'#eed28b');
  }
  c.globalAlpha=1;c.restore();
  const veil=c.createLinearGradient(0,0,225,0);veil.addColorStop(0,'rgba(8,18,24,.83)');veil.addColorStop(1,'rgba(8,18,24,0)');
  c.fillStyle=veil;c.fillRect(0,92,225,240);
  const top=c.createLinearGradient(0,0,0,100);top.addColorStop(0,'rgba(7,17,23,.92)');top.addColorStop(1,'rgba(7,17,23,0)');
  c.fillStyle=top;c.fillRect(0,0,480,100);
  r(c,0,340,480,12,'#0a171e');
}

const letters:Record<string,string[]> = {
  D:['11110','11011','11001','11001','11001','11011','11110'],
  U:['11011','11011','11011','11011','11011','11011','01110'],
  C:['01111','11001','11000','11000','11000','11001','01111'],
  K:['11011','11011','11110','11100','11110','11011','11011'],
  H:['11011','11011','11011','11111','11011','11011','11011'],
  E:['11111','11000','11000','11110','11000','11000','11111'],
  I:['11111','00110','00110','00110','00110','00110','11111'],
  S:['01111','11000','11000','01110','00011','00011','11110'],
  T:['11111','00110','00110','00110','00110','00110','00110'],
};
export function drawPixelLogo(c:Ctx) {
  const s=5, word='DUCK HEIST', width=word.split('').reduce((n,l)=>n+(l===' '?3:6)*s,0)-s;
  let x=(480-width)/2;
  for(const ch of word) {
    if(ch===' ') { x+=3*s; continue; }
    const rows=letters[ch];
    for(let y=0;y<7;y++) for(let xx=0;xx<5;xx++) if(rows[y][xx]==='1') {
      r(c,x+xx*s+2,28+y*s+7,s,s,'#050e16');
      r(c,x+xx*s,28+y*s+4,s,s,'#7c522a');
    }
    for(let y=0;y<7;y++) for(let xx=0;xx<5;xx++) if(rows[y][xx]==='1') {
      r(c,x+xx*s,28+y*s,s,s,y<2?'#fff2b3':y<5?'#f1d175':'#dca749');
      if(y===0 || rows[y-1][xx]==='0') r(c,x+xx*s,28+y*s,s,1,'#fffbdb');
    }
    x+=6*s;
  }
}