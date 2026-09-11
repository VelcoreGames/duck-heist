// Declarative modifiers are evaluated by the existing combat engine. Flags
// have dedicated hooks for room entry, floor entry, shooting and damage.
import { EXPANSION_ITEMS } from './expansion';
export interface BuildEffects {
  damage: number; damageScale: number; speed: number; fireRate: number;
  projectileSpeed: number; bounces: number; penetration: number; crit: number;
  healing: number; maxHearts: number; contactReduction: number; shop: number;
  floorCrumbs: number; floorShield: number; roomShield: number;
  contactShield:number;
  extraDrop: number; extraCrumbs: number; rewardChance: number; rarityLuck: number;
  specialReward:number;
  projectileBlock: number; block: number; slow: number; magnet: number;
  dashDistance: number; dashCooldown: number; activeCooldown: number;
  burn: number; duplicates: number; companion: number; aura: number;
  debt: number; smoke: number; toaster: number; map: number; reveal: number;
  triple: number; orbit: number; family: number; ultra: number; uranium: number;
  goldCrit: number; spicyCrit: number; honey: number; coupon: number;
  ghost: number; infinite: number; king: number; armor: number;
  accuracy: number; enemySpeed: number; helmet: number; bribe: number; pond: number;
  currencyScale:number;firstDiscount:number;dashHaste:number;firstHitReduction:number;chocolate:number;
  critCoinChance:number;wetSocks:number;fifthBounce:number;reflectChance:number;keepFood:number;
  blueprint:number;gps:number;stainedMap:number;guardLenses:number;shopReveal:number;
  sneeze:number;bounceDamage:number;dashDamage:number;burnChance:number;sticky:number;confetti:number;
  extraEnemy:number;foodEvery:number;lethalSave:number;twinCannon:number;spiral:number;
  chicken:number;bodyguard:number;explosionScale:number;explosiveRate:number;radiation:number;
  crown:number;cooldownRate:number;eliteChance:number;overdraft:number;alertGrowth:number;
}
export type Rule = Partial<BuildEffects>;
export const BASE_EFFECTS: BuildEffects = {
  damage:0, damageScale:1, speed:1, fireRate:1, projectileSpeed:1, bounces:0, penetration:0, crit:0,
  healing:1, maxHearts:0, contactReduction:0, shop:1, floorCrumbs:0, floorShield:0, roomShield:0,contactShield:0,
  extraDrop:0, extraCrumbs:0, rewardChance:0, rarityLuck:0,specialReward:0, projectileBlock:0, block:0, slow:0,
  magnet:22, dashDistance:1, dashCooldown:1, activeCooldown:1, burn:0, duplicates:0, companion:0,
  aura:0, debt:0, smoke:0, toaster:0, map:0, reveal:0, triple:0, orbit:0, family:0, ultra:0,
  uranium:0, goldCrit:0, spicyCrit:0, honey:0, coupon:0, ghost:0, infinite:0, king:0, armor:0,
  accuracy:1, enemySpeed:1, helmet:0, bribe:0, pond:0,
  currencyScale:1,firstDiscount:0,dashHaste:0,firstHitReduction:0,chocolate:0,critCoinChance:0,
  wetSocks:0,fifthBounce:0,reflectChance:0,keepFood:0,blueprint:0,gps:0,stainedMap:0,guardLenses:0,shopReveal:0,
  sneeze:0,bounceDamage:0,dashDamage:0,burnChance:0,sticky:0,confetti:0,extraEnemy:0,foodEvery:0,
  lethalSave:0,twinCannon:0,spiral:0,chicken:0,bodyguard:0,explosionScale:1,explosiveRate:1,radiation:0,
  crown:0,cooldownRate:1,eliteChance:0,overdraft:0,alertGrowth:1,
};

export const PASSIVE_RULES: Record<string, Rule> = {
  bread_helmet:{maxHearts:1, helmet:1}, lucky_feather:{crit:.15,rarityLuck:.12,extraDrop:.05},
  greasy_wings:{speed:.3}, double_yolk:{duplicates:.2}, mother_duck:{companion:1},
  bread_magnet:{magnet:62}, hot_sauce:{burn:180}, butter:{bounces:1}, toaster:{toaster:1},
  golden_beak:{extraDrop:.1}, angry_goose_feather:{damageScale:.3,enemySpeed:.15},
  pond_water:{pond:1}, bread_crust:{block:.2}, donut_bribe:{bribe:1}, smoke_feather:{smoke:1},
  vault_map:{map:1}, wide_belt:{extraCrumbs:1,dashCooldown:-.2}, magnetic_crumbs:{magnet:128},
  soapy_feet:{speed:.15,dashDistance:.15}, garlic_bread:{aura:3}, steel_feathers:{penetration:1},
  gas_coffee:{fireRate:.2,accuracy:.05}, tactical_mayo:{slow:.15}, eggshell:{floorShield:1},
  debt:{debt:1}, cardboard_vest:{projectileBlock:.12}, stolen_map:{reveal:1},
  monocle:{rarityLuck:.2}, broken_alarm:{rewardChance:.08},
};

type PassiveRow = [id:string, name:string, effect:string, rarity:number, flavor:string, rule:Rule];
export const NEW_PASSIVE_ITEMS: PassiveRow[] = [
  ['toasted_bread','PAN TOSTADO','+1 daño.',0,'Más duro. Más peligroso.',{damage:1}],
  ['industrial_butter','MANTEQUILLA INDUSTRIAL','+1 rebote. Primer rebote: +20% daño.',1,'Grasa táctica.',{bounces:1}],
  ['hard_egg','HUEVO DURO','+1 corazón máximo. -5% velocidad.',1,'Protección ovalada.',{maxHearts:1,speed:-.05}],
  ['sharp_beak','PICO AFILADO','+2 daño.',2,'No es para abrir sobres.',{damage:2}],
  ['aerodynamic_feather','PLUMA AERODINÁMICA','+15% velocidad de proyectil.',1,'Ahora con menos resistencia.',{projectileSpeed:.15}],
  ['running_feet','PATAS DE CARRERA','+12% velocidad de movimiento.',1,'Sin dejar de parecer culpable.',{speed:.12}],
  ['wholegrain','PAN INTEGRAL','La comida cura un 25% más.',2,'Fibra y antecedentes.',{healing:.25}],
  ['suspicious_seeds','SEMILLAS SOSPECHOSAS','10% de soltar migajas extra.',0,'No preguntes qué crece.',{extraDrop:.1}],
  ['tactical_napkin','SERVILLETA TÁCTICA','Bloquea el primer proyectil de cada sala.',2,'Limpia incluso las balas.',{roomShield:1}],
  ['stolen_helmet','CASCO DE POLICÍA ROBADO','-10% daño de contacto policial.',1,'Un préstamo sin permiso.',{contactReduction:.1}],
  ['fortunate_plume','PLUMA CON SUERTE','+8% probabilidad de crítico.',1,'La suerte tiene plumas.',{crit:.08}],
  ['crumb_bag','BOLSA DE MIGAS','+10 migajas al comenzar cada piso.',1,'Provisiones para el delito.',{floorCrumbs:10}],
  ['clandestine_account','CUENTA CLANDESTINA','Las tiendas cuestan un 10% menos.',2,'Sin preguntas fiscales.',{shop:-.1}],
  ['reinforced_shell','CASCARÓN REFORZADO','1 escudo por piso; bloquea daño de contacto.',2,'Huevo con homologación.',{contactShield:1}],
  ['wet_bread','PAN MOJADO','Los impactos ralentizan un 8% durante 2 s.',1,'Triste, pero eficaz.',{slow:.08}],
  ['spicy_egg','HUEVO PICANTE','Los críticos queman durante 3 s.',2,'La yema tiene mal genio.',{spicyCrit:1}],
  ['honey_bread','PAN CON MIEL','Curarte da +10% velocidad durante 5 s.',1,'Una huida pegajosa.',{honey:1}],
  ['faulty_alarm','ALARMA DESCOMPUESTA','+12% botín de mayor rareza en salas especiales.',2,'Silencio muy rentable.',{specialReward:.12}],
  ['stolen_coupon','CUPÓN ROBADO','Primera compra de cada piso: -25%.',1,'No acumulable con la ley.',{coupon:1}],
  ['ghost_feather','PLUMA FANTASMA','Al terminar el esquive: 0.3 s de invulnerabilidad.',2,'La policía vio un fantasma.',{ghost:1}],
  ['triple_yolk','TRIPLE YEMA','Cada cuarto disparo añade dos proyectiles.',3,'Tres yemas. Menos preguntas.',{triple:1}],
  ['blessed_bread','PAN BENDITO','Los disparos orbitan 0.35 s antes de salir.',3,'Pan con trayectoria divina.',{orbit:1}],
  ['pocket_duck','PATO DE BOLSILLO','Un patito dispara 4 de daño cada 0.8 s.',2,'Pequeño cómplice.',{companion:1}],
  ['large_family','FAMILIA NUMEROSA','Dos patitos disparan 2 de daño cada 0.8 s.',3,'Atraco familiar.',{family:1}],
  ['bottomless_bag','BOLSA SIN FONDO','+2 migajas por baja. Tiendas +15%.',2,'El gerente también lo sabe.',{extraCrumbs:2,shop:.15}],
  ['recharged_quack','CUAC RECARGADO','-25% tiempo de recarga del objeto activo.',2,'Garganta de repuesto.',{activeCooldown:-.25}],
  ['ultra_quack','ULTRA CUAC','Las ondas CUAC hacen 18 de daño extra.',3,'Prohibido en bibliotecas.',{ultra:1}],
  ['turbo_feather','PLUMA TURBO','Esquive: +30% distancia; +15% tiempo de recarga.',2,'Frenar es otro problema.',{dashDistance:.3,dashCooldown:.15}],
  ['uranium_bread','PAN DE URANIO','Balas grandes. +25% daño; -15% cadencia.',4,'No lo metas en la tostadora.',{damageScale:.25,fireRate:-.15,uranium:1}],
  ['golden_egg','HUEVO DORADO','Los críticos tienen 35% de crear una migaja.',4,'Rentabilidad por impacto.',{goldCrit:1}],
  ['infinite_quack','CUAC INFINITO','Cada baja reduce 0.5 s la recarga del objeto activo.',4,'Sin pausa para respirar.',{infinite:1}],
  ['crumb_king','REY DE LAS MIGAS','Las migajas cercanas orbitan y hacen 2 de daño.',4,'Tu fortuna lucha por ti.',{king:1,magnet:78}],
  ['baguette_armor','ARMADURA DE BAGUETTE','1 escudo por piso. Al romperse, explota.',4,'Crujiente por fuera.',{armor:1,floorShield:1}],
];
NEW_PASSIVE_ITEMS.forEach(([id,,,,, rule]) => { PASSIVE_RULES[id] = rule; });
EXPANSION_ITEMS.forEach(item=>{PASSIVE_RULES[item.id]=item.rule;});

export type ActiveAction = 'quack'|'bomb'|'decoy'|'stun'|'coffee'|'heal'|'mega'|'grenade'|'lure'|'siren'|'doubleCoffee'|'tray'|'food'|'chaos';
export const ACTIVE_RULES: Record<string, { action:ActiveAction; cooldown:number; duration?:number }> = {
  emergency_quack:{action:'quack',cooldown:180}, bread_bomb:{action:'bomb',cooldown:480},
  duck_decoy:{action:'decoy',cooldown:600,duration:360}, false_alarm:{action:'stun',cooldown:720,duration:150},
  coffee_machine:{action:'coffee',cooldown:900,duration:360}, holy_crumb:{action:'heal',cooldown:2400},
  megaphone:{action:'mega',cooldown:600}, bread_grenade:{action:'grenade',cooldown:540},
  rubber_lure:{action:'lure',cooldown:720,duration:480}, stolen_siren:{action:'siren',cooldown:660,duration:240},
  double_coffee:{action:'doubleCoffee',cooldown:600,duration:360}, tray_shield:{action:'tray',cooldown:720,duration:240},
  bread_box:{action:'food',cooldown:3600}, red_button:{action:'chaos',cooldown:1500},
};
export const NEW_ACTIVE_ITEMS: [string,string,string,number,string][] = [
  ['bread_grenade','GRANADA DE PAN','Lanza una granada hacia la mira. Explota 0.8 s después de caer.',2,'Pan con consecuencias.'],
  ['rubber_lure','PATITO SEÑUELO','Atrae enemigos 8 s. Explota al desaparecer.',2,'Un empleado desechable.'],
  ['stolen_siren','SIRENA ROBADA','Aturde a todos los policías durante 4 s.',2,'Orden de quedarse quieto.'],
  ['double_coffee','CAFÉ DOBLE','+50% cadencia durante 6 s.',1,'Con un toque de pánico.'],
  ['tray_shield','ESCUDO DE CHAROLA','Bloquea los proyectiles frontales durante 4 s.',2,'Servicio a prueba de balas.'],
  ['bread_box','CAJA DE PAN','Suelta 3 comidas. Recarga: 60 s.',3,'El botiquín del panadero.'],
  ['red_button','BOTÓN ROJO','Efecto potente al azar. Puede activar la alarma.',4,'No pone qué hace.'],
  ['remote_bomb','PAN BOMBA REMOTO','Coloca un pan. Vuelve a usar para detonarlo.',2,'Una trampa con corteza.'],
  ['butter_sprayer','ASPERSOR DE MANTEQUILLA','Rocía mantequilla hacia la mira. El piso se pone resbaloso.',2,'Cuidado con el piso.'],
  ['crumb_drone','MIGAJÓN DRON','Un dron ataca 10 s al enemigo más cercano.',2,'Vuela y delata.'],
  ['emergency_bread','PAN DE EMERGENCIA','Recupera 2 de vida. No se usa con la vida llena.',3,'El botiquín de verdad.'],
  ['fake_alarm','ALARMA FALSA','Una alarma atrae enemigos 4 s y luego aturde.',2,'Todos voltean para allá.'],
];

const cache = new WeakMap<object, { key:string; value:BuildEffects }>();
export function getBuild(player: { items:string[] }): BuildEffects {
  const key = player.items.join('|');
  const prev = cache.get(player);
  if (prev?.key === key) return prev.value;
  const value = { ...BASE_EFFECTS };
  for (const id of new Set(player.items)) {
    for (const [stat, amount] of Object.entries(PASSIVE_RULES[id] ?? {})) value[stat as keyof BuildEffects] += amount;
  }
  value.speed = Math.max(.55, value.speed); value.fireRate = Math.max(.5, value.fireRate);
  value.activeCooldown = Math.max(.3, value.activeCooldown); value.shop = Math.max(.5, value.shop);
  value.crit = Math.min(.7, value.crit); value.block = Math.min(.45, value.block);
  value.slow = Math.min(.6, value.slow); value.dashCooldown = Math.max(.35, value.dashCooldown);
  value.healing=Math.max(.25,value.healing);value.cooldownRate=Math.min(2,value.cooldownRate);
  value.firstDiscount=Math.min(.5,value.firstDiscount);value.alertGrowth=Math.max(.4,value.alertGrowth);
  cache.set(player,{ key, value }); return value;
}

export const FOODS: Record<string,{name:string;description:string;heal:number;rarity:number;flavor:string}> = {
  hp:{name:'REBANADA DE PAN',description:'Recupera 1 corazón.',heal:1,rarity:0,flavor:'Botiquín con corteza.'},
  sandwich:{name:'SÁNDWICH',description:'Recupera 2 corazones.',heal:2,rarity:1,flavor:'Doble capa de esperanza.'},
  baguette:{name:'BAGUETTE',description:'Recupera 2 corazones.',heal:2,rarity:1,flavor:'Esta no explota.'},
  croissant:{name:'CUERNITO',description:'Recupera 1 vida; +25% velocidad durante 6 s.',heal:1,rarity:1,flavor:'Hojaldre a la fuga.'},
  torta:{name:'PASTEL GIGANTE',description:'Recupera 3 de vida.',heal:3,rarity:2,flavor:'Feliz cumpleaños, prófugo.'},
  pan_dorado:{name:'PAN DORADO',description:'Recupera todos los corazones.',heal:99,rarity:4,flavor:'La salud no tiene precio.'},
};