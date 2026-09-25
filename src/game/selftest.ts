import { auditContent, CATALOG, COLLECTION_TABS } from './catalog';
import { ITEMS, ACTIVE_ITEMS, WEAPONS, SKINS, BOSSES, MINIBOSSES, SUBBOSSES, ENEMIES, FLOOR_BOSS_POOL, FLOOR_MINIBOSS_POOL, FLOOR_SUBBOSS_POOL, FINAL_BOSS_ID } from './data';
import { generateMap, validateMap,generateRoomLayout,ROOM_TEMPLATES,type MapRoom } from './mapgen';
import { getBuild, BASE_EFFECTS, PASSIVE_RULES, ACTIVE_RULES } from './itemRules';
import { normalizeProgress, permanentSnapshot } from './progress';
import { createEngine,startGame,updateEngine,cycleWeapon,selectSwapSlot,confirmSwap,cancelSwap,confirmActiveSwap,enterRoom,damageEnemy,damagePlayer,handleActiveItem,handleDash,wardrobeAction,grantItem,shopPrice,changeAlert,rollItem,recycleNearestEndlessFloorItem,cleanupEndlessFloorDrops,beginEndlessFloorSweep,bossPartsFor,GameState } from './engine';
import { setAudioTestMode,setVolumes } from './audio';
import type { GameEngine } from './types';
import { RoomType,DIR_VECTORS,OPPOSITE,UI_BASE_WIDTH,CANVAS_HEIGHT,HEIST_INTRO_FRAMES,HEIST_INTRO_SKIP_AFTER,type Dir } from './constants';
import { visibleRoomKeys,knownPath,toggleFloorMap,openFloorMap,closeFloorMap,applyMapItemEffects,mapNodeLayout,mapHit,roomStatus,focusMapDestination } from './floorMap';
import { EXPANSION_ITEMS } from './expansion';
import { eligiblePassives,diverseRewards } from './loot';
import { deadzone } from './gamepad';
import { T,LOCALE } from './i18n';
import { DEFAULT_BINDINGS, normalizeBindings, remapBinding } from './controls';
import { endlessRoundKind, rewardRounds, endlessScale, endlessOverdrive, endlessHazardTiming, endlessStage } from './endless';
import { bossVisualIdentityKey, drawBoss, drawPoliciaPato, drawPoliciaRapido, drawPoliciaEscopeta, drawPoliciaAntidisturbios, drawDronPolicial, drawGuardGoose, drawSecurityPigeon, drawToasterTurret, drawRollingBagel, drawEvilCroissant, drawBankerChicken } from './sprites';
import { SPECIAL_ENEMIES, drawTacticalEnemy } from './tacticalSprites';
import { coverVisibleCanvasRect } from './layout';
import { drawVaultScene } from './titleScene';

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
    check('Intro de atraco tiene duración y skip válidos',()=>{
      assert(HEIST_INTRO_FRAMES>=120&&HEIST_INTRO_FRAMES<=180,'duración fuera de rango');
      assert(HEIST_INTRO_SKIP_AFTER>=12&&HEIST_INTRO_SKIP_AFTER<HEIST_INTRO_FRAMES*.35,'skip fuera de rango');
    });
    check('Escena de bóveda renderiza todas las fases cinematográficas',()=>{
      const scene=document.createElement('canvas');scene.width=480;scene.height=352;
      const sceneCtx=scene.getContext('2d')!;
      for(const phase of [0,.12,.28,.48,.72,.9,1]){
        sceneCtx.clearRect(0,0,480,352);
        drawVaultScene(sceneCtx,120,'robber',phase,240,176,phase,'#e6c56f');
      }
    });
    check('UI legacy cabe completa en el área segura calculada',()=>{
      for(const [w,h] of [[1920,1080],[1366,768],[1600,900],[1920,1200],[1280,1024],[2560,1080]]){
        const safe=coverVisibleCanvasRect(w,h);
        const scale=Math.min(1,safe.w/UI_BASE_WIDTH,safe.h/CANVAS_HEIGHT);
        assert(scale>0,'escala segura inválida');
        assert(UI_BASE_WIDTH*scale<=safe.w+.001,'ancho legacy recortado');
        assert(CANVAS_HEIGHT*scale<=safe.h+.001,'alto legacy recortado');
      }
    });
    check('Item art manifest',()=>assert(report.manifest.issues.length===0,report.manifest.issues.join(', ')));
    check('All content has a pickup category',()=>assert(report.manifest.entries.every(i=>!!i.pickup&&!!i.category),'missing pickup metadata'));
    check('Exactly eleven cosmetic skins',()=>assert(SKINS.length===11 && SKINS.every(s=>!('hp' in s)&&!('damage' in s)),'invalid cosmetics'));
    for(let i=0;i<12;i++) for(let floor=0;floor<6;floor++) check(`Map ${i}/${floor}`,()=>assert(validateMap(generateMap(floor,`AUDIT-${i}`)).length===0,'invalid doors, reachability or boss'));
    check('Seeded layouts are reproducible',()=>assert(JSON.stringify([...generateMap(2,'BREAD-TEST').rooms])===JSON.stringify([...generateMap(2,'BREAD-TEST').rooms]),'layout changed'));
    check('Different seeds change maps',()=>assert(JSON.stringify([...generateMap(0,'A').rooms])!==JSON.stringify([...generateMap(0,'B').rooms]),'identical maps'));
    for(const id of Object.keys(ITEMS)) check(`Passive ${id}`,()=>{
      const b=getBuild({items:[id]});const keys=Object.keys(PASSIVE_RULES[id]);
      assert(keys.length>0 && keys.some(k=>b[k as keyof typeof b]!==BASE_EFFECTS[k as keyof typeof b]),'no modifier');
    });
    for(const id of Object.keys(ACTIVE_ITEMS)) check(`Active ${id}`,()=>{
      const e=setup();e.player.activeItem=id;
      if(id==='emergency_bread')e.player.hp=Math.max(.5,e.player.maxHp-2);
      handleActiveItem(e);
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
    check('Impact feedback never freezes the gameplay update',()=>{
      const e=setup();
      e.hitStop=4;
      e.keys.d=true;
      const before=e.player.x;
      tick(e);
      assert(e.hitStop===3,'impact feedback counter did not advance');
      assert(e.player.x!==before || e.player.vx!==0,'hit feedback froze player movement');
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
      e.keys.e=true;tick(e);selectSwapSlot(e,1);confirmSwap(e);assert(e.player.crumbs===5&&c.shopItems[0].sold,'incorrect commit');
      confirmSwap(e);assert(e.player.crumbs===5,'double charge');
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
      const e=setup();e.player.items=['cloned_card'];assert(shopPrice(e,{cost:20})===13,'sin descuento');e.player.couponUsed=true;assert(shopPrice(e,{cost:20})===25,'descuento permanente');
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
    check('Los cuatro activos añadidos ejecutan su mecánica',()=>{
      const butter=setup(),bc=butter.contents.get(butter.currentKey)!;butter.player.activeItem='butter_sprayer';handleActiveItem(butter);
      assert(bc.puddles.length>=5&&bc.puddles.every(p=>p.kind==='butter'),'aspersor sin zona de mantequilla');
      const drone=setup();drone.player.activeItem='crumb_drone';handleActiveItem(drone);assert(drone.drone?.life===600,'dron no desplegado');
      const bread=setup();bread.player.activeItem='emergency_bread';bread.player.hp=bread.player.maxHp-2;handleActiveItem(bread);assert(bread.player.hp===bread.player.maxHp,'pan no curó 2');
      const alarm=setup();alarm.player.activeItem='fake_alarm';handleActiveItem(alarm);assert(alarm.decoy?.stunOnExpire===150&&alarm.decoy.life===240,'alarma falsa incompleta');
    });
    check('Pan de emergencia no gasta recarga con vida completa',()=>{
      const e=setup();e.player.activeItem='emergency_bread';e.player.activeItemCooldown=0;handleActiveItem(e);assert(e.player.activeItemCooldown===0,'gastó recarga sin curar');
    });
    check('Controles antiguos reciben reciclaje de Sin Fin',()=>{
      const bindings=normalizeBindings({moveUp:'i'});assert(bindings.moveUp==='i'&&bindings.recycle===DEFAULT_BINDINGS.recycle,'migración de controles incompleta');
      remapBinding(bindings,'recycle','q');assert(bindings.recycle==='q','reciclaje no remapeable');
    });
    check('Reciclaje de suelo Sin Fin elimina un objeto y paga migas',()=>{
      const e=setup(),c=e.contents.get(e.currentKey)!;e.gameMode='endless';e.state=GameState.PLAYING;e.player.crumbs=0;
      c.items.push({x:e.player.x,y:e.player.y,itemId:'bread_helmet',isWeapon:false,isActive:false});
      assert(recycleNearestEndlessFloorItem(e),'no recicló');assert(c.items.length===0,'objeto sigue en el suelo');assert(e.player.crumbs>0,'no entregó migas');
    });
    check('Cadencia de 10 rondas de Atraco Sin Fin',()=>{
      const expected=['combat','combat','combat','combat','miniboss','combat','special','subboss','combat','boss'];
      assert(expected.every((kind,i)=>endlessRoundKind(i+1)===kind),'cadencia de rondas cambió');
      assert([3,5,7,8,10].every(rewardRounds),'faltan recompensas tempranas');
      assert(!rewardRounds(101)&&rewardRounds(108)&&rewardRounds(110),'taper de recompensas tardías cambió');
    });
    check('Curva tardía de Sin Fin escala presión sin inflar esponjas',()=>{
      const r50=endlessScale(50,'normal'),r100=endlessScale(100,'normal'),r150=endlessScale(150,'normal'),r200=endlessScale(200,'normal');
      assert(r100.hp>r50.hp&&r200.hp>r100.hp,'HP dejó de progresar');
      assert(r200.hp<10&&r200.budget<100,'endgame volvió a ser esponja o maratón');
      assert(r150.pressureGain>r100.pressureGain&&r200.pressureGain>=r150.pressureGain,'presión tardía no escala');
      assert(r200.maxActive<=12,'demasiados enemigos simultáneos');
    });
    check('Atraco Imposible avanza por cinco niveles',()=>{
      assert(endlessOverdrive(100)===0&&endlessOverdrive(101)===1&&endlessOverdrive(121)===2,'inicio de sobrecarga incorrecto');
      assert(endlessOverdrive(181)===5&&endlessOverdrive(500)===5,'sobrecarga sin límite');
      assert(endlessStage(200)==='ATRACO IMPOSIBLE · V','nivel final no visible');
    });
    check('Peligros tardíos aumentan frecuencia sin perder aviso',()=>{
      const early=endlessHazardTiming(100),late=endlessHazardTiming(200);
      assert(late.warning<early.warning&&late.warning>=34,'aviso tardío ilegible');
      assert(late.repeatCooldown<early.repeatCooldown&&late.repeatCooldown>=145,'cadencia de peligros fuera de rango');
      assert(late.openingCooldown>=120,'peligro inicial instantáneo');
    });
    check('Sin Fin muestra el botín viajando al pato antes de cobrarlo',()=>{
      const e=setup(),c=e.contents.get(e.currentKey)!;e.gameMode='endless';e.state=GameState.PLAYING;e.endless.round=1;e.endless.roundActive=true;
      e.player.crumbs=0;e.player.goldenCrumbs=0;e.totalGoldenCrumbs=0;e.player.hp=e.player.maxHp;
      c.items=[{x:70,y:70,itemId:'feather_gun',isWeapon:true,isActive:false}];
      c.pickups=[{x:390,y:75,type:'crumb',value:5,lifetime:99999},{x:390,y:250,type:'golden_crumb',value:2,lifetime:99999},{x:80,y:250,type:'hp',value:1,lifetime:99999}];
      const beforeItem=Math.hypot(c.items[0].x+8-(e.player.x+7),c.items[0].y+8-(e.player.y+8));
      const beforeCoin=Math.hypot(c.pickups[0].x-(e.player.x+7),c.pickups[0].y-(e.player.y+8));
      beginEndlessFloorSweep(e,c);
      assert(e.player.crumbs===0&&e.totalGoldenCrumbs===0,'el botín se cobró antes de animarse');
      assert(c.items[0].vacuuming&&c.pickups.every(p=>p.forceMagnet),'el barrido no marcó todo el botín');
      tick(e,5);
      assert(c.items.length===0||Math.hypot(c.items[0].x+8-(e.player.x+7),c.items[0].y+8-(e.player.y+8))<beforeItem,'el objeto no viajó al pato');
      assert(c.pickups.length<3||Math.hypot(c.pickups[0].x-(e.player.x+7),c.pickups[0].y-(e.player.y+8))<beforeCoin,'las monedas no viajaron al pato');
      tick(e,120);
      assert(e.player.crumbs>=5&&e.totalGoldenCrumbs===2,'el botín visual no se acreditó al llegar');
    });
    check('Sin Fin limpia drops entre rondas sin perder monedas',()=>{
      const e=setup(),c=e.contents.get(e.currentKey)!;e.gameMode='endless';e.player.crumbs=0;e.player.goldenCrumbs=0;e.totalGoldenCrumbs=0;
      c.items=[{x:10,y:10,itemId:'feather_gun',isWeapon:true,isActive:false},{x:20,y:20,itemId:'bread_helmet',isWeapon:false,isActive:false}];
      c.pickups=[{x:0,y:0,type:'crumb',value:5,lifetime:99999},{x:0,y:0,type:'golden_crumb',value:2,lifetime:99999},{x:0,y:0,type:'hp',value:1,lifetime:99999}];
      const result=cleanupEndlessFloorDrops(e,c);
      assert(c.items.length===0&&c.pickups.length===0,'drops persistieron');
      assert(result.recycledItems===2&&result.discardedHealing===1,'limpieza incompleta');
      assert(e.player.crumbs>=5+result.recycledMigas&&e.totalGoldenCrumbs===2,'monedas perdidas');
    });
    check('Todo el roster normal rediseñado renderiza sin excepción',()=>{
      const ids=Object.keys(ENEMIES);
      for(const id of ids){
        if(SPECIAL_ENEMIES.has(id)){drawTacticalEnemy(ctx,id,40,40,120,false,.4,.65);continue;}
        switch(id){
          case 'policia_pato':drawPoliciaPato(ctx,40,40,120,false,1);break;
          case 'policia_rapido':drawPoliciaRapido(ctx,40,40,120,false,1);break;
          case 'policia_escopeta':drawPoliciaEscopeta(ctx,40,40,120,false,1,.65);break;
          case 'policia_antidisturbios':drawPoliciaAntidisturbios(ctx,40,40,120,false,{x:1,y:0},true,false);break;
          case 'dron_policial':drawDronPolicial(ctx,40,40,120,false);break;
          case 'guard_goose':drawGuardGoose(ctx,40,40,120,false);break;
          case 'security_pigeon':drawSecurityPigeon(ctx,40,40,120,false);break;
          case 'toaster_turret':drawToasterTurret(ctx,40,40,120,false);break;
          case 'rolling_bagel':drawRollingBagel(ctx,40,40,120,false);break;
          case 'evil_croissant':drawEvilCroissant(ctx,40,40,120,false);break;
          case 'banker_chicken':drawBankerChicken(ctx,40,40,120,false);break;
          default:throw new Error('enemigo sin renderer: '+id);
        }
      }
      assert(ids.length>=20,'roster normal incompleto');
    });
    check('Los diez bosses icónicos tienen módulos destructibles manuales',()=>{
      const ids=['captain_honk','comisario_pico_duro','toaster_9000','general_ganso','don_levadura','director_seguridad','head_baker','el_auditor','ganso_antidisturbios','cajero_3000'];
      for(const id of ids){
        const parts=bossPartsFor(id);
        assert(parts.length>0,id+' sin módulos destructibles');
        assert(new Set(parts.map(p=>p.id)).size===parts.length,id+' repite IDs de módulo');
        assert(parts.every(p=>p.hp===p.maxHp&&p.maxHp>0&&p.w>0&&p.h>0),id+' tiene módulo inválido');
        assert(parts.every(p=>(p.exposedPhase??0)>=0&&(p.exposedPhase??0)<=2),id+' tiene exposición de fase inválida');
      }
      assert(bossPartsFor('director_seguridad').filter(p=>p.kind==='turret').length===2,'Director sin dos torretas independientes');
      assert(bossPartsFor('ganso_antidisturbios').some(p=>p.kind==='shield'),'Antidisturbios sin escudo destructible');
      assert(bossPartsFor('toaster_9000').filter(p=>p.kind==='reactor').length===2,'Tostadora sin resistencias independientes');
    });
    check('Estados destruidos de bosses icónicos siguen siendo renderizables',()=>{
      const ids=['captain_honk','comisario_pico_duro','toaster_9000','general_ganso','don_levadura','director_seguridad','head_baker','el_auditor','ganso_antidisturbios','cajero_3000'];
      for(const id of ids){
        const def=BOSSES[id]??SUBBOSSES[id]??MINIBOSSES[id];
        const parts=bossPartsFor(id).map(p=>({...p,hp:0,destroyed:true}));
        drawBoss(ctx,80,80,id,180,def.hp,def.hp,false,Math.min(2,def.phases-1),.85,parts);
      }
    });
    check('Coreografía manual renderiza windup, ataque y recuperación por boss icónico',()=>{
      const ids=['captain_honk','comisario_pico_duro','toaster_9000','general_ganso','don_levadura','director_seguridad','head_baker','el_auditor','ganso_antidisturbios','cajero_3000'];
      for(const id of ids){
        const def=BOSSES[id]??SUBBOSSES[id]??MINIBOSSES[id];
        const parts=bossPartsFor(id);
        for(let atk=0;atk<Math.min(5,def.phases+2);atk++){
          drawBoss(ctx,80,80,id,210+atk*3,def.hp,def.hp,false,Math.min(def.phases-1,1),.72,parts,atk,0,18);
          drawBoss(ctx,80,80,id,230+atk*3,def.hp,def.hp,false,Math.min(def.phases-1,1),0,parts,undefined,12,18);
        }
      }
    });
    check('Buckshot conserva identidad real de escopeta',()=>{
      const w=WEAPONS.breadcrumb_shotgun;
      assert(w.projectileType==='buckshot_player','escopeta de jugador sin proyectil buckshot');
      assert(w.projectileCount>=7&&w.spread>=.5,'escopeta de jugador sin abanico de perdigones');
      assert(w.knockback>=3.5&&w.fireRate>=28,'escopeta de jugador sin retroceso/cadencia de escopeta');
      assert(ENEMIES.policia_escopeta.behavior==='shotgunner'&&ENEMIES.policia_escopeta.projectileType==='buckshot','enemigo escopetero perdió buckshot');
    });
    check('Los 145 encuentros de jerarquía renderizan sin excepción',()=>{
      const all=[...Object.values(MINIBOSSES),...Object.values(SUBBOSSES),...Object.values(BOSSES)];
      assert(all.length===145,'conteo total inesperado');
      for(const b of all) for(let phase=0;phase<b.phases;phase++) drawBoss(ctx,40,40,b.id,120+phase*7,b.hp,b.hp,false,phase);
    });
    check('Los 145 encuentros tienen identidad visual estructural única',()=>{
      const all=[...Object.values(MINIBOSSES),...Object.values(SUBBOSSES),...Object.values(BOSSES)];
      const keys=all.map(b=>bossVisualIdentityKey(b.id));
      assert(keys.every(Boolean),'encuentro sin firma visual');
      assert(new Set(keys).size===all.length,'dos encuentros comparten la misma firma visual estructural');
      assert(bossVisualIdentityKey(FINAL_BOSS_ID)==='final:bread_banker:imperial-vault','firma final incorrecta');
    });
    check('Jefes usan proporciones e hitboxes realmente diversas',()=>{
      const all=[...Object.values(MINIBOSSES),...Object.values(SUBBOSSES),...Object.values(BOSSES).filter(b=>!b.finalBoss)];
      const proportions=new Set(all.map(b=>`${b.scaleX.toFixed(2)}x${b.scaleY.toFixed(2)}`));
      assert(proportions.size>=6,'faltan perfiles corporales distintos');
      assert(all.every(b=>b.hitboxW>0&&b.hitboxH>0),'hurtbox inválida');
      assert(all.some(b=>b.hitboxW>b.hitboxH*1.35),'falta jefe claramente ancho');
      assert(all.some(b=>b.hitboxH>b.hitboxW*1.35),'falta jefe claramente alto');
      assert(all.some(b=>b.stationary),'faltan jefes-fortaleza estáticos');
    });
    check('Todos los subjefes y jefes cubren doce roles de combate',()=>{
      const expected=['artillery','duelist','bulwark','swarm','sniper','storm','warden','charger','vortex','executioner','reactor','trickster'];
      for(const group of [Object.values(SUBBOSSES),Object.values(BOSSES).filter(b=>!b.finalBoss)]){
        const roles=new Set(group.map(b=>b.role));
        assert(expected.every(role=>roles.has(role as never)),'jerarquía sin todos los roles');
        assert(group.every(b=>b.roleVariant>=0&&b.roleVariant<=3),'variante de rol inválida');
      }
    });
    check('Subjefes y jefes no repiten identidad completa de combate',()=>{
      const all=[...Object.values(SUBBOSSES),...Object.values(BOSSES)];
      const identities=all.map(b=>[
        b.family,b.role,b.roleVariant,b.pattern.mobility,b.pattern.sequence.join('>'),
        b.scaleX.toFixed(2),b.scaleY.toFixed(2),b.stationary?'fixed':'mobile'
      ].join(':'));
      assert(new Set(identities).size===identities.length,'dos jefes comparten la misma identidad completa');
    });
    check('El roster completo utiliza las doce familias de ataque',()=>{
      const expected=['fan','ring','spiral','crossfire','cage','mines','lanes','rush','summon','sniper','nova','warp'];
      for(const group of [Object.values(MINIBOSSES),Object.values(SUBBOSSES),Object.values(BOSSES).filter(b=>!b.finalBoss)]){
        const attacks=new Set(group.flatMap(b=>b.pattern.sequence));
        assert(expected.every(a=>attacks.has(a as never)),'familia de ataque ausente');
      }
    });
    check('Plantilla masiva contiene al menos 40 por jerarquía',()=>{
      assert(Object.keys(MINIBOSSES).length>=48,'faltan minijefes');
      assert(Object.keys(SUBBOSSES).length>=48,'faltan subjefes');
      assert(Object.values(BOSSES).filter(b=>!b.finalBoss).length>=48,'faltan jefes de piso rotativos');
    });
    check('Cada jefe data-driven tiene firma de combate única y válida',()=>{
      const all=[...Object.values(MINIBOSSES),...Object.values(SUBBOSSES),...Object.values(BOSSES)];
      const signatures=all.map(b=>b.pattern.signature);
      assert(new Set(signatures).size===signatures.length,'firmas de combate repetidas');
      assert(all.every(b=>b.pattern.sequence.length>=4&&new Set(b.pattern.sequence).size===b.pattern.sequence.length),'secuencia de ataques pobre o duplicada');
      const miniSeq=Object.values(MINIBOSSES).map(b=>b.pattern.sequence.join('>'));
      const subSeq=Object.values(SUBBOSSES).map(b=>b.pattern.sequence.join('>'));
      const bossSeq=Object.values(BOSSES).filter(b=>!b.finalBoss).map(b=>b.pattern.sequence.join('>'));
      assert(new Set(miniSeq).size===miniSeq.length,'minijefes con secuencia base repetida');
      assert(new Set(subSeq).size===subSeq.length,'subjefes con secuencia base repetida');
      assert(new Set(bossSeq).size===bossSeq.length,'jefes rotativos con secuencia base repetida');
      assert(all.every(b=>b.pattern.support.length>=3&&b.pattern.tempo>0&&b.pattern.speed>0),'firma incompleta');
    });
    check('Todos los apoyos de las firmas de jefe existen',()=>{
      const all=[...Object.values(MINIBOSSES),...Object.values(SUBBOSSES),...Object.values(BOSSES)];
      assert(all.every(b=>b.pattern.support.every(id=>!!ENEMIES[id])),'firma invoca un enemigo inexistente');
    });
    check('Los 145 encuentros pueden dibujarse sin excepción',()=>{
      const all=[...Object.values(MINIBOSSES),...Object.values(SUBBOSSES),...Object.values(BOSSES)];
      all.forEach(b=>drawBoss(ctx,80,80,b.id,120,b.hp,b.hp,false,b.phases-1));
      assert(all.length===145,'catálogo de jerarquía incompleto');
    });
    check('Pisos 1 a 5 rotan ocho jefes y piso 6 fija al Gran Jefe',()=>{
      assert(FLOOR_BOSS_POOL.length===6,'cantidad de pisos incorrecta');
      assert(FLOOR_BOSS_POOL.slice(0,5).every(pool=>pool.length>=8),'cada piso previo debe tener al menos ocho jefes');
      const rotating=Object.values(BOSSES).filter(b=>!b.finalBoss).map(b=>b.id);
      const accessible=new Set(FLOOR_BOSS_POOL.slice(0,5).flat());
      assert(rotating.every(id=>accessible.has(id)),'jefe rotativo inaccesible');
      assert(FLOOR_BOSS_POOL[5].length===1&&FLOOR_BOSS_POOL[5][0]===FINAL_BOSS_ID,'jefe final no está fijado');
      assert(!FLOOR_BOSS_POOL.slice(0,5).flat().includes(FINAL_BOSS_ID),'el Gran Jefe apareció antes del piso 6');
      assert(BOSSES[FINAL_BOSS_ID]?.finalBoss===true&&BOSSES[FINAL_BOSS_ID]?.name==='EL GRAN JEFE DEL BANCO','identidad del jefe final incorrecta');
    });
    check('Pools de minijefes y subjefes cubren todo el catálogo',()=>{
      const mini=new Set(FLOOR_MINIBOSS_POOL.flat()),sub=new Set(FLOOR_SUBBOSS_POOL.flat());
      assert(Object.keys(MINIBOSSES).every(id=>mini.has(id)),'minijefe inaccesible');
      assert(Object.keys(SUBBOSSES).every(id=>sub.has(id)),'subjefe inaccesible');
      assert(FLOOR_MINIBOSS_POOL.slice(0,5).every(p=>p.length>=8),'pool de minijefes desbalanceado');
      assert(FLOOR_SUBBOSS_POOL.slice(0,5).every(p=>p.length>=8),'pool de subjefes desbalanceado');
    });
    check('Jerarquía de jefes conserva fases previstas',()=>{
      assert(Object.values(MINIBOSSES).every(b=>b.phases===1),'minijefe con fases inesperadas');
      assert(Object.values(SUBBOSSES).every(b=>b.phases===2),'subjefe con fases inesperadas');
      assert(Object.values(BOSSES).every(b=>b.phases===3),'jefe de piso sin tres fases');
    });
    check('Zona muerta del control no mueve al pato',()=>assert(deadzone(.12)===0&&deadzone(-1)===-1,'zona muerta inválida'));
    check('Terminología y catálogo es-MX',()=>{
      assert(LOCALE==='es-MX','locale incorrecto');
      const text=[...Object.values(T).flat().filter(v=>typeof v==='string'),...CATALOG.flatMap(i=>[i.name,i.description,i.flavor])].join(' ');
      assert(!/\b(coger|coge|pulsa|ratón|dash|cooldown|settings|room|shop|boss|skin|run|floor)\b/i.test(text),'terminología no localizada');
      assert(COLLECTION_TABS.map(t=>t.name).join('|')==='OBJETOS|ARMAS|ENEMIGOS|JEFES|ASPECTOS|SINERGIAS','secciones incorrectas');
    });
    for(let floor=0;floor<6;floor++) for(const template of ROOM_TEMPLATES)check(`Plantilla ${floor}/${template}`,()=>{
      const room:MapRoom={gx:0,gy:0,type:RoomType.COMBAT,doors:['N','S','E','W'],visited:false,cleared:false,generated:false,distance:1,floorIndex:floor,layout:[]};
      room.layout=generateRoomLayout(room,()=>.4,template);
      assert(room.layout[1][7]===0&&room.layout[9][7]===0&&room.layout[5][1]===0&&room.layout[5][13]===0,'entrada obstruida');
    });
  } finally {setAudioTestMode(false);setVolumes(.8,.35,.85);}
  return report;
}