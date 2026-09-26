import { RoomType } from './constants';
import type { MapRoom } from './mapgen';

export interface BankKeyWallet {
  bankKeys:number;
  keyPity:number;
  keyDropsFloor:number;
}

export function specialRoomKeyCost(room:Pick<MapRoom,'type'|'template'>):number {
  if(room.type===RoomType.SECRET)return 2;
  if(room.type===RoomType.ITEM||room.type===RoomType.TREASURE||
    room.type===RoomType.SHOP||room.type===RoomType.GUN_VAN||
    room.type===RoomType.CHOICE)return 1;
  if(room.type===RoomType.EVENT&&room.template==='cafe')return 1;
  return 0;
}

export function specialRoomLocked(room:Pick<MapRoom,'type'|'template'|'keyUnlocked'>):boolean {
  return specialRoomKeyCost(room)>0&&!room.keyUnlocked;
}

export function tryUnlockSpecialRoom(
  room:Pick<MapRoom,'type'|'template'|'keyUnlocked'>,
  wallet:Pick<BankKeyWallet,'bankKeys'>,
):{ok:boolean;cost:number} {
  const cost=specialRoomKeyCost(room);
  if(cost<=0||room.keyUnlocked)return {ok:true,cost:0};
  if(wallet.bankKeys<cost)return {ok:false,cost};
  wallet.bankKeys-=cost;
  room.keyUnlocked=true;
  return {ok:true,cost};
}

/**
 * Economía adaptativa para que la exploración produzca decisiones y no lotería.
 * - combate: 12% base + 10 pp por fallo;
 * - modificador peligroso: +8 pp;
 * - con 2 llaves el drop baja; con 3+ baja mucho;
 * - tras cuatro fallos, el siguiente combate garantiza llave si llevas <3;
 * - minijefe garantiza una si llevas <3.
 */
export function bankKeyDropChance(
  room:Pick<MapRoom,'type'|'modifier'>,
  held:number,
  pity:number,
):number {
  if(room.type===RoomType.BOSS)return 0;
  if(room.type===RoomType.MINIBOSS)return held<3?1:.42;
  if(room.type===RoomType.SUBBOSS)return held<2?.38:held===2?.20:.08;
  if(room.type!==RoomType.COMBAT&&room.type!==RoomType.CHALLENGE)return 0;

  if(pity>=4&&held<3)return 1;
  const danger=room.modifier?.08:room.type===RoomType.CHALLENGE?.06:0;
  const base=.12+Math.max(0,pity)*.10+danger;
  const supply=held>=4?.08:held===3?.20:held===2?.55:1;
  return Math.min(.72,base*supply);
}

export function bankKeyPityAfterAttempt(pity:number,dropped:boolean,eligible:boolean):number {
  if(!eligible)return pity;
  return dropped?0:Math.min(4,pity+1);
}
