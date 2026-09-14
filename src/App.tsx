import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createEngine, startGame, beginHeist, updateEngine, menuMove, buyUpgrade, saveSettings,getContentOf,
  handleDash, handleActiveItem, cycleWeapon, confirmSwap, cancelSwap, confirmActiveSwap,
  selectSwapSlot, adjustSetting, SETTING_ROWS, wardrobeAction, ensureSkinVisible,selectEventOption,
  CANVAS_WIDTH, CANVAS_HEIGHT, GameState,
  type GameEngine,
} from './game/engine';
import { renderWorld, renderUI } from './game/render';
import { initAudio, setMusic, playUiSelect, playUiBack, playUiMove } from './game/audio';
import { MAIN_MENU, PAUSE_MENU, mainMenuHit, WARDROBE, WARDROBE_ACTION, wardrobeHit, swapHit, SETTINGS, inside, COLLECTION, activeSwapHit } from './game/layout';
import { toggleFloorMap, openFloorMap, closeFloorMap, inspectMapDirection, mapHit, mapClick, focusMapDestination } from './game/floorMap';
import { GamepadInput, type PadAction } from './game/gamepad';
import { getBuild } from './game/itemRules';
import { COLLECTION_TABS, collectionEntries } from './game/catalog';
import { collectionMove, collectionTab, collectionClick } from './game/collectionUI';
import { SKINS, BOSSES } from './game/data';
import { runSelfChecks, type CheckReport } from './game/selftest';

const MENU_TOP=MAIN_MENU.y,MENU_H=MAIN_MENU.h,MENU_GAP=MAIN_MENU.gap,MENU_W=MAIN_MENU.w;
const PAUSE_TOP=PAUSE_MENU.y,PAUSE_H=PAUSE_MENU.h,PAUSE_GAP=PAUSE_MENU.gap,PAUSE_W=PAUSE_MENU.w;
const OVER_TOP = CANVAS_HEIGHT - 62, OVER_H = 22, OVER_GAP = 4, OVER_W = 200;

export default function App() {
  const worldRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rafRef = useRef<number>(0);
  const [, force] = useState(0);
  const [hint, setHint] = useState('');
  const [cursor, setCursor] = useState<'crosshair' | 'default'>('default');
  const [audit,setAudit]=useState<CheckReport|null>(null);

  /** Escala entera para el canvas de mundo + supersampling para la UI */
  const computeScale = useCallback(() => {
    const availW = window.innerWidth - 52;
    const availH = window.innerHeight - 88;
    const fit=Math.min(availW/CANVAS_WIDTH,availH/CANVAS_HEIGHT);
    let css=Math.max(.6,Math.min(fit,3));
    const eng = engineRef.current;
    if (eng) css = Math.max(.6, Math.min(css, eng.settings.uiScale + 1));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    return { css, ui: Math.max(1, Math.min(6,Math.ceil(css * dpr))) };
  }, []);

  useEffect(() => {
    const wc = worldRef.current, uc = uiRef.current;
    if (!wc || !uc) return;

    wc.width = CANVAS_WIDTH;
    wc.height = CANVAS_HEIGHT;
    const wctx = wc.getContext('2d', { alpha: false })!;
    const uctx = uc.getContext('2d')!;
    wctx.imageSmoothingEnabled = false;
    if(new URLSearchParams(window.location.search).get('auditoria')==='1') {
      const report=runSelfChecks();setAudit(report);
      (window as Window & {duckHeistAudit?:CheckReport}).duckHeistAudit=report;
    }

    const engine = createEngine(wc, wctx, uctx);
    engineRef.current = engine;
    engine.onStateChange = () => {
      force(n => n + 1);
      setHint(hintFor(engine));
      setCursor(engine.state === GameState.PLAYING ? 'crosshair' : 'default');
    };

    const applySize = () => {
      const { css, ui } = computeScale();
      const wrap = wrapRef.current;
      if (wrap) {
        wrap.style.width = `${CANVAS_WIDTH * css}px`;
        wrap.style.height = `${CANVAS_HEIGHT * css}px`;
      }
      for (const c of [wc, uc]) {
        (c as HTMLCanvasElement).style.width = `${CANVAS_WIDTH * css}px`;
        (c as HTMLCanvasElement).style.height = `${CANVAS_HEIGHT * css}px`;
      }
      uc.width = CANVAS_WIDTH * ui;
      uc.height = CANVAS_HEIGHT * ui;
      engine.uiScale = ui;
      engine.scale = css;
    };
    applySize();
    setHint(hintFor(engine));
    window.addEventListener('resize', applySize);

    // fuerza la carga de las tipografías antes del primer texto en canvas
    if ('fonts' in document) {
      const ready = (document as Document & { fonts: FontFaceSet }).fonts;
      Promise.all([
        ready.load('700 16px "Bungee"'),
        ready.load('600 12px "Chakra Petch"'),
        ready.load('700 12px "Chakra Petch"'),
      ]).then(() => ready.ready).then(() => force(n => n + 1)).catch(() => undefined);
    }

    // ------------------------------------------------------------------
    // ENTRADA
    // ------------------------------------------------------------------
    const goTo = (s: GameState) => {
      engine.state=s;engine.mouseDown=false;engine.keys={};
      engine.onStateChange?.(s);
      if(s===GameState.PLAYING) setMusic(getContentOf(engine).enemies.some(e=>e.isBoss&&BOSSES[e.bossType])?'boss':'run',engine.map.floorIndex);
    };
    let subReturn: GameState = GameState.MENU;

    const inSwap = () => !!engine.swap;

    const activateMenu = () => {
      playUiSelect();
      initAudio();
      switch (engine.menuIndex) {
        case 0: beginHeist(engine); break;
        case 1: engine.upgradeIndex = 0; subReturn = GameState.MENU; goTo(GameState.UPGRADES); break;
        case 2: engine.wardrobeIndex=SKINS.findIndex(s=>s.id===engine.equippedSkin);ensureSkinVisible(engine);subReturn=GameState.MENU;goTo(GameState.WARDROBE);break;
        case 3: subReturn=GameState.MENU;goTo(GameState.COLLECTION);break;
        case 4: subReturn = GameState.MENU; goTo(GameState.HOW_TO_PLAY); break;
        case 5: engine.settingsIndex = 0; subReturn = GameState.MENU; goTo(GameState.SETTINGS); break;
      }
    };
    const activatePause = () => {
      switch (engine.pauseIndex) {
        case 0: playUiSelect(); goTo(GameState.PLAYING); break;
        case 1: openFloorMap(engine); break;
        case 2: playUiSelect(); startGame(engine); break;
        case 3: playUiSelect(); subReturn = GameState.PAUSED; goTo(GameState.HOW_TO_PLAY); break;
        case 4: playUiSelect(); engine.settingsIndex = 0; subReturn = GameState.PAUSED; goTo(GameState.SETTINGS); break;
        case 5: playUiBack(); engine.menuIndex = 0; setMusic('menu'); goTo(GameState.MENU); break;
      }
    };
    const activateEnd = () => {
      playUiSelect();
      if (engine.pauseIndex === 0) startGame(engine);
      else { engine.menuIndex = 0; setMusic('menu'); goTo(GameState.MENU); }
    };

    const onKeyDown = (e: KeyboardEvent,fromGamepad=false) => {
      if(e.ctrlKey || e.metaKey || e.altKey) return;
      engine.lastInput=fromGamepad?'gamepad':'keyboard';
      initAudio();if(engine.state===GameState.MENU) setMusic('menu');
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'r', 'm', 'escape', 'enter', '1', '2'].includes(k)) {
        e.preventDefault();
      }
      if (e.repeat && k !== 'r') return;
      if(k==='m') {toggleFloorMap(engine);return;}
      if(engine.state===GameState.MAP) {
        if(k==='escape') closeFloorMap(engine);
        else if(k==='w'||k==='arrowup') inspectMapDirection(engine,'N');
        else if(k==='s'||k==='arrowdown') inspectMapDirection(engine,'S');
        else if(k==='a'||k==='arrowleft') inspectMapDirection(engine,'W');
        else if(k==='d'||k==='arrowright') inspectMapDirection(engine,'E');
        else if(getBuild(engine.player).gps&&['1','2','3'].includes(k)) focusMapDestination(engine,(['shop','boss','stairs'] as const)[Number(k)-1]);
        return;
      }
      engine.keys[k] = true;

      const up = k === 'w' || k === 'arrowup';
      const down = k === 's' || k === 'arrowdown';
      const left = k === 'a' || k === 'arrowleft';
      const right = k === 'd' || k === 'arrowright';
      const yes = k === 'enter' || k === ' ';

      if (k === 'f' && !e.ctrlKey && !e.metaKey && !inSwap()) {
        toggleFullscreen(engine, applySize);
        return;
      }

      // --- MENÚ DE REEMPLAZO DE ARMA (prioridad máxima en juego) ---
      if (engine.activeSwap) {
        if (yes || k === 'e') confirmActiveSwap(engine);
        else if (k === 'escape') cancelSwap(engine);
        return;
      }
      if (inSwap()) {
        if (k === '1') selectSwapSlot(engine, 0);
        else if (k === '2') selectSwapSlot(engine, 1);
        else if (left || up) selectSwapSlot(engine, engine.swapSel === 0 ? 1 : 0);
        else if (right || down) selectSwapSlot(engine, engine.swapSel === 0 ? 1 : 0);
        else if (yes || k === 'e') confirmSwap(engine);
        else if (k === 'escape') cancelSwap(engine);
        return;
      }

      switch (engine.state) {
        case GameState.MENU:
          if (up) menuMove(engine, -1, 6, 'menu');
          else if (down) menuMove(engine, 1, 6, 'menu');
          else if (yes) activateMenu();
          break;
        case GameState.HEIST_INTRO:
          if(yes && engine.heistIntroSeen) engine.heistIntroTimer=1;
          break;
        case GameState.COLLECTION: {
          const tab=COLLECTION_TABS.findIndex(t=>t.id===engine.collectionTab);
          if(k==='escape') goTo(subReturn);
          else if(k==='a') collectionTab(engine,tab-1);
          else if(k==='d' || k==='tab') {e.preventDefault();collectionTab(engine,tab+1);}
          else if(up) collectionMove(engine,-4);
          else if(down) collectionMove(engine,4);
          else if(left) collectionMove(engine,-1);
          else if(right) collectionMove(engine,1);
          break;
        }
        case GameState.HOW_TO_PLAY:
          if (yes || k === 'escape') { playUiBack(); goTo(subReturn); }
          break;
        case GameState.WARDROBE:
          if (k === 'escape') { playUiBack(); goTo(subReturn); }
          else if (up) menuMove(engine, -3, SKINS.length, 'wardrobe');
          else if (down) menuMove(engine, 3, SKINS.length, 'wardrobe');
          else if (left) menuMove(engine, -1, SKINS.length, 'wardrobe');
          else if (right) menuMove(engine, 1, SKINS.length, 'wardrobe');
          else if (yes) wardrobeAction(engine);
          break;
        case GameState.SETTINGS: {
          const n = SETTING_ROWS.length;
          if (up) menuMove(engine, -1, n, 'settings');
          else if (down) menuMove(engine, 1, n, 'settings');
          else if (left || right) {
            if(SETTING_ROWS[engine.settingsIndex].key==='fullscreen') toggleFullscreen(engine,applySize);
            else adjustSetting(engine,engine.settingsIndex,right?1:-1);
          }
          else if (yes) {
            const row = SETTING_ROWS[engine.settingsIndex];
            if (row.key === 'fullscreen') toggleFullscreen(engine, applySize);
            else if (row.kind === 'bool') adjustSetting(engine, engine.settingsIndex, 1);
            else adjustSetting(engine, engine.settingsIndex, 1);
          } else if (k === 'escape') { playUiBack(); goTo(subReturn); }
          break;
        }
        case GameState.UPGRADES:
          if (up) menuMove(engine, -1, 4, 'upgrade');
          else if (down) menuMove(engine, 1, 4, 'upgrade');
          else if (yes) buyUpgrade(engine, engine.upgradeIndex);
          else if (k === 'escape') { playUiBack(); goTo(subReturn); }
          break;
        case GameState.PLAYING:
          if (k === 'escape') { engine.pauseIndex = 0; goTo(GameState.PAUSED); setMusic('menu'); }
          else if (k === 'shift') handleDash(engine);
          else if (k === ' ') handleActiveItem(engine);
          else if (k === '1' && !selectEventOption(engine,0)) selectWeaponDirect(engine, 0);
          else if (k === '2' && !selectEventOption(engine,1)) selectWeaponDirect(engine, 1);
          break;
        case GameState.PAUSED:
          if (k === 'escape') { playUiBack(); goTo(GameState.PLAYING); }
          else if (up) menuMove(engine, -1, PAUSE_MENU.count, 'pause');
          else if (down) menuMove(engine, 1, PAUSE_MENU.count, 'pause');
          else if (k === 'enter') activatePause();
          break;
        case GameState.GAME_OVER:
        case GameState.VICTORY:
          if (k === 'enter') activateEnd();
          else if (k === '1') { engine.pauseIndex = 0; activateEnd(); }
          else if (k === '2') { engine.pauseIndex = 1; activateEnd(); }
          else if (up || left) { engine.pauseIndex = 0; playUiMoveSafe(); }
          else if (down || right) { engine.pauseIndex = 1; playUiMoveSafe(); }
          else if (k === 'escape') { playUiBack(); engine.menuIndex = 0; goTo(GameState.MENU); setMusic('menu'); }
          break;
        default: break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { engine.keys[e.key.toLowerCase()] = false; };

    // La rueda cambia el arma en juego y desplaza las listas de interfaz.
    const onWheel = (e: WheelEvent) => {
      engine.lastInput='keyboard';
      e.preventDefault();
      if (inSwap()) { selectSwapSlot(engine, engine.swapSel === 0 ? 1 : 0); return; }
      if (engine.state === GameState.MENU) {
        menuMove(engine, e.deltaY > 0 ? 1 : -1, 6, 'menu');
        return;
      }
      if (engine.state === GameState.WARDROBE) {
        const max=Math.ceil(SKINS.length/3)*(WARDROBE.cellH+WARDROBE.gap)-WARDROBE.gap-WARDROBE.h;
        engine.wardrobeScrollTarget=Math.max(0,Math.min(max,engine.wardrobeScrollTarget+e.deltaY/engine.scale));
        return;
      }
      if(engine.state===GameState.COLLECTION) {
        const max=Math.max(0,Math.ceil(collectionEntries(engine.collectionTab).length/4)*64-8-COLLECTION.h);
        engine.collectionScroll=Math.max(0,Math.min(max,engine.collectionScroll+e.deltaY/engine.scale));
        return;
      }
      if (engine.state !== GameState.PLAYING) return;
      if (Math.abs(e.deltaY) < 2) return;
      cycleWeapon(engine, e.deltaY > 0 ? 1 : -1);
    };

    const toWorld = (ev: MouseEvent) => {
      const r = wc.getBoundingClientRect();
      return {
        x: (ev.clientX - r.left) * (CANVAS_WIDTH / r.width),
        y: (ev.clientY - r.top) * (CANVAS_HEIGHT / r.height),
      };
    };
    const onMove = (ev: MouseEvent) => {
      const p = toWorld(ev);
      engine.mouseX = p.x; engine.mouseY = p.y;
      if(Math.abs(ev.movementX)+Math.abs(ev.movementY)>1)engine.lastInput='keyboard';
      if(engine.state===GameState.MAP) {mapHit(engine,p.x,p.y);return;}
      if(engine.swap) {const hit=swapHit(p.x,p.y);if(hit>=0&&hit!==engine.swapSel) selectSwapSlot(engine,hit);return;}
      // micro-interacción: el puntero también navega las listas
      const st = engine.state;
      if (st === GameState.MENU || st === GameState.PAUSED || st === GameState.GAME_OVER || st === GameState.VICTORY) {
        const top = st === GameState.MENU ? MENU_TOP : st === GameState.PAUSED ? PAUSE_TOP : OVER_TOP;
        const cnt = st === GameState.MENU ? 6 : st === GameState.PAUSED ? PAUSE_MENU.count : 2;
        const h = st === GameState.MENU ? MENU_H : st === GameState.PAUSED ? PAUSE_H : OVER_H;
        const g = st === GameState.MENU ? MENU_GAP : st === GameState.PAUSED ? PAUSE_GAP : OVER_GAP;
        const w = st === GameState.MENU ? MENU_W : st === GameState.PAUSED ? PAUSE_W : OVER_W;
        const i=st===GameState.MENU?mainMenuHit(p.x,p.y):hitList(p.x,p.y,top,cnt,h,g,w);
        if (i >= 0) {
          if (st === GameState.MENU) { if (engine.menuIndex !== i) { engine.menuIndex = i; softMove(); } }
          else if (st === GameState.PAUSED) { if (engine.pauseIndex !== i) { engine.pauseIndex = i; softMove(); } }
          else { if (engine.pauseIndex !== i) { engine.pauseIndex = i; softMove(); } }
        }
      } else if (st === GameState.SETTINGS) {
        let hit = -1;
        SETTING_ROWS.forEach((_, i) => {
          if(inside(p.x,p.y,{...SETTINGS,y:SETTINGS.y+i*(SETTINGS.h+SETTINGS.gap)})) hit=i;
        });
        if (hit >= 0 && engine.settingsIndex !== hit) { engine.settingsIndex = hit; softMove(); }
      } else if (st === GameState.UPGRADES) {
        let hit = -1;
        for (let i = 0; i < 4; i++) {
          const by = 82 + i * 44;
          if (p.y > by - 12 && p.y < by + 28) hit = i;
        }
        if (hit >= 0 && engine.upgradeIndex !== hit) { engine.upgradeIndex = hit; softMove(); }
      }
    };
    let lastMoveSound = 0;
    const softMove = () => {
      const now = performance.now();
      if (now - lastMoveSound > 40) { lastMoveSound = now; playUiMove(); }
      force(n => n + 1);
    };

    const hitList = (x: number, y: number, top: number, count: number, h: number, gap: number, w: number) => {
      for (let i = 0; i < count; i++) {
        const by = top + i * (h + gap);
        if (x > CANVAS_WIDTH / 2 - w / 2 - 4 && x < CANVAS_WIDTH / 2 + w / 2 + 4 && y > by - 3 && y < by + h + 3) return i;
      }
      return -1;
    };

    const onDown = (ev: MouseEvent) => {
      engine.lastInput='keyboard';
      initAudio();
      // El clic derecho solo activa el esquive.
      if (ev.button === 2) {
        ev.preventDefault();
        if (engine.state === GameState.PLAYING && !inSwap()) {
          engine.mouseDown=false;engine.player.shootFlash=0;
          handleDash(engine);
        }
        return;
      }

      // Sólo procesamos click izquierdo para interactuar / disparar
      if (ev.button !== 0) return;

      const { x, y } = toWorld(ev);
      engine.mouseX=x;engine.mouseY=y;
      if(engine.state===GameState.MAP) {if(y>316) closeFloorMap(engine);else mapClick(engine,x,y);return;}
      if (engine.activeSwap) {
        const hit = activeSwapHit(x, y);
        if (hit === 'confirm') confirmActiveSwap(engine);
        else if (hit === 'cancel' || hit === -1) cancelSwap(engine);
        return;
      }
      if (inSwap()) {
        const hit=swapHit(x,y);
        if(hit>=0) {selectSwapSlot(engine,hit);confirmSwap(engine);}
        return;
      }
      if (engine.state === GameState.PLAYING) { engine.mouseDown = true; return; }
      switch (engine.state) {
        case GameState.MENU: {
          setMusic('menu');const i=mainMenuHit(x,y);
          if (i >= 0) { engine.menuIndex = i; activateMenu(); }
          break;
        }
        case GameState.COLLECTION:collectionClick(engine,x,y);break;
        case GameState.PAUSED: {
          const i = hitList(x, y, PAUSE_TOP, PAUSE_MENU.count, PAUSE_H, PAUSE_GAP, PAUSE_W);
          if (i >= 0) { engine.pauseIndex = i; activatePause(); }
          break;
        }
        case GameState.GAME_OVER:
        case GameState.VICTORY: {
          const i = hitList(x, y, OVER_TOP, 2, OVER_H, OVER_GAP, OVER_W);
          if (i >= 0) { engine.pauseIndex = i; activateEnd(); }
          break;
        }
        case GameState.SETTINGS: {
          let hit = -1;
          SETTING_ROWS.forEach((_, i) => {
            if(inside(x,y,{...SETTINGS,y:SETTINGS.y+i*(SETTINGS.h+SETTINGS.gap)})) hit=i;
          });
          if (hit >= 0) {
            engine.settingsIndex = hit;
            const row = SETTING_ROWS[hit];
            if (row.key === 'fullscreen') toggleFullscreen(engine, applySize);
            else adjustSetting(engine, hit, x > CANVAS_WIDTH / 2 ? 1 : -1);
          } else { playUiBack(); goTo(subReturn); }
          break;
        }
        case GameState.UPGRADES: {
          let hit = -1;
          for (let i = 0; i < 4; i++) {
            const by = 82 + i * 44;
            if (y > by - 12 && y < by + 28) hit = i;
          }
          if (hit >= 0) { engine.upgradeIndex = hit; buyUpgrade(engine, hit); }
          else { playUiBack(); goTo(subReturn); }
          break;
        }
        case GameState.WARDROBE: {
          if (inside(x,y,WARDROBE_ACTION)) {
            wardrobeAction(engine);
            return;
          }
          const hit=wardrobeHit(x,y,engine.wardrobeScroll,SKINS.length);
          if(hit>=0) {engine.wardrobeIndex=hit;softMove();}
          if(y>318) {playUiBack();goTo(subReturn);}
          break;
        }
        case GameState.HOW_TO_PLAY:
          playUiBack(); goTo(subReturn);
          break;
        default: break;
      }
    };
    const onUp = (ev: MouseEvent) => {
      if (ev.button === 0) engine.mouseDown = false;
    };
    const padInput=new GamepadInput();
    const onBlur = () => {engine.keys={};engine.mouseDown=false;padInput.reset(engine);if(engine.state===GameState.PLAYING)goTo(GameState.PAUSED);};
    const onCtx = (ev: Event) => ev.preventDefault();

    const playUiMoveSafe = () => { try { playUiBack(); } catch { /* silencioso */ } };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mouseup', onUp);
    wc.addEventListener('wheel', onWheel, { passive: false });
    uc.addEventListener('wheel', onWheel, { passive: false });
    wc.addEventListener('mousemove', onMove);
    uc.addEventListener('mousemove', onMove);
    wc.addEventListener('mousedown', onDown);
    uc.addEventListener('mousedown', onDown);
    wc.addEventListener('contextmenu', onCtx);
    uc.addEventListener('contextmenu', onCtx);

    // ------------------------------------------------------------------
    // BUCLE
    // ------------------------------------------------------------------
    let last = performance.now();
    const step = 1000 / 60;
    let lastUiScale = engine.settings.uiScale;
    let lastBrightness=-1;
    let lastDevice=engine.lastInput;
    const padAction=(action:PadAction)=>{
      if(action==='previousWeapon'||action==='nextWeapon'){cycleWeapon(engine,action==='nextWeapon'?1:-1);return;}
      const key:Record<Exclude<PadAction,'previousWeapon'|'nextWeapon'>,string>={
        map:'m',pause:'Escape',dash:'Shift',active:' ',interact:'e',back:'Escape',confirm:'Enter',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',
      };
      if(action==='left'||action==='right'){
        if(engine.state===GameState.COLLECTION){collectionTab(engine,COLLECTION_TABS.findIndex(t=>t.id===engine.collectionTab)+(action==='right'?1:-1));return;}
      }
      onKeyDown(new KeyboardEvent('keydown',{key:key[action]}),true);
      if(action!=='interact')engine.keys[key[action].toLowerCase()]=false;
    };
    const onFsChange = () => {
      engine.settings.fullscreen = !!document.fullscreenElement;
      saveSettings(engine);
      applySize();
    };
    document.addEventListener('fullscreenchange', onFsChange);

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const delta = ts - last;
      if (delta < step) return;
      last = ts - (delta % step);
      if(document.hasFocus())padInput.poll(engine,padAction,ts);
      if(lastDevice!==engine.lastInput){lastDevice=engine.lastInput;setHint(hintFor(engine));}

      // La escala elegida en configuración se aplica al instante.
      if (engine.settings.uiScale !== lastUiScale) {
        lastUiScale = engine.settings.uiScale;
        applySize();
      }
      if(lastBrightness!==engine.settings.brightness) {lastBrightness=engine.settings.brightness;wc.style.filter=`brightness(${lastBrightness})`;}

      const st = engine.state;
      const live = st === GameState.PLAYING || st === GameState.FLOOR_INTRO ||
        st === GameState.BOSS_INTRO || st === GameState.FLOOR_CLEAR || st===GameState.HEIST_INTRO;
      if (live) updateEngine(engine);
      else if(st===GameState.MAP) engine.mapView.frame++;
      else engine.frame++;
      engine.wardrobeScroll+=(engine.wardrobeScrollTarget-engine.wardrobeScroll)*.22;

      const wctx2 = engine.ctx;
      wctx2.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      renderWorld(engine);

      const u = engine.ui;
      if (u) {
        u.setTransform(1, 0, 0, 1, 0, 0);
        u.clearRect(0, 0, uc.width, uc.height);
        renderUI(engine);
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      setMusic('off');
      padInput.reset(engine);
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', applySize);
      wc.removeEventListener('wheel', onWheel);
      uc.removeEventListener('wheel', onWheel);
      wc.removeEventListener('mousemove', onMove);
      uc.removeEventListener('mousemove', onMove);
      wc.removeEventListener('mousedown', onDown);
      uc.removeEventListener('mousedown', onDown);
      wc.removeEventListener('contextmenu', onCtx);
      uc.removeEventListener('contextmenu', onCtx);
    };
  }, [computeScale]);

  const toggleFs = () => {
    const eng = engineRef.current;
    if (!eng) return;
    toggleFullscreen(eng, () => {
      const e = engineRef.current; if (!e) return;
      e.settings.fullscreen = !!document.fullscreenElement;
      saveSettings(e);
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04050b] text-[#c3cbd9] flex flex-col items-center justify-center select-none"
      style={{ backgroundImage: 'radial-gradient(120% 90% at 50% -10%, #14203d 0%, #0a0e1c 45%, #05060c 100%)' }}>
      {/* ambiente: monedas y migas flotando tras la consola */}
      <Ambient />
      <div ref={wrapRef} className="relative z-10"
        style={{ width: CANVAS_WIDTH * 2, height: CANVAS_HEIGHT * 2, cursor }}>
        <canvas ref={worldRef} aria-hidden="true" className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'pixelated' }} />
        <canvas ref={uiRef} role="application" aria-label="Duck Heist. Usa WASD para moverte, flechas o clic izquierdo para disparar, clic derecho o Shift para esquivar, E para interactuar, M para el mapa y Escape para pausar." tabIndex={0} className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'auto',outline:'none' }} />
        <div className="pointer-events-none absolute -inset-3 rounded-[2px] border border-[#2f3644]" />
        <div className="pointer-events-none absolute -inset-6 rounded-[3px] border border-[#161c2a]" />
      </div>
      <div className="relative z-10 mt-6 flex max-w-[94vw] items-center gap-4 text-[10px] tracking-[0.12em] font-semibold uppercase">
        <span className="hidden text-[#6a817f] md:block">{hint}</span>
        <button onClick={toggleFs}
          className="pointer-events-auto text-[#7c8494] hover:text-[#f4d03f] transition-colors border border-transparent hover:border-[#f4d03f]/40 px-2 py-0.5">
          Pantalla completa · F
        </button>
      </div>
      {audit && <details className="fixed bottom-2 left-2 z-50 max-h-[40vh] max-w-[94vw] overflow-auto border border-[#5b7b72] bg-[#0c1b22] p-3 text-xs">
        <summary className="cursor-pointer text-[#e7d196]">Auditoría: {audit.passed} comprobaciones correctas · {audit.failures.length} fallos · {audit.manifest.count} objetos</summary>
        {audit.failures.map(f=><p key={f} className="my-1 text-red-300">{f}</p>)}
        <p className="mt-2">No se modifican tus datos guardados.</p>
        <table><thead><tr><th>ID</th><th>Categoría</th><th>Sprite</th><th>Efecto</th></tr></thead><tbody>{audit.manifest.entries.map(i=><tr key={i.id}><td className="pr-3">{i.id}</td><td className="pr-3">{i.category}</td><td className="pr-3">{i.sprite}</td><td>{i.effect}</td></tr>)}</tbody></table>
      </details>}
    </div>
  );
}

function selectWeaponDirect(engine: GameEngine, i: number) {
  if (engine.player.weapons[i]) {
    if (engine.player.activeWeapon === i) return;
    engine.player.activeWeapon = i;
    engine.player.switchAnim = 12;
    engine.player.fireCooldown = Math.max(engine.player.fireCooldown, 6);
    try { playUiSelect(); } catch { /* silencioso */ }
  }
}

function toggleFullscreen(engine: GameEngine, after: () => void) {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.().then(after).catch(() => undefined);
    else void document.exitFullscreen?.().then(after).catch(() => undefined);
    engine.settings.fullscreen = !document.fullscreenElement;
    saveSettings(engine);
  } catch { /* no soportado */ }
}

function hintFor(engine: GameEngine): string {
  if(engine.lastInput==='gamepad')return 'PALANCA IZQUIERDA · MOVER  RT · DISPARAR  B · ESQUIVAR  A · INTERACTUAR  Y · OBJETO  VIEW · MAPA  START · PAUSA';
  switch (engine.state) {
    case GameState.MENU: return 'W / S elegir · ENTER confirmar · rueda también vale';
    case GameState.PLAYING: return 'WASD mover · MOUSE / FLECHAS disparar · RUEDA cambiar arma · SHIFT esquivar · E interactuar · M mapa';
    case GameState.MAP:return 'MAPA · Combate en pausa · WASD / FLECHAS / MOUSE inspeccionar · M / ESC cerrar';
    case GameState.PAUSED: return 'ESC continuar · flechas navegar';
    default: return 'ENTER confirmar · ESC volver';
  }
}

/** Migas y monedas ambientales detrás de la consola */
function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const bits = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(),
      s: 0.4 + Math.random() * 1.6, v: 0.00018 + Math.random() * 0.0006,
      gold: Math.random() < 0.28, ph: Math.random() * 6.28,
    }));
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    let t = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      t++;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.y -= b.v;
        if (b.y < -0.02) b.y = 1.02;
        const x = b.x * c.width + Math.sin(t * 0.008 + b.ph) * 14;
        const y = b.y * c.height;
        ctx.globalAlpha = b.gold ? 0.4 + Math.sin(t * 0.03 + b.ph) * 0.25 : 0.18;
        ctx.fillStyle = b.gold ? '#f4d03f' : '#8a7f6a';
        ctx.fillRect(x, y, b.s, b.s);
      }
      // barrido de luz tipo bóveda
      ctx.globalAlpha = 0.05;
      const g = ctx.createLinearGradient(0, 0, c.width, c.height);
      const p = (t * 0.0012) % 1;
      g.addColorStop(Math.max(0, p - 0.12), 'rgba(244,208,63,0)');
      g.addColorStop(p, 'rgba(244,208,63,0.5)');
      g.addColorStop(Math.min(1, p + 0.12), 'rgba(244,208,63,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 z-0 opacity-70" />;
}
