import type { EventKind } from './types';
export const EVENTS:Record<EventKind,{name:string;description:string;options:string[];icon:string}> = {
  safe:{name:'CAJA FUERTE ABANDONADA',description:'Paga 18 migajas por un objeto raro.',options:['PAGAR 18','DEJARLA'],icon:'vault_map'},
  bakery:{name:'PANADERÍA CLANDESTINA',description:'Entrega 1 corazón por un objeto pasivo.',options:['DAR 1 CORAZÓN','PASAR'],icon:'garlic_bread'},
  vending:{name:'MÁQUINA EXPENDEDORA',description:'8 migajas por una comida al azar.',options:['COMPRAR · 8','PASAR'],icon:'bread_box'},
  injured:{name:'PATO HERIDO',description:'Dale 1 corazón. Te regala 8 monedas doradas.',options:['AYUDAR','SEGUIR'],icon:'mother_duck'},
  interrogation:{name:'SALA DE INTERROGATORIO',description:'Paga 15 migajas o combate una patrulla élite.',options:['PAGAR 15','LUCHAR'],icon:'stolen_helmet'},
  atm:{name:'CAJERO ROTO',description:'12 migajas: 35% de ganar 8 monedas doradas.',options:['PROBAR · 12','PASAR'],icon:'clandestine_account'},
};