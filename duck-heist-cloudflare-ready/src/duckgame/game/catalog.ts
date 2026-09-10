import { ITEMS, ACTIVE_ITEMS, WEAPONS, ENEMIES, BOSSES, MINIBOSSES, SKINS, FLAVOR } from './data';
import { ITEM_ART, getIconPixels } from './itemArt';
import { ACTIVE_RULES, FOODS, PASSIVE_RULES } from './itemRules';

export type CollectionCategory = 'items' | 'weapons' | 'bosses' | 'enemies' | 'skins';
export const COLLECTION_TABS: { id:CollectionCategory; name:string }[] = [
  {id:'items',name:'OBJETOS'}, {id:'weapons',name:'ARMAS'}, {id:'enemies',name:'ENEMIGOS'},
  {id:'bosses',name:'JEFES'}, {id:'skins',name:'ASPECTOS'},
];
export interface CatalogEntry {
  id:string; name:string; description:string; flavor:string; rarity:number;
  category:CollectionCategory; sprite:string; mechanic:string;
}
const enemyInfo: Record<string,string> = {
  chaser_shooter:'Se acerca y dispara. Esquiva sus balas lentas.', swarmer:'Rápido e imprevisible. No dejes que te rodee.',
  shotgunner:'Avisa antes de disparar perdigones. Mantén tu distancia.', shielded:'Bloquea por delante. Rodéalo durante su carga y recuperación.',
  drone:'Sobrevuela obstáculos y dispara ráfagas.', shooter:'Mantiene distancia y dispara.',
  chaser:'Persigue al pato sin descanso.', turret:'No se mueve. Busca cobertura entre disparos.', roller:'Rebota por la sala. Vigila su trayectoria.',
  sniper:'Fija una mira durante 1 s antes de disparar. El tiro causa 2 de daño.',
  medic:'Cura aliados cercanos cada 2.5 s. Es débil cuando está solo.',
  captain:'Aumenta la velocidad y cadencia de policías cercanos. Derrótalo primero.',
  k9:'Anuncia su carga y queda vulnerable después. Es un ganso, no un perro.',
  camera:'Activa refuerzos si no la destruyes en 9 s.',
  grenadier:'Marca el suelo y lanza una granada a donde vas. No predice perfecto.',
  baton:'Se acerca por un costado y carga. Queda vulnerable al fallar.',
  atm:'Lento. Dispara monedas. Al caer suelta migajas extra.',
  mobileCam:'Recorre las paredes. Si te ve un rato, llama refuerzos.',
};
export const CATALOG: CatalogEntry[] = [
  ...Object.values({...ITEMS,...ACTIVE_ITEMS}).map(i=>({
    id:i.id,name:i.name,description:i.description,flavor:i.flavor ?? FLAVOR[i.id] ?? '',rarity:i.rarity,
    category:'items' as const,sprite:i.id,mechanic:i.passive?'PASIVO · Se aplica al recoger':'ACTIVO · ESPACIO para usar',
  })),
  ...Object.entries(FOODS).map(([id,f])=>({id,name:f.name,description:f.description,flavor:f.flavor,rarity:f.rarity,
    category:'items' as const,sprite:id,mechanic:'COMIDA · Recupera corazones al recoger'})),
  ...Object.values(WEAPONS).map(w=>({id:w.id,name:w.name,description:w.special,flavor:FLAVOR[w.id] ?? '',rarity:w.rarity,category:'weapons' as const,sprite:w.id,mechanic:'ARMA · Cambia con la rueda'})),
  ...Object.values({...BOSSES,...MINIBOSSES}).map(b=>({id:b.id,name:b.name,description:b.subtitle,flavor:BOSSES[b.id]?'El banco tiene un problema contigo.':'Un problema menor. Con peor humor.',rarity:BOSSES[b.id]?4:2,category:'bosses' as const,sprite:b.id,mechanic:BOSSES[b.id]?'JEFE DE PISO · Botín garantizado':'MINIJEFE · Riesgo y recompensa'})),
  ...Object.values(ENEMIES).map(e=>({id:e.id,name:e.name,description:enemyInfo[e.behavior],flavor:'Empleado del mes. En detenciones.',rarity:0,category:'enemies' as const,sprite:e.id,mechanic:'SEGURIDAD DEL BANCO'})),
  ...SKINS.map(s=>({id:s.id,name:s.name,description:s.description,flavor:'Solo cambia tu estilo, nunca tus estadísticas.',rarity:s.cost>=500?4:1,category:'skins' as const,sprite:s.id,mechanic:`COSMÉTICO · ${s.cost} monedas doradas`})),
];

export function collectionEntries(category:CollectionCategory) { return CATALOG.filter(c=>c.category===category); }

// A inspectable manifest, not a hand-maintained list of supposedly valid IDs.
export function auditContent() {
  const obtainables = [
    ...Object.values({...ITEMS,...ACTIVE_ITEMS}).map(i=>({id:i.id,name:i.name,description:i.description,rarity:i.rarity,sprite:i.sprite,category:i.category,effect:i.effect,pickup:i.pickupBehavior})),
    ...Object.values(WEAPONS).map(w=>({id:w.id,name:w.name,description:w.special,rarity:w.rarity,sprite:w.id,category:'weapon',effect:w.projectileType,pickup:'two-slot-transaction'})),
    ...Object.entries(FOODS).map(([id,f])=>({id,name:f.name,description:f.description,rarity:f.rarity,sprite:id,category:'healing',effect:`heal:${f.heal}`,pickup:'contact-if-injured'})),
    ...['crumb','golden_crumb'].map(id=>({id,name:id==='crumb'?'MIGAJAS':'MONEDAS DORADAS',description:'Moneda de atraco',rarity:id==='crumb'?0:4,sprite:id,category:'currency',effect:id==='crumb'?'temporary':'permanent',pickup:'magnet'})),
  ];
  const issues:string[] = [];
  for(const item of obtainables) {
    for(const field of ['id','name','description','sprite','category','effect','pickup'] as const) if(!item[field]) issues.push(`${item.id}: ${field}`);
    if (!ITEM_ART[item.id]) issues.push(`${item.id}: missing custom art`);
    if (getIconPixels(item.id).filter(Boolean).length < 16) issues.push(`${item.id}: blank art`);
    if (item.rarity < 0 || item.rarity > 4) issues.push(`${item.id}: invalid rarity`);
  }
  for(const id of Object.keys(ITEMS)) if(!PASSIVE_RULES[id]) issues.push(`${id}: missing passive rule`);
  for(const id of Object.keys(ACTIVE_ITEMS)) if(!ACTIVE_RULES[id]) issues.push(`${id}: missing active rule`);
  return { count:obtainables.length, issues, entries:obtainables };
}