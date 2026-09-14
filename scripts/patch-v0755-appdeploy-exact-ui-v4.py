from pathlib import Path
import re
import runpy

# Start from the visually closest validated restoration (home, pause, upgrades,
# wardrobe/collection typography, etc.). This script then restores the parts
# that v3 still did not reproduce from the *deployed* AppDeploy bundle:
# language, 12 cursors, speaker mute control and full-size settings geometry.
runpy.run_path('scripts/patch-v0755-appdeploy-exact-ui-v3.py', run_name='__main__')


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
    return text[:match.start()] + body.rstrip() + '\n\n' + text[match.end() - len(f'function {next_name}'):]


# Candidate marker.
p = Path('index.html')
s = p.read_text()
s = replace_once(s, '0.7.55-appdeploy-exact-ui-candidate', '0.7.55-appdeploy-exact-ui-candidate-v4', 'v4 build marker')
p.write_text(s)


# -----------------------------------------------------------------------------
# Restore the exact 12 cursor images from the archived deployed AppDeploy
# bundle. Duck Heist's art is canvas-generated, so these embedded PNG data URIs
# are the cursor assets. The patch intentionally fails if the archive changes.
# -----------------------------------------------------------------------------
bundle = Path('appdeploy-live/assets/index-BgUNQzP_.js').read_text()
uris = []
for uri in re.findall(r'data:image/png;base64,[A-Za-z0-9+/=]+', bundle):
    if uri not in uris:
        uris.append(uri)
if len(uris) != 12:
    raise SystemExit(f'expected exactly 12 archived cursor PNGs, found {len(uris)}')

cursor_names = ['CLÁSICO','PUNTO','CRUZ TÁCTICA','CUAC','MIGA','PAN','MONEDA','DIAMANTE','HUEVO','PLUMA','BÓVEDA','CALAVERA']
Path('src/game/cursors.ts').write_text(
    "// Restored verbatim from the deployed AppDeploy archive fc214761.\n"
    + "export const CURSOR_NAMES = " + repr(cursor_names).replace("'", '"') + " as const;\n"
    + "export const CURSOR_DATA_URIS = [\n"
    + ''.join(f'  {uri!r},\n' for uri in uris)
    + "] as const;\n"
    + "export function cursorCss(index:number) { const i=((Math.floor(index)||0)%12+12)%12; return `url(\\\"${CURSOR_DATA_URIS[i]}\\\") 16 16, default`; }\n"
)


# -----------------------------------------------------------------------------
# Locale: the deployed AppDeploy build had a real ES/EN toggle backed by the
# independent duckheist_locale key. Restore that behavior and translate the
# navigation/settings surfaces rather than presenting a fake selector.
# -----------------------------------------------------------------------------
p = Path('src/game/i18n.ts')
s = p.read_text()
locale_code = r'''

export type DuckLocale = 'es-MX' | 'en-US';
const LOCALE_KEY = 'duckheist_locale';
let currentLocale:DuckLocale = (() => {
  try { return localStorage.getItem(LOCALE_KEY) === 'en-US' ? 'en-US' : 'es-MX'; }
  catch { return 'es-MX'; }
})();

export function getLocale():DuckLocale { return currentLocale; }
export function setLocale(locale:DuckLocale) {
  currentLocale=locale;
  try { localStorage.setItem(LOCALE_KEY,locale); } catch { /* storage unavailable */ }
  if(typeof document!=='undefined') document.documentElement.lang=locale==='en-US'?'en':'es-MX';
}
export function toggleLocale() { setLocale(currentLocale==='es-MX'?'en-US':'es-MX'); }

const EN:Record<string,string> = {
  'DUCK HEIST':'DUCK HEIST','EL BANCO DEL PAN':'THE BREAD BANK','¡EL PRECIO DEL PAN ES UN ROBO!':'BREAD PRICES ARE A ROBBERY!',
  'INICIAR ATRACO':'START HEIST','MEJORAS':'UPGRADES','MEJORAS PERMANENTES':'PERMANENT UPGRADES','ARMARIO':'WARDROBE','COLECCIÓN':'COLLECTION','CÓMO JUGAR':'HOW TO PLAY','CONFIGURACIÓN':'SETTINGS',
  'CONTINUAR':'RESUME','MAPA':'MAP','REINICIAR PARTIDA':'RESTART RUN','MENÚ PRINCIPAL':'MAIN MENU','PAUSA':'PAUSED',
  'DIFICULTAD':'DIFFICULTY','RELAJADO':'RELAXED','NORMAL':'NORMAL','IMPLACABLE':'RUTHLESS',
  'IDIOMA':'LANGUAGE','ESPAÑOL':'SPANISH','ENGLISH':'ENGLISH','VOLUMEN GENERAL':'MASTER VOLUME','MÚSICA':'MUSIC','EFECTOS DE SONIDO':'SOUND EFFECTS','BRILLO':'BRIGHTNESS','VIBRACIÓN DE PANTALLA':'SCREEN SHAKE','NÚMEROS DE DAÑO':'DAMAGE NUMBERS','PANTALLA COMPLETA':'FULLSCREEN','CURSOR':'CURSOR','PROBAR CUAC':'TEST QUACK','PROBAR ESQUIVE':'TEST DASH',
  'CLÁSICO':'CLASSIC','PUNTO':'DOT','CRUZ TÁCTICA':'TACTICAL CROSS','CUAC':'QUACK','MIGA':'CRUMB','PAN':'BREAD','MONEDA':'COIN','DIAMANTE':'DIAMOND','HUEVO':'EGG','PLUMA':'FEATHER','BÓVEDA':'VAULT','CALAVERA':'SKULL',
  'BOCINA · SILENCIAR TODO':'SPEAKER · MUTE ALL','SONIDO SILENCIADO · CLIC EN LA BOCINA PARA ACTIVAR':'SOUND MUTED · CLICK SPEAKER TO RESTORE',
  'FLECHAS · AJUSTAR     CLIC · ELEGIR NIVEL     M · SILENCIAR     ESC · VOLVER':'ARROWS · ADJUST     CLICK · SET LEVEL     M · MUTE     ESC · BACK',
  'CRUCETA · AJUSTAR     A · CAMBIAR     B · VOLVER':'D-PAD · ADJUST     A · CHANGE     B · BACK',
  'SÍ':'YES','NO':'NO','REPRODUCIR':'PLAY','VOLVER':'BACK','COMPRAR':'BUY','EQUIPAR ASPECTO':'EQUIP ASPECT','EQUIPADO':'EQUIPPED','DESBLOQUEADO':'UNLOCKED',
  'CONTROLES':'CONTROLS','Moverse':'Move','Disparar':'Shoot','Esquivar':'Dash','Interactuar':'Interact','Objeto activo':'Active item','Cambiar arma':'Switch weapon','Abrir mapa':'Open map','Pausa':'Pause',
  'W / S · ELEGIR     ENTER · CONFIRMAR':'W / S · SELECT     ENTER · CONFIRM','CRUCETA · ELEGIR     A · CONFIRMAR':'D-PAD · SELECT     A · CONFIRM',
};
export function tr(str:string) {
  if(currentLocale==='es-MX' || !str) return str;
  const exact=EN[str]; if(exact) return exact;
  return str
    .replace(/^PISO (\d+)\/6$/, 'FLOOR $1/6')
    .replace(/^PISO (\d+)$/, 'FLOOR $1')
    .replace(/^MIGAJAS: (\d+)$/, 'CRUMBS: $1')
    .replace(/^MONEDAS: (\d+)$/, 'COINS: $1');
}
if(typeof document!=='undefined') document.documentElement.lang=currentLocale==='en-US'?'en':'es-MX';
'''
s += locale_code
p.write_text(s)


# Translate the shared UI text path, matching the behavior of the archived
# bundle's translation function. v3 injects legacyTitleText before this pass.
p = Path('src/game/ui.ts')
s = p.read_text()
s = replace_once(s, "import { drawPixelLogo } from './titleScene';", "import { drawPixelLogo } from './titleScene';\nimport { tr } from './i18n';", 'ui tr import')
s = replace_once(s, ") {\n  ctx.save();\n  ctx.font = `${strong ? '700' : '600'} ${size}px ${FONT_UI}`;", ") {\n  str = tr(str);\n  ctx.save();\n  ctx.font = `${strong ? '700' : '600'} ${size}px ${FONT_UI}`;", 'text translate')
s = replace_once(s, ") {\n  ctx.save();\n  ctx.font = `${size}px ${FONT_TITLE}`;", ") {\n  str = tr(str);\n  ctx.save();\n  ctx.font = `${size}px ${FONT_TITLE}`;", 'title translate')
s = replace_once(s, "export function wrappedText(ctx:Ctx,str:string,x:number,y:number,width:number,size=8,lineHeight=11,maxLines=2,color='#c3cbd9',strong=false) {\n  ctx.save();", "export function wrappedText(ctx:Ctx,str:string,x:number,y:number,width:number,size=8,lineHeight=11,maxLines=2,color='#c3cbd9',strong=false) {\n  str = tr(str);\n  ctx.save();", 'wrapped translate')
s = replace_once(s, "  ctx.save();\n  ctx.font = `${weight} ${size}px ${FONT_UI}`;", "  str = tr(str);\n  ctx.save();\n  ctx.font = `${weight} ${size}px ${FONT_UI}`;", 'legacy title translate')
p.write_text(s)


# -----------------------------------------------------------------------------
# Restore Settings model: difficulty stays as the one intentional new option;
# every historical AppDeploy row returns. Mute is no longer a row.
# -----------------------------------------------------------------------------
p = Path('src/game/types.ts')
s = p.read_text()
s = replace_once(s, "  brightness: number;       // 0.6..1.4\n}", "  brightness: number;       // 0.1..1\n  cursorStyle: number;       // 0..11 · AppDeploy cursor set\n}", 'settings cursor type')
p.write_text(s)

p = Path('src/game/progress.ts')
s = p.read_text()
s = replace_once(s,
    "export const DEFAULT_SETTINGS:Settings = {master:.8,music:.35,sfx:.85,muted:false,difficulty:'normal',shake:.7,damageNumbers:true,uiScale:2,fullscreen:false,brightness:1};",
    "export const DEFAULT_SETTINGS:Settings = {master:.8,music:.35,sfx:.85,muted:false,difficulty:'normal',shake:.7,damageNumbers:true,uiScale:2,fullscreen:false,brightness:1,cursorStyle:0};",
    'default cursor setting')
s = replace_once(s,
    "  settings.shake=finite(typeof values.shake==='boolean'?(values.shake?1:0):values.shake,.7,0,2);\n  settings.uiScale=finite(values.uiScale,2,1,3);settings.brightness=finite(values.brightness,1,.6,1.4);",
    "  settings.shake=finite(typeof values.shake==='boolean'?(values.shake?1:0):values.shake,.7,0,1);\n  settings.uiScale=2; settings.brightness=finite(values.brightness,1,.1,1);\n  settings.cursorStyle=Math.floor(finite(values.cursorStyle,0,0,11));",
    'normalize archived settings')
p.write_text(s)

p = Path('src/game/engine.ts')
s = p.read_text()
s = replace_once(s, "import { T, FLOOR_NAMES_ES } from './i18n';", "import { T, FLOOR_NAMES_ES, getLocale, toggleLocale } from './i18n';", 'engine locale import')
old_rows = """export const SETTING_ROWS = [
  { key: 'difficulty', label: 'DIFICULTAD', kind: 'choice' as const },
  { key: 'muted', label: 'SILENCIAR TODO', kind: 'bool' as const },
  { key: 'master', label: T.settingMaster, kind: 'vol' as const },
  { key: 'music', label: T.settingMusic, kind: 'vol' as const },
  { key: 'sfx', label: T.settingSfx, kind: 'vol' as const },
  { key: 'testQuack', label: 'PROBAR CUAC', kind: 'action' as const },
  { key: 'shake', label: T.settingShake, kind: 'shake' as const },
  { key: 'damageNumbers', label: T.settingDamage, kind: 'bool' as const },
  { key: 'uiScale', label: T.settingUiScale, kind: 'scale' as const },
  { key: 'fullscreen', label: T.settingFullscreen, kind: 'bool' as const },
  { key: 'brightness', label: 'BRILLO', kind: 'brightness' as const },
  { key: 'testDash', label: 'PROBAR ESQUIVE', kind: 'action' as const },
];"""
new_rows = """export const SETTING_ROWS = [
  { key: 'difficulty', label: 'DIFICULTAD', kind: 'choice' as const },
  { key: 'language', label: 'IDIOMA', kind: 'language' as const },
  { key: 'master', label: T.settingMaster, kind: 'vol' as const },
  { key: 'music', label: T.settingMusic, kind: 'vol' as const },
  { key: 'sfx', label: T.settingSfx, kind: 'vol' as const },
  { key: 'brightness', label: 'BRILLO', kind: 'brightness' as const },
  { key: 'shake', label: T.settingShake, kind: 'shake' as const },
  { key: 'damageNumbers', label: T.settingDamage, kind: 'bool' as const },
  { key: 'fullscreen', label: T.settingFullscreen, kind: 'bool' as const },
  { key: 'cursorStyle', label: 'CURSOR', kind: 'cursor' as const },
  { key: 'testQuack', label: 'PROBAR CUAC', kind: 'action' as const },
  { key: 'testDash', label: 'PROBAR ESQUIVE', kind: 'action' as const },
];"""
s = replace_once(s, old_rows, new_rows, 'settings rows restore')
# settingValue special values.
s = replace_once(s,
    "  if (!row || row.kind === 'action') return 0;\n  const v = (engine.settings as unknown as Record<string, number | boolean | string>)[row.key];",
    "  if (!row || row.kind === 'action') return 0;\n  if(row.kind==='language') return getLocale()==='en-US'?1:0;\n  if(row.kind==='cursor') return engine.settings.cursorStyle;\n  const v = (engine.settings as unknown as Record<string, number | boolean | string>)[row.key];",
    'setting value special')
# adjustSetting special handlers and historical ranges.
s = replace_once(s,
    "  if (row.key === 'testDash') {\n    playDash();\n    return;\n  }\n  const s = engine.settings as unknown as Record<string, number | boolean | string>;",
    "  if (row.key === 'testDash') { playDash(); return; }\n  if (row.kind === 'language') { toggleLocale(); engine.onStateChange?.(engine.state); playUiMove(); return; }\n  if (row.kind === 'cursor') { engine.settings.cursorStyle=(engine.settings.cursorStyle+(dir>=0?1:-1)+12)%12; saveSettings(engine); engine.onStateChange?.(engine.state); playUiMove(); return; }\n  const s = engine.settings as unknown as Record<string, number | boolean | string>;",
    'adjust language cursor')
s = replace_once(s, "    s[row.key] = clamp((s[row.key] as number) + dir * 0.5, 0, 2);", "    s[row.key] = Math.round(clamp((s[row.key] as number) + dir * 0.1, 0, 1)*10)/10;", 'historical shake')
s = replace_once(s, "    s[row.key]=Math.round(clamp((s[row.key] as number)+dir*.1,.6,1.4)*10)/10;", "    s[row.key]=Math.round(clamp((s[row.key] as number)+dir*.1,.1,1)*10)/10;", 'historical brightness')
# Add dedicated mute action.
anchor = "export function buyUpgrade(engine: GameEngine, index: number) {"
mute_fn = """export function toggleMute(engine:GameEngine) {
  engine.settings.muted=!engine.settings.muted;
  saveSettings(engine);
  engine.onStateChange?.(engine.state);
  playUiMove();
}

"""
s = replace_once(s, anchor, mute_fn + anchor, 'mute action')
p.write_text(s)


# Exact deployed settings sheet proportions; one extra difficulty row is fitted
# without collapsing the original control sizes.
p = Path('src/game/layout.ts')
s = p.read_text()
s = replace_once(s,
    "export const SETTINGS = { x:78,y:65,w:324,h:18,gap:2 };\nexport function settingsRect(index:number) {\n  return {x:SETTINGS.x,y:SETTINGS.y+index*(SETTINGS.h+SETTINGS.gap),w:SETTINGS.w,h:SETTINGS.h};\n}",
    "export const SETTINGS = { x:62,y:63,w:356,h:17,gap:2 };\nexport const SETTINGS_MUTE = { x:390,y:35,w:28,h:18 };\nexport function settingsRect(index:number) {\n  return {x:SETTINGS.x,y:SETTINGS.y+index*(SETTINGS.h+SETTINGS.gap),w:SETTINGS.w,h:SETTINGS.h};\n}",
    'full settings geometry')
p.write_text(s)


# -----------------------------------------------------------------------------
# Render exact-era settings language: dark squared sheet, gold trim, segmented
# meters, top-right speaker/mute action, language and cursor selectors.
# -----------------------------------------------------------------------------
p = Path('src/game/render.ts')
s = p.read_text()
s = replace_once(s, "import { T, FLOOR_NAMES_ES, ROOM_LABELS } from './i18n';", "import { T, FLOOR_NAMES_ES, ROOM_LABELS, getLocale, tr } from './i18n';", 'render locale import')
s = replace_once(s, "import { MAIN_MENU, PAUSE_MENU, WARDROBE, WARDROBE_ACTION, SETTINGS, settingsRect } from './layout';", "import { MAIN_MENU, PAUSE_MENU, WARDROBE, WARDROBE_ACTION, SETTINGS, SETTINGS_MUTE, settingsRect } from './layout';", 'render layout mute import')
# The exact import string can vary; if base render imports layout differently, patch the token.
if "SETTINGS_MUTE" not in s.split('\n', 60)[0:60].__str__():
    # fallback targeted insertion on settingsRect import line
    s = s.replace('settingsRect,', 'SETTINGS_MUTE, settingsRect,', 1)
s = replace_once(s, "import { SKINS,", "import { CURSOR_DATA_URIS, CURSOR_NAMES } from './cursors';\nimport { SKINS,", 'cursor render import')
# Preview cache after imports.
first_marker = "// ---------------------------------------------------------------------------\n// RENDER DEL MUNDO"
if first_marker in s:
    preview = "const CURSOR_PREVIEW_IMAGES = typeof Image!=='undefined' ? CURSOR_DATA_URIS.map(src=>{const img=new Image();img.src=src;return img;}) : [];\n\n"
    s = replace_once(s, first_marker, preview + first_marker, 'cursor preview cache')
else:
    # stable fallback before first exported render function
    s = replace_once(s, 'export function renderWorld', "const CURSOR_PREVIEW_IMAGES = typeof Image!=='undefined' ? CURSOR_DATA_URIS.map(src=>{const img=new Image();img.src=src;return img;}) : [];\n\nexport function renderWorld", 'cursor preview cache fallback')

settings_body = r'''function renderSettingsUI(engine: GameEngine) {
  const ctx=engine.ui!;
  drawPanel(ctx,50,22,CANVAS_WIDTH-100,CANVAS_HEIGHT-48,'rgba(8,11,18,.98)','#f4d03f','#39414f');
  legacyTitleText(ctx,T.settingsTitle,CANVAS_WIDTH/2,51,17,'#f4d03f');

  // AppDeploy speaker control: mute is a global action, not a settings row.
  const mx=SETTINGS_MUTE.x,my=SETTINGS_MUTE.y,mw=SETTINGS_MUTE.w,mh=SETTINGS_MUTE.h;
  ctx.fillStyle=engine.settings.muted?'rgba(210,74,65,.24)':'rgba(244,208,63,.13)';ctx.fillRect(mx,my,mw,mh);
  ctx.strokeStyle=engine.settings.muted?'#ef7864':'#f4d03f';ctx.strokeRect(mx+.5,my+.5,mw-1,mh-1);
  // small speaker glyph
  ctx.fillStyle=engine.settings.muted?'#ef7864':'#f4d03f';ctx.fillRect(mx+6,my+7,4,5);ctx.beginPath();ctx.moveTo(mx+10,my+7);ctx.lineTo(mx+15,my+4);ctx.lineTo(mx+15,my+15);ctx.lineTo(mx+10,my+12);ctx.closePath();ctx.fill();
  ctx.strokeStyle=engine.settings.muted?'#ef7864':'#f4d03f';ctx.beginPath();ctx.arc(mx+15,my+9.5,5,-.8,.8);ctx.stroke();
  text(ctx,engine.settings.muted?'SONIDO SILENCIADO · CLIC EN LA BOCINA PARA ACTIVAR':'BOCINA · SILENCIAR TODO',382,58,4.8,engine.settings.muted?'#ef7864':'#9ea8b7','right',true,false);

  SETTING_ROWS.forEach((row,i)=>{
    const r=settingsRect(i),on=i===engine.settingsIndex;
    ctx.fillStyle=on?'rgba(244,208,63,.13)':i%2===0?'rgba(255,255,255,.038)':'rgba(255,255,255,.018)';ctx.fillRect(r.x,r.y,r.w,r.h);
    if(on){ctx.fillStyle='#f4d03f';ctx.fillRect(r.x-5,r.y+2,3,r.h-4);ctx.strokeStyle='rgba(244,208,63,.6)';ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);}
    text(ctx,row.label,r.x+8,r.y+12,7.7,on?'#fff4bd':'#c3cbd9','left',on,false);

    if(row.kind==='difficulty'||row.kind==='choice') {
      const value=engine.settings.difficulty==='relaxed'?'RELAJADO':engine.settings.difficulty==='hard'?'IMPLACABLE':'NORMAL';
      text(ctx,'‹',314,r.y+12,8,on?'#f4d03f':'#687382','center',true,false);text(ctx,value,360,r.y+12,6.8,on?'#fff4bd':'#cbd3dd','center',true,false);text(ctx,'›',408,r.y+12,8,on?'#f4d03f':'#687382','center',true,false);return;
    }
    if(row.kind==='language') {
      text(ctx,'‹',314,r.y+12,8,on?'#f4d03f':'#687382','center',true,false);text(ctx,getLocale()==='en-US'?'ENGLISH':'ESPAÑOL',360,r.y+12,6.8,on?'#fff4bd':'#cbd3dd','center',true,false);text(ctx,'›',408,r.y+12,8,on?'#f4d03f':'#687382','center',true,false);return;
    }
    if(row.kind==='cursor') {
      text(ctx,'‹',300,r.y+12,8,on?'#f4d03f':'#687382','center',true,false);
      const ci=((engine.settings.cursorStyle%12)+12)%12, img=CURSOR_PREVIEW_IMAGES[ci];
      ctx.fillStyle='#111722';ctx.fillRect(337,r.y+1,34,15);ctx.strokeStyle=on?'#f4d03f':'#46505e';ctx.strokeRect(337.5,r.y+1.5,33,14);
      if(img?.complete) ctx.drawImage(img,346,r.y,17,17);
      text(ctx,CURSOR_NAMES[ci],330,r.y+12,5.4,on?'#fff4bd':'#aeb8c6','right',true,false);text(ctx,'›',408,r.y+12,8,on?'#f4d03f':'#687382','center',true,false);return;
    }

    const v=settingValue(engine,i);
    if(row.kind==='vol'||row.kind==='shake'||row.kind==='brightness') {
      const fraction=row.kind==='vol'?v:v; // archived shake/brightness are 0..1
      const sx=304,sy=r.y+5,sw=88,blocks=10,onBlocks=Math.round(Math.max(0,Math.min(1,fraction))*blocks);
      for(let b=0;b<blocks;b++){ctx.fillStyle=b<onBlocks?(on?'#f4d03f':'#8b956f'):'#29313d';ctx.fillRect(sx+b*9,sy,7,7);}
      text(ctx,`${Math.round(fraction*100)}%`,405,r.y+12,6.4,on?'#fff4bd':'#9ca7b6','right',true,false);return;
    }
    if(row.kind==='action') {text(ctx,'REPRODUCIR',405,r.y+12,6.2,on?'#f4d03f':'#8c96a5','right',true,false);return;}
    text(ctx,v>.5?T.on:T.off,405,r.y+12,6.4,v>.5?'#65d68a':'#9da7b5','right',true,false);
  });

  text(ctx,engine.lastInput==='gamepad'?'CRUCETA · AJUSTAR     A · CAMBIAR     B · VOLVER':'FLECHAS · AJUSTAR     CLIC · ELEGIR NIVEL     M · SILENCIAR     ESC · VOLVER',240,321,6.2,'#91aaa6','center',true,false);
}'''
s = replace_function(s, 'renderSettingsUI', 'renderWardrobeUI', settings_body)
p.write_text(s)


# -----------------------------------------------------------------------------
# Input behavior: M mute, clickable speaker, exact cursor application.
# -----------------------------------------------------------------------------
p = Path('src/App.tsx')
s = p.read_text()
s = replace_once(s, 'selectSwapSlot, adjustSetting, SETTING_ROWS, wardrobeAction, ensureSkinVisible,selectEventOption,', 'selectSwapSlot, adjustSetting, toggleMute, SETTING_ROWS, wardrobeAction, ensureSkinVisible,selectEventOption,', 'app mute import')
s = replace_once(s, 'settingsRect, inside, COLLECTION, activeSwapHit', 'SETTINGS_MUTE, settingsRect, inside, COLLECTION, activeSwapHit', 'app settings mute layout')
s = replace_once(s, "import { runSelfChecks, type CheckReport } from './game/selftest';", "import { runSelfChecks, type CheckReport } from './game/selftest';\nimport { cursorCss } from './game/cursors';", 'app cursor import')
s = replace_once(s, "const [cursor, setCursor] = useState<'crosshair' | 'default'>('default');", "const [cursor, setCursor] = useState<string>('default');", 'cursor state type')
s = replace_once(s, "      setCursor(engine.state === GameState.PLAYING ? 'crosshair' : 'default');", "      setCursor(cursorCss(engine.settings.cursorStyle));", 'state cursor apply')
s = replace_once(s, "    applySize();\n    setHint(hintFor(engine));", "    applySize();\n    setCursor(cursorCss(engine.settings.cursorStyle));\n    setHint(hintFor(engine));", 'initial cursor apply')
s = replace_once(s, "      if(k==='m') {toggleFloorMap(engine);return;}", "      if(k==='m' && engine.state===GameState.SETTINGS) {toggleMute(engine);return;}\n      if(k==='m') {toggleFloorMap(engine);return;}", 'keyboard mute')
# Speaker click before settings row lookup.
s = replace_once(s, "        case GameState.SETTINGS: {\n          let hit = -1;", "        case GameState.SETTINGS: {\n          if(inside(x,y,SETTINGS_MUTE)) {toggleMute(engine);return;}\n          let hit = -1;", 'settings speaker click')
p.write_text(s)

print(f'v0.7.55 v4 patch ready with {len(uris)} exact archived cursors')
