import type { EventKind } from './types';
export const EVENTS:Record<EventKind,{name:string;description:string;options:string[];icon:string}> = {
  safe:{name:'CAJA FUERTE ABANDONADA',description:'Paga 18 migajas por un objeto raro.',options:['PAGAR 18','DEJARLA'],icon:'vault_map'},
  bakery:{name:'PANADERÍA CLANDESTINA',description:'Entrega 1 corazón por un objeto pasivo.',options:['DAR 1 CORAZÓN','PASAR'],icon:'garlic_bread'},
  vending:{name:'MÁQUINA EXPENDEDORA',description:'8 migajas por una comida al azar.',options:['COMPRAR · 8','PASAR'],icon:'bread_box'},
  injured:{name:'PATO HERIDO',description:'Dale 1 corazón. Te regala 8 monedas.',options:['AYUDAR','SEGUIR'],icon:'mother_duck'},
  interrogation:{name:'SALA DE INTERROGATORIO',description:'Paga 15 migajas o combate una patrulla élite.',options:['PAGAR 15','LUCHAR'],icon:'stolen_helmet'},
  atm:{name:'CAJERO ROTO',description:'12 migajas: 35% de ganar 8 monedas.',options:['PROBAR · 12','PASAR'],icon:'clandestine_account'},
  security_terminal:{name:'PEDESTAL DE SEGURIDAD',description:'12 migajas: reduce la alerta y revela al jefe del piso.',options:['INTERVENIR · 12','DEJARLO'],icon:'vault_map'},
  field_medic:{name:'PEDESTAL MÉDICO',description:'10 migajas: recupera 1 corazón si estás herido.',options:['CURAR · 10','PASAR'],icon:'bread_helmet'},
  weapon_forge:{name:'PEDESTAL DEL ARSENAL',description:'24 migajas: fabrica un arma aleatoria para recoger.',options:['FABRICAR · 24','PASAR'],icon:'golden_beak'},
  bread_altar:{name:'ALTAR DE LA MIGA',description:'Entrega 1 corazón por una recompensa de jefe.',options:['OFRECER 1 CORAZÓN','ALEJARSE'],icon:'holy_crumb'},
};