from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def patch(path: str, old: str, new: str) -> None:
    p = ROOT / path
    s = p.read_text(encoding='utf-8')
    if new in s:
        return
    if old not in s:
        raise SystemExit(f'Anchor not found in {path}: {old[:120]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')

# v0.4.3: optional second ITEM room 75% -> 35%.
patch('src/game/mapgen.ts',
      'if (random() < 0.75) assignDeadEndOrRandom(remaining(), RoomType.ITEM,random);',
      'if (random() < 0.35) assignDeadEndOrRandom(remaining(), RoomType.ITEM,random);')

# Types needed by the production EVENT/cafe state.
patch('src/game/types.ts',
      '  deniedUntil?:number;\n}',
      '  deniedUntil?:number;\n  isFood?:boolean;\n}')
patch('src/game/types.ts',
      '  event?:RoomEvent;\n  merchantLine?:string;',
      '  event?:RoomEvent;\n  cafe?:boolean;\n  dangerEventStarted?:boolean;\n  dangerEventActive?:boolean;\n  dangerEventDone?:boolean;\n  dangerEventTotal?:number;\n  dangerEventTimer?:number;\n  dangerEventWave?:boolean;\n  dangerEventPressure?:number;\n  merchantLine?:string;')
patch('src/game/types.ts',
      '  coffeeCrash:number;\n  synergyNotice:',
      '  coffeeCrash:number;\n  dangerEventMusic?:boolean;\n  synergyNotice:')

# Add a dedicated high-risk event music state to the existing source audio system.
patch('src/game/audio.ts',
      "let musicMood: 'menu' | 'run' | 'boss' | 'off' = 'off';",
      "let musicMood: 'menu' | 'run' | 'boss' | 'event' | 'off' = 'off';")
patch('src/game/audio.ts',
      'const BOSS = [131, 156, 131, 110, 131, 175, 156, 110];',
      "const BOSS = [131, 156, 131, 110, 131, 175, 156, 110];\nconst EVENT = [92, 0, 138, 0, 176, 138, 92, 70];")
patch('src/game/audio.ts',
      "export function setMusic(mood: 'menu' | 'run' | 'boss' | 'off',floor=musicFloor) {",
      "export function setMusic(mood: 'menu' | 'run' | 'boss' | 'event' | 'off',floor=musicFloor) {")
patch('src/game/audio.ts',
      "const bpm = mood === 'boss' ? 132 : mood === 'run' ? 108 : 84;",
      "const bpm = mood === 'event' ? 148 : mood === 'boss' ? 132 : mood === 'run' ? 108 : 84;")
patch('src/game/audio.ts',
      "function tickMusic(mood: 'menu' | 'run' | 'boss', beat: number) {",
      "function tickMusic(mood: 'menu' | 'run' | 'boss' | 'event', beat: number) {")
patch('src/game/audio.ts',
      "  const seq = mood === 'menu' ? MENUS : mood === 'run' ? FLOOR_SEQ[Math.min(5,musicFloor)] : BOSS;",
      "  const seq = mood === 'menu' ? MENUS : mood === 'run' ? FLOOR_SEQ[Math.min(5,musicFloor)] : mood === 'event' ? EVENT : BOSS;")
patch('src/game/audio.ts',
      "blip(mood === 'menu' ? 'triangle' : 'square', f, f * 0.99",
      "blip(mood === 'menu' ? 'triangle' : mood === 'event' ? 'sawtooth' : 'square', f, f * 0.99")

# EVENT construction: 38% cafe, otherwise an interactive event + high-risk survival encounter.
patch('src/game/engine.ts',
'''    case RoomType.EVENT: {
      const kind=pick(Object.keys(EVENTS)) as EventKind;
      content.event={kind,x:232,y:170,used:false,selected:0,message:''};break;
    }
''',
'''    case RoomType.EVENT: {
      if (Math.random() < .38) {
        content.cafe = true;
        const foods = ['hp','croissant','sandwich','baguette','torta'];
        const selected = [...foods].sort(() => Math.random() - .5).slice(0, 3);
        const foodCost = (id:string) => id === 'hp' ? 5 : id === 'croissant' ? 7 : (id === 'sandwich' || id === 'baguette') ? 9 : 14;
        content.shopItems = selected.map((id, i) => ({
          itemId:id,cost:foodCost(id),sold:false,isWeapon:false,isFood:true,x:145+i*95,y:232,
        }));
      } else {
        const kind=pick(Object.keys(EVENTS)) as EventKind;
        content.event={kind,x:232,y:170,used:false,selected:0,message:''};
      }
      break;
    }
''')

helpers = '''// ---------------------------------------------------------------------------
// EVENTO DE ALTO RIESGO
// ---------------------------------------------------------------------------
function dangerEventEnemyPool(floor:number): string[] {
  return [
    ['policia_pato','policia_rapido'],
    ['policia_pato','policia_rapido','policia_escopeta'],
    ['policia_rapido','policia_escopeta','dron_policial'],
    ['policia_escopeta','dron_policial','policia_francotirador'],
    ['policia_escopeta','dron_policial','policia_francotirador','policia_rapido'],
    ['policia_escopeta','dron_policial','policia_francotirador','policia_rapido'],
  ][clamp(floor,0,5)];
}

function spawnDangerEventSecurity(engine:GameEngine, room:MapRoom, content:RoomContent, count:number) {
  const floor=clamp(engine.map.floorIndex,0,5);
  const pool=dangerEventEnemyPool(floor);
  const spots=freeTiles(room.layout,2).filter(spot=>{
    const x=spot.x*TILE_SIZE+TILE_SIZE/2,y=spot.y*TILE_SIZE+TILE_SIZE/2;
    if(dist(x,y,engine.player.x+7,engine.player.y+8)<105) return false;
    if((room.doors ?? []).some(dir=>{const door=DOOR_TILE[dir];return Math.hypot(spot.x-door.x,spot.y-door.y)<2.7;})) return false;
    if(content.event && !content.event.used && dist(x,y,content.event.x,content.event.y)<56) return false;
    return true;
  });
  for(let i=0;i<count && spots.length;i++) {
    const index=Math.floor(Math.random()*spots.length);
    const spot=spots.splice(index,1)[0];
    const type=pool[Math.floor(Math.random()*pool.length)];
    content.enemies.push(makeEnemy(type,floorScale(engine.map.floorIndex,room.distance),spot.x,spot.y,false));
  }
}

function updateDangerEvent(engine:GameEngine) {
  if(engine.state!==GameState.PLAYING) return;
  const room=currentRoom(engine),content=getContent(engine);
  if(!(room.type===RoomType.EVENT && !content.cafe)) {
    if(engine.dangerEventMusic) {
      engine.dangerEventMusic=false;
      setMusic(room.type===RoomType.BOSS?'boss':'run',engine.map.floorIndex);
    }
    return;
  }
  if(content.dangerEventDone) {
    if(engine.dangerEventMusic) {engine.dangerEventMusic=false;setMusic('run',engine.map.floorIndex);}
    return;
  }
  const floor=clamp(engine.map.floorIndex,0,5);
  if(!content.dangerEventStarted) {
    content.dangerEventStarted=true;
    content.dangerEventActive=true;
    content.dangerEventTotal=(20+floor*2)*60;
    content.dangerEventTimer=content.dangerEventTotal;
    content.dangerEventWave=false;
    content.dangerEventPressure=0;
    spawnDangerEventSecurity(engine,room,content,4+(floor>=2?1:0)+(floor>=4?1:0));
    room.cleared=false;
    engine.roomLabel='EVENTO DE ALTO RIESGO';
    engine.roomLabelTimer=90;
    engine.shakeIntensity=Math.max(engine.shakeIntensity,2.5);
  }
  if(!content.dangerEventActive) return;
  engine.dangerEventMusic=true;
  setMusic('event',floor);
  room.cleared=false;
  if((content.dangerEventTimer ?? 0)>0) content.dangerEventTimer!--;
  const total=content.dangerEventTotal ?? 1,timer=content.dangerEventTimer ?? 0;
  const elapsed=total-timer;
  if(!content.dangerEventWave && elapsed>=total*.5) {
    content.dangerEventWave=true;
    spawnDangerEventSecurity(engine,room,content,2+(floor>=3?1:0));
    engine.roomLabel='¡REFUERZOS EN CAMINO!';engine.roomLabelTimer=72;
    engine.shakeIntensity=Math.max(engine.shakeIntensity,3);
  }
  if(timer>0 && content.enemies.length===0 && engine.frame>(content.dangerEventPressure ?? 0)) {
    content.dangerEventPressure=engine.frame+210;
    spawnDangerEventSecurity(engine,room,content,2+(floor>=4?1:0));
  }
  if(timer<=0 && content.enemies.length===0) {
    content.dangerEventActive=false;content.dangerEventDone=true;
    engine.dangerEventMusic=false;setMusic('run',floor);
    engine.toast='EVENTO SUPERADO';engine.toastTimer=90;
  }
}

'''
patch('src/game/engine.ts',
      '// ---------------------------------------------------------------------------\n// BUCLE DE ACTUALIZACIÓN\n// ---------------------------------------------------------------------------\n',
      helpers + '// ---------------------------------------------------------------------------\n// BUCLE DE ACTUALIZACIÓN\n// ---------------------------------------------------------------------------\n')
patch('src/game/engine.ts',
      'export function updateEngine(engine: GameEngine) {\n  if(engine.state===GameState.MAP) return;',
      'export function updateEngine(engine: GameEngine) {\n  updateDangerEvent(engine);\n  if(engine.state===GameState.MAP) return;')

# Cafe purchases behave like food rather than passive items.
patch('src/game/engine.ts',
'''          let ok = true;
          if (s.isWeapon) ok = tryGiveWeapon(engine, s.itemId, 'shop', si, s.x, s.y - 20);
          else if (ACTIVE_ITEMS[s.itemId] && player.activeItem && player.activeItem !== s.itemId) ok = offerActiveSwap(engine, s.itemId, 'shop', si, s.x, s.y);
          if (ok) {
            player.crumbs -= price;
            player.couponUsed=true;s.soldAt=engine.frame;s.sold = true;
            if (!s.isWeapon && !ACTIVE_ITEMS[s.itemId]) grantItem(engine, s.itemId, false, false);
            if (!s.isWeapon && ACTIVE_ITEMS[s.itemId] && !engine.activeSwap) grantItem(engine, s.itemId, false, true);
''',
'''          let ok = true;
          if (s.isFood && player.hp >= player.maxHp) {ok=false;engine.toast='VIDA COMPLETA';engine.toastTimer=60;playDeny();}
          else if (s.isWeapon) ok = tryGiveWeapon(engine, s.itemId, 'shop', si, s.x, s.y - 20);
          else if (ACTIVE_ITEMS[s.itemId] && player.activeItem && player.activeItem !== s.itemId) ok = offerActiveSwap(engine, s.itemId, 'shop', si, s.x, s.y);
          if (ok) {
            player.crumbs -= price;
            player.couponUsed=true;s.soldAt=engine.frame;s.sold = true;
            if (s.isFood) {healPlayer(engine,foodHeal(s.itemId));playHeal();}
            else if (!s.isWeapon && !ACTIVE_ITEMS[s.itemId]) grantItem(engine, s.itemId, false, false);
            if (!s.isFood && !s.isWeapon && ACTIVE_ITEMS[s.itemId] && !engine.activeSwap) grantItem(engine, s.itemId, false, true);
''')

# Tester-feedback economy/drop fixes.
patch('src/game/engine.ts',
      'if (!room.cleared && content.enemies.length === 0 && (content.alarmTimer ?? 0)<=0) {',
      'if (!room.cleared && !content.dangerEventActive && content.enemies.length === 0 && (content.alarmTimer ?? 0)<=0) {')
patch('src/game/engine.ts',
      "if ((room.type === RoomType.COMBAT || room.type === RoomType.CHALLENGE) && Math.random() < .16+getBuild(player).rewardChance+engine.alert*.0006+(room.modifier==='alarm'?.1:0)) {",
      "if (room.type === RoomType.COMBAT && Math.random() < .07+getBuild(player).rewardChance*.5+engine.alert*.0003+(room.modifier==='alarm'?.03:0)) {")
patch('src/game/engine.ts',
      'if(e.elite && Math.random()<.12) content.items.push',
      'if(e.elite && Math.random()<.04) content.items.push')
patch('src/game/engine.ts',
      'return Math.max(1,Math.ceil(product.cost*b.shop*coupon));',
      'return Math.max(1,Math.ceil(product.cost*b.shop*coupon*(1.25+engine.map.floorIndex*.2)));')

# Remote bomb behavior: place, then detonate even if cooldown is running.
patch('src/game/engine.ts',
      'if (!p.activeItem || p.activeItemCooldown > 0) return;',
      "if (!p.activeItem || (p.activeItemCooldown > 0 && !(p.activeItem==='remote_bomb' && engine.remoteBomb))) return;")
patch('src/game/engine.ts',
'''    case 'chaos': {
''',
'''    case 'remoteBomb': {
      if(engine.remoteBomb) {
        const bomb=engine.remoteBomb;
        explode(engine,makeProjectile(bomb.x,bomb.y,0,0,'baguette',55,true,1,{explode:120}),content,false);
        spawn(engine,bomb.x,bomb.y,'spark',18,'#f4d03f');
        engine.shakeIntensity=Math.max(engine.shakeIntensity,4);
        engine.remoteBomb=null;
      } else {
        engine.remoteBomb={x:cx,y:cy,life:1800};
        playBounce();
      }
      break;
    }
    case 'chaos': {
''')

# Choices in a non-cafe event are locked until survival is complete.
patch('src/game/engine.ts',
      '  if(event.used) return;\n  const cost=',
      "  if(event.used) return;\n  if(currentRoom(engine).type===RoomType.EVENT && !content.cafe && content.dangerEventActive) {\n    event.message='Primero sobrevive al operativo.';playDeny();return;\n  }\n  const cost=")

print('Step 1 v0.4.3 source sync patch applied.')
