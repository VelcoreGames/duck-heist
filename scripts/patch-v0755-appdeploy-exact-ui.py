from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def replace_function(text: str, name: str, next_name: str, body: str) -> str:
    pattern = rf"function {re.escape(name)}\(.*?\n\}}\n\nfunction {re.escape(next_name)}"
    match = re.search(pattern, text, flags=re.S)
    if not match:
        raise SystemExit(f'function block not found: {name} -> {next_name}')
    prefix = text[:match.start()]
    suffix = text[match.end() - len(f'function {next_name}'):]
    return prefix + body.rstrip() + '\n\n' + suffix


# Build marker
p = Path('index.html')
s = p.read_text()
s = replace_once(s, '0.7.54-menu-difficulty-audio', '0.7.55-appdeploy-exact-ui-candidate', 'build marker')
p.write_text(s)

# Settings geometry: restore the archived single-column settings sheet while
# retaining the current 12 functional rows (difficulty + mute included).
p = Path('src/game/layout.ts')
s = p.read_text()
old = '''export const SETTINGS = { x:54,y:72,w:372,h:22,gap:5 };
export function settingsRect(index:number) {
  if(index===0) return {x:54,y:72,w:372,h:30};
  if(index>=1 && index<=5) return {x:54,y:125+(index-1)*27,w:177,h:22};
  return {x:249,y:125+(index-6)*27,w:177,h:22};
}'''
new = '''export const SETTINGS = { x:78,y:65,w:324,h:18,gap:2 };
export function settingsRect(index:number) {
  return {x:SETTINGS.x,y:SETTINGS.y+index*(SETTINGS.h+SETTINGS.gap),w:SETTINGS.w,h:SETTINGS.h};
}'''
s = replace_once(s, old, new, 'settings geometry')
p.write_text(s)

# UI restoration
p = Path('src/game/render.ts')
s = p.read_text()
s = s.replace(', drawPremiumButton, drawPremiumMeter', '')

menu = r'''function renderMenuUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawTitleLogo(ctx, CANVAS_WIDTH / 2, 62, engine.frame);
  text(ctx,'SE BUSCA UN CÓMPLICE',MAIN_MENU.x+MAIN_MENU.w/2,115,7,'#c9b27a','center',true);
  MENU_ITEMS.forEach((item,i)=>{
    const on=i===engine.menuIndex,x=MAIN_MENU.x,y=MAIN_MENU.y+i*(MAIN_MENU.h+MAIN_MENU.gap),w=MAIN_MENU.w,h=MAIN_MENU.h;
    ctx.save();if(on) {ctx.shadowColor='#e8b95066';ctx.shadowBlur=15;ctx.translate(x+w/2,y+h/2);ctx.scale(1.025,1.025);ctx.translate(-x-w/2,-y-h/2);}
    ctx.fillStyle=on?'#d9bc70':'rgba(18,36,42,.95)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=on?'#fff0b0':'#3b5355';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
    ctx.fillStyle=on?'#f5dc92':'#203a42';ctx.fillRect(x+3,y+2,w-6,1);
    ctx.fillStyle=on?'#8c6b39':'#0a1b22';ctx.fillRect(x+3,y+h-3,w-6,1);
    if(on) {ctx.fillStyle='rgba(255,255,220,.13)';ctx.fillRect(x+3+(engine.frame*.6)%(w-24),y+3,20,h-6);}
    text(ctx,item.label,x+w/2,y+15,9,on?'#17262a':'#b7c5b6','center',true,false);
    if(on) {text(ctx,'›',x-9,y+15,14,'#e7c87f');text(ctx,'‹',x+w+9,y+15,14,'#e7c87f');}
    ctx.restore();
  });
  text(ctx,T.tagline,240,326,9,'#dbbd77','center',true);
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · ELEGIR     A · CONFIRMAR':'W / S · ELEGIR     ENTER · CONFIRMAR',30,348,6,'#738b89','left');
  drawItemIcon(ctx,368,337,'golden_crumb',13);text(ctx,`${engine.totalGoldenCrumbs} DORADAS`,389,348,6,'#ac9f75','left');
}'''

howto = r'''function renderHowToPlayUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPanel(ctx, 20, 14, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 34);
  titleText(ctx, T.howToTitle, CANVAS_WIDTH / 2, 40, 18, '#f4d03f');

  const gamepad=engine.lastInput==='gamepad';
  const rows:[string,string][] = gamepad?[
    ['PALANCA IZQUIERDA','Moverse'],['PALANCA DERECHA + RT','Apuntar y disparar'],['B','Esquivar'],['A','Interactuar / recoger'],['Y','Objeto activo'],['LB / RB','Cambiar arma'],['VIEW','Abrir mapa'],['START','Pausa'],
  ]:[
    ['WASD','Moverse'],['FLECHAS / CLIC IZQUIERDO','Disparar'],['SHIFT / CLIC DERECHO','Esquivar'],['E','Interactuar / recoger'],['ESPACIO','Objeto activo'],['RUEDA DEL MOUSE','Cambiar arma'],['M','Abrir mapa'],['R · MANTENER','Reiniciar partida'],['ESC','Pausa'],
  ];
  rows.forEach(([k,v],i)=>{const y=60+i*17;ctx.fillStyle='#1c343d';ctx.fillRect(37,y-9,158,14);text(ctx,k,44,y,7.5,'#d9cb92','left',true);text(ctx,v,207,y,8,'#d1ded4','left');});
  const instructions=['Explora salas y derrota enemigos para abrir las puertas.','El pan recupera vida. Las monedas doradas se guardan.','Elige dos armas, encuentra objetos y crea sinergias.','Derrota al jefe, recoge el botín y baja al siguiente piso.','El mapa pausa el combate. No permite transportarte.'];
  instructions.forEach((line,i)=>text(ctx,line,240,228+i*14,7.8,'#a4bcb9'));
  text(ctx,gamepad?'B · VOLVER':'ESC · VOLVER',240,322,9,'#dfc582','center',true);
}'''

settings = r'''function renderSettingsUI(engine: GameEngine) {
  const ctx = engine.ui!;
  // Preserve the exact archived visual language: squared dark sheet, gold trim,
  // single-column rows, segmented meters and a compact command footer.
  drawPanel(ctx, 66, 26, 348, 282, 'rgba(8,11,18,.98)', '#f4d03f', '#39414f');
  titleText(ctx, T.settingsTitle, CANVAS_WIDTH / 2, 52, 18, '#f4d03f');

  SETTING_ROWS.forEach((row, i) => {
    const r=settingsRect(i), on=i===engine.settingsIndex;
    ctx.fillStyle=on?'rgba(244,208,63,.15)':i%2===0?'rgba(255,255,255,.045)':'rgba(255,255,255,.025)';
    ctx.fillRect(r.x,r.y,r.w,r.h);
    if(on) {
      ctx.strokeStyle='#f4d03f';ctx.lineWidth=1;ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);
      ctx.fillStyle='#f4d03f';ctx.fillRect(r.x-4,r.y+2,3,r.h-4);
    }
    text(ctx,row.label,r.x+9,r.y+12.5,6.8,on?'#fff6c9':'#c2cbd8','left',on,false);

    if(row.kind==='choice') {
      const value=engine.settings.difficulty==='relaxed'?'RELAJADO':engine.settings.difficulty==='hard'?'IMPLACABLE':'NORMAL';
      text(ctx,'‹',r.x+r.w-105,r.y+12.5,7,on?'#f4d03f':'#6e7785','center',true,false);
      text(ctx,value,r.x+r.w-53,r.y+12.5,6.5,on?'#fff6c9':'#d1d8e2','center',true,false);
      text(ctx,'›',r.x+r.w-9,r.y+12.5,7,on?'#f4d03f':'#6e7785','center',true,false);
      return;
    }

    const v=settingValue(engine,i);
    if(row.kind==='vol' || row.kind==='shake' || row.kind==='scale' || row.kind==='brightness') {
      const max=row.kind==='vol'?1:row.kind==='shake'?2:row.kind==='brightness'?1.4:3;
      const fraction=Math.max(0,Math.min(1,v/max));
      drawBar(ctx,r.x+r.w-105,r.y+5,68,fraction,on?'#f4d03f':'#7d8795');
      const display=row.kind==='vol'?`${Math.round(v*100)}%`:row.kind==='shake'?`${Math.round(v/2*100)}%`:row.kind==='brightness'?`${Math.round(v*100)}%`:`${v}x`;
      text(ctx,display,r.x+r.w-8,r.y+12.5,6.2,on?'#fff6c9':'#9ca7b6','right',true,false);
    } else {
      let label=row.kind==='action'?'REPRODUCIR':v>.5?T.on:T.off;
      let col=v>.5||row.kind==='action'?'#39d353':'#b0bac6';
      if(row.key==='muted') {label=engine.settings.muted?'SÍ':'NO';col=engine.settings.muted?'#ff8a7d':'#b0bac6';}
      text(ctx,label,r.x+r.w-9,r.y+12.5,6.4,col,'right',true,false);
    }
  });

  const diff=engine.settings.difficulty==='relaxed'?'RELAJADO':engine.settings.difficulty==='hard'?'IMPLACABLE':'NORMAL';
  text(ctx,`DIFICULTAD · ${diff}     ${engine.settings.muted?'AUDIO SILENCIADO':'AUDIO ACTIVO'}`,240,316,5.6,'#788996','center',true,false);
  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · AJUSTAR     A · CAMBIAR     B · VOLVER':'FLECHAS · AJUSTAR     ENTER · CAMBIAR     ESC · VOLVER',240,329,6,'#91aaa6','center',true,false);
}'''

upgrades = r'''function renderUpgradesUI(engine: GameEngine) {
  const ctx = engine.ui!;
  drawPanel(ctx, 26, 16, CANVAS_WIDTH - 52, CANVAS_HEIGHT - 34);
  titleText(ctx, T.upgradesTitle, CANVAS_WIDTH / 2, 40, 17, '#f4d03f');
  drawChibiCoinV3(ctx, CANVAS_WIDTH / 2 - 52, 58, engine.frame, true);
  text(ctx, `${T.upgradesCurrency}: ${engine.totalGoldenCrumbs}`, CANVAS_WIDTH / 2 + 4, 62, 12, '#f4d03f', 'center', true);

  META_UPGRADES.forEach((up, i) => {
    const y = 82 + i * 44;
    const lvl = engine.metaLevels[up.id] ?? 0;
    const maxed = lvl >= up.maxLevel;
    const cost = up.cost * (lvl + 1);
    const sel = i === engine.upgradeIndex;
    ctx.fillStyle = sel ? 'rgba(244,208,63,0.14)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(40, y - 12, CANVAS_WIDTH - 80, 40);
    titleText(ctx, up.name, 50, y + 4, 13, maxed ? '#39d353' : sel ? '#fff6c9' : '#c3cbd9', 'left');
    text(ctx, up.description, 50, y + 20, 10, '#8792a5', 'left', false);
    for (let l = 0; l < up.maxLevel; l++) {
      ctx.fillStyle = l < lvl ? '#f4d03f' : '#2f3644';
      ctx.fillRect(CANVAS_WIDTH - 150 + l * 12, y - 4, 9, 9);
    }
    text(ctx, maxed ? T.upgradeBought : `${cost}`, CANVAS_WIDTH - 48, y + 16,
      9, maxed ? '#39d353' : engine.totalGoldenCrumbs >= cost ? '#f4d03f' : '#ff5b4f', 'right', true);
  });

  text(ctx,engine.lastInput==='gamepad'?'A · COMPRAR':'ENTER · COMPRAR',240,308,9,'#a9b3c4');
  text(ctx,engine.lastInput==='gamepad'?'B · VOLVER':'ESC · VOLVER',240,324,9,'#f4d03f','center',true);
}'''

paused = r'''function renderPausedUI(engine: GameEngine) {
  const ctx = engine.ui!;
  ctx.fillStyle = 'rgba(4,6,14,0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPanel(ctx, 42, 18, CANVAS_WIDTH - 84, CANVAS_HEIGHT - 36);
  titleText(ctx, T.paused, CANVAS_WIDTH / 2, 48, 24, '#f4d03f');
  ctx.fillStyle = '#8a2c2c';
  ctx.fillRect(CANVAS_WIDTH / 2 - 60, 55, 120, 2);

  const items = [
    { label: T.resume }, {label:'MAPA'}, { label: T.restartRun }, { label: T.menuHowTo },
    { label: T.menuSettings }, { label: T.backToMenu },
  ];
  drawButtons(ctx,items,engine.pauseIndex,240,PAUSE_MENU.y,engine.frame,PAUSE_MENU.w,PAUSE_MENU.h,PAUSE_MENU.gap);

  text(ctx, T.controls, CANVAS_WIDTH / 2, 220, 11, '#8792a5', 'center', true);
  const rows: [string, string][] = engine.lastInput==='gamepad'?[
    ['PALANCA','Moverse'],['RT','Disparar'],['B','Esquivar'],['Y','Objeto activo'],['A','Interactuar'],['VIEW','Mapa'],
  ]:[
    [T.keyMove, T.ctrlMove], [T.keyShoot, T.ctrlShoot], [T.keyDash, T.ctrlDash],
    [T.keyItem, T.ctrlItem], [T.keyInteract, T.ctrlInteract], [T.keyRestart, T.ctrlRestart],
  ];
  rows.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = CANVAS_WIDTH / 2 - 128 + col * 132;
    const y = 236 + row * 16;
    ctx.fillStyle = 'rgba(244,208,63,0.10)';
    ctx.fillRect(x, y - 10, 48, 13);
    text(ctx, k, x + 24, y, 8, '#f4d03f', 'center', true);
    wrappedText(ctx,v,x+54,y,76,7,9,2,'#a9b3c4');
  });
  text(ctx,`SEMILLA · ${engine.run.seed}`,240,300,9,'#d4bb7b','center',true);
  text(ctx,`${actionPrompt(engine,'weapons')} · CAMBIAR ARMA    ${engine.lastInput==='gamepad'?'B':'CLIC DERECHO'} · ESQUIVAR`,240,315,6.5,'#768f8f');
}'''

s = replace_function(s, 'renderMenuUI', 'renderHowToPlayUI', menu)
s = replace_function(s, 'renderHowToPlayUI', 'renderSettingsUI', howto)
s = replace_function(s, 'renderSettingsUI', 'renderWardrobeUI', settings)
s = replace_function(s, 'renderUpgradesUI', 'renderFloorIntroUI', upgrades)
s = replace_function(s, 'renderPausedUI', 'renderSwapUI', paused)
p.write_text(s)
