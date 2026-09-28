import { auditContent, CATALOG, COLLECTION_TABS } from './catalog';
import { ITEMS, ACTIVE_ITEMS, WEAPONS, SKINS, BOSSES, MINIBOSSES, SUBBOSSES, ENEMIES, FLOOR_BOSS_POOL, FLOOR_MINIBOSS_POOL, FLOOR_SUBBOSS_POOL, FINAL_BOSS_ID } from './data';
import { generateMap, validateMap,generateRoomLayout,ROOM_TEMPLATES,BANK_ROOM_TEMPLATES_BY_FLOOR,BANK_ROOM_TEMPLATES,type MapRoom } from './mapgen';
import { getBuild, BASE_EFFECTS, PASSIVE_RULES, ACTIVE_RULES } from './itemRules';
import { normalizeProgress, permanentSnapshot } from './progress';
import { createEngine,startGame,updateEngine,cycleWeapon,selectSwapSlot,confirmSwap,cancelSwap,confirmActiveSwap,enterRoom,damageEnemy,damagePlayer,handleActiveItem,handleDash,wardrobeAction,grantItem,shopPrice,changeAlert,rollItem,recycleNearestEndlessFloorItem,cleanupEndlessFloorDrops,beginEndlessFloorSweep,bossPartsFor,damageObstacleTile,obstacleHpAt,GameState,SETTING_ROWS } from './engine';
import { setAudioTestMode,setVolumes } from './audio';
import type { GameEngine, RoomContent } from './types';
import { RoomType,DIR_VECTORS,OPPOSITE,UI_BASE_WIDTH,CANVAS_HEIGHT,HEIST_INTRO_FRAMES,HEIST_INTRO_SKIP_AFTER,OBSTACLES,OBSTACLE_BASE,FLOOR_PROP_NAMES,OBSTACLES_PER_FLOOR,ART_SCALE,ART_PIXEL,FLOOR_THEMES,type Dir } from './constants';
import { visibleRoomKeys,knownPath,toggleFloorMap,openFloorMap,closeFloorMap,applyMapItemEffects,mapNodeLayout,mapHit,roomStatus,focusMapDestination } from './floorMap';
import { EXPANSION_ITEMS } from './expansion';
import { eligiblePassives,diverseRewards } from './loot';
import { deadzone } from './gamepad';
import { T,LOCALE } from './i18n';
import { DEFAULT_BINDINGS, normalizeBindings, remapBinding, keyLabel } from './controls';
import { beginControlCapture, requestControlReset, cancelControlReset, resetControls } from './controlsUI';
import { endlessRoundKind, rewardRounds, endlessScale, endlessOverdrive, endlessHazardTiming, endlessStage } from './endless';
import { bossVisualIdentityKey, drawBoss, drawDuckSkin, drawPoliciaPato, drawPoliciaRapido, drawPoliciaEscopeta, drawPoliciaAntidisturbios, drawDronPolicial, drawGuardGoose, drawSecurityPigeon, drawToasterTurret, drawRollingBagel, drawEvilCroissant, drawBankerChicken, drawChest, drawDoor, drawObstacle, drawShopPigeon, drawPedestal, drawParticle, drawProjectile, drawCoin, drawBankKey, drawCrumbCluster } from './sprites';
import { SPECIAL_ENEMIES, drawTacticalEnemy } from './tacticalSprites';
import { coverVisibleCanvasRect,mainMenuRect,mainMenuHit,pauseRect,settingsRect,settingsMinusRect,settingsPlusRect,settingsActionRect,endActionRect,BACK_BUTTON,PRIMARY_BUTTON,inside } from './layout';
import { drawVaultScene } from './titleScene';
import { drawMenuBackdrop, drawMenuHeader, drawMenuCard, drawMouseButton } from './ui';
import { drawRoomAtmosphere, drawRichTile } from './roomArt';
import { obstacleHitbox, obstacleCoverRect, obstacleOccludes, obstacleMaxHp, obstacleValue, obstacleFloorTier, OBSTACLE_DURABILITY, specialSolidRects, pedestalHitbox, pedestalInteractPoint, PEDESTAL_INTERACT_RADIUS } from './worldProps';
import { bankKeyDropChance, specialRoomKeyCost, tryUnlockSpecialRoom } from './keyAccess';

export interface CheckReport { passed:number; failures:string[]; manifest:ReturnType<typeof auditContent>; }
export function runSelfChecks():CheckReport {
  const report:CheckReport={passed:0,failures:[],manifest:auditContent()};
  const check=(name:string,fn:()=>void)=>{try {fn();report.passed++;}catch(error){report.failures.push(`${name}: ${String(error)}`);}};
  const assert=(ok:unknown,message:string)=>{if(!ok) throw new Error(message);};
  setAudioTestMode(true);
  check('Resolución artística interna usa rejilla 4x sin alterar unidades lógicas',()=>{
    assert(ART_SCALE===4,'ART_SCALE debe permanecer en 4');
    assert(ART_PIXEL===.25,'cada microdetalle debe equivaler a 1/4 de píxel lógico');
  });
  check('Hit-test del menú coincide con layout ancho y compacto',()=>{
    for(const wide of [false,true]){
      for(let i=0;i<8;i++){
        const box=mainMenuRect(i,wide);
        assert(mainMenuHit(box.x+box.w/2,box.y+box.h/2,wide)===i,`menú ${i} no responde en layout ${wide?'ancho':'compacto'}`);
      }
    }
  });
  check('Todas las variantes de suelo y pared renderizan sin referencias inválidas',()=>{
    const tileCanvas=document.createElement('canvas');
    tileCanvas.width=32*15;tileCanvas.height=32*11;
    const tileCtx=tileCanvas.getContext('2d')!;
    FLOOR_THEMES.forEach((theme,floorIndex)=>{
      for(let y=0;y<11;y++)for(let x=0;x<15;x++){
        drawRichTile(tileCtx,x,y,y===0||x===0||x===14||y===10,theme,floorIndex,0,123+floorIndex*17,true);
      }
    });
  });
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
    add(0,0,RoomType.START,true);add(-1,0,RoomType.COMBAT);add(1,0,RoomType.COMBAT);add(0,1,RoomType.COMBAT);
    add(2,0,RoomType.SHOP);add(1,-1,RoomType.SECRET);add(0,2,RoomType.ITEM);
    add(1,1,RoomType.COMBAT);add(2,1,RoomType.SUBBOSS);add(3,1,RoomType.BOSS);
    const link=(a:string,d:Dir)=>{const r=e.map.rooms.get(a)!,v=DIR_VECTORS[d],n=e.map.rooms.get(`${r.gx+v.x},${r.gy+v.y}`)!;r.doors.push(d);n.doors.push(OPPOSITE[d]);};
    link('0,0','W');link('0,0','E');link('0,0','S');link('1,0','E');link('1,0','N');link('0,1','S');link('0,1','E');link('1,1','E');link('2,1','E');
    e.map.startKey='0,0';e.map.itemRoomKey='0,2';e.map.bossKey='3,1';e.currentKey='0,0';
    return e;
  };
  try {
    check('Mapa abre y cierra con el mismo toggle',()=>{
      const e=setup();
      e.state=GameState.PLAYING;
      const before=e.state;
      assert(toggleFloorMap(e),'M no abrió el mapa desde juego');
      assert(e.state===GameState.MAP,'estado no cambió a MAP');
      assert(toggleFloorMap(e),'M no cerró el mapa');
      assert(e.state===before,'el mapa no volvió al estado anterior');
    });
    check('Remapeo actualiza la fuente viva usada por el manual',()=>{
      const bindings={...DEFAULT_BINDINGS};
      remapBinding(bindings,'moveUp','q');
      assert(bindings.moveUp==='q','remapeo no actualizó binding vivo');
      assert(keyLabel(bindings.moveUp)==='Q','etiqueta no refleja tecla remapeada');
      remapBinding(bindings,'shootUp','x');
      assert(bindings.shootUp==='x'&&keyLabel(bindings.shootUp)==='X','disparo remapeado no se refleja');
    });
    check('Popup de remapeo y confirmación de reset preservan estado correctamente',()=>{
      const e=setup();
      e.state=GameState.CONTROLS;
      e.bindings={...DEFAULT_BINDINGS,moveUp:'q',dash:'x'};
      beginControlCapture(e,0);
      assert(e.controlCapture&&!e.controlResetConfirm,'popup de remapeo no se abrió');
      assert(e.controlIndex===0,'popup abrió la acción incorrecta');
      e.controlCapture=false;
      requestControlReset(e);
      assert(e.controlResetConfirm&&!e.controlCapture,'confirmación de reset no se abrió');
      assert(e.bindings.moveUp==='q'&&e.bindings.dash==='x','pedir confirmación modificó controles antes de aceptar');
      cancelControlReset(e);
      assert(!e.controlResetConfirm&&e.bindings.moveUp==='q','cancelar reset alteró controles');
      requestControlReset(e);
      resetControls(e);
      assert(!e.controlResetConfirm&&!e.controlCapture,'reset dejó popup activo');
      assert(JSON.stringify(e.bindings)===JSON.stringify(DEFAULT_BINDINGS),'reset no restauró exactamente los controles base');
    });
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
    check('Menús principales tienen hitboxes ordenados, visibles y sin solaparse',()=>{
      const within=(r:{x:number;y:number;w:number;h:number})=>r.x>=0&&r.y>=0&&r.w>0&&r.h>0&&r.x+r.w<=UI_BASE_WIDTH&&r.y+r.h<=CANVAS_HEIGHT;
      const overlap=(a:{x:number;y:number;w:number;h:number},b:{x:number;y:number;w:number;h:number})=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
      const menu=Array.from({length:8},(_,i)=>mainMenuRect(i,false));
      assert(menu.every(within),'opción de menú fuera del canvas');
      for(let i=0;i<menu.length;i++){
        assert(mainMenuHit(menu[i].x+menu[i].w/2,menu[i].y+menu[i].h/2,false)===i,'hitbox principal no coincide con su tarjeta');
        for(let j=i+1;j<menu.length;j++)assert(!overlap(menu[i],menu[j]),'opciones principales solapadas');
      }
      const pause=Array.from({length:7},(_,i)=>pauseRect(i));
      assert(pause.every(within),'opción de pausa fuera del canvas');
      assert(pause[0].w>pause[1].w,'reanudar no ocupa la fila principal');
      for(let i=0;i<pause.length;i++)for(let j=i+1;j<pause.length;j++)assert(!overlap(pause[i],pause[j]),'opciones de pausa solapadas');
      assert(within(BACK_BUTTON)&&within(PRIMARY_BUTTON),'acciones inferiores fuera del canvas');
    });
    check('Ajustes mantienen controles dentro de cada fila y grupos completos',()=>{
      assert(SETTING_ROWS.length===12,'cantidad de ajustes inesperada');
      assert(SETTING_ROWS.slice(0,4).every(r=>r.group==='AUDIO'),'audio dejó de estar agrupado');
      assert(SETTING_ROWS[6].group==='VIDEO'&&SETTING_ROWS[7].group==='VIDEO','video dejó de estar agrupado');
      assert(SETTING_ROWS[11].key==='controls','controles ya no cierra la columna de sistema');
      for(let i=0;i<SETTING_ROWS.length;i++){
        const row=settingsRect(i);
        assert(row.x>=0&&row.y>=0&&row.x+row.w<=UI_BASE_WIDTH&&row.y+row.h<=CANVAS_HEIGHT,'fila de ajustes fuera del canvas');
        if(['vol','shake','brightness'].includes(SETTING_ROWS[i].kind)){
          for(const control of [settingsMinusRect(i),settingsPlusRect(i)])assert(inside(control.x+1,control.y+1,row)&&inside(control.x+control.w-1,control.y+control.h-1,row),'stepper fuera de su fila');
        }else{
          const action=settingsActionRect(i);
          assert(inside(action.x+1,action.y+1,row)&&inside(action.x+action.w-1,action.y+action.h-1,row),'acción fuera de su fila');
        }
      }
      const a=endActionRect(0),b=endActionRect(1);
      assert(a.y===b.y&&a.x+a.w<b.x,'acciones finales no quedaron en una fila limpia');
    });
    check('El cursor actualiza la dirección de apuntado sin disparar',()=>{
      const e=setup();
      e.player.x=120;e.player.y=120;e.player.vx=0;e.player.vy=0;e.mouseDown=false;
      e.mouseX=e.player.x+107;e.mouseY=e.player.y+8;
      tick(e);
      assert(Math.abs(e.player.facingAngle)<.08,'cursor a la derecha no orientó el arma a la derecha');
      e.mouseX=e.player.x+7;e.mouseY=e.player.y-92;
      tick(e);
      assert(Math.abs(e.player.facingAngle+Math.PI/2)<.08,'cursor arriba no orientó el arma hacia arriba');
      e.keys={a:true};e.mouseX=e.player.x+107;e.mouseY=e.player.y+8;
      tick(e);
      assert(Math.abs(e.player.facingAngle)<.08,'movimiento contrario anuló la dirección del cursor');
    });
    check('Las 11 skins renderizan locomoción, combate, dash, apuntado y muerte en cuatro direcciones',()=>{
      assert(SKINS.length===11,'roster cosmético inesperado');
      for(const skin of SKINS){
        for(const dir of ['up','down','left','right'] as const){
          drawDuckSkin(ctx,80,80,120,skin.id,dir,false,false,false,false,false,true);
          drawDuckSkin(ctx,80,80,126,skin.id,dir,true,false,false,false,false,false);
          drawDuckSkin(ctx,80,80,132,skin.id,dir,true,false,false,true,false,true);
          drawDuckSkin(ctx,80,80,138,skin.id,dir,true,false,true,false,false,true);
          drawDuckSkin(ctx,80,80,144,skin.id,dir,false,true,false,false,false,false);
          drawDuckSkin(ctx,80,80,150,skin.id,dir,false,false,false,false,true,false);
        }
      }
    });
    check('Cada skin conserva una identidad visual propia y datos de arte completos',()=>{
      assert(new Set(SKINS.map(s=>s.overlay)).size===SKINS.length,'dos skins comparten overlay principal');
      assert(new Set(SKINS.map(s=>[s.palette.body,s.accent,s.trim,s.metal].join(':'))).size===SKINS.length,'dos skins comparten firma cromática');
      assert(SKINS.every(s=>!!s.accent&&!!s.trim&&!!s.metal),'skin sin colores de identidad');
      assert(SKINS.every(s=>s.description.length>=45),'skin sin descripción visual suficiente');
    });
    check('Props, puertas y proyectiles rediseñados renderizan sin excepción',()=>{
      const art=document.createElement('canvas');art.width=480;art.height=352;
      const a=art.getContext('2d')!;
      for(const style of ['normal','gold','green','orange','boss','purple'] as const){
        drawDoor(a,32,32,'N',style,true,0,120);
        drawDoor(a,64,32,'E',style,false,.8,140);
      }
      for(let kind=0;kind<OBSTACLES.length;kind++)drawObstacle(a,32+(kind%7)*36,96+Math.floor(kind/7)*40,kind,180);
      drawChest(a,80,180,false,180);drawChest(a,112,180,true,180);
      drawPedestal(a,160,180,180,false,'#e6c56f');
      drawShopPigeon(a,220,180,180);
      drawCrumbCluster(a,244,170,180,16,true);
      drawCoin(a,270,180,180,false,true);drawCoin(a,290,180,180,true,true);
      drawBankKey(a,310,174,180,16,true);
      drawCrumbCluster(a,338,174,180,12,false);
      drawCoin(a,365,181,180,true,false);
      drawBankKey(a,386,175,180,14,false);
      for(const type of ['pistol_round','buckshot_player','enemy_bullet','pistol','buckshot','drone_shot','coin_proj','toast','dough_ball'])drawProjectile(a,320,180,type,180);
      for(const type of ['hit','spark','smoke','crumb','coin','feather'])drawParticle(a,360,180,type,.7,'#e6c56f');
    });
    check('Sistema visual Duck Heist renderiza componentes base sin excepción',()=>{
      const uiCanvas=document.createElement('canvas');uiCanvas.width=480;uiCanvas.height=352;
      const uiCtx=uiCanvas.getContext('2d')!;
      for(const [accent,i] of [['#e6c56f',0],['#79b9d2',1],['#d85d58',2],['#78c99a',3]] as const){
        drawMenuBackdrop(uiCtx,120+i*13,.92,accent);
        drawMenuHeader(uiCtx,'DUCK HEIST','Prueba de jerarquía visual.',120+i*13,accent,'VAULT OPS');
        drawMenuCard(uiCtx,36,82,408,72,i===1,accent,'rgba(8,20,26,.96)');
        drawMouseButton(uiCtx,'ACCIÓN',168,178,144,30,i===2,accent,i===2,false);
      }
    });
    check('Atmósferas de los seis sectores renderizan sin filtros costosos',()=>{
      const art=document.createElement('canvas');art.width=480;art.height=352;
      const artCtx=art.getContext('2d')!;
      for(const deco of ['lobby','security','storage','bakery','vault','golden']){
        artCtx.clearRect(0,0,480,352);
        drawRoomAtmosphere(artCtx,deco,180,deco==='golden');
      }
    });
    check('Catálogo contiene 120 props únicos distribuidos en seis pisos',()=>{
      assert(FLOOR_PROP_NAMES.length===6,'se esperaban seis pisos de props');
      assert(FLOOR_PROP_NAMES.every(row=>row.length===OBSTACLES_PER_FLOOR),'cada piso debe tener 20 objetos');
      assert(OBSTACLES.length===120,'el catálogo destructible no llegó a 120 objetos');
      assert(new Set(OBSTACLES).size===OBSTACLES.length,'hay nombres de props duplicados');
      const legacy=['desk','barrier','shelf','moneybag','crate','column','safe','rubble','deposit_lockers','briefcase','cash_tray','value_cart','archive_cabinet','armored_case'];
      for(const old of legacy)assert(!OBSTACLES.includes(old),`sobrevivió prop antiguo: ${old}`);
      for(let floor=0;floor<6;floor++)for(let slot=0;slot<OBSTACLES_PER_FLOOR;slot++){
        const kind=floor*OBSTACLES_PER_FLOOR+slot;
        assert(obstacleFloorTier(kind)===floor,`tier incorrecto en ${OBSTACLES[kind]}`);
      }
    });
    check('Objetos de pisos altos siempre son más caros que su equivalente inferior',()=>{
      for(let slot=0;slot<OBSTACLES_PER_FLOOR;slot++){
        let previous=0;
        for(let floor=0;floor<6;floor++){
          const kind=floor*OBSTACLES_PER_FLOOR+slot,value=obstacleValue(kind);
          assert(value>previous,`valor no crece por piso en ${OBSTACLES[kind]}`);
          previous=value;
        }
      }
      assert(obstacleValue(5*OBSTACLES_PER_FLOOR+13)>obstacleValue(13),'jaula soberana no supera al piso inicial');
    });
    check('Hitboxes de los 120 props quedan dentro del tile y la cobertura permite ocultarse detrás',()=>{
      let coverCount=0;
      for(let kind=0;kind<OBSTACLES.length;kind++){
        const r=obstacleHitbox(kind,64,96);
        assert(r.w>0&&r.h>0,`hitbox vacío ${OBSTACLES[kind]}`);
        assert(r.x>=64&&r.y>=96&&r.x+r.w<=96&&r.y+r.h<=128,`hitbox fuera del tile ${OBSTACLES[kind]}`);
        assert(r.y>100,`base sin espacio para pasar detrás ${OBSTACLES[kind]}`);
        if(obstacleOccludes(kind)){
          coverCount++;
          const cover=obstacleCoverRect(kind,64,96);
          assert(cover.x>=64&&cover.y>=96&&cover.x+cover.w<=96&&cover.y+cover.h<=128,`zona de ocultamiento fuera del tile ${OBSTACLES[kind]}`);
          assert(cover.y<r.y&&cover.y+cover.h>=r.y,`zona de ocultamiento no alcanza la base ${OBSTACLES[kind]}`);
        }
      }
      assert(coverCount>=72,'hay muy pocos props altos que funcionen como cobertura visual');
    });
    check('Los 120 props mantienen destrucción rápida pero los pisos altos resisten un poco más',()=>{
      assert(OBSTACLE_DURABILITY.length===OBSTACLES.length,'faltan resistencias de objetos');
      assert(OBSTACLE_DURABILITY.every(d=>d.hp>=6&&d.hp<=63),'objeto con resistencia fuera de rango');
      assert(Math.max(...OBSTACLE_DURABILITY.map(d=>d.hp))<=63,'ningún prop debe exigir más de 9 impactos de la pistola inicial');
      for(let slot=0;slot<OBSTACLES_PER_FLOOR;slot++){
        const low=obstacleMaxHp(slot),high=obstacleMaxHp(5*OBSTACLES_PER_FLOOR+slot);
        assert(high>=low,`el prop premium quedó más débil: ${OBSTACLES[5*OBSTACLES_PER_FLOOR+slot]}`);
      }
      assert(obstacleMaxHp(15)<obstacleMaxHp(19),'silla debería romperse antes que servidor');
      assert(obstacleMaxHp(3)<obstacleMaxHp(13),'tote debería romperse antes que jaula de valores');
    });
    check('Generador sólo coloca props del piso correspondiente',()=>{
      for(let floor=0;floor<6;floor++){
        const room:MapRoom={gx:0,gy:0,type:RoomType.COMBAT,doors:['N','S'],visited:false,cleared:false,generated:false,layout:[],distance:2,floorIndex:floor};
        for(const template of ROOM_TEMPLATES){
          const layout=generateRoomLayout(room,()=>.37,template);
          for(const row of layout)for(const tile of row){
            if(tile<OBSTACLE_BASE)continue;
            const kind=tile-OBSTACLE_BASE;
            assert(obstacleFloorTier(kind)===floor,`template ${template} mezcló props de otro piso`);
          }
        }
      }
    });
    check('Generación normal usa layouts bancarios del piso correspondiente',()=>{
      for(let floor=0;floor<6;floor++){
        const room:MapRoom={gx:2,gy:-1,type:RoomType.COMBAT,doors:['N','S','E','W'],visited:false,cleared:false,generated:false,layout:[],distance:3,floorIndex:floor};
        generateRoomLayout(room,()=>.42);
        assert(BANK_ROOM_TEMPLATES_BY_FLOOR[floor].includes(room.template as never),`piso ${floor+1} usó layout fuera de su zona bancaria: ${room.template}`);
        assert(BANK_ROOM_TEMPLATES.includes(room.template as never),`layout ${room.template} no está registrado como bancario`);
      }
    });
    check('Layouts bancarios conservan corredores de puerta y centro libres',()=>{
      for(let floor=0;floor<6;floor++)for(const template of BANK_ROOM_TEMPLATES_BY_FLOOR[floor]){
        const room:MapRoom={gx:1,gy:1,type:RoomType.COMBAT,doors:['N','S','E','W'],visited:false,cleared:false,generated:false,layout:[],distance:2,floorIndex:floor};
        const layout=generateRoomLayout(room,()=>.41,template);
        const cx=Math.floor(layout[0].length/2),cy=Math.floor(layout.length/2);
        for(let x=1;x<layout[0].length-1;x++)assert(layout[cy][x]<OBSTACLE_BASE,`${template} bloqueó corredor horizontal`);
        for(let y=1;y<layout.length-1;y++)assert(layout[y][cx]<OBSTACLE_BASE,`${template} bloqueó corredor vertical`);
      }
    });
    check('Sala inicial también se amuebla como banco sin bloquear accesos',()=>{
      const room:MapRoom={gx:0,gy:0,type:RoomType.START,doors:['N','E','S'],visited:false,cleared:false,generated:false,layout:[],distance:0,floorIndex:0};
      const layout=generateRoomLayout(room,()=>.2);
      const props=layout.flat().filter(v=>v>=OBSTACLE_BASE);
      assert(props.length>=4,'START sigue pareciendo una sala vacía');
      assert(room.template==='bankLobby','START no usa recepción bancaria');
      const cx=Math.floor(layout[0].length/2),cy=Math.floor(layout.length/2);
      assert(layout[cy][cx]<OBSTACLE_BASE,'START bloqueó el centro');
    });
    check('Daño de escenario persiste y al romper libera el tile',()=>{
      const e=setup(),room=e.map.rooms.get(e.currentKey)!,content=e.contents.get(e.currentKey)!;
      const tx=5,ty=5,kind=6,max=obstacleMaxHp(kind);
      room.layout[ty][tx]=OBSTACLE_BASE+kind;
      content.obstacleHp={};
      const brokeEarly=damageObstacleTile(e,room,content,tx,ty,max*.4);
      assert(!brokeEarly,'objeto resistente se rompió demasiado pronto');
      const remaining=obstacleHpAt(content,kind,tx,ty);
      assert(remaining<max&&remaining>0,'daño no persistió');
      const broke=damageObstacleTile(e,room,content,tx,ty,max);
      assert(broke,'objeto no se destruyó al agotar resistencia');
      assert(room.layout[ty][tx]<OBSTACLE_BASE,'tile destruido sigue siendo sólido');
    });
    check('Disparos enemigos dañan la cobertura destructible',()=>{
      const e=setup(),room=e.map.rooms.get(e.currentKey)!,content=e.contents.get(e.currentKey)!;
      const tx=7,ty=5,kind=1,max=obstacleMaxHp(kind);
      room.layout[ty][tx]=OBSTACLE_BASE+kind;
      content.obstacleHp={};
      const hit=obstacleHitbox(kind,tx*32,ty*32);
      e.projectiles.push({
        x:hit.x-2,y:hit.y+hit.h/2,vx:3,vy:0,type:'enemy_bullet',damage:1,friendly:false,
        lifetime:20,maxLifetime:20,bounces:0,piercing:false,boomerang:false,boomerangPhase:0,
        hitEnemies:new Set(),burning:false,explode:0,focusTarget:-1,focusTime:0,
      });
      tick(e);
      assert(obstacleHpAt(content,kind,tx,ty)<max,'proyectil enemigo no dañó el prop');
    });
    check('Estados visuales de daño de los 120 props renderizan sin excepción',()=>{
      for(let kind=0;kind<OBSTACLES.length;kind++){
        drawObstacle(ctx,32+(kind%7)*36,40+Math.floor(kind/7)*44,kind,180,1);
        drawObstacle(ctx,32+(kind%7)*36,40+Math.floor(kind/7)*44,kind,180,.55);
        drawObstacle(ctx,32+(kind%7)*36,40+Math.floor(kind/7)*44,kind,180,.2);
      }
    });
    check('Las 20 familias de props y los 6 pisos recorren el nuevo renderer',()=>{
      for(let tier=0;tier<6;tier++)for(let family=0;family<20;family++){
        const kind=tier*20+family;
        drawObstacle(ctx,64+family*2,64+tier*3,kind,240+tier*17,1);
      }
    });
    check('Props físicos especiales tienen colisión y botín de suelo no',()=>{
      const content:RoomContent={
        enemies:[],pickups:[{x:10,y:10,type:'crumb',value:1,lifetime:300}],
        items:[{x:20,y:20,itemId:'quack_blaster',isWeapon:true,isActive:false}],
        puddles:[],airStrikes:[],doorAnim:{},lockFlash:0,combatTimer:0,ambient:0,magnet:0,
        chest:{x:180,y:140,opened:false},
        pedestal:{x:230,y:140,itemId:'hot_sauce',isWeapon:false,taken:false},
        choices:[{x:280,y:140,itemId:'hot_sauce',isWeapon:false,taken:false}],
        event:{kind:'safe',x:320,y:140,used:false,selected:0,message:''},
        shopItems:[{itemId:'hot_sauce',cost:10,sold:false,isWeapon:false,x:210,y:230}],
        cafe:true,
        stairs:{x:120,y:120,unlocked:true,glow:1},
      };
      const rects=specialSolidRects(RoomType.GUN_VAN,content);
      const kinds=new Set(rects.map(r=>r.kind));
      const expected=['chest','pedestal','choice','event','shop_stand','gun_van','cafe_counter'] as const;
      for(const kind of expected)assert(kinds.has(kind),`falta colisión ${kind}`);
      assert(rects.length===7,'coleccionables o escalera se volvieron sólidos');
    });
    check('Pedestal: base física y alcance exterior coherentes',()=>{
      const ped={x:220,y:150};
      const hit=pedestalHitbox(ped),use=pedestalInteractPoint(ped);
      assert(hit.x===217&&hit.y===177&&hit.w===30&&hit.h===8,'hitbox de pedestal desalineado');
      assert(use.x===232&&use.y===168,'punto de interacción incorrecto');
      const below={x:232,y:194};
      assert(Math.hypot(below.x-use.x,below.y-use.y)<PEDESTAL_INTERACT_RADIUS,'no se puede recoger desde abajo fuera de colisión');
      assert(!(below.x>=hit.x&&below.x<hit.x+hit.w&&below.y>=hit.y&&below.y<hit.y+hit.h),'punto de interacción quedó dentro de colisión');
    });


    check('Llaves bancarias: costos, consumo único y café',()=>{
      const itemDoor={type:RoomType.ITEM,template:undefined,keyUnlocked:false};
      const secretDoor={type:RoomType.SECRET,template:undefined,keyUnlocked:false};
      const cafeDoor={type:RoomType.EVENT,template:'cafe',keyUnlocked:false};
      const eventDoor={type:RoomType.EVENT,template:'event',keyUnlocked:false};
      assert(specialRoomKeyCost(itemDoor)===1,'ITEM no cuesta 1 llave');
      assert(specialRoomKeyCost(secretDoor)===2,'SECRET no cuesta 2 llaves');
      assert(specialRoomKeyCost(cafeDoor)===1,'CAFÉ no cuesta 1 llave');
      assert(specialRoomKeyCost(eventDoor)===0,'EVENT normal quedó bloqueado');
      const wallet={bankKeys:1};
      const opened=tryUnlockSpecialRoom(itemDoor,wallet);
      assert(opened.ok&&opened.cost===1&&wallet.bankKeys===0&&itemDoor.keyUnlocked,'no abrió/consumió correctamente');
      const second=tryUnlockSpecialRoom(itemDoor,wallet);
      assert(second.ok&&second.cost===0&&wallet.bankKeys===0,'cobró dos veces la misma puerta');
      const denied=tryUnlockSpecialRoom(secretDoor,wallet);
      assert(!denied.ok&&denied.cost===2&&wallet.bankKeys===0&&!secretDoor.keyUnlocked,'SECRET abrió sin llaves');
    });
    check('Economía de llaves protege mala suerte y frena acumulación',()=>{
      const combat={type:RoomType.COMBAT,modifier:undefined};
      const alarm={type:RoomType.COMBAT,modifier:'alarm' as const};
      const mini={type:RoomType.MINIBOSS,modifier:undefined};
      assert(bankKeyDropChance(combat,0,0)>=.12,'probabilidad base demasiado baja');
      assert(bankKeyDropChance(alarm,0,0)>bankKeyDropChance(combat,0,0),'modificador no mejora drop');
      assert(bankKeyDropChance(combat,0,4)===1,'pity no garantiza llave');
      assert(bankKeyDropChance(combat,3,0)<bankKeyDropChance(combat,0,0),'no reduce inflación con 3 llaves');
      assert(bankKeyDropChance(mini,2,0)===1,'minijefe no garantiza llave con inventario bajo');
      assert(bankKeyDropChance(mini,3,0)<1,'minijefe sigue inflando inventario alto');
    });
    check('Llave del suelo se recoge aunque la vida esté llena',()=>{
      const e=setup(),content=e.contents.get(e.currentKey)!;
      e.player.hp=e.player.maxHp;e.player.bankKeys=0;
      content.pickups.push({x:e.player.x+7,y:e.player.y+8,type:'bank_key',value:1,lifetime:99999});
      tick(e,2);
      assert(e.player.bankKeys===1,'llave no recogida');
      assert(!content.pickups.some(p=>p.type==='bank_key'),'llave permaneció en suelo');
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
      const e=mapFixture(),v=visibleRoomKeys(e);assert(v.size===4&&v.has('-1,0')&&v.has('1,0')&&v.has('0,1'),'primera frontera incorrecta');
      assert(!v.has('2,0')&&!v.has(e.map.bossKey)&&!v.has('1,-1'),'filtró información distante');
    });
    check('Los secretos requieren descubrimiento explícito',()=>{
      const e=mapFixture();e.player.items=['vault_map'];assert(!visibleRoomKeys(e).has('1,-1'),'plano reveló secreto');
      e.map.rooms.get('1,-1')!.revealed=true;assert(visibleRoomKeys(e).has('1,-1'),'secreto descubierto oculto');
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
        if(SPECIAL_ENEMIES.has(id)){
          for(const charge of [0,.35,.8])drawTacticalEnemy(ctx,id,40,40,120,false,.4,charge);
          continue;
        }
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
    check('Estados de daño, carga y recuperación de enemigos no rompen render',()=>{
      for(const id of ['policia_pato','policia_rapido','policia_escopeta','policia_antidisturbios','dron_policial','guard_goose','toaster_turret','rolling_bagel']){
        const def=ENEMIES[id];assert(!!def,id+' sin definición');
      }
      drawPoliciaEscopeta(ctx,80,80,180,true,1,.95);
      drawPoliciaAntidisturbios(ctx,110,80,180,true,{x:1,y:0},true,true);
      drawDronPolicial(ctx,140,80,180,true);
      drawRollingBagel(ctx,170,80,180,true);
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
      assert(bossPartsFor('toaster_9000').filter(p=>p.kind==='reactor').length===2,'Dron de asalto sin reactores independientes');
      const finalParts=bossPartsFor('bread_banker');
      assert(finalParts.length===5,'Jefe final sin cinco módulos destructibles');
      assert(finalParts.filter(p=>p.kind==='turret').length===2,'Jefe final sin drones destruibles');
      assert(finalParts.some(p=>p.id==='vault_core'&&p.exposedPhase===1),'núcleo final sin exposición por fase');
    });
    check('Jefe final renderiza sus módulos intactos y destruidos en las tres fases',()=>{
      const def=BOSSES.bread_banker;
      const alive=bossPartsFor('bread_banker');
      const broken=alive.map(p=>({...p,hp:0,destroyed:true}));
      for(let phase=0;phase<3;phase++){
        drawBoss(ctx,80,80,'bread_banker',260+phase*7,def.hp,def.hp,false,phase,.65,alive,phase,0,20);
        drawBoss(ctx,80,80,'bread_banker',280+phase*7,def.hp,def.hp,false,phase,.65,broken,phase,0,20);
      }
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
    check('Subjefes y jefes icónicos tienen coreografía propia por fase',()=>{
      const ids=['captain_honk','comisario_pico_duro','toaster_9000','general_ganso','don_levadura','director_seguridad','head_baker','el_auditor','ganso_antidisturbios','cajero_3000'];
      for(const id of ids){
        const def=BOSSES[id]??SUBBOSSES[id];
        assert(!!def,'encuentro icónico ausente: '+id);
        assert(def.phaseAttackPlan?.length===def.phases,'plan de fases incompleto: '+id);
        def.phaseAttackPlan!.forEach((plan,phase)=>{
          const maxAttack=2+phase;
          assert(plan.length>=3,'fase sin rotación suficiente: '+id+' p'+phase);
          assert(plan.every(atk=>Number.isInteger(atk)&&atk>=0&&atk<=maxAttack),'ataque fuera de rango: '+id+' p'+phase);
          if(phase>0)assert(plan[0]===maxAttack,'la fase no abre con su ataque nuevo: '+id+' p'+phase);
        });
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
    check('Los 145 encuentros renderizan telegraph, recuperación y daño crítico',()=>{
      const all=[...Object.values(MINIBOSSES),...Object.values(SUBBOSSES),...Object.values(BOSSES)];
      for(const b of all){
        const phase=Math.max(0,b.phases-1);
        const step=2;
        drawBoss(ctx,72,72,b.id,170,b.hp*.32,b.hp,false,phase,.78,b.legacy?bossPartsFor(b.id):undefined,step,0,14);
        drawBoss(ctx,72,72,b.id,181,b.hp*.18,b.hp,false,phase,0,b.legacy?bossPartsFor(b.id):undefined,undefined,9,14);
      }
      assert(all.length===145,'catálogo incompleto durante prueba de pose/daño');
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
    check('Nuevos props bancarios aparecen en plantillas dedicadas',()=>{
      const expected:Record<string,number[]>={
        depositLockers:[8],
        valueCarts:[10,11],
        archiveCabinets:[12],
        transferCases:[9],
      };
      for(const [template,kinds] of Object.entries(expected)){
        const room:MapRoom={gx:0,gy:0,type:RoomType.COMBAT,doors:['N','S','E','W'],visited:false,cleared:false,generated:false,distance:2,floorIndex:4,layout:[]};
        const layout=generateRoomLayout(room,()=>.4,template);
        const ids=new Set(layout.flat().filter(v=>v>=OBSTACLE_BASE).map(v=>v-OBSTACLE_BASE));
        for(const kind of kinds)assert(ids.has(kind),`${template} no genera ${OBSTACLES[kind]}`);
      }
    });
    for(let floor=0;floor<6;floor++) for(const template of ROOM_TEMPLATES)check(`Plantilla ${floor}/${template}`,()=>{
      const room:MapRoom={gx:0,gy:0,type:RoomType.COMBAT,doors:['N','S','E','W'],visited:false,cleared:false,generated:false,distance:1,floorIndex:floor,layout:[]};
      room.layout=generateRoomLayout(room,()=>.4,template);
      assert(room.layout[1][7]===0&&room.layout[9][7]===0&&room.layout[5][1]===0&&room.layout[5][13]===0,'entrada obstruida');
    });
  } finally {setAudioTestMode(false);setVolumes(.8,.35,.85);}
  return report;
}