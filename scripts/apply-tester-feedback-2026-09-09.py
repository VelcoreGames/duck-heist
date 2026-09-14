from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

# 1) PAN BOMBA REMOTO: estaba en el catálogo pero sin regla/ejecución.
p = "src/game/itemRules.ts"
s = read(p)
s = replace_once(
    s,
    "export type ActiveAction = 'quack'|'bomb'|'decoy'|'stun'|'coffee'|'heal'|'mega'|'grenade'|'lure'|'siren'|'doubleCoffee'|'tray'|'food'|'chaos';",
    "export type ActiveAction = 'quack'|'bomb'|'remoteBomb'|'decoy'|'stun'|'coffee'|'heal'|'mega'|'grenade'|'lure'|'siren'|'doubleCoffee'|'tray'|'food'|'chaos';",
    "ActiveAction remoteBomb",
)
s = replace_once(
    s,
    "  bread_box:{action:'food',cooldown:3600}, red_button:{action:'chaos',cooldown:1500},\n",
    "  bread_box:{action:'food',cooldown:3600}, red_button:{action:'chaos',cooldown:1500},\n"
    "  remote_bomb:{action:'remoteBomb',cooldown:600},\n",
    "remote_bomb rule",
)
write(p, s)

# 2) MAPA: máximo duro de 2 salas de objetos y segunda sala menos frecuente.
p = "src/game/mapgen.ts"
s = read(p)
s = replace_once(
    s,
    "  // Segunda sala de objeto opcional\n  if (random() < 0.75) assignDeadEndOrRandom(remaining(), RoomType.ITEM,random);\n",
    "  // Segunda sala de objeto opcional. La primera sigue garantizada; nunca habrá más de dos.\n"
    "  if (random() < 0.5) assignDeadEndOrRandom(remaining(), RoomType.ITEM,random);\n",
    "item room probability",
)
anchor = "  // 7) Garantía dura: EXACTAMENTE un jefe por piso\n"
cap = (
    "  // Garantía dura: como máximo 2 salas de objetos por piso, incluso si cambia el generador.\n"
    "  const itemRooms = [...rooms.values()].filter(r => r.type === RoomType.ITEM)\n"
    "    .sort((a, b) => a.distance - b.distance);\n"
    "  for (const extra of itemRooms.slice(2)) extra.type = RoomType.COMBAT;\n\n"
)
s = replace_once(s, anchor, cap + anchor, "hard cap item rooms")
write(p, s)

# 3) INPUT: TAB debe quedarse dentro del juego para mostrar estadísticas mientras se mantiene pulsado.
p = "src/App.tsx"
s = read(p)
s = replace_once(
    s,
    "['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'r', 'm', 'escape', 'enter', '1', '2']",
    "['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'r', 'm', 'tab', 'escape', 'enter', '1', '2']",
    "prevent Tab browser focus",
)
write(p, s)

# 4) MOTOR: desafío idempotente, economía, drops, bomba remota y patrones de jefes.
p = "src/game/engine.ts"
s = read(p)

s = replace_once(
    s,
    "  engine.decoy=null;engine.tooltip={key:'',since:0};\n",
    "  engine.decoy=null;engine.remoteBomb=null;engine.tooltip={key:'',since:0};\n",
    "clear remote bomb on room transition",
)

s = replace_once(
    s,
    """  if(content.alarmTimer!==undefined && content.alarmTimer>0) {
    content.alarmTimer--;
    if(content.alarmTimer%360===0 && content.enemies.length<8) {
      const spot=freeTiles(room.layout,2)[0];if(spot) content.enemies.push(makeEnemy('policia_pato',floorScale(engine.map.floorIndex,room.distance),spot.x,spot.y,false));
    }
  }
""",
    """  if(content.alarmTimer!==undefined && content.alarmTimer>0) {
    content.alarmTimer--;
    // Nunca crear una última oleada exactamente al llegar a 0: el reto termina de forma limpia.
    if(content.alarmTimer>0 && content.alarmTimer%360===0 && content.enemies.length<8) {
      const spot=freeTiles(room.layout,2)[0];if(spot) content.enemies.push(makeEnemy('policia_pato',floorScale(engine.map.floorIndex,room.distance),spot.x,spot.y,false));
    }
  }
""",
    "alarm zero-frame reinforcement",
)

old_clear = """  // --- Sala despejada ---
  if (!room.cleared && content.enemies.length === 0 && (content.alarmTimer ?? 0)<=0) {
    room.cleared = true;
    content.clearAge=0;engine.hitStop=Math.max(engine.hitStop,2);
    const firstClear=!content.clearCounted;content.clearCounted=true;
    if(firstClear)engine.stats.roomsCleared++;
    content.lockFlash = 45;
    playDoorUnlock();
    playRoomClear();
    if(firstClear && (room.type===RoomType.COMBAT || room.type===RoomType.CHALLENGE)){
      if(!content.damaged){
        engine.roomStreak++;engine.toast='SALA PERFECTA';engine.toastTimer=90;
        if(!content.perfectAwarded&&Math.random()<.25)content.pickups.push({x:240,y:192,type:Math.random()<.85?'crumb':'hp',value:5,lifetime:99999});
        if(engine.roomStreak===3||engine.roomStreak===5){player.perfectBuff=600;engine.toast=engine.roomStreak===3?'3 SALAS · IMPECABLE':'5 SALAS · PROFESIONAL';engine.toastTimer=110;}
      }else engine.roomStreak=0;
      content.perfectAwarded=true;
      if(build.foodEvery&&engine.stats.roomsCleared%build.foodEvery===0)content.pickups.push({x:240,y:192,type:rollFood(),value:1,lifetime:99999});
    }
    applyMapItemEffects(engine,false);
    spawn(engine, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'spark', 16, '#39d353');
    if ((room.type === RoomType.COMBAT || room.type === RoomType.CHALLENGE) && Math.random() < .16+getBuild(player).rewardChance+engine.alert*.0006+(room.modifier==='alarm'?.1:0)) {
      content.items.push({ x: CANVAS_WIDTH / 2 - 8, y: CANVAS_HEIGHT / 2 - 8, itemId: rollItem(engine), isWeapon: false, isActive: false });
    }
    if (room.type === RoomType.CHALLENGE) {
      content.pickups.push({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 26, type: 'golden_crumb', value: 3, lifetime: 99999 });
      if(content.challenge==='alarm' || !content.damaged) content.items.push({x:232,y:150,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
    }
    if(content.event?.kind==='interrogation') content.items.push({x:232,y:155,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
    if(room.type===RoomType.BOSS) {content.rewardTimer=75;setMusic('run',engine.map.floorIndex);}
    if(room.type===RoomType.COMBAT && Math.random()<.12) content.pickups.push({x:240,y:198,type:'hp',value:1,lifetime:99999});
  }
"""
new_clear = """  // --- Sala despejada ---
  if (!room.cleared && content.enemies.length === 0 && (content.alarmTimer ?? 0)<=0) {
    room.cleared = true;
    content.clearAge=0;engine.hitStop=Math.max(engine.hitStop,2);
    const firstClear=!content.clearCounted;content.clearCounted=true;
    content.lockFlash = 45;
    playDoorUnlock();

    // Todo lo que concede progreso, sonido de victoria o botín ocurre UNA sola vez.
    // Así un reto temporizado no puede volver a pagar si su estado se reabre por otro efecto.
    if(firstClear) {
      engine.stats.roomsCleared++;
      playRoomClear();
      if(room.type===RoomType.COMBAT || room.type===RoomType.CHALLENGE){
        if(!content.damaged){
          engine.roomStreak++;engine.toast='SALA PERFECTA';engine.toastTimer=90;
          if(!content.perfectAwarded&&Math.random()<.25)content.pickups.push({x:240,y:192,type:Math.random()<.85?'crumb':'hp',value:5,lifetime:99999});
          if(engine.roomStreak===3||engine.roomStreak===5){player.perfectBuff=600;engine.toast=engine.roomStreak===3?'3 SALAS · IMPECABLE':'5 SALAS · PROFESIONAL';engine.toastTimer=110;}
        }else engine.roomStreak=0;
        content.perfectAwarded=true;
        if(build.foodEvery&&engine.stats.roomsCleared%build.foodEvery===0)content.pickups.push({x:240,y:192,type:rollFood(),value:1,lifetime:99999});
      }
      applyMapItemEffects(engine,false);
      spawn(engine, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'spark', 16, '#39d353');

      // Las salas de desafío ya tienen su recompensa propia; no duplicar además el drop normal.
      if (room.type === RoomType.COMBAT && Math.random() < .10+getBuild(player).rewardChance+engine.alert*.0006+(room.modifier==='alarm'?.1:0)) {
        content.items.push({ x: CANVAS_WIDTH / 2 - 8, y: CANVAS_HEIGHT / 2 - 8, itemId: rollItem(engine), isWeapon: false, isActive: false });
      }
      if (room.type === RoomType.CHALLENGE) {
        content.pickups.push({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 + 26, type: 'golden_crumb', value: 3, lifetime: 99999 });
        if(content.challenge==='alarm' || !content.damaged) content.items.push({x:232,y:150,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
      }
      if(content.event?.kind==='interrogation') content.items.push({x:232,y:155,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});
      if(room.type===RoomType.BOSS) {content.rewardTimer=75;setMusic('run',engine.map.floorIndex);}
      if(room.type===RoomType.COMBAT && Math.random()<.12) content.pickups.push({x:240,y:198,type:'hp',value:1,lifetime:99999});
    }
  }
"""
s = replace_once(s, old_clear, new_clear, "idempotent room clear")

s = replace_once(
    s,
    "  if(e.elite && Math.random()<.12) content.items.push({x:e.x,y:e.y,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});\n",
    "  if(e.elite && Math.random()<.05) content.items.push({x:e.x,y:e.y,itemId:rollBossRewardItem(engine),isWeapon:false,isActive:false});\n",
    "elite item drop rate",
)

s = replace_once(
    s,
    "    case 'bomb': explode(engine,makeProjectile(cx,cy,0,0,'baguette',30,true,1,{explode:84,burning:b.burn>0}),content,false);break;\n",
    """    case 'bomb': explode(engine,makeProjectile(cx,cy,0,0,'baguette',30,true,1,{explode:84,burning:b.burn>0}),content,false);break;
    case 'remoteBomb': {
      if(!engine.remoteBomb) {
        const spot=safeDrop(room,cx,cy);
        engine.remoteBomb={x:spot.x+8,y:spot.y+8,life:3600};
        spawn(engine,engine.remoteBomb.x,engine.remoteBomb.y,'spark',6,'#d4a574');
        playEquip();
        // Colocar no consume la recarga: la segunda pulsación debe poder detonarla.
        return;
      }
      const bomb=engine.remoteBomb;
      engine.remoteBomb=null;
      explode(engine,makeProjectile(bomb.x,bomb.y,0,0,'baguette',45,true,1,{explode:96,burning:b.burn>0}),content,false);
      break;
    }
""",
    "remote bomb behavior",
)

s = replace_once(
    s,
    """export function shopPrice(engine:GameEngine,product:{cost:number}) {
  const b=getBuild(engine.player);
  const discount=Math.max(b.coupon>0?.25:0,b.firstDiscount);
  const coupon=!engine.player.couponUsed?1-discount:1;
  return Math.max(1,Math.ceil(product.cost*b.shop*coupon));
}
""",
    """export function shopPrice(engine:GameEngine,product:{cost:number}) {
  const b=getBuild(engine.player);
  const discount=Math.max(b.coupon>0?.25:0,b.firstDiscount);
  const coupon=!engine.player.couponUsed?1-discount:1;
  // Mantener las migajas divertidas de recoger, pero convertir la tienda en un gasto real.
  // El aumento es predecible por piso y no depende de cuánto dinero tenga el jugador.
  const floorMarkup=3+engine.map.floorIndex*.5;
  return Math.max(1,Math.ceil(product.cost*b.shop*coupon*floorMarkup));
}
""",
    "shop economy",
)

old_boss = """  if (boss.attackTimer <= 0) {
    boss.attackTimer = Math.max(30, boss.attackCooldown - boss.bossPhase * 12);
    boss.telegraph = 0;
    const atk = rngInt(0, 3 + (boss.bossPhase>=1 ? 1 : 0));
    if (atk === 0) { boss.moveAngle = ang; boss.moveTimer = 22; }
    else if (atk === 1) {
      const n = 6 + boss.bossPhase * 4 + pattern * 2;
      for (let i = 0; i < n; i++) enemyShoot(engine, boss, (i / n) * Math.PI * 2 + engine.frame * 0.01, 2.5, boss.projectileType);
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 4);
    } else if (atk === 2) {
      const n = 3 + boss.bossPhase + Math.floor(pattern / 2);
      for (let i = 0; i < n; i++) {
        enemyShoot(engine, boss, ang + rng(-0.28, 0.28), 3 + i * 0.3,
          boss.bossType === 'bread_banker' ? 'coin_proj' : boss.projectileType);
      }
    } else if (atk === 3) {
      // espiral (pisos altos)
      const n = 10 + pattern * 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        engine.projectiles.push(makeProjectile(bx, by, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 'drone_shot', 1, false, 130));
      }
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 5);
    } else {
      engine.shakeIntensity = Math.max(engine.shakeIntensity, 6);
      spawn(engine, bx, by + boss.size / 2, 'smoke', 10, '#6c7684');
      if (boss.bossPhase >= 1 && content.enemies.length < 6 + pattern) {
        const s = freeTiles(room.layout, 2)[0];
        if (s) content.enemies.push(makeEnemy(pick(['policia_pato', 'policia_rapido', 'dron_policial']), floorScale(engine.map.floorIndex, room.distance), s.x, s.y, false));
      }
    }
  }

  const spd = boss.speed * (1 + boss.bossPhase * 0.25);
  if (boss.moveTimer > 0) {
    boss.moveTimer--;
    moveEnemy(boss, room, Math.cos(boss.moveAngle) * spd * 2.6, Math.sin(boss.moveAngle) * spd * 2.6);
  } else {
    moveEnemy(boss, room, Math.cos(ang) * spd * 0.32, Math.sin(ang) * spd * 0.32);
  }
"""
new_boss = """  if (boss.attackTimer <= 0) {
    const type=boss.bossType;
    boss.attackTimer = Math.max(34, boss.attackCooldown - boss.bossPhase * 12);
    boss.telegraph = 0;

    // Cada jefe principal tiene una identidad mecánica propia; comparten el sistema de fases,
    // pero ya no sortean exactamente el mismo paquete genérico de ataques.
    if(type==='captain_honk') {
      const atk=rngInt(0,2);
      if(atk===0) {boss.moveAngle=ang;boss.moveTimer=28+boss.bossPhase*6;playDanger('charge');}
      else if(atk===1) {
        for(let i=-2;i<=2;i++) enemyShoot(engine,boss,ang+i*.14,3.1+boss.bossPhase*.15,'buckshot');
      } else {
        const n=8+boss.bossPhase*4;
        for(let i=0;i<n;i++) enemyShoot(engine,boss,(i/n)*Math.PI*2+engine.frame*.015,2.6,boss.projectileType);
      }
      boss.attackTimer=Math.max(38,boss.attackTimer-10);
    } else if(type==='comisario_pico_duro') {
      const atk=rngInt(0,2);
      if(atk===0) {
        for(let i=-2-boss.bossPhase;i<=2+boss.bossPhase;i++) enemyShoot(engine,boss,ang+i*.11,2.8,'coin_proj');
      } else if(atk===1) {
        if(content.enemies.length<6) {
          const spots=freeTiles(room.layout,2);
          for(let i=0;i<2;i++) if(spots[i]) content.enemies.push(makeEnemy(i?'policia_escopeta':'policia_pato',floorScale(engine.map.floorIndex,room.distance),spots[i].x,spots[i].y,false));
        }
        spawn(engine,bx,by,'smoke',8,'#6c7684');
      } else {
        const n=8+boss.bossPhase*2;
        for(let i=0;i<n;i++) enemyShoot(engine,boss,(i/n)*Math.PI*2+(boss.bossPhase?Math.PI/8:0),2.2,'coin_proj');
      }
    } else if(type==='toaster_9000') {
      const atk=rngInt(0,2);
      if(atk===0) {
        const n=10+boss.bossPhase*4;
        for(let i=0;i<n;i++) enemyShoot(engine,boss,(i/n)*Math.PI*2+engine.frame*.02,2.15,'toast');
      } else if(atk===1) {
        for(let i=-2;i<=2;i++) enemyShoot(engine,boss,ang+i*.2,2.5,'toast');
      } else {
        for(let i=-1;i<=1;i++) content.puddles.push({x:clamp(px+i*55,48,CANVAS_WIDTH-48),y:clamp(py+(i%2)*36,48,CANVAS_HEIGHT-48),life:210,kind:'fire',radius:25});
        spawn(engine,px,py,'smoke',10,'#ff9f43');
      }
      boss.attackTimer+=18;
    } else if(type==='general_ganso') {
      const atk=rngInt(0,2);
      if(atk<2) {boss.moveAngle=ang+rng(-.12,.12);boss.moveTimer=34+boss.bossPhase*9;playDanger('charge');}
      else {
        const n=12+boss.bossPhase*4;
        for(let i=0;i<n;i++) enemyShoot(engine,boss,(i/n)*Math.PI*2,2.7,'enemy_bullet');
      }
      boss.attackTimer=Math.max(32,boss.attackTimer-16);
    } else if(type==='don_levadura') {
      const atk=rngInt(0,2);
      if(atk===0) {
        for(let i=-3;i<=3;i++) enemyShoot(engine,boss,ang+i*.17,2.25,'dough_ball');
      } else if(atk===1) {
        const n=8+boss.bossPhase*4;
        for(let i=0;i<n;i++) enemyShoot(engine,boss,(i/n)*Math.PI*2+engine.frame*.01,2,'dough_ball');
      } else {
        for(let i=0;i<3;i++) {
          const a=ang+(i-1)*.75;
          content.puddles.push({x:clamp(bx+Math.cos(a)*80,48,CANVAS_WIDTH-48),y:clamp(by+Math.sin(a)*80,48,CANVAS_HEIGHT-48),life:240,kind:'fire',radius:28});
        }
      }
    } else if(type==='director_seguridad') {
      const atk=rngInt(0,2);
      if(atk===0) {
        const n=12+boss.bossPhase*4;
        for(let i=0;i<n;i++) enemyShoot(engine,boss,(i/n)*Math.PI*2+engine.frame*.035,2.45,'drone_shot');
      } else if(atk===1) {
        if(content.enemies.filter(e=>e.type==='dron_policial').length<2) {
          const spots=freeTiles(room.layout,2);
          for(let i=0;i<2;i++) if(spots[i]) content.enemies.push(makeEnemy('dron_policial',floorScale(engine.map.floorIndex,room.distance),spots[i].x,spots[i].y,false));
        }
      } else {
        for(let i=-1;i<=1;i++) enemyShoot(engine,boss,ang+i*.08,4.2,'drone_shot');
      }
      boss.attackTimer+=8;
    } else {
      // BANQUERO DEL PAN: mezcla dinero, presión radial y refuerzos en fases finales.
      const atk=rngInt(0,boss.bossPhase>=1?3:2);
      if(atk===0) {
        const n=10+boss.bossPhase*5;
        for(let i=0;i<n;i++) enemyShoot(engine,boss,(i/n)*Math.PI*2+engine.frame*.012,2.7,'coin_proj');
      } else if(atk===1) {
        for(let i=-3;i<=3;i++) enemyShoot(engine,boss,ang+i*.12,3.2+i*.08,'coin_proj');
      } else if(atk===2) {
        boss.moveAngle=ang;boss.moveTimer=24+boss.bossPhase*5;
      } else if(content.enemies.length<6) {
        const spots=freeTiles(room.layout,2);
        for(let i=0;i<2;i++) if(spots[i]) content.enemies.push(makeEnemy(i?'dron_policial':'policia_capitan',floorScale(engine.map.floorIndex,room.distance),spots[i].x,spots[i].y,false));
      }
    }
    engine.shakeIntensity=Math.max(engine.shakeIntensity,3+boss.bossPhase);
  }

  const spd = boss.speed * (1 + boss.bossPhase * 0.25);
  if (boss.moveTimer > 0) {
    boss.moveTimer--;
    moveEnemy(boss, room, Math.cos(boss.moveAngle) * spd * 2.6, Math.sin(boss.moveAngle) * spd * 2.6);
  } else if(boss.bossType==='toaster_9000') {
    // La Tostadora domina espacio desde una posición estable.
    moveEnemy(boss,room,Math.cos(ang+Math.PI/2)*spd*.08,Math.sin(ang+Math.PI/2)*spd*.08);
  } else if(boss.bossType==='director_seguridad') {
    // El Director orbita al jugador en vez de perseguirlo de frente.
    moveEnemy(boss,room,Math.cos(ang+Math.PI/2)*spd*.42,Math.sin(ang+Math.PI/2)*spd*.42);
  } else {
    moveEnemy(boss, room, Math.cos(ang) * spd * 0.32, Math.sin(ang) * spd * 0.32);
  }
"""
s = replace_once(s, old_boss, new_boss, "distinct boss patterns")
write(p, s)

# 5) UI: overlay de estadísticas mientras TAB esté pulsado.
p = "src/game/render.ts"
s = read(p)
s = replace_once(
    s,
    """    default:
      drawHUD(engine);
      renderPrompts(engine);
      break;
""",
    """    default:
      drawHUD(engine);
      renderPrompts(engine);
      if(engine.keys['tab']) renderRunStatsOverlay(engine);
      break;
""",
    "Tab stats render",
)
marker = """// ---------------------------------------------------------------------------
// PROMPTS Y FICHAS (coordenadas de mundo, tipografía nítida)
// ---------------------------------------------------------------------------
"""
overlay = """function renderRunStatsOverlay(engine: GameEngine) {
  const ctx=engine.ui!;
  const x=104,y=50,w=272,h=244;
  const r=engine.run,s=engine.stats,p=engine.player;
  ctx.save();
  ctx.fillStyle='rgba(2,6,12,.82)';ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  drawPanel(ctx,x,y,w,h,'rgba(8,16,25,.98)','#d6b45f');
  text(ctx,'ESTADÍSTICAS DE LA RUN',240,y+25,12,'#f4d03f','center',true);
  text(ctx,`PISO  ${r.floorReached}/${TOTAL_FLOORS}`,x+24,y+54,8,'#e9dfbd','left',true);
  text(ctx,`SALAS  ${s.roomsCleared}`,x+24,y+77,8,'#cbd5d9','left');
  text(ctx,`ENEMIGOS  ${s.enemiesDefeated}`,x+24,y+100,8,'#cbd5d9','left');
  text(ctx,`JEFES  ${r.bosses}`,x+24,y+123,8,'#cbd5d9','left');
  text(ctx,`MIGAJAS  ${Math.floor(p.crumbs)}`,x+148,y+54,8,'#e9dfbd','left',true);
  text(ctx,`ROBADO  ${s.breadStolen}`,x+148,y+77,8,'#cbd5d9','left');
  text(ctx,`OBJETOS  ${r.items}`,x+148,y+100,8,'#cbd5d9','left');
  text(ctx,`ARMAS  ${r.weaponsFound}`,x+148,y+123,8,'#cbd5d9','left');
  text(ctx,`DAÑO HECHO  ${Math.round(r.dmgDealt)}`,x+24,y+158,8,'#9ec6b8','left');
  text(ctx,`DAÑO RECIBIDO  ${Math.round(r.dmgTaken)}`,x+24,y+181,8,'#d7a39c','left');
  text(ctx,'SUELTA TAB PARA CERRAR',240,y+h-22,7,'#8fa1a8','center');
  ctx.restore();
}

"""
s = replace_once(s, marker, overlay + marker, "stats overlay function")
write(p, s)

print("Tester feedback patch applied successfully.")
