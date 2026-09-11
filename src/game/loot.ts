import { ITEMS, ACTIVE_ITEMS } from './data';
import type { ItemRole } from './expansion';
import type { GameEngine } from './types';

export function eligiblePassives(e:GameEngine,role?:ItemRole,exclude:string[]=[]):string[] {
  return Object.values(ITEMS).filter(i=>!e.player.items.includes(i.id)&&!exclude.includes(i.id)&&(!role||i.role===role)).map(i=>i.id);
}
export function pickPassive(e:GameEngine,role?:ItemRole,exclude:string[]=[],rare=false):string|null {
  let pool=eligiblePassives(e,role,exclude);
  if(!pool.length && role) pool=eligiblePassives(e,undefined,exclude);
  if(rare) {const rares=pool.filter(id=>ITEMS[id].rarity>=2);if(rares.length) pool=rares;}
  // Recent offers are de-prioritized, but uncollected objects remain valid.
  const unseen=pool.filter(id=>!e.offeredItems.includes(id));if(unseen.length) pool=unseen;
  if(!pool.length) return null;
  const id=pool[Math.floor(Math.random()*pool.length)];e.offeredItems.push(id);return id;
}
export function diverseRewards(e:GameEngine):string[] {
  const result:string[]=[];
  for(const role of ['offense','defense','utility'] as const) {
    const id=pickPassive(e,role,result,true);
    if(id) result.push(id);
  }
  return result;
}
export function fallbackActive(e:GameEngine) {
  const pool=Object.keys(ACTIVE_ITEMS).filter(id=>id!==e.player.activeItem);
  return pool[Math.floor(Math.random()*pool.length)];
}