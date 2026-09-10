import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const once=(s,re,to,label)=>{const n=s.replace(re,to);if(n===s)throw new Error('Weapon patch failed: '+label);return n;};
const NEW_WEAPONS=`
  butter_blaster: {
    id: 'butter_blaster', name: 'PISTOLA DE MANTEQUILLA',
    description: 'Bolas de mantequilla que frenan al objetivo',
    special: 'Cada impacto acumula lentitud. Rebota una vez en paredes.',
    fireRate: 13, damage: 6, projectileSpeed: 4.3, projectileType: 'butter_glob',
    spread: .05, projectileCount: 1, knockback: 1,
    piercing: false, bounces: 1, continuous: false, boomerang: false,
    cost: 18, rarity: 1, bars: { dmg: 2, rate: 4, range: 3, speed: 3 },
  },
  croissant_cutter: {
    id: 'croissant_cutter', name: 'CORTACROISSANTS',
    description: 'Dos medias lunas giratorias por disparo',
    special: 'Cada hoja atraviesa un enemigo y rebota una vez.',
    fireRate: 22, damage: 9, projectileSpeed: 5.1, projectileType: 'croissant_blade',
    spread: .22, projectileCount: 2, knockback: 1.2,
    piercing: false, bounces: 1, continuous: false, boomerang: false,
    cost: 23, rarity: 2, bars: { dmg: 3, rate: 3, range: 4, speed: 4 },
  },
  vault_drill: {
    id: 'vault_drill', name: 'TALADRO DE BÓVEDA',
    description: 'Ráfaga perforante de alcance muy corto',
    special: 'DPS brutal de cerca. Atraviesa enemigos, pero exige arriesgarte.',
    fireRate: 4, damage: 3.5, projectileSpeed: 7.5, projectileType: 'drill_bit',
    spread: .03, projectileCount: 1, knockback: .8,
    piercing: true, bounces: 0, continuous: true, boomerang: false,
    cost: 30, rarity: 3, bars: { dmg: 4, rate: 5, range: 1, speed: 5 },
  },
  receipt_ripper: {
    id: 'receipt_ripper', name: 'TRITURADORA DE RECIBOS',
    description: 'Escupe tiras de recibo en una ráfaga triple',
    special: 'Los recibos rebotan una vez y ganan daño al rebotar.',
    fireRate: 9, damage: 2.8, projectileSpeed: 6.4, projectileType: 'receipt',
    spread: .34, projectileCount: 3, knockback: .4,
    piercing: false, bounces: 1, continuous: false, boomerang: false,
    cost: 19, rarity: 1, bars: { dmg: 2, rate: 4, range: 3, speed: 5 },
  },`;
const FIRE=`function fireWeapon(engine: GameEngine, dx: number, dy: number) {
  const p=engine.player,w=activeWeapon(p),b=getBuild(p);
  if(w.id==='feather_gun'&&p.overheat>0)return;
  let piercingShot=w.piercing,projRadius=b.uranium?6:3;
  const len=Math.hypot(dx,dy);if(!len)return;dx/=len;dy/=len;p.shotCounter++;
  const continuous=w.continuous;
  const baseCount=(continuous?1:w.projectileCount)+(b.triple&&p.shotCounter%4===0?2:0);
  const count=baseCount*(b.twinCannon?2:1);
  for(let i=0;i<count;i++){
    let a=Math.atan2(dy,dx);
    if(count>1)a+=(i-(count-1)/2)*(w.spread||.15)/(b.twinCannon?1.6:1);
    if(!continuous)a+=rng(-.045,.045)*b.accuracy;
    let type=w.projectileType;
    let dmg=(w.damage+b.damage)*b.damageScale*p.damageMultiplier*(b.debt?1+Math.min(.3,Math.floor(p.crumbs/10)*.01):1);
    if(b.twinCannon)dmg*=.7;if(b.crown)dmg*=1+Math.min(.3,Math.floor(p.crumbs/25)*.05);if(p.chocolateTimer>0)dmg*=1+b.chocolate;
    let burning=false,bonusCrit:number|undefined;
    if(p.items.includes('toaster')&&p.shotCounter%5===0){type='toast';dmg*=1.5;burning=true;}
    if(b.burn>0||Math.random()<b.burnChance||(w.id==='baguette_launcher'&&b.burnChance>0))burning=true;
    const powerQuack=w.id==='quack_blaster'&&p.shotCounter%6===0;
    if(powerQuack){dmg*=1.6;type='quack_power';projRadius=Math.max(projRadius,4);}
    if(w.id==='feather_gun'){
      p.heat=Math.min(100,p.heat+7);a+=rng(-.035,.035)*(p.heat/45);
      if(p.heat>=100){p.overheat=45;p.heat=72;}
    }
    if(w.id==='plasma_baker'&&p.charge>18){const charge=Math.min(1,p.charge/52);dmg*=1+charge*1.65;projRadius=3+charge*7;if(charge>.68)piercingShot=true;}
    if(w.id==='golden_egg_revolver'){
      const charge=Math.min(1,p.charge/46);if(charge>.45){dmg*=1.2+charge*.18;type='golden_egg_charged';bonusCrit=.48+charge*.27;}else bonusCrit=.28;
    }
    if(w.id==='baguette_sniper'){
      const charge=Math.min(1,p.charge/55);dmg*=1+charge*.9;projRadius=3+charge*2;bonusCrit=.06+charge*.18;
    }
    p.projectileCounter++;
    const bounces=w.bounces+b.bounces+(b.fifthBounce&&p.projectileCounter%5===0?1:0)+(w.bounces>0&&(p.items.includes('butter')||p.items.includes('industrial_butter'))?2:0);
    const speed=w.projectileSpeed*b.projectileSpeed;
    const radius=(w.explode??0)*(b.uranium?1.5:1)*Math.sqrt(b.explosionScale);
    const life=w.id==='vault_drill'?18:w.boomerang?62:continuous?46:w.projectileType==='breadcrumb'?24:80;
    const penetration=b.penetration+(piercingShot&&w.id==='plasma_baker'?2:0)+(w.id==='croissant_cutter'?1:0)+(powerQuack?1:0);
    const proj=makeProjectile(p.x+7,p.y+8,Math.cos(a)*speed,Math.sin(a)*speed,type,dmg,true,life,{bounces,piercing:w.piercing,boomerang:w.boomerang,burning,explode:radius,sourceWeapon:w.id,baseSpeed:speed,penetration,knockback:w.knockback+(powerQuack?1.5:0),orbit:b.spiral?30:b.orbit?21:0,radius:projRadius,nuclear:b.uranium>0,damageScaled:true,bounceBoost:0,originDamage:dmg,critChance:bonusCrit});
    engine.projectiles.push(proj);proj.ricochetBoost=p.items.includes('industrial_butter');
    if(Math.random()<b.duplicates)engine.projectiles.push({...proj,hitEnemies:new Set(),bounces:proj.bounces+(w.id==='rubber_duck_cannon'?1:0),vx:proj.vx+rng(-.6,.6),vy:proj.vy+rng(-.6,.6)});
  }
  spawn(engine,p.x+7+dx*10,p.y+8+dy*10,'spark',w.id==='breadcrumb_shotgun'?6:w.id==='vault_drill'?4:2,w.id==='golden_egg_revolver'?'#f4d03f':w.id==='butter_blaster'?'#ffd95a':'#fff3b0');
  if(w.knockback>=3||w.id==='breadcrumb_shotgun'){p.vx-=dx*.45*w.knockback;p.vy-=dy*.45*w.knockback;}
  if(w.knockback>=5||w.id==='breadcrumb_shotgun')engine.shakeIntensity=Math.max(engine.shakeIntensity,w.id==='breadcrumb_shotgun'?2.4:2.2);
  p.charge=0;
}`;
const SPLIT=`function splitEggShell(engine:GameEngine,p:Projectile){
  const base=Math.atan2(p.vy,p.vx),speed=Math.max(3.8,(p.baseSpeed??3.8)*1.08),dmg=Math.max(1,p.damage*.52);
  for(let n=-1;n<=1;n++){const a=base+n*.5;engine.projectiles.push(makeProjectile(p.x,p.y,Math.cos(a)*speed,Math.sin(a)*speed,'yolk',dmg,true,30,{sourceWeapon:'egg_cannon',baseSpeed:speed,knockback:.8,damageScaled:true,originDamage:dmg,radius:2,critChance:.05}));}
  spawn(engine,p.x,p.y,'crumb',5,'#f4d03f');
}`;
export function applyDuckWeapons(gameDir){
  const data=path.join(gameDir,'game','data.ts');let d=readFileSync(data,'utf8');
  d=d.replace("fireRate: 30, damage: 5, projectileSpeed: 4.5, projectileType: 'breadcrumb',\n    spread: 0.5, projectileCount: 6,","fireRate: 30, damage: 5, projectileSpeed: 4.8, projectileType: 'breadcrumb',\n    spread: 0.48, projectileCount: 6,");
  d=d.replace("special: 'Cada rebote suma 10% de daño. Rechina en las paredes.'","special: 'Cada rebote suma 15% de daño y acelera el patito.'");
  d=d.replace("fireRate: 45, damage: 25, projectileSpeed: 3, projectileType: 'baguette',","fireRate: 48, damage: 24, projectileSpeed: 3.2, projectileType: 'baguette',");
  d=d.replace("description: 'Mucho daño, lento, críticos',\n    special: 'Mantén la mira: el siguiente tiro gana crítico dorado.',\n    fireRate: 40, damage: 30,","description: 'Mucho daño, lento y preciso',\n    special: 'Mantén la mira entre disparos: carga daño y probabilidad crítica.',\n    fireRate: 38, damage: 28,");
  d=d.replace("fireRate: 22, damage: 6, projectileSpeed: 4.2, projectileType: 'toast_stick',","fireRate: 20, damage: 7, projectileSpeed: 4.4, projectileType: 'toast_stick',");
  d=d.replace("description: 'Huevos que se rompen en 3 yemas.',\n    special: 'Al impactar, 3 yemas salen en abanico.',\n    fireRate: 26, damage: 9,","description: 'Huevos que se rompen en tres yemas balísticas.',\n    special: 'Al impactar o romperse, libera tres yemas en abanico.',\n    fireRate: 27, damage: 8,");
  d=d.replace("description: 'Mantén para apuntar. Suelta para un disparo rápido.',\n    special: 'Perfora varios enemigos. Alta precisión.',\n    fireRate: 48, damage: 34,","description: 'Francotirador de precisión y alto impacto.',\n    special: 'Mantén la mira entre disparos para potenciar daño y crítico.',\n    fireRate: 48, damage: 28,");
  d=d.replace("fireRate: 18, damage: 8, projectileSpeed: 4.5, projectileType: 'plasma_bread',","fireRate: 18, damage: 7, projectileSpeed: 4.7, projectileType: 'plasma_bread',");
  d=d.replace("special: 'Daño bajo. Ayuda a aprender a apuntar.',\n    fireRate: 10, damage: 4, projectileSpeed: 3.6,","special: 'Corrige la trayectoria hacia el enemigo más cercano.',\n    fireRate: 11, damage: 5, projectileSpeed: 3.8,");
  d=once(d,/  homing_crumbs: \{[\s\S]*?\n  \},\n\};/,m=>m.slice(0,-3)+NEW_WEAPONS+'\n};','append weapons');writeFileSync(data,d);
  const types=path.join(gameDir,'game','types.ts');let t=readFileSync(types,'utf8');t=once(t,/  stickyStacks\?:number;\n/,"  stickyStacks?:number;\n  toastStacks?:number;\n",'toast stacks');writeFileSync(types,t);
  const engine=path.join(gameDir,'game','engine.ts');let e=readFileSync(engine,'utf8');
  e=once(e,/function fireWeapon\(engine: GameEngine, dx: number, dy: number\) \{[\s\S]*?\n\}\n\nfunction updateProjectiles/,FIRE+'\n\n'+SPLIT+'\n\nfunction updateProjectiles','fire weapon');
  e=e.replace("if (!engine.mouseDown && player.heat > 0) player.heat = Math.max(0, player.heat - 1.2);","if(!engine.mouseDown&&player.heat>0)player.heat=Math.max(0,player.heat-1.45);");
  e=e.replace("if ((sx || sy) && player.fireCooldown <= 0 && player.switchAnim <= 6 && player.dashTimer<=0) {","if((sx||sy)&&player.fireCooldown<=0&&player.switchAnim<=6&&player.dashTimer<=0&&!(activeWeapon(player).id==='feather_gun'&&player.overheat>0)) {");
  e=e.replace("if (p.boomerangPhase === 0 && p.lifetime < p.maxLifetime * 0.5) {p.boomerangPhase=1;p.hitEnemies.clear();playReturn();}","if(p.boomerangPhase===0&&p.lifetime<p.maxLifetime*.5){p.boomerangPhase=1;p.hitEnemies.clear();if(p.sourceWeapon==='bread_boomerang')p.damage*=1.25;playReturn();}");
  e=e.replace("p.vx = p.vx * .86 + Math.cos(a) * (p.baseSpeed ?? 3.6) * .14;\n        p.vy = p.vy * .86 + Math.sin(a) * (p.baseSpeed ?? 3.6) * .14;","p.vx=p.vx*.82+Math.cos(a)*(p.baseSpeed??3.6)*.18;\n        p.vy=p.vy*.82+Math.sin(a)*(p.baseSpeed??3.6)*.18;");
  e=e.replace("if (p.explode > 0) { explode(engine, p, content); engine.projectiles.splice(i, 1); continue; }","if(p.type==='egg_shell'){splitEggShell(engine,p);engine.projectiles.splice(i,1);continue;}\n      if(p.explode>0){explode(engine,p,content);engine.projectiles.splice(i,1);continue;}");
  e=e.replace("if(p.type==='rubber_duck') p.damage *= 1.1;","if(p.type==='rubber_duck'){p.damage*=1.15;p.vx*=1.05;p.vy*=1.05;}\n        if(p.type==='receipt')p.damage*=1.2;");
  e=e.replace("if (p.lifetime <= 0) {\n      if (p.explode > 0) explode(engine, p, content);","if(p.lifetime<=0){\n      if(p.type==='egg_shell')splitEggShell(engine,p);\n      if(p.explode>0)explode(engine,p,content);");
  e=e.replace("if(p.explode>0) {explode(engine,p,content);engine.projectiles.splice(i,1);removed=true;break;}","if(p.explode>0){if(p.sourceWeapon==='baguette_launcher')p.damage*=1.25;explode(engine,p,content);engine.projectiles.splice(i,1);removed=true;break;}");
  e=e.replace("let critChance = p.type === 'golden_egg' ? 0.3 : 0.05;","let critChance=p.critChance??((p.type==='golden_egg'||p.type==='golden_egg_charged')?.3:.05);");
  e=e.replace("damageEnemy(engine, e, final, crit, content);\n        if((p.knockback ?? 0)>0",`damageEnemy(engine,e,final,crit,content);
        if(p.sourceWeapon==='butter_blaster'&&e.hp>0){e.stickyStacks=Math.min(.45,(e.stickyStacks??0)+.09);e.slowTimer=180;e.slowPower=Math.max(e.slowPower??0,e.stickyStacks);}
        if(p.sourceWeapon==='tactical_toaster'&&e.hp>0){e.toastStacks=(e.toastStacks??0)+1;if(e.toastStacks>=3){e.toastStacks=0;spawn(engine,e.x+e.size/2,e.y+e.size/2,'spark',9,'#ff9f43');for(const other of [...content.enemies])if(other.hp>0&&dist(e.x,e.y,other.x,other.y)<42){damageEnemy(engine,other,Math.max(5,Math.round(p.damage*1.35)),false,content);other.burn=Math.max(other.burn,120);}engine.shakeIntensity=Math.max(engine.shakeIntensity,3);playExplosion();}}
        if((p.knockback??0)>0`);
  e=e.replace("if (p.explode > 0) { explode(engine, p, content); engine.projectiles.splice(i, 1); removed = true; break; }\n\n        p.hitEnemies.add(e.id);","if(p.explode>0){explode(engine,p,content);engine.projectiles.splice(i,1);removed=true;break;}\n        if(p.type==='egg_shell'){splitEggShell(engine,p);engine.projectiles.splice(i,1);removed=true;break;}\n\n        p.hitEnemies.add(e.id);");writeFileSync(engine,e);
  const sprites=path.join(gameDir,'game','sprites.ts');let s=readFileSync(sprites,'utf8');s=s.replace("case 'golden_egg': {","case 'golden_egg': case 'golden_egg_charged': {");s=once(s,/    case 'coin_proj': \{/,`    case 'butter_glob': {ctx.fillStyle='rgba(255,217,90,.28)';ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fill();rect(ctx,bx-3,by-2,6,5,'#ffd95a');px(ctx,bx-1,by-1,'#fff3b0',2);break;}
    case 'croissant_blade': {ctx.save();ctx.translate(bx,by);ctx.rotate(frame*.42);ctx.fillStyle='#e8b45f';ctx.beginPath();ctx.arc(0,0,5,-1.2,1.2);ctx.lineWidth=3;ctx.strokeStyle='#e8c99b';ctx.stroke();rect(ctx,-1,-1,2,2,'#fff0c8');ctx.restore();break;}
    case 'drill_bit': {ctx.save();ctx.translate(bx,by);ctx.rotate(frame*.7);rect(ctx,-5,-2,8,4,'#8fa4b3');rect(ctx,2,-1,5,2,'#dfe6ee');px(ctx,-3,-1,'#6fc5d8',2);ctx.restore();break;}
    case 'receipt': {ctx.save();ctx.translate(bx,by);ctx.rotate(Math.atan2(Math.sin(frame*.22),3));rect(ctx,-4,-2,8,4,'#f2f0df');rect(ctx,-2,-1,4,1,'#71858b');px(ctx,2,1,'#e1b64b',1);ctx.restore();break;}
    case 'coin_proj': {`,'projectile art');writeFileSync(sprites,s);
  const art=path.join(gameDir,'game','itemArt.ts');let ia=readFileSync(art,'utf8');ia=once(ia,/  remote_bomb: p => \{/,`  butter_blaster: p => { p.rect(3,10,15,6,C.gold); p.rect(6,16,5,5,C.crust); p.rect(17,11,5,3,C.cream); p.oval(7,7,4,3,C.bread); p.dot(19,12,C.light); },
  croissant_cutter: p => { p.rect(3,12,14,5,C.steel); p.rect(6,17,5,4,C.navy); p.poly([[14,5],[19,4],[22,8],[18,12],[14,10],[17,8]],C.bread); p.line(15,6,19,10,C.cream,2); },
  vault_drill: p => { p.rect(3,10,11,8,C.navy); p.rect(6,17,5,5,C.steel); p.poly([[14,9],[22,12],[14,15]],C.silver); p.line(15,11,21,12,C.light); p.dot(7,13,C.red); },
  receipt_ripper: p => { p.rect(3,9,15,8,C.steel); p.rect(6,17,5,4,C.navy); p.rect(16,7,6,3,C.white); p.rect(17,10,5,2,C.cream); p.line(18,7,20,12,C.dark); },
  remote_bomb: p => {`,'weapon icons');writeFileSync(art,ia);
  const audio=path.join(gameDir,'game','audio.ts');let au=readFileSync(audio,'utf8');au=once(au,/case 'homing_crumbs':gun\('pistol',\.34\);blip\('sine',690,330,\.055,\.012\);break;default:/,"case 'homing_crumbs':gun('pistol',.34);blip('sine',690,330,.055,.012);break;case 'butter_blaster':blip('triangle',210,105,.09,.025);noise(.035,.016,0,.08);break;case 'croissant_cutter':noise(.055,.018,0,.24);blip('triangle',520,760,.07,.018);break;case 'vault_drill':blip('sawtooth',105,165,.055,.022);noise(.028,.012,0,.15);break;case 'receipt_ripper':noise(.032,.018,0,.35);blip('square',410,300,.035,.008);break;default:",'new weapon audio');writeFileSync(audio,au);
}
