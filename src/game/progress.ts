import { SKINS } from './data';
import { CATALOG, type CollectionCategory } from './catalog';
import type { GameEngine, Settings } from './types';

export const DEFAULT_SETTINGS:Settings = {master:.8,music:.35,sfx:.85,shake:.7,damageNumbers:true,uiScale:2,fullscreen:false,brightness:1};
export const emptyDiscoveries = ():Record<CollectionCategory,string[]> => ({items:[],weapons:['quack_blaster'],bosses:[],enemies:[],skins:['robber']});
const finite=(v:unknown,fallback:number,min=0,max=1e9)=>typeof v==='number' && Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function normalizeProgress(raw:Record<string,unknown>={}) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  const valid=new Set(SKINS.map(s=>s.id));
  const unlockedSkins=[...new Set(['robber',...(Array.isArray(raw.unlockedSkins)?raw.unlockedSkins.filter((id):id is string=>typeof id==='string'&&valid.has(id)):[])])];
  const equippedSkin=typeof raw.equippedSkin==='string'&&unlockedSkins.includes(raw.equippedSkin)?raw.equippedSkin:'robber';
  const settings={...DEFAULT_SETTINGS};
  const values=raw.settings && typeof raw.settings==='object'?raw.settings as Record<string,unknown>:{};
  for(const k of ['master','music','sfx'] as const) settings[k]=finite(values[k],settings[k],0,1);
  settings.shake=finite(typeof values.shake==='boolean'?(values.shake?1:0):values.shake,.7,0,2);
  settings.uiScale=finite(values.uiScale,2,1,3);settings.brightness=finite(values.brightness,1,.6,1.4);
  settings.damageNumbers=values.damageNumbers!==false;
  if(values.sound===false) settings.master=0;
  const discovered=emptyDiscoveries(), d=raw.discovered as Record<string,unknown>|undefined;
  for(const category of Object.keys(discovered) as CollectionCategory[]) {
    const known=new Set(CATALOG.filter(c=>c.category===category).map(c=>c.id));
    discovered[category]=[...new Set([...discovered[category],...(Array.isArray(d?.[category])?(d![category] as unknown[]).filter((id):id is string=>typeof id==='string'&&known.has(id)):[])])];
  }
  const metaLevels:Record<string,number>={};
  const meta=raw.metaLevels as Record<string,unknown>|undefined;
  for(const key of ['hp','damage','crumbs','dash']) metaLevels[key]=Math.floor(finite(meta?.[key],0,0,3));
  const t=raw.tutorial && typeof raw.tutorial==='object'?raw.tutorial as Record<string,unknown>:{};
  const tutorial={started:t.started===true,map:t.map===true,mapShown:t.mapShown===true,wheel:t.wheel===true,dash:t.dash===true};
  return {totalGoldenCrumbs:finite(raw.totalGoldenCrumbs,0),equippedSkin,unlockedSkins,settings,metaLevels,discovered,tutorial,bestFloor:finite(raw.bestFloor,0,0,6)};
}
export function permanentSnapshot(e:GameEngine) {
  // Explicit whitelist: neither loadout nor temporary migajas enter the save.
  return {version:4,locale:'es-MX',totalGoldenCrumbs:e.totalGoldenCrumbs,metaLevels:e.metaLevels,settings:e.settings,
    unlockedSkins:e.unlockedSkins,equippedSkin:e.equippedSkin,discovered:e.discovered,bestFloor:e.bestFloor,tutorial:e.tutorial};
}