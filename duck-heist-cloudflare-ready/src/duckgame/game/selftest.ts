import { auditContent, CATALOG, COLLECTION_TABS } from './catalog';
import { ITEMS, ACTIVE_ITEMS, WEAPONS, SKINS } from './data';
import { generateMap, validateMap,generateRoomLayout,ROOM_TEMPLATES,type MapRoom } from './mapgen';
import { getBuild, BASE_EFFECTS, PASSIVE_RULES, ACTIVE_RULES } from './itemRules';
import { normalizeProgress, permanentSnapshot } from './progress';
import { createEngine,startGame,updateEngine,cycleWeapon,selectSwapSlot,confirmSwap,cancelSwap,confirmActiveSwap,enterRoom,damageEnemy,damagePlayer,handleActiveItem,handleDash,wardrobeAction,grantItem,shopPrice,changeAlert,rollItem,GameState } from './engine';
import { setAudioTestMode,setVolumes } from './audio';
import type { GameEngine } from './types';
import { RoomType,DIR_VECTORS,OPPOSITE,type Dir } from './constants';
import { visibleRoomKeys,knownPath,toggleFloorMap,openFloorMap,closeFloorMap,applyMapItemEffects,mapNodeLayout,mapHit,roomStatus,focusMapDestination } from './floorMap';
import { EXPANSION_ITEMS } from './expansion';
import { eligiblePassives,diverseRewards } from './loot';
import { deadzone } from './gamepad';
import { T,LOCALE } from './i18n';

export interface CheckReport { passed:number; failures:string[]; manifest:ReturnType<typeof auditContent>; }
export function runSelfChecks():CheckReport {
  const report:CheckReport={passed:0,failures:[],manifest:auditContent()};
  const check=(name:string,fn:()=>void)=>{try {fn();report.passed++;}catch(error){report.failures.push(`${name}: ${String(error)}`);}};
  const assert=(ok:unknown,message:string)=>{if(!ok) throw new Error(message);};
  setAudioTestMode(true);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;
  const setup=()=>{
    const e=createEngine(canvas,ctx,null);e.testing=true;e.metaLevels={};startGame(e);e.state=GameState.PLAYING;return e;
  };
  const tick=(e:GameEngine,n=1)=>{for(let i=0;i<n;i++) updateEngine(e);};
  const giveWeapon=(e:GameEngine,id:string)=>{
    const c=e.contents.get(e.currentKey)!;
    c.items.push({x:e.player.x,y:e.player.y,itemId:id,isWeapon:true,isActive:false});
    e.keys.e=true;tick(e);
  };
  const mapFixture=()=>{
    const e=setup();e.map.rooms.clear();e.contents.clear();
    const add=(x:number,y:number,type:RoomType,visited=false)=>{
      const r:MapRoom={gx:x,gy:y,type,visited,cleared:visited,generated:false,doors:[],distance:Math.abs(x)+Math.abs(y),layout:[]};
      r.layout=generateRoomLayout(r);e.map.rooms.set(`${x},${y}`,r);return r;
    };
    add(0,0,RoomType.START,true);add(-1,0,RoomType.ITEM);add(1,0,RoomType.COMBAT);
    add(2,0,RoomType.SHOP);add(1,-1,RoomType.MINIBOSS);add(2,-1,RoomType.COMBAT);add(3,-1,RoomType.BOSS);add(0,1,RoomType.SECRET);
    const link=(a:string,d:Dir)=>{const r=e.map.rooms.get(a)!,v=DIR_VECTORS[d],n=e.map.rooms.get(`${r.gx+v.x},${r.gy+v.y}`)!;r.doors.push(d);n.doors.push(OPPOSITE[d]);};
    link('0,0','W');link('0,0','E');link('0,0','S');link('1,0','E');link('1,0','N');link('1,-1','E');link('2,-1','E');
    e.map.startKey='0,0';e.map.itemRoomKey='-1,0';e.map.bossKey='3,-1';e.currentKey='0,0';
    return e;
  };
  try {
    check('Item art manifest',()=>assert(report.manifest.issues.length===0,report.manifest.issues.join(', ')));
    check('All content has a pickup category',()=>assert(report.manifest.entries.every(i=>!!i.pickup&&!!i.category),'missing pickup metadata'));
    check('Exactly twelve cosmetic skins',()=>assert(SKINS.length===12 && SKINS.every(s=>!('hp' in s)&&!('damage' in s)),'invalid cosmetics'));
    check('Exactly forty-seven weapons',()=>assert(Object.keys(WEAPONS).length===47,'weapon count'));
    for(let i=0;i<12;i++) for(let floor=0;floor<6;floor++) check(`Map ${i}/${floor}`,()=>assert(validateMap(generateMap(floor,`AUDIT-${i}`)).length===0,'invalid doors, reachability or boss'));
    check('Seeded layouts are reproducible',()=>assert(JSON.stringify([...generateMap(2,'BREAD-TEST').rooms])===JSON.stringify([...generateMap(2,'BREAD-TEST').rooms]),'layout changed'));
    check('Different seeds change maps',()=>assert(JSON.stringify([...generateMap(0,'A').rooms])!==JSON.stringify([...generateMap(0,'B').rooms]),'identical maps'));
    for(const id of Object.keys(ITEMS)) check(`Passive ${id}`,()=>{
      const b=getBuild({items:[id]});const keys=Object.keys(PASSIVE_RULES[id]);
      assert(keys.length>0 && keys.some(k=>b[k as keyof typeof b]!==BASE_EFFECTS[k as keyof typeof b]),'no modifier');
    });
    for(const id of Object.keys(ACTIVE_ITEMS)) check(`Active ${id}`,()=>{
      const e=setup();e.player.activeItem=id;handleActiveItem(e);
      assert(e.player.activeItemCooldown===ACTIVE_RULES[id].cooldown,'inactive or incorrect cooldown');
    });
    check('Two weapon slots and cyclic wheel',()=>{
      const e=setup();assert(e.player.weapons.filter(Boolean).length===1,'start loadout');
      giveWeapon(e,'baguette_launcher');assert(e.player.weapons[1]?.id==='baguette_launcher','second slot');
      cycleWeapon(e,1);assert(e.player.activeWeapon===1,'next');cycleWeapon(e,1);assert(e.player.activeWeapon===0,'wrap');
      cycleWeapon(e,-1);assert(e.player.activeWeapon===1,'reverse');assert(e.projectiles.length===0,'switch fired');
    });
    for(const slot of [0,1]) check(`Replacement slot ${slot+1} and cancellation`,()=>{
      const e=setup();giveWeapon(e,'baguette_launcher');giveWeapon(e,'feather_gun');assert(e.swap,'no swap');
      const before=e.player.weapons.map(w=>w?.id).join();cancelSwap(e);assert(e.player.weapons.map(w=>w?.id).join()===before,'cancel changed loadout');
      const c=e.contents.get(e.currentKey)!;assert(c.items.some(i=>i.itemId==='feather_gun'),'cancel deleted floor weapon');
      e.keys.e=true;tick(e);selectSwapSlot(e,slot);const old=e.player.weapons[slot]!.id;confirmSwap(e);
      assert(e.player.weapons[slot]?.id==='feather_gun','wrong slot replaced');assert(c.items.some(i=>i.itemId===old),'old weapon not dropped');
      assert(!c.items.some(i=>i.itemId==='feather_gun'),'source remains');
    });
    check('Dash does not create shots',()=>{const e=setup();handleDash(e);tick(e);assert(e.player.dashCooldown>0 && e.projectiles.length===0,'dash fired');});
    check('Ready transitions do not retrigger',()=>{
      const e=setup();e.player.dashCooldown=1;e.player.activeItemCooldown=1;tick(e);
      assert(e.player.dashReadyFlash>0 && e.player.quackReadyFlash>0,'missing ready transition');
      tick(e,60);assert(e.player.dashReadyFlash===0 && e.player.quackReadyFlash===0,'ready repeats');
    });
    check('Cosmetic purchase and equip preserve stats',()=>{
      const e=setup(),stats=JSON.stringify({hp:e.player.hp,speed:e.player.speed,damage:e.player.damageMultiplier});
      e.totalGoldenCrumbs=1000;e.unlockedSkins=['robber'];e.wardrobeIndex=1;
      wardrobeAction(e);assert(e.totalGoldenCrumbs===800 && e.unlockedSkins.includes('gangster'),'purchase failed');
      wardrobeAction(e);assert(e.equippedSkin==='gangster' && e.totalGoldenCrumbs===800,'equip charged again');
      assert(stats===JSON.stringify({hp:e.player.hp,speed:e.player.speed,damage:e.player.damageMultiplier}),'cosmetic changed stats');
    });
    check('Shop replacement commits payment only once',()=>{
      const e=setup();giveWeapon(e,'baguette_launcher');const c=e.contents.get(e.currentKey)!;
      c.shopItems=[{x:e.player.x+7,y:e.player.y+8,itemId:'feather_gun',isWeapon:true,cost:20,sold:false}];
      e.player.crumbs=30;e.keys.e=true;tick(e);cancelSwap(e);assert(e.player.crumbs===30&&!c.shopItems[0].sold,'cancel charged');
      e.keys.e=true;tick(e);selectSwapSlot(e,1);confirmSwap(e);assert(e.player.crumbs===10&&c.shopItems[0].sold,'incorrect commit');
      confirmSwap(e);assert(e.player.crumbs===10,'double charge');
    });
    check('Healing is not magnetized',()=>{
      const e=setup(),c=e.contents.get(e.currentKey)!;c.clearAge=25;e.player.hp=2;
      c.pickups=[{x:55,y:55,type:'hp',value:1,lifetime:99999}];tick(e,20);
      assert(c.pickups[0].x===55 && c.pickups[0].y===55,'healing moved');
      e.player.x=49;e.player.y=47;tick(e);assert(e.player.hp===3,'food did not heal');
    });
    check('Boss rewards persist; stairs preserve build',()=>{
      const e=setup();giveWeapon(e,'baguette_launcher');
      enterRoom(e,e.map.bossKey,null);e.state=GameState.PLAYING;
      const c=e.contents.get(e.currentKey)!;assert(!c.stairs,'premature stairs');
      for(const enemy of [...c.enemies]) damageEnemy(e,enemy,9999,false,c);
      tick(e,100);assert(c.stairs && (c.pedestal||c.choices?.length),'missing guaranteed reward');
      const oldMap=e.map,oldWeapons=e.player.weapons.map(w=>w?.id).join();
      e.player.x=c.stairs!.x+8;e.player.y=c.stairs!.y+8;e.keys.e=true;tick(e);
      assert(String(e.state)===GameState.FLOOR_CLEAR,'stairs did not activate');tick(e,180);
      assert(e.map.floorIndex===1 && e.map!==oldMap,'no new floor');assert(e.player.weapons.map(w=>w?.id).join()===oldWeapons,'lost loadout');
      assert(validateMap(e.map).length===0,'bad next floor');
    });
    check('Save excludes temporary run state',()=>{
      const e=setup();e.totalGoldenCrumbs=345;e.player.crumbs=999;e.unlockedSkins.push('pirate');e.equippedSkin='pirate';e.discovered.items.push('double_yolk');
      const snap=permanentSnapshot(e),loaded=normalizeProgress(JSON.parse(JSON.stringify(snap)));
      assert(!('player' in snap)&&!('crumbs' in snap),'temporary data saved');
      assert(loaded.totalGoldenCrumbs===345 && loaded.equippedSkin==='pirate' && loaded.discovered.items.includes('double_yolk'),'progress lost');
    });
    check('Invalid saved skin is repaired',()=>assert(normalizeProgress({equippedSkin:'invalid',unlockedSkins:['invalid'],totalGoldenCrumbs:-22}).equippedSkin==='robber','unsafe skin'));
    check('All weapon stats survive a pickup copy',()=>Object.values(WEAPONS).forEach(w=>assert(JSON.stringify({...w}.bars)===JSON.stringify(w.bars),'stats changed')));
    check('La granada sigue al cursor, no al movimiento',()=>{
      const e=setup();e.player.activeItem='bread_grenade';e.player.x=200;e.player.y=160;e.mouseX=400;e.mouseY=80;e.player.facingAngle=Math.PI;
      handleActiveItem(e);const g=e.grenades[0];assert(!!g && g.vx>0 && g.vy<0,'no apuntó al cursor');
    });
    check('Reemplazar objeto activo deja el anterior en el suelo',()=>{
      const e=setup();const c=e.contents.get(e.currentKey)!;
      c.items.push({x:e.player.x,y:e.player.y,itemId:'bread_grenade',isWeapon:false,isActive:true});
      e.keys.e=true;tick(e);assert(e.activeSwap?.itemId==='bread_grenade','no pidió cambio');
      confirmActiveSwap(e);assert(e.player.activeItem==='bread_grenade','no se equipó');
      assert(c.items.some(i=>i.itemId==='emergency_quack'&&i.isActive),'no soltó el cuac');
    });

    check('M alterna el mapa y ESC lo cierra',()=>{
      const e=setup();assert(toggleFloorMap(e),'no abrió');assert(e.state===GameState.MAP,'estado equivocado');
      toggleFloorMap(e);assert(String(e.state)===GameState.PLAYING,'M no cerró');openFloorMap(e);closeFloorMap(e);assert(String(e.state)===GameState.PLAYING,'no cerró');
    });
    check('El mapa desde pausa regresa a pausa',()=>{const e=setup();e.state=GameState.PAUSED;openFloorMap(e);closeFloorMap(e);assert(e.state===GameState.PAUSED,'perdió la pausa');});
    check('Mapa congela combate, proyectiles, vida y recargas',()=>{
      const e=setup(),combat=[...e.map.rooms.values()].find(r=>r.type===RoomType.COMBAT)!;
      enterRoom(e,`${combat.gx},${combat.gy}`,null);e.state=GameState.PLAYING;e.player.dashCooldown=30;e.player.activeItemCooldown=120;
      const snapshot=()=>JSON.stringify({player:e.player,projectiles:e.projectiles,rooms:[...e.map.rooms],content:[...e.contents],stats:e.stats,run:e.run,frame:e.frame});
      openFloorMap(e);const before=snapshot();tick(e,240);assert(snapshot()===before,'el combate avanzó');
      handleDash(e);handleActiveItem(e);cycleWeapon(e,1);assert(snapshot()===before,'una acción funcionó con mapa abierto');
    });
    check('Solo salas visitadas y conexiones descubiertas',()=>{
      const e=mapFixture(),v=visibleRoomKeys(e);assert(v.size===3&&v.has('-1,0')&&v.has('1,0'),'primera frontera incorrecta');
      assert(!v.has('2,0')&&!v.has(e.map.bossKey)&&!v.has('0,1'),'filtró información distante');
    });
    check('Los secretos requieren descubrimiento explícito',()=>{
      const e=mapFixture();e.player.items=['vault_map'];assert(!visibleRoomKeys(e).has('0,1'),'plano reveló secreto');
      e.map.rooms.get('0,1')!.revealed=true;assert(visibleRoomKeys(e).has('0,1'),'secreto descubierto oculto');
    });
    check('Ruta mínima usa solo salas conocidas',()=>{
      const e=mapFixture();assert(knownPath(e,'2,0').length===0,'ruta hacia sala oculta');
      e.map.rooms.get('1,0')!.visited=true;assert(knownPath(e,'2,0').join('|')==='0,0|1,0|2,0','ruta incorrecta');
      e.map.rooms.get(e.map.bossKey)!.revealed=true;assert(knownPath(e,e.map.bossKey).length===0,'ruta atravesó información desconocida');
    });
    check('Seleccionar sala no transporta al pato',()=>{
      const e=mapFixture();openFloorMap(e);const n=mapNodeLayout(e).find(n=>n.id==='-1,0')!,x=e.player.x;
      mapHit(e,n.x,n.y);assert(e.currentKey==='0,0'&&e.player.x===x&&e.mapView.selected==='-1,0','se transportó');
    });
    check('Plano, soplón y mapa manchado revelan información limitada',()=>{
      const e=mapFixture();e.player.items=['bank_blueprint'];applyMapItemEffects(e);assert(visibleRoomKeys(e).has('2,0'),'plano sin efecto');
      e.player.items=['informant'];applyMapItemEffects(e);assert(e.map.rooms.get('2,0')!.revealed,'tienda oculta');
      const n=mapFixture();n.player.items=['stained_map'];applyMapItemEffects(n,true);
      assert([...n.map.rooms.values()].filter(r=>r.revealed&&r.type!==RoomType.START).length===1,'revelación no es única');
      const before=JSON.stringify([...n.map.rooms]);applyMapItemEffects(n,true);assert(JSON.stringify([...n.map.rooms])===before,'se repitió en el mismo piso');
    });
    check('Lentes del guardia: umbral de salas despejadas',()=>{
      const e=mapFixture();e.player.items=['guard_glasses'];applyMapItemEffects(e);assert(!visibleRoomKeys(e).has(e.map.bossKey),'jefe revelado antes');
      for(const r of e.map.rooms.values())if(r.type===RoomType.COMBAT)r.cleared=true;
      applyMapItemEffects(e);assert(visibleRoomKeys(e).has(e.map.bossKey),'umbral sin efecto');
    });
    check('GPS resalta solo una ruta encontrada',()=>{
      const e=mapFixture();e.map.rooms.get('1,0')!.visited=true;openFloorMap(e);focusMapDestination(e,'shop');
      assert(e.mapView.selected==='2,0'&&e.currentKey==='0,0','GPS transporta o no selecciona');
    });
    check('Estado de tienda y botín se conserva al abrir mapa',()=>{
      const e=setup(),c=e.contents.get(e.currentKey)!;c.shopItems=[{itemId:'hot_sauce',isWeapon:false,cost:15,sold:true,x:0,y:0}];
      openFloorMap(e);closeFloorMap(e);assert(roomStatus(e,e.currentKey)==='Agotada','olvidó compra');
    });
    for(const item of EXPANSION_ITEMS) check(`Efecto y arte: ${item.name}`,()=>{
      const e=setup();grantItem(e,item.id);assert(e.player.items.includes(item.id),'no se recogió');
      assert(eligiblePassives(e).every(id=>id!==item.id),'regresa al grupo aleatorio');
      assert(e.player.hp>0&&e.player.maxHp>=1,'vida inválida');
    });
    check('No ofrece pasivos repetidos ni al agotar el catálogo',()=>{
      const e=setup();e.player.items=Object.keys(ITEMS);
      for(let i=0;i<20;i++)assert(!ITEMS[rollItem(e)],'repitió un pasivo agotado');
    });
    check('Tres opciones: ataque, defensa y utilidad',()=>{
      const e=setup(),choices=diverseRewards(e);assert(new Set(choices).size===3,'opciones repetidas');
      assert(new Set(choices.map(id=>ITEMS[id].role)).size===3,'opciones demasiado similares');
    });
    check('Tarjeta clonada descuenta solo la primera compra',()=>{
      const e=setup();e.player.items=['cloned_card'];assert(shopPrice(e,{cost:20})===10,'sin descuento');e.player.couponUsed=true;assert(shopPrice(e,{cost:20})===20,'descuento permanente');
    });
    check('Casco reduce el primer golpe de sala',()=>{
      const e=setup();e.player.items=['motorcycle_helmet'];damagePlayer(e,1);assert(e.player.hp===4.5,'primer golpe no reducido');
      e.player.iFrames=0;damagePlayer(e,1);assert(e.player.hp===3.5,'segundo golpe también reducido');
    });
    check('Tiempo de recarga acelerado cruza cero una sola vez',()=>{
      const e=setup();e.player.items=['stolen_watch'];e.player.dashCooldown=1;e.player.activeItemCooldown=1;tick(e);
      assert(e.player.dashCooldown===0&&e.player.activeItemCooldown===0,'recarga negativa');tick(e,60);
      assert(!e.player.dashReadyFlash&&!e.player.quackReadyFlash,'aviso repetido');
    });
    check('Credencial falsa modera la alerta',()=>{const e=setup();e.alert=0;e.player.items=['fake_id'];changeAlert(e,10);assert(e.alert===8,'crecimiento incorrecto');});
    check('Zona muerta del control no mueve al pato',()=>assert(deadzone(.12)===0&&deadzone(-1)===-1,'zona muerta inválida'));
    check('Terminología y catálogo es-MX',()=>{
      assert(LOCALE==='es-MX','locale incorrecto');
      const text=[...Object.values(T).flat().filter(v=>typeof v==='string'),...CATALOG.flatMap(i=>[i.name,i.description,i.flavor])].join(' ');
      assert(!/\b(coger|coge|pulsa|ratón|dash|cooldown|settings|room|shop|boss|skin|run|floor)\b/i.test(text),'terminología no localizada');
      assert(COLLECTION_TABS.map(t=>t.name).join('|')==='OBJETOS|ARMAS|ENEMIGOS|JEFES|ASPECTOS','secciones incorrectas');
    });
    for(let floor=0;floor<6;floor++) for(const template of ROOM_TEMPLATES)check(`Plantilla ${floor}/${template}`,()=>{
      const room:MapRoom={gx:0,gy:0,type:RoomType.COMBAT,doors:['N','S','E','W'],visited:false,cleared:false,generated:false,distance:1,floorIndex:floor,layout:[]};
      room.layout=generateRoomLayout(room,()=>.4,template);
      assert(room.layout[1][7]===0&&room.layout[9][7]===0&&room.layout[5][1]===0&&room.layout[5][13]===0,'entrada obstruida');
    });
  } finally {setAudioTestMode(false);setVolumes(.8,.35,.85);}
  return report;
}