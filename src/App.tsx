import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createEngine, beginHeist, updateEngine, menuMove, buyUpgrade, saveSettings,getContentOf,
  restartCurrentMode, abandonCurrentRun, moveEndlessReward, confirmEndlessReward, recycleEndlessRewards, recycleNearestEndlessFloorItem,
  resumeEndlessGame, clearEndlessCheckpoint,
  handleDash, handleActiveItem, cycleWeapon, confirmSwap, cancelSwap, confirmActiveSwap,
  selectSwapSlot, adjustSetting, SETTING_ROWS, wardrobeAction, ensureSkinVisible,selectEventOption,
  DIFFICULTY_MODES, selectDifficulty,
  CANVAS_WIDTH, CANVAS_HEIGHT, GameState,
  type GameEngine,
} from './game/engine';
import { renderWorld, renderUI } from './game/render';
import { initAudio, setMusic, playUiSelect, playUiBack, playUiMove } from './game/audio';
import {
  mainMenuHit, difficultyRect, DIFFICULTY_START, BACK_BUTTON, PRIMARY_BUTTON,
  PAUSE_MENU, pauseRect, CONFIRM_RECTS, WARDROBE, WARDROBE_ACTION, wardrobeHit, swapHit, SWAP_CANCEL,
  settingsRect, settingsMinusRect, settingsPlusRect, settingsActionRect,
  upgradeRect, upgradeActionRect, endlessResumeRect, ENDLESS_SECONDARY,
  inside, COLLECTION, COLLECTION_CAREER, CONTROLS_RESET, MAP_CLOSE, HUD_MENU, activeSwapHit, endlessRewardHit, endActionHit,
} from './game/layout';
import { toggleFloorMap, openFloorMap, closeFloorMap, inspectMapDirection, mapHit, mapClick, focusMapDestination } from './game/floorMap';
import { GamepadInput, type PadAction } from './game/gamepad';
import { getBuild } from './game/itemRules';
import { COLLECTION_TABS } from './game/catalog';
import { collectionMove, collectionTab, collectionClick, collectionViewEntries, cycleCollectionFilter, cycleCollectionSort } from './game/collectionUI';
import { CONTROL_ROWS, remapBinding, keyLabel } from './game/controls';
import { controlsHit, resetControls } from './game/controlsUI';
import { careerClick, careerTab } from './game/careerUI';
import { SKINS, BOSSES } from './game/data';
import { runSelfChecks, type CheckReport } from './game/selftest';
import { refreshDailyRuntime } from './game/dailyChallenge';
import { UI_OFFSET_X, UI_BASE_WIDTH } from './game/constants';


export default function App() {
  const worldRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rafRef = useRef<number>(0);
  const [, force] = useState(0);
  const [hint, setHint] = useState('');
  const [cursor, setCursor] = useState<'crosshair' | 'default' | 'pointer'>('pointer');
  const [audit,setAudit]=useState<CheckReport|null>(null);

  /** Escala responsive exacta del release aprobado v0.4.3. */
  const computeScale = useCallback(() => {
    const viewport=window.visualViewport;
    const vw=Math.max(1,viewport?.width ?? window.innerWidth);
    const vh=Math.max(1,viewport?.height ?? window.innerHeight);
    const fullscreen=!!document.fullscreenElement;
    const rootStyle=getComputedStyle(document.documentElement);
    const cssVar=(name:string)=>parseFloat(rootStyle.getPropertyValue(name))||0;
    const safeX=cssVar('--duck-safe-left')+cssVar('--duck-safe-right');
    const safeY=cssVar('--duck-safe-top')+cssVar('--duck-safe-bottom');
    const padX=fullscreen?0:Math.max(2,Math.min(8,vw*.006));
    const padY=fullscreen?0:Math.max(2,Math.min(7,vh*.008));
    const footer=fullscreen?0:vh<440?18:24;
    const availW=Math.max(1,vw-safeX-padX*2);
    const availH=Math.max(1,vh-safeY-padY*2-footer);
    const eng=engineRef.current;
    const maxScale=fullscreen?8:eng?Math.max(1.25,Math.min(7,eng.settings.uiScale+3)):7;
    const widthScale=availW/CANVAS_WIDTH;
    const heightScale=availH/CANVAS_HEIGHT;

    // Fullscreen usa un único factor XY y modo "cover": llena ancho Y alto sin
    // deformar sprites ni UI. Si sobra una franja mínima por la cuantización a
    // tiles impares, se recorta simétricamente fuera del viewport en vez de
    // mostrar bandas del shell.
    const css=fullscreen
      ? Math.max(.2,widthScale,heightScale)
      : Math.max(.2,Math.min(widthScale,heightScale,maxScale));
    const displayW=Math.max(1,fullscreen?Math.ceil(CANVAS_WIDTH*css):Math.floor(CANVAS_WIDTH*css));
    const displayH=Math.max(1,fullscreen?Math.ceil(CANVAS_HEIGHT*css):Math.floor(CANVAS_HEIGHT*css));
    const dpr=Math.max(1,Math.min(2.25,window.devicePixelRatio||1));
    return {displayW,displayH,css,ui:Math.max(1,Math.min(6,Math.ceil(css*dpr)))};
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
    if(new URLSearchParams(window.location.search).get('auditoria')==='1'){
      engine.testing=true;
      (window as Window & {duckHeistEngine?:GameEngine}).duckHeistEngine=engine;
    }
    engineRef.current = engine;
    engine.onStateChange = () => {
      force(n => n + 1);
      setHint(hintFor(engine));
      setCursor(engine.state === GameState.PLAYING ? 'crosshair' : 'pointer');
    };

    const applySize = () => {
      const {displayW,displayH,css,ui}=computeScale();
      const wrap=wrapRef.current;
      if(wrap){wrap.style.width=`${displayW}px`;wrap.style.height=`${displayH}px`;}
      for(const c of [wc,uc]) {c.style.width=`${displayW}px`;c.style.height=`${displayH}px`;c.style.imageRendering='pixelated';}
      const uiW=CANVAS_WIDTH*ui,uiH=CANVAS_HEIGHT*ui;
      if(uc.width!==uiW)uc.width=uiW;if(uc.height!==uiH)uc.height=uiH;
      engine.uiScale=ui;engine.scale=css;
    };
    let resizeRaf=0;
    const scheduleSize=()=>{if(resizeRaf)cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;applySize();});};
    applySize();
    setHint(hintFor(engine));
    window.addEventListener('resize',scheduleSize,{passive:true});
    window.addEventListener('orientationchange',scheduleSize,{passive:true});
    window.visualViewport?.addEventListener('resize',scheduleSize,{passive:true});
    window.visualViewport?.addEventListener('scroll',scheduleSize,{passive:true});

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
    const moveDifficulty=(dir:number)=>{engine.difficultyIndex=(engine.difficultyIndex+dir+DIFFICULTY_MODES.length)%DIFFICULTY_MODES.length;playUiMove();force(n=>n+1);};
    const activateDifficulty=()=>{if(selectDifficulty(engine,engine.difficultyIndex)){playUiSelect();beginHeist(engine);}};

    const activateMenu = () => {
      playUiSelect();
      initAudio();
      switch (engine.menuIndex) {
        case 0: engine.pendingMode='heist';engine.difficultyIndex=Math.max(0,DIFFICULTY_MODES.indexOf(engine.difficulty));goTo(GameState.DIFFICULTY); break;
        case 1:
          engine.pendingMode='endless';
          if(engine.endlessCheckpointRound>0){engine.endlessResumeIndex=0;goTo(GameState.ENDLESS_RESUME);}
          else {engine.difficultyIndex=Math.max(0,DIFFICULTY_MODES.indexOf(engine.difficulty));goTo(GameState.DIFFICULTY);}
          break;
        case 2:
          refreshDailyRuntime(engine);engine.pendingMode='daily';goTo(GameState.DAILY_BRIEF);break;
        case 3: engine.upgradeIndex = 0; subReturn = GameState.MENU; goTo(GameState.UPGRADES); break;
        case 4: engine.wardrobeIndex=SKINS.findIndex(s=>s.id===engine.equippedSkin);ensureSkinVisible(engine);subReturn=GameState.MENU;goTo(GameState.WARDROBE);break;
        case 5: subReturn=GameState.MENU;goTo(GameState.COLLECTION);break;
        case 6: subReturn = GameState.MENU; goTo(GameState.HOW_TO_PLAY); break;
        case 7: engine.settingsIndex = 0; subReturn = GameState.MENU; goTo(GameState.SETTINGS); break;
      }
    };
    const openConfirm=(kind:GameEngine['confirmKind'])=>{
      engine.confirmKind=kind;engine.confirmIndex=1;engine.confirmReturnState=engine.state;playUiSelect();goTo(GameState.CONFIRM);
    };
    const cancelConfirm=()=>{
      const back=engine.confirmReturnState;
      engine.confirmKind=null;engine.confirmIndex=1;playUiBack();goTo(back);
    };
    const executeConfirm=()=>{
      const kind=engine.confirmKind;engine.confirmKind=null;engine.confirmIndex=1;playUiSelect();
      if(kind==='restart'){restartCurrentMode(engine);return;}
      if(kind==='quit'){abandonCurrentRun(engine);engine.menuIndex=0;setMusic('menu');goTo(GameState.MENU);return;}
      if(kind==='new_endless'){
        clearEndlessCheckpoint(engine);
        engine.difficultyIndex=Math.max(0,DIFFICULTY_MODES.indexOf(engine.difficulty));
        goTo(GameState.DIFFICULTY);
      }
    };
    const activatePause = () => {
      switch (engine.pauseIndex) {
        case 0: playUiSelect(); goTo(GameState.PLAYING); break;
        case 1:
          if(engine.gameMode==='endless'){engine.runInfoTab=1;playUiSelect();goTo(GameState.RUN_INFO);}
          else openFloorMap(engine);
          break;
        case 2: engine.runInfoTab=0;playUiSelect();goTo(GameState.RUN_INFO); break;
        case 3: openConfirm('restart'); break;
        case 4: playUiSelect(); subReturn = GameState.PAUSED; goTo(GameState.HOW_TO_PLAY); break;
        case 5: playUiSelect(); engine.settingsIndex = 0; subReturn = GameState.PAUSED; goTo(GameState.SETTINGS); break;
        case 6: openConfirm('quit'); break;
      }
    };
    const activateEnd = () => {
      playUiSelect();
      if (engine.pauseIndex === 0) restartCurrentMode(engine);
      else { engine.menuIndex = 0; setMusic('menu'); goTo(GameState.MENU); }
    };

    const onKeyDown = (e: KeyboardEvent,fromGamepad=false) => {
      if(e.ctrlKey || e.metaKey || e.altKey) return;
      engine.lastInput=fromGamepad?'gamepad':'keyboard';
      initAudio();if(engine.state===GameState.MENU) setMusic('menu');
      const k = e.key.toLowerCase();
      const fullscreenEscape = !fromGamepad && k === 'escape' && !!document.fullscreenElement;
      if (!fullscreenEscape && (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'r', 'm', 'tab', 'escape', 'enter', '1', '2'].includes(k) || Object.values(engine.bindings).includes(k))) {
        e.preventDefault();
      }
      if (e.repeat) return;

      // En fullscreen, el primer ESC pertenece exclusivamente al navegador:
      // sale de pantalla completa sin navegar/pausar también el juego.
      // El siguiente ESC ya ejecuta la navegación universal de Duck Heist.
      if (fullscreenEscape) return;

      // F es un atajo global reservado: funciona también en menús mouse-first
      // y vuelve a salir de fullscreen al pulsarlo de nuevo.
      if (k === 'f' && !fromGamepad) {
        e.preventDefault();
        toggleFullscreen(engine, applySize);
        return;
      }

      if(engine.state===GameState.CONTROLS && engine.controlCapture){
        if(k==='escape'){engine.controlCapture=false;playUiBack();force(n=>n+1);return;}
        if(k==='f'){playUiBack();return;}
        const row=CONTROL_ROWS[engine.controlIndex];
        if(row){remapBinding(engine.bindings,row.id,k);engine.controlCapture=false;saveSettings(engine);playUiSelect();force(n=>n+1);}
        return;
      }

      // ESC es la navegación universal de regreso. Se procesa antes de los menús
      // mouse-first para que funcione en todas las pantallas y también despause.
      if(k==='escape'){
        if(engine.activeSwap || inSwap()){cancelSwap(engine);return;}
        if(engine.state===GameState.MAP){closeFloorMap(engine);return;}
        if(engine.state===GameState.CONFIRM){cancelConfirm();return;}
        if(engine.state===GameState.ENDLESS_REWARD){openConfirm('quit');return;}
        switch(engine.state){
          case GameState.PLAYING:
            engine.pauseIndex=0;playUiBack();goTo(GameState.PAUSED);setMusic('menu');return;
          case GameState.PAUSED:
            playUiBack();goTo(GameState.PLAYING);return;
          case GameState.DAILY_BRIEF:
            playUiBack();engine.pendingMode='heist';goTo(GameState.MENU);return;
          case GameState.DIFFICULTY:
          case GameState.ENDLESS_RESUME:
            playUiBack();goTo(GameState.MENU);return;
          case GameState.COLLECTION:
            playUiBack();goTo(subReturn);return;
          case GameState.CAREER:
            playUiBack();goTo(GameState.COLLECTION);return;
          case GameState.HOW_TO_PLAY:
          case GameState.WARDROBE:
          case GameState.SETTINGS:
          case GameState.UPGRADES:
            playUiBack();goTo(subReturn);return;
          case GameState.CONTROLS:
            playUiBack();goTo(GameState.SETTINGS);return;
          case GameState.RUN_INFO:
            playUiBack();goTo(GameState.PAUSED);return;
          case GameState.GAME_OVER:
          case GameState.VICTORY:
            playUiBack();engine.menuIndex=0;setMusic('menu');goTo(GameState.MENU);return;
          case GameState.MENU:
          default:
            return;
        }
      }

      const mouseOnlyMenu = [
        GameState.MENU,GameState.DAILY_BRIEF,GameState.DIFFICULTY,GameState.MAP,GameState.COLLECTION,GameState.CAREER,
        GameState.HOW_TO_PLAY,GameState.WARDROBE,GameState.SETTINGS,GameState.CONTROLS,GameState.UPGRADES,GameState.ENDLESS_RESUME,
        GameState.ENDLESS_REWARD,GameState.PAUSED,GameState.RUN_INFO,GameState.CONFIRM,GameState.GAME_OVER,GameState.VICTORY,
      ].includes(engine.state);
      if(mouseOnlyMenu)return;

      if(k===engine.bindings.map && (engine.state===GameState.PLAYING||engine.state===GameState.PAUSED)) {if(engine.gameMode!=='endless')toggleFloorMap(engine);return;}
      if(engine.state===GameState.MAP) {
        if(k==='escape'||k===engine.bindings.map) closeFloorMap(engine);
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

      // --- MENÚ DE REEMPLAZO DE ARMA (prioridad máxima en juego) ---
      if (engine.activeSwap) {
        if (yes || k === engine.bindings.interact) confirmActiveSwap(engine);
        else if (k === 'escape') cancelSwap(engine);
        return;
      }
      if (inSwap()) {
        if (k === '1') selectSwapSlot(engine, 0);
        else if (k === '2') selectSwapSlot(engine, 1);
        else if (left || up) selectSwapSlot(engine, engine.swapSel === 0 ? 1 : 0);
        else if (right || down) selectSwapSlot(engine, engine.swapSel === 0 ? 1 : 0);
        else if (yes || k === engine.bindings.interact) confirmSwap(engine);
        else if (k === 'escape') cancelSwap(engine);
        return;
      }

      switch (engine.state) {
        case GameState.MENU:
          if (up) menuMove(engine, -1, 8, 'menu');
          else if (down) menuMove(engine, 1, 8, 'menu');
          else if (yes) activateMenu();
          break;
        case GameState.DAILY_BRIEF:
          if(yes){playUiSelect();beginHeist(engine);}
          else if(k==='escape'){playUiBack();engine.pendingMode='heist';goTo(GameState.MENU);}
          break;
        case GameState.DIFFICULTY:
          if(up) moveDifficulty(-1);
          else if(down) moveDifficulty(1);
          else if(yes) activateDifficulty();
          else if(k==='escape'){playUiBack();goTo(GameState.MENU);}
          break;
        case GameState.HEIST_INTRO:
          if(yes && engine.heistIntroSeen) engine.heistIntroTimer=1;
          break;
        case GameState.COLLECTION: {
          const tab=COLLECTION_TABS.findIndex(t=>t.id===engine.collectionTab);
          if(k==='escape') goTo(subReturn);
          else if(k==='p'){engine.careerTab=0;playUiSelect();goTo(GameState.CAREER);}
          else if(k==='q'){cycleCollectionFilter(engine);playUiMove();}
          else if(k==='e'){cycleCollectionSort(engine);playUiMove();}
          else if(k==='a') collectionTab(engine,tab-1);
          else if(k==='d' || k==='tab') {e.preventDefault();collectionTab(engine,tab+1);}
          else if(up) collectionMove(engine,-4);
          else if(down) collectionMove(engine,4);
          else if(left) collectionMove(engine,-1);
          else if(right) collectionMove(engine,1);
          break;
        }
        case GameState.CAREER:
          if(k==='escape'){playUiBack();goTo(GameState.COLLECTION);}
          else if(left||k==='a'){careerTab(engine,engine.careerTab-1);playUiMove();}
          else if(right||k==='d'||k==='tab'){careerTab(engine,engine.careerTab+1);playUiMove();}
          break;
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
            else if(row.key==='controls'){engine.controlIndex=0;engine.controlCapture=false;playUiSelect();goTo(GameState.CONTROLS);}
            else if (row.kind === 'bool') adjustSetting(engine, engine.settingsIndex, 1);
            else adjustSetting(engine, engine.settingsIndex, 1);
          } else if (k === 'escape') { playUiBack(); goTo(subReturn); }
          break;
        }
        case GameState.CONTROLS:
          if(k==='escape'){playUiBack();goTo(GameState.SETTINGS);}
          else if(k==='r'){resetControls(engine);saveSettings(engine);playUiSelect();}
          else if(up){engine.controlIndex=(engine.controlIndex-1+CONTROL_ROWS.length)%CONTROL_ROWS.length;playUiMove();}
          else if(down){engine.controlIndex=(engine.controlIndex+1)%CONTROL_ROWS.length;playUiMove();}
          else if(left){engine.controlIndex=Math.max(0,engine.controlIndex-8);playUiMove();}
          else if(right){engine.controlIndex=Math.min(CONTROL_ROWS.length-1,engine.controlIndex+8);playUiMove();}
          else if(yes){engine.controlCapture=true;playUiSelect();}
          break;
        case GameState.UPGRADES:
          if (up) menuMove(engine, -1, 4, 'upgrade');
          else if (down) menuMove(engine, 1, 4, 'upgrade');
          else if (yes) buyUpgrade(engine, engine.upgradeIndex);
          else if (k === 'escape') { playUiBack(); goTo(subReturn); }
          break;
        case GameState.ENDLESS_RESUME:
          if(up||left){engine.endlessResumeIndex=0;playUiMove();}
          else if(down||right){engine.endlessResumeIndex=1;playUiMove();}
          else if(yes){
            if(engine.endlessResumeIndex===0){
              playUiSelect();
              if(!resumeEndlessGame(engine)){clearEndlessCheckpoint(engine);engine.difficultyIndex=Math.max(0,DIFFICULTY_MODES.indexOf(engine.difficulty));goTo(GameState.DIFFICULTY);}
            } else {
              openConfirm('new_endless');
            }
          } else if(k==='escape'){playUiBack();goTo(GameState.MENU);}
          break;
        case GameState.ENDLESS_REWARD:
          if(left || up) moveEndlessReward(engine,-1);
          else if(right || down) moveEndlessReward(engine,1);
          else if(k===engine.bindings.recycle) recycleEndlessRewards(engine);
          else if(yes) confirmEndlessReward(engine);
          else if(k==='escape'){openConfirm('quit');}
          break;
        case GameState.PLAYING:
          if (k === engine.bindings.pause) { engine.pauseIndex = 0; goTo(GameState.PAUSED); setMusic('menu'); }
          else if (k === engine.bindings.dash) handleDash(engine);
          else if (k === engine.bindings.active) handleActiveItem(engine);
          else if (k === engine.bindings.recycle && engine.gameMode==='endless') recycleNearestEndlessFloorItem(engine);
          else if (k === engine.bindings.weapon1 && !selectEventOption(engine,0)) selectWeaponDirect(engine, 0);
          else if (k === engine.bindings.weapon2 && !selectEventOption(engine,1)) selectWeaponDirect(engine, 1);
          break;
        case GameState.PAUSED:
          if (k === 'escape') { playUiBack(); goTo(GameState.PLAYING); }
          else if(k==='tab'){engine.runInfoTab=0;playUiSelect();goTo(GameState.RUN_INFO);}
          else if (up) menuMove(engine, -1, PAUSE_MENU.count, 'pause');
          else if (down) menuMove(engine, 1, PAUSE_MENU.count, 'pause');
          else if (yes) activatePause();
          break;
        case GameState.RUN_INFO:
          if(k==='escape'){playUiBack();goTo(GameState.PAUSED);}
          else if(left||k==='a'){engine.runInfoTab=0;playUiMove();}
          else if(right||k==='d'||k==='tab'){engine.runInfoTab=1;playUiMove();}
          break;
        case GameState.CONFIRM:
          if(k==='escape'){cancelConfirm();}
          else if(up||left){engine.confirmIndex=0;playUiMove();}
          else if(down||right){engine.confirmIndex=1;playUiMove();}
          else if(yes){if(engine.confirmIndex===0)executeConfirm();else cancelConfirm();}
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
      if (engine.state === GameState.WARDROBE) {
        const max=Math.ceil(SKINS.length/3)*(WARDROBE.cellH+WARDROBE.gap)-WARDROBE.gap-WARDROBE.h;
        engine.wardrobeScrollTarget=Math.max(0,Math.min(max,engine.wardrobeScrollTarget+e.deltaY/engine.scale));
        return;
      }
      if(engine.state===GameState.COLLECTION) {
        const max=Math.max(0,Math.ceil(collectionViewEntries(engine).length/4)*64-8-COLLECTION.h);
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
    const wideFullscreenMenu=()=>engine.state===GameState.MENU&&!!document.fullscreenElement&&CANVAS_WIDTH>UI_BASE_WIDTH;
    const usesLegacyUiCoordinates=()=>{
      if(wideFullscreenMenu())return false;
      return !!engine.swap||!!engine.activeSwap||[
        GameState.MENU,GameState.DIFFICULTY,GameState.DAILY_BRIEF,GameState.HEIST_INTRO,
        GameState.MAP,GameState.COLLECTION,GameState.CAREER,GameState.HOW_TO_PLAY,
        GameState.WARDROBE,GameState.SETTINGS,GameState.CONTROLS,GameState.UPGRADES,
        GameState.ENDLESS_RESUME,GameState.ENDLESS_REWARD,GameState.PAUSED,GameState.RUN_INFO,
        GameState.CONFIRM,GameState.GAME_OVER,GameState.VICTORY,
      ].includes(engine.state);
    };
    const uiPoint=(p:{x:number;y:number})=>usesLegacyUiCoordinates()?{x:p.x-UI_OFFSET_X,y:p.y}:p;

    const onMove = (ev: MouseEvent) => {
      const raw = toWorld(ev);
      const p = uiPoint(raw);
      engine.mouseX = p.x; engine.mouseY = p.y;
      if(Math.abs(ev.movementX)+Math.abs(ev.movementY)>1)engine.lastInput='keyboard';
      if(engine.state===GameState.PLAYING)setCursor(inside(p.x,p.y,HUD_MENU)?'pointer':'crosshair');
      if(engine.state===GameState.MAP) {mapHit(engine,p.x,p.y);return;}
      if(engine.swap) {const hit=swapHit(p.x,p.y);if(hit>=0&&hit!==engine.swapSel) selectSwapSlot(engine,hit);return;}
      // Hover real: la selección visual sigue exactamente a la geometría clicable.
      const st=engine.state;
      if(st===GameState.MENU){
        const i=mainMenuHit(p.x,p.y,wideFullscreenMenu());if(i>=0&&engine.menuIndex!==i){engine.menuIndex=i;softMove();}
      }else if(st===GameState.DIFFICULTY){
        // La dificultad cambia solo al hacer clic; el hover se dibuja aparte.
      }else if(st===GameState.ENDLESS_RESUME){
        for(let i=0;i<2;i++)if(inside(p.x,p.y,endlessResumeRect(i))&&engine.endlessResumeIndex!==i){engine.endlessResumeIndex=i;softMove();}
      }else if(st===GameState.PAUSED){
        for(let i=0;i<PAUSE_MENU.count;i++)if(inside(p.x,p.y,pauseRect(i))&&engine.pauseIndex!==i){engine.pauseIndex=i;softMove();}
      }else if(st===GameState.CONFIRM){
        CONFIRM_RECTS.forEach((box,i)=>{if(inside(p.x,p.y,box)&&engine.confirmIndex!==i){engine.confirmIndex=i;softMove();}});
      }else if(st===GameState.GAME_OVER||st===GameState.VICTORY){
        const i=endActionHit(p.x,p.y);if(i>=0&&engine.pauseIndex!==i){engine.pauseIndex=i;softMove();}
      } else if(st===GameState.CAREER){
        // Las pestañas cambian con clic, no con hover.
      } else if(st===GameState.CONTROLS){
        CONTROL_ROWS.forEach((_,i)=>{
          const col=i<8?0:1,row=i<8?i:i-8,bx=34+col*210,by=78+row*27;
          if(inside(p.x,p.y,{x:bx,y:by,w:202,h:22})&&engine.controlIndex!==i){engine.controlIndex=i;softMove();}
        });
      } else if(st===GameState.RUN_INFO){
        // La vista cambia únicamente con clic.
      } else if(st===GameState.ENDLESS_REWARD){
        const count=engine.endless.marketOpen?3:engine.endless.rewardOptions.length;
        const hit=endlessRewardHit(p.x,p.y,count);
        if(hit>=0){
          if(engine.endless.marketOpen&&engine.endless.marketIndex!==hit){engine.endless.marketIndex=hit;softMove();}
          else if(!engine.endless.marketOpen&&engine.endless.rewardIndex!==hit){engine.endless.rewardIndex=hit;softMove();}
        }
      } else if(st===GameState.SETTINGS){
        for(let i=0;i<SETTING_ROWS.length;i++)if(inside(p.x,p.y,settingsRect(i))&&engine.settingsIndex!==i){engine.settingsIndex=i;softMove();}
      } else if(st===GameState.UPGRADES){
        for(let i=0;i<4;i++)if(inside(p.x,p.y,upgradeRect(i))&&engine.upgradeIndex!==i){engine.upgradeIndex=i;softMove();}
      }
    };
    let lastMoveSound = 0;
    const softMove = () => {
      const now = performance.now();
      if (now - lastMoveSound > 40) { lastMoveSound = now; playUiMove(); }
      force(n => n + 1);
    };

    const onDown = (ev: MouseEvent) => {
      engine.lastInput='keyboard';
      initAudio();
      // El clic derecho solo activa el esquive.
      if (ev.button === 2) {
        ev.preventDefault();
        if (engine.state === GameState.PLAYING && !inSwap()) {
          // El dash no debe cancelar el disparo izquierdo que siga sostenido.
          handleDash(engine);
        }
        return;
      }

      // Sólo procesamos click izquierdo para interactuar / disparar
      if (ev.button !== 0) return;

      const { x, y } = uiPoint(toWorld(ev));
      engine.mouseX=x;engine.mouseY=y;
      if(engine.state===GameState.MAP){if(inside(x,y,MAP_CLOSE))closeFloorMap(engine);else mapClick(engine,x,y);return;}
      if (engine.activeSwap) {
        const hit = activeSwapHit(x, y);
        if (hit === 'confirm') confirmActiveSwap(engine);
        else if (hit === 'cancel') cancelSwap(engine);
        return;
      }
      if(inSwap()){
        if(inside(x,y,SWAP_CANCEL)){cancelSwap(engine);return;}
        const hit=swapHit(x,y);if(hit>=0){selectSwapSlot(engine,hit);confirmSwap(engine);}return;
      }
      if(engine.state===GameState.PLAYING){
        if(inside(x,y,HUD_MENU)){engine.pauseIndex=0;playUiSelect();goTo(GameState.PAUSED);setMusic('menu');return;}
        engine.mouseDown=true;return;
      }
      switch (engine.state) {
        case GameState.MENU: {
          setMusic('menu');const i=mainMenuHit(x,y,wideFullscreenMenu());
          if(i>=0){engine.menuIndex=i;activateMenu();}
          break;
        }
        case GameState.DAILY_BRIEF:
          if(inside(x,y,PRIMARY_BUTTON)){playUiSelect();beginHeist(engine);}
          else if(inside(x,y,BACK_BUTTON)){playUiBack();engine.pendingMode='heist';goTo(GameState.MENU);}
          break;
        case GameState.ENDLESS_RESUME: {
          if(inside(x,y,BACK_BUTTON)){playUiBack();goTo(GameState.MENU);break;}
          for(let i=0;i<2;i++)if(inside(x,y,endlessResumeRect(i))){
            engine.endlessResumeIndex=i;
            if(i===0){playUiSelect();if(!resumeEndlessGame(engine)){clearEndlessCheckpoint(engine);goTo(GameState.DIFFICULTY);}}
            else openConfirm('new_endless');
            break;
          }
          break;
        }
        case GameState.ENDLESS_REWARD: {
          if(inside(x,y,ENDLESS_SECONDARY)){recycleEndlessRewards(engine);break;}
          const count=engine.endless.marketOpen?3:engine.endless.rewardOptions.length,hit=endlessRewardHit(x,y,count);
          if(hit>=0){if(engine.endless.marketOpen)engine.endless.marketIndex=hit;else engine.endless.rewardIndex=hit;confirmEndlessReward(engine);}
          break;
        }
        case GameState.DIFFICULTY: {
          if(inside(x,y,BACK_BUTTON)){playUiBack();goTo(GameState.MENU);break;}
          if(inside(x,y,DIFFICULTY_START)){activateDifficulty();break;}
          for(let i=0;i<4;i++)if(inside(x,y,difficultyRect(i))){engine.difficultyIndex=i;playUiMove();force(n=>n+1);break;}
          break;
        }
        case GameState.COLLECTION:
          if(inside(x,y,BACK_BUTTON)){playUiBack();goTo(subReturn);}
          else if(inside(x,y,COLLECTION_CAREER)){engine.careerTab=0;playUiSelect();goTo(GameState.CAREER);}
          else collectionClick(engine,x,y);
          break;
        case GameState.CAREER:
          if(inside(x,y,{...BACK_BUTTON,w:136})){playUiBack();goTo(GameState.COLLECTION);}else careerClick(engine,x,y);
          break;
        case GameState.CONTROLS:
          if(inside(x,y,BACK_BUTTON)){engine.controlCapture=false;playUiBack();goTo(GameState.SETTINGS);}
          else if(inside(x,y,CONTROLS_RESET)){resetControls(engine);saveSettings(engine);playUiSelect();force(n=>n+1);}
          else controlsHit(engine,x,y);
          break;
        case GameState.PAUSED:
          for(let i=0;i<PAUSE_MENU.count;i++)if(inside(x,y,pauseRect(i))){engine.pauseIndex=i;activatePause();break;}
          break;
        case GameState.RUN_INFO:
          if(inside(x,y,{...BACK_BUTTON,w:126})){playUiBack();goTo(GameState.PAUSED);}
          else if(inside(x,y,{x:42,y:70,w:190,h:24})){engine.runInfoTab=0;playUiMove();}
          else if(inside(x,y,{x:248,y:70,w:190,h:24})){engine.runInfoTab=1;playUiMove();}
          break;
        case GameState.CONFIRM:
          if(inside(x,y,CONFIRM_RECTS[0])){engine.confirmIndex=0;executeConfirm();}
          else if(inside(x,y,CONFIRM_RECTS[1])){engine.confirmIndex=1;cancelConfirm();}
          break;
        case GameState.GAME_OVER:
        case GameState.VICTORY: {
          const i=endActionHit(x,y);
          if (i >= 0) { engine.pauseIndex = i; activateEnd(); }
          break;
        }
        case GameState.SETTINGS: {
          if(inside(x,y,BACK_BUTTON)){playUiBack();goTo(subReturn);break;}
          let hit=-1;for(let i=0;i<SETTING_ROWS.length;i++)if(inside(x,y,settingsRect(i))){hit=i;break;}
          if(hit<0)break;
          engine.settingsIndex=hit;const row=SETTING_ROWS[hit];
          if(row.kind==='vol'||row.kind==='shake'||row.kind==='scale'||row.kind==='brightness'){
            if(inside(x,y,settingsMinusRect(hit)))adjustSetting(engine,hit,-1);
            else if(inside(x,y,settingsPlusRect(hit)))adjustSetting(engine,hit,1);
          }else if(inside(x,y,settingsActionRect(hit))){
            if(row.key==='fullscreen')toggleFullscreen(engine,applySize);
            else if(row.key==='controls'){engine.controlIndex=0;engine.controlCapture=false;playUiSelect();goTo(GameState.CONTROLS);}
            else adjustSetting(engine,hit,1);
          }
          break;
        }
        case GameState.UPGRADES:
          if(inside(x,y,BACK_BUTTON)){playUiBack();goTo(subReturn);break;}
          for(let i=0;i<4;i++)if(inside(x,y,upgradeRect(i))){
            engine.upgradeIndex=i;if(inside(x,y,upgradeActionRect(i)))buyUpgrade(engine,i);else softMove();break;
          }
          break;
        case GameState.WARDROBE: {
          if (inside(x,y,WARDROBE_ACTION)) {
            wardrobeAction(engine);
            return;
          }
          if(inside(x,y,BACK_BUTTON)){playUiBack();goTo(subReturn);break;}
          const hit=wardrobeHit(x,y,engine.wardrobeScroll,SKINS.length);
          if(hit>=0){engine.wardrobeIndex=hit;softMove();}
          break;
        }
        case GameState.HOW_TO_PLAY:
          if(inside(x,y,BACK_BUTTON)){playUiBack();goTo(subReturn);}
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
    let lastContrast=engine.settings.highContrast;
    let lastDevice=engine.lastInput;
    const padAction=(action:PadAction)=>{
      const live=engine.state===GameState.PLAYING;
      if(!live)return;
      if(action==='previousWeapon'||action==='nextWeapon'){cycleWeapon(engine,action==='nextWeapon'?1:-1);return;}
      const liveKeys:Partial<Record<PadAction,string>>={
        map:engine.bindings.map,pause:engine.bindings.pause,dash:engine.bindings.dash,
        active:engine.bindings.active,interact:engine.bindings.interact,recycle:engine.bindings.recycle,
      };
      const key=liveKeys[action]||'Enter';
      onKeyDown(new KeyboardEvent('keydown',{key}),true);
      if(action!=='interact')engine.keys[key.toLowerCase()]=false;
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
      if(lastBrightness!==engine.settings.brightness||lastContrast!==engine.settings.highContrast) {
        lastBrightness=engine.settings.brightness;lastContrast=engine.settings.highContrast;
        wc.style.filter=`brightness(${lastBrightness}) contrast(${lastContrast?1.08:1})`;
        uc.style.filter=lastContrast?'contrast(1.18) saturate(1.05)':'none';
      }

      const st = engine.state;
      const live = st === GameState.PLAYING || st === GameState.FLOOR_INTRO ||
        st === GameState.BOSS_INTRO || st === GameState.FLOOR_CLEAR || st===GameState.HEIST_INTRO ||
        st===GameState.ENDLESS_REWARD;
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
      window.removeEventListener('resize', scheduleSize);
      window.removeEventListener('orientationchange', scheduleSize);
      window.visualViewport?.removeEventListener('resize',scheduleSize);
      window.visualViewport?.removeEventListener('scroll',scheduleSize);
      if(resizeRaf)cancelAnimationFrame(resizeRaf);
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
    <div className="duck-responsive-shell relative w-screen h-screen overflow-hidden bg-[#04050b] text-[#c3cbd9] flex flex-col items-center justify-center select-none"
      style={{ backgroundImage: 'radial-gradient(120% 90% at 50% -10%, #14203d 0%, #0a0e1c 45%, #05060c 100%)' }}>
      {/* ambiente: monedas y migas flotando tras la consola */}
      <Ambient />
      <div ref={wrapRef} className="duck-responsive-stage relative z-10"
        style={{ width: CANVAS_WIDTH * 2, height: CANVAS_HEIGHT * 2, cursor }}>
        <canvas ref={worldRef} aria-hidden="true" className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'pixelated' }} />
        <canvas ref={uiRef} role="application" aria-label="Duck Heist. Usa WASD para moverte, flechas o clic izquierdo para disparar, clic derecho o Shift para esquivar, E para interactuar, M para el mapa y Escape para pausar, reanudar o volver." tabIndex={0} className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'auto',outline:'none' }} />
        <div className="duck-responsive-frame duck-frame-near pointer-events-none absolute -inset-3 rounded-[2px] border border-[#2f3644]" />
        <div className="duck-responsive-frame duck-frame-far pointer-events-none absolute -inset-6 rounded-[3px] border border-[#161c2a]" />
      </div>
      <div className="duck-responsive-footer relative z-10 mt-6 flex max-w-[94vw] items-center gap-4 text-[10px] tracking-[0.12em] font-semibold uppercase">
        <span className="duck-responsive-hint hidden text-[#6a817f] md:block">{hint}</span>
        <button onClick={toggleFs}
          className="duck-responsive-fullscreen pointer-events-auto text-[#7c8494] hover:text-[#f4d03f] transition-colors border border-transparent hover:border-[#f4d03f]/40 px-2 py-0.5">
          Pantalla completa
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
  if(engine.state===GameState.PLAYING&&engine.lastInput==='gamepad')return 'PALANCA IZQUIERDA · MOVER  RT · DISPARAR  B · ESQUIVAR  A · INTERACTUAR  Y · OBJETO  VIEW · MAPA  START · PAUSA';
  switch (engine.state) {
    case GameState.MENU:return 'Mueve el ratón sobre una opción y haz clic para abrirla';
    case GameState.DIFFICULTY:return 'Haz clic en una dificultad y luego en INICIAR · ESC volver';
    case GameState.DAILY_BRIEF:return 'Haz clic en COMENZAR DESAFÍO · ESC volver';
    case GameState.PLAYING: return keyLabel(engine.bindings.moveUp)+' '+keyLabel(engine.bindings.moveLeft)+' '+keyLabel(engine.bindings.moveDown)+' '+keyLabel(engine.bindings.moveRight)+' mover · MOUSE / '+keyLabel(engine.bindings.shootUp)+' '+keyLabel(engine.bindings.shootLeft)+' '+keyLabel(engine.bindings.shootDown)+' '+keyLabel(engine.bindings.shootRight)+' disparar · '+keyLabel(engine.bindings.dash)+' esquivar · ESC pausa';
    case GameState.MAP:return 'MAPA · Haz clic en una sala para inspeccionarla · ESC cerrar';
    case GameState.PAUSED:return 'Elige una acción con el ratón · ESC reanudar';
    case GameState.RUN_INFO:return 'Haz clic en BUILD o RENDIMIENTO · ESC volver a pausa';
    case GameState.COLLECTION:return 'Haz clic en categorías, filtros o fichas · ESC volver';
    case GameState.CAREER:return 'Haz clic en una pestaña · ESC volver a Colección';
    case GameState.CONTROLS:return engine.controlCapture?'Pulsa una tecla · ESC cancela la captura':'Haz clic en una acción para remapearla · ESC volver';
    case GameState.SETTINGS:return 'Ajusta con el ratón · ESC volver';
    case GameState.WARDROBE:return 'Elige un aspecto · ESC volver';
    case GameState.UPGRADES:return 'Elige una mejora · ESC volver';
    case GameState.HOW_TO_PLAY:return 'ESC volver';
    case GameState.ENDLESS_RESUME:return 'Elige cómo continuar · ESC volver';
    case GameState.CONFIRM:return 'Haz clic en CANCELAR o CONFIRMAR · ESC cancelar';
    default:return 'Usa el ratón para navegar · ESC volver';
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
