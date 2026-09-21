// Expansión masiva de jefes para Duck Heist.
// Cada enemigo nuevo recibe una firma de combate data-driven única.

export type BossTier='mini'|'sub'|'boss';
export type BossFamily='command'|'finance'|'bakery'|'tech'|'riot'|'war'|'wealth'|'vault';
export type BossAttackKind='fan'|'ring'|'spiral'|'crossfire'|'cage'|'mines'|'lanes'|'rush'|'summon'|'sniper'|'nova'|'warp';
export type BossMobility='hunter'|'orbit'|'skirmish'|'fortress'|'ambush';

export interface BossPatternDef {
  signature:string;
  sequence:BossAttackKind[];
  projectile:string;
  altProjectile:string;
  support:string[];
  mobility:BossMobility;
  tempo:number;
  count:number;
  spread:number;
  speed:number;
  phaseShift:number;
  hazardRadius:number;
  orbitBias:number;
}

export interface BossDef {
  id:string;name:string;subtitle:string;
  hp:number;speed:number;size:number;phases:number;
  family:BossFamily;accent:string;secondary:string;
  pattern:BossPatternDef;
  floorBand:number;
  legacy?:boolean;
  finalBoss?:boolean;
}

type Seed=[string,string,BossFamily,string,boolean?];

export const BOSS_FAMILY_STYLE:Record<BossFamily,{accent:string;secondary:string;projectile:string;altProjectile:string;support:string[]}> = {
  command:{accent:'#5f89df',secondary:'#f3b65b',projectile:'enemy_bullet',altProjectile:'buckshot',support:['policia_pato','policia_rapido','policia_capitan']},
  finance:{accent:'#70b49f',secondary:'#e0b85a',projectile:'coin_proj',altProjectile:'briefcase',support:['banker_chicken','policia_pato','policia_capitan']},
  bakery:{accent:'#e29355',secondary:'#ffd47a',projectile:'dough_ball',altProjectile:'toast',support:['evil_croissant','rolling_bagel','toaster_turret']},
  tech:{accent:'#55cbe0',secondary:'#f26b6b',projectile:'drone_shot',altProjectile:'enemy_bullet',support:['dron_policial','security_camera','camara_movil']},
  riot:{accent:'#879aaa',secondary:'#5d7faf',projectile:'enemy_bullet',altProjectile:'buckshot',support:['policia_antidisturbios','policia_escopeta','ganso_k9']},
  war:{accent:'#7d8faa',secondary:'#dc5e52',projectile:'buckshot',altProjectile:'enemy_bullet',support:['policia_rapido','policia_escopeta','policia_capitan']},
  wealth:{accent:'#e5bd45',secondary:'#fff0a1',projectile:'coin_proj',altProjectile:'briefcase',support:['banker_chicken','policia_capitan','policia_medico']},
  vault:{accent:'#8e82d9',secondary:'#6bd4c4',projectile:'drone_shot',altProjectile:'coin_proj',support:['security_camera','dron_policial','policia_antidisturbios']},
};

const ATTACKS:BossAttackKind[]=['fan','ring','spiral','crossfire','cage','mines','lanes','rush','summon','sniper','nova','warp'];
const MOBILITY:BossMobility[]=['hunter','orbit','skirmish','fortress','ambush'];

function patternFor(tier:BossTier,index:number,family:BossFamily):BossPatternDef {
  const salt=tier==='mini'?0:tier==='sub'?4:8;
  const wanted=tier==='mini'?4:tier==='sub'?5:6;
  const raw=[
    (index*3+salt)%ATTACKS.length,
    (index*5+1+salt)%ATTACKS.length,
    (index*7+4+salt)%ATTACKS.length,
    (index*11+6+salt)%ATTACKS.length,
    (index*13+9+salt)%ATTACKS.length,
    (index*17+2+salt)%ATTACKS.length,
  ];
  const sequence:BossAttackKind[]=[];
  for(const n of raw){const a=ATTACKS[n];if(!sequence.includes(a))sequence.push(a);}
  for(let i=0;sequence.length<wanted;i++){const a=ATTACKS[(i+index+salt)%ATTACKS.length];if(!sequence.includes(a))sequence.push(a);}
  const style=BOSS_FAMILY_STYLE[family];
  const mobility=MOBILITY[(index*2+salt)%MOBILITY.length];
  const tempo=Number((.82+(index%7)*.045+(tier==='mini'?.04:tier==='boss'?-0.035:0)).toFixed(3));
  const count=3+(index%5)*2+(tier==='boss'?2:tier==='sub'?1:0);
  const spread=Number((.08+(index%6)*.022).toFixed(3));
  const speed=Number((2.45+(index%7)*.18+(tier==='boss'?.15:0)).toFixed(2));
  const phaseShift=1+(index%3);
  const hazardRadius=15+(index%5)*3+(tier==='boss'?3:tier==='sub'?1:0);
  const orbitBias=Number((((index%7)-3)*.075).toFixed(3));
  return {
    signature:[tier,index+1,family,mobility,...sequence,tempo,count,spread,speed,phaseShift,hazardRadius,orbitBias].join(':'),
    sequence,projectile:style.projectile,altProjectile:style.altProjectile,support:[...style.support],
    mobility,tempo,count,spread,speed,phaseShift,hazardRadius,orbitBias,
  };
}

const LEGACY_STATS:Record<string,Partial<BossDef>>={
  tax_collector:{hp:125,speed:1.9,size:25},
  sargento_migajas:{hp:135,speed:1.4,size:27},
  dron_centinela:{hp:145,speed:1.5,size:27},
  panadero_loco:{hp:150,speed:1.25,size:27},
  head_baker:{hp:190,speed:1.25,size:30},
  el_auditor:{hp:185,speed:1.2,size:30},
  ganso_antidisturbios:{hp:220,speed:1,size:32},
  cajero_3000:{hp:230,speed:.85,size:34},
  captain_honk:{hp:260,speed:1.55,size:34},
  comisario_pico_duro:{hp:300,speed:1.4,size:34},
  toaster_9000:{hp:340,speed:.9,size:42},
  general_ganso:{hp:380,speed:1.15,size:38},
  don_levadura:{hp:360,speed:1.05,size:38},
  director_seguridad:{hp:420,speed:1.02,size:40},
};

function build(seed:Seed,index:number,tier:BossTier):BossDef {
  const [id,name,family,subtitle,legacy]=seed;
  // 48 encuentros por jerarquía: 10/10/10/10/8 entre los cinco primeros pisos.
  const band=Math.min(4,Math.floor(index/10)),slot=index%10;
  const style=BOSS_FAMILY_STYLE[family];
  const hp=tier==='mini'?122+band*13+slot*4:tier==='sub'?184+band*20+slot*6:255+band*34+slot*9;
  const speed=tier==='mini'?1.22+(slot%5)*.12:tier==='sub'?1.02+(slot%5)*.09:.92+(slot%5)*.085;
  const size=tier==='mini'?25+(slot%3):tier==='sub'?30+(slot%4):35+(slot%5);
  const base:BossDef={
    id,name,subtitle,hp,speed,size,phases:tier==='mini'?1:tier==='sub'?2:3,
    family,accent:style.accent,secondary:style.secondary,
    pattern:patternFor(tier,index,family),floorBand:band,legacy,
  };
  return {...base,...(LEGACY_STATS[id]??{})};
}

const MINI_SEEDS:Seed[]=[
  [
    "tax_collector",
    "EL RECAUDADOR",
    "finance",
    "Maletines, cobros y multas de área",
    true
  ],
  [
    "sargento_migajas",
    "SARGENTO MIGAJAS",
    "war",
    "Escopeta, carga y refuerzos",
    true
  ],
  [
    "dron_centinela",
    "DRON CENTINELA",
    "tech",
    "Anillos, barridos y microdrones",
    true
  ],
  [
    "panadero_loco",
    "EL PANADERO LOCO",
    "bakery",
    "Bombas de masa y zonas de horno",
    true
  ],
  [
    "cobrador_nocturno",
    "COBRADOR NOCTURNO",
    "finance",
    "Deudas marcadas · ráfagas cerradas · retirada súbita"
  ],
  [
    "teniente_tostada",
    "TENIENTE TOSTADA",
    "command",
    "Formación corta · fuego cruzado · carga disciplinada"
  ],
  [
    "sabueso_de_caja",
    "SABUESO DE CAJA",
    "riot",
    "Persecución feroz · cerco móvil · mordida de choque"
  ],
  [
    "cajero_fantasma",
    "CAJERO FANTASMA",
    "tech",
    "Teletransporte corto · monedas rápidas · emboscada digital"
  ],
  [
    "inspectora_miga",
    "INSPECTORA MIGA",
    "finance",
    "Auditoría móvil · minas de recibos · disparos de precisión"
  ],
  [
    "granadero_mantequilla",
    "GRANADERO MANTEQUILLA",
    "war",
    "Bombardeo resbaladizo · abanicos · avance agresivo"
  ],
  [
    "chef_de_guardia",
    "CHEF DE GUARDIA",
    "bakery",
    "Masa caliente · jaulas de horno · persecución corta"
  ],
  [
    "dron_avispa",
    "DRON AVISPA",
    "tech",
    "Picadas rápidas · espiral eléctrica · reposicionamiento"
  ],
  [
    "cabo_candado",
    "CABO CANDADO",
    "command",
    "Bloqueo de rutas · ráfagas · entrada por sorpresa"
  ],
  [
    "corredor_de_valores",
    "CORREDOR DE VALORES",
    "wealth",
    "Monedas veloces · órbitas doradas · salto de mercado"
  ],
  [
    "ganso_de_cobranza",
    "GANSO DE COBRANZA",
    "riot",
    "Empuje frontal · muro de plumas · presión continua"
  ],
  [
    "tostador_tactico",
    "TOSTADOR TÁCTICO",
    "tech",
    "Líneas calientes · doble anillo · sobrecarga breve"
  ],
  [
    "contador_rojo",
    "CONTADOR ROJO",
    "finance",
    "Cuentas explosivas · abanico fino · jaula fiscal"
  ],
  [
    "hornero_fugitivo",
    "HORNERO FUGITIVO",
    "bakery",
    "Carreras impredecibles · minas de masa · llamaradas"
  ],
  [
    "centinela_boveda",
    "CENTINELA DE BÓVEDA",
    "vault",
    "Barrido de bóveda · pulso radial · defensa orbital"
  ],
  [
    "patrullero_brioche",
    "PATRULLERO BRIOCHE",
    "command",
    "Patrulla en arco · refuerzo rápido · ráfaga de cobertura"
  ],
  [
    "alguacil_bagel",
    "ALGUACIL BAGEL",
    "war",
    "Carga circular · metralla · cerco de choque"
  ],
  [
    "robot_cobrador",
    "ROBOT COBRADOR",
    "tech",
    "Facturas láser · salto mecánico · anillos sincronizados"
  ],
  [
    "inspector_glaseado",
    "INSPECTOR GLASEADO",
    "bakery",
    "Charcos pegajosos · disparo fino · espiral dulce"
  ],
  [
    "guardia_moneda",
    "GUARDIA MONEDA",
    "wealth",
    "Escudo de capital · nova dorada · contraataque"
  ],
  [
    "agente_croissant",
    "AGENTE CROISSANT",
    "command",
    "Pinza veloz · abanico curvo · llamada de apoyo"
  ],
  [
    "liquidador_de_pan",
    "LIQUIDADOR DE PAN",
    "finance",
    "Cobro total · líneas contables · ráfaga de maletines"
  ],
  [
    "dron_buitre",
    "DRON BUITRE",
    "tech",
    "Órbita alta · picado láser · cerco de proyectiles"
  ],
  [
    "sargento_horno",
    "SARGENTO HORNO",
    "war",
    "Marcha ardiente · disparos alternos · carga larga"
  ],
  [
    "cerrajero_negro",
    "CERRAJERO NEGRO",
    "vault",
    "Cierra salidas · minas de llave · emboscada lateral"
  ],
  [
    "interventor_manteca",
    "INTERVENTOR MANTECA",
    "finance",
    "Círculos de embargo · disparos lentos · reposición"
  ],
  [
    "ganso_cerrojo",
    "GANSO CERROJO",
    "riot",
    "Ariete frontal · jaula defensiva · lluvia corta"
  ],
  [
    "repostero_balistico",
    "REPOSTERO BALÍSTICO",
    "bakery",
    "Bollos balísticos · espiral · horno de proximidad"
  ],
  [
    "visor_de_boveda",
    "VISOR DE BÓVEDA",
    "vault",
    "Tiro de precisión · telemetría · anillo de seguridad"
  ],
  [
    "cobrador_dorado",
    "COBRADOR DORADO",
    "wealth",
    "Monedas pesadas · salto brillante · abanico de lujo"
  ],
  [
    "caporal_centeno",
    "CAPORAL CENTENO",
    "war",
    "Ráfaga militar · embestida · refuerzos de choque"
  ],
  [
    "dron_cerbero",
    "DRON CERBERO",
    "tech",
    "Tres líneas de fuego · órbita doble · salto digital"
  ],
  [
    "alguacil_deposito",
    "ALGUACIL DEPÓSITO",
    "command",
    "Control territorial · fuego cruzado · captura rápida"
  ],
  [
    "fiscal_del_pan",
    "FISCAL DEL PAN",
    "finance",
    "Sentencia radial · multas explosivas · tiro estrecho"
  ],
  [
    "guardia_fortuna",
    "GUARDIA FORTUNA",
    "wealth",
    "Nova de monedas · jaula dorada · retirada táctica"
  ],
  [
    "vigilante_levadura",
    "VIGILANTE LEVADURA",
    "bakery",
    "Fermentación rápida · minas vivas · espiral final"
  ],
  [
    "verdugo_del_ticket",
    "VERDUGO DEL TICKET",
    "finance",
    "Recibos cortantes · jaula de deuda · salto fiscal"
  ],
  [
    "centinela_termico",
    "CENTINELA TÉRMICO",
    "tech",
    "Barrido de calor · órbita rápida · mina de reactor"
  ],
  [
    "brigadier_baguette",
    "BRIGADIER BAGUETTE",
    "war",
    "Lanzas de pan · carga oblicua · fuego de cobertura"
  ],
  [
    "cazador_de_claves",
    "CAZADOR DE CLAVES",
    "vault",
    "Cerrojos móviles · disparo espejo · emboscada de bóveda"
  ],
  [
    "ganso_de_reserva",
    "GANSO DE RESERVA",
    "riot",
    "Ariete corto · bloqueo lateral · nova defensiva"
  ],
  [
    "operador_central",
    "OPERADOR CENTRAL",
    "command",
    "Órdenes remotas · refuerzo medido · fuego triangular"
  ],
  [
    "pastelero_de_choque",
    "PASTELERO DE CHOQUE",
    "bakery",
    "Bombas dulces · suelo pegajoso · espiral de horno"
  ],
  [
    "corredor_platino",
    "CORREDOR PLATINO",
    "wealth",
    "Órbitas de capital · teletransporte · disparo bursátil"
  ]
];
const SUB_SEEDS:Seed[]=[
  [
    "head_baker",
    "EL PANADERO JEFE",
    "bakery",
    "Masa explosiva · transformación de fermento",
    true
  ],
  [
    "el_auditor",
    "EL AUDITOR",
    "finance",
    "Maletines explosivos · revisión total",
    true
  ],
  [
    "ganso_antidisturbios",
    "GANSO ANTIDISTURBIOS",
    "riot",
    "Escudo frontal · furia sin blindaje",
    true
  ],
  [
    "cajero_3000",
    "CAJERO 3000",
    "finance",
    "Monedas, láser y modo emergencia",
    true
  ],
  [
    "interventor_general",
    "INTERVENTOR GENERAL",
    "finance",
    "Embargos concéntricos · inspección móvil · cierre de cuentas"
  ],
  [
    "mariscal_tostada",
    "MARISCAL TOSTADA",
    "war",
    "Artillería de horno · cargas · contraofensiva"
  ],
  [
    "custodio_boveda",
    "CUSTODIO DE BÓVEDA",
    "vault",
    "Cercos de acero · teletransporte · sello de seguridad"
  ],
  [
    "maestra_horno",
    "MAESTRA DEL HORNO",
    "bakery",
    "Oleadas de calor · masa viva · anillos incendiarios"
  ],
  [
    "comandante_caja",
    "COMANDANTE CAJA",
    "command",
    "Fuego escalonado · refuerzos · maniobra de pinza"
  ],
  [
    "auditor_espectral",
    "AUDITOR ESPECTRAL",
    "finance",
    "Apariciones fiscales · disparos gemelos · jaula de deuda"
  ],
  [
    "coloso_antidisturbios",
    "COLOSO ANTIDISTURBIOS",
    "riot",
    "Muralla móvil · embestida doble · ondas de choque"
  ],
  [
    "terminal_omega",
    "TERMINAL OMEGA",
    "tech",
    "Barridos láser · espirales · protocolos de emergencia"
  ],
  [
    "prefecto_migajas",
    "PREFECTO MIGAJAS",
    "command",
    "Formaciones · castigo radial · refuerzo selectivo"
  ],
  [
    "chef_incendiario",
    "CHEF INCENDIARIO",
    "bakery",
    "Líneas de horno · minas calientes · persecución"
  ],
  [
    "inspector_de_oro",
    "INSPECTOR DE ORO",
    "wealth",
    "Monedas orbitales · embargo dorado · salto de capital"
  ],
  [
    "guardian_cerbero",
    "GUARDIÁN CERBERO",
    "vault",
    "Tres frentes · jaulas · reposicionamiento defensivo"
  ],
  [
    "coronel_centeno",
    "CORONEL CENTENO",
    "war",
    "Ráfagas militares · cargas en fases · fuego cruzado"
  ],
  [
    "notario_negro",
    "NOTARIO NEGRO",
    "finance",
    "Sellos explosivos · sentencia de área · tiro quirúrgico"
  ],
  [
    "dron_arconte",
    "DRON ARCONTE",
    "tech",
    "Órbitas múltiples · picado · relámpagos radiales"
  ],
  [
    "hornero_de_hierro",
    "HORNERO DE HIERRO",
    "bakery",
    "Blindaje caliente · nova · fermentación agresiva"
  ],
  [
    "alguacil_capital",
    "ALGUACIL CAPITAL",
    "command",
    "Cerco legal · líneas de tiro · llamada de élite"
  ],
  [
    "cobrador_supremo",
    "COBRADOR SUPREMO",
    "finance",
    "Cobros sucesivos · maletines · persecución de deuda"
  ],
  [
    "muralla_ganso",
    "MURALLA GANSO",
    "riot",
    "Bloqueo frontal · anillos lentos · ariete"
  ],
  [
    "protocolo_sigma",
    "PROTOCOLO SIGMA",
    "tech",
    "Secuencias láser · teleport · sobrecarga de arena"
  ],
  [
    "tesorero_roto",
    "TESORERO ROTO",
    "wealth",
    "Tormenta de monedas · mina dorada · carrera errática"
  ],
  [
    "verdugo_brioche",
    "VERDUGO BRIOCHE",
    "war",
    "Cuchilladas de metralla · carga · cerco ardiente"
  ],
  [
    "maestro_candado",
    "MAESTRO CANDADO",
    "vault",
    "Cierra rutas · jaulas concéntricas · salto de bóveda"
  ],
  [
    "interventora_escarlata",
    "INTERVENTORA ESCARLATA",
    "finance",
    "Auditoría roja · abanicos · zonas prohibidas"
  ],
  [
    "bastion_caja",
    "BASTIÓN CAJA",
    "riot",
    "Defensa inmóvil · explosión radial · avance pesado"
  ],
  [
    "ingeniero_horno",
    "INGENIERO DEL HORNO",
    "bakery",
    "Geometría térmica · líneas · espirales de masa"
  ],
  [
    "canciller_miga",
    "CANCILLER MIGA",
    "command",
    "Orden de ataque · pinza · refuerzos sincronizados"
  ],
  [
    "auditor_cero",
    "AUDITOR CERO",
    "finance",
    "Vacío contable · teletransporte · disparos sin margen"
  ],
  [
    "leviatan_deposito",
    "LEVIATÁN DEPÓSITO",
    "vault",
    "Pulso de bóveda · anillos densos · embestida"
  ],
  [
    "general_bagel",
    "GENERAL BAGEL",
    "war",
    "Artillería circular · carga prolongada · escuadra"
  ],
  [
    "oraculo_cajero",
    "ORÁCULO CAJERO",
    "tech",
    "Predicción de ruta · láseres · minas digitales"
  ],
  [
    "jefe_de_turno",
    "JEFE DE TURNO",
    "command",
    "Cambio de formación · ráfaga · captura territorial"
  ],
  [
    "comisaria_glaseado",
    "COMISARIA GLASEADO",
    "bakery",
    "Pegamento dulce · jaula · proyectiles de masa"
  ],
  [
    "ariete_boveda",
    "ARIETE DE BÓVEDA",
    "riot",
    "Choque frontal · líneas blindadas · onda de presión"
  ],
  [
    "fiscal_mayor",
    "FISCAL MAYOR",
    "finance",
    "Sentencias sucesivas · abanico preciso · embargo total"
  ],
  [
    "custodio_umbra",
    "CUSTODIO UMBRA",
    "vault",
    "Sombras de bóveda · teleport · nova oscura"
  ],
  [
    "magistrado_del_pan",
    "MAGISTRADO DEL PAN",
    "finance",
    "Sentencia de área · sellos orbitales · persecución legal"
  ],
  [
    "arquitecta_de_boveda",
    "ARQUITECTA DE BÓVEDA",
    "vault",
    "Muros temporales · saltos geométricos · jaula de seguridad"
  ],
  [
    "mariscal_de_harina",
    "MARISCAL DE HARINA",
    "war",
    "Nube de harina · cargas dobles · artillería de masa"
  ],
  [
    "nucleo_cajero",
    "NÚCLEO CAJERO",
    "tech",
    "Reactor de monedas · espiral láser · teleport de emergencia"
  ],
  [
    "prefecta_antidisturbios",
    "PREFECTA ANTIDISTURBIOS",
    "riot",
    "Escudos rotativos · ariete · corredor de presión"
  ],
  [
    "tesorera_real",
    "TESORERA REAL",
    "wealth",
    "Anillos de oro · lluvia de capital · emboscada brillante"
  ],
  [
    "maestro_de_turno_negro",
    "MAESTRO DE TURNO NEGRO",
    "command",
    "Fuego por sectores · refuerzos élite · cerco sincronizado"
  ],
  [
    "abadesa_levadura",
    "ABADESA LEVADURA",
    "bakery",
    "Fermentación ritual · minas vivas · corona de fuego"
  ]
];
const BOSS_SEEDS:Seed[]=[
  [
    "captain_honk",
    "CAPITÁN HONK",
    "command",
    "Jefe de seguridad · control, supresión y ley marcial",
    true
  ],
  [
    "comisario_pico_duro",
    "COMISARIO PICO DURO",
    "command",
    "Formaciones, cerco y ejecución",
    true
  ],
  [
    "toaster_9000",
    "LA TOSTADORA 9000",
    "tech",
    "Calentamiento, sobrecarga y fusión",
    true
  ],
  [
    "general_ganso",
    "GENERAL GANSO",
    "war",
    "Armadura pesada que termina en furia de guerra",
    true
  ],
  [
    "don_levadura",
    "DON LEVADURA",
    "bakery",
    "Fermentación, expansión y horno vivo",
    true
  ],
  [
    "director_seguridad",
    "DIRECTOR DE SEGURIDAD",
    "tech",
    "Protocolo, contención y bloqueo total",
    true
  ],
  [
    "mariscal_boveda",
    "MARISCAL DE LA BÓVEDA",
    "vault",
    "Sellos de seguridad · anillos blindados · salto táctico"
  ],
  [
    "reina_caja_fuerte",
    "REINA CAJA FUERTE",
    "wealth",
    "Capital orbital · jaulas doradas · ejecución financiera"
  ],
  [
    "almirante_migaja",
    "ALMIRANTE MIGAJA",
    "war",
    "Flotas de proyectiles · cargas · fuego cruzado"
  ],
  [
    "gobernador_tostado",
    "GOBERNADOR TOSTADO",
    "bakery",
    "Horno político · minas · nova de brasas"
  ],
  [
    "baron_del_cobro",
    "BARÓN DEL COBRO",
    "finance",
    "Impuestos en espiral · embargo · persecución"
  ],
  [
    "arquitecto_horno",
    "ARQUITECTO DEL HORNO",
    "bakery",
    "Laberintos térmicos · líneas · fermentación"
  ],
  [
    "comandante_omega",
    "COMANDANTE OMEGA",
    "tech",
    "Protocolos rotativos · teleport · tormenta láser"
  ],
  [
    "dama_del_candado",
    "DAMA DEL CANDADO",
    "vault",
    "Cierres concéntricos · jaulas · emboscada"
  ],
  [
    "patriarca_brioche",
    "PATRIARCA BRIOCHE",
    "bakery",
    "Masa ancestral · anillos · oleadas de horno"
  ],
  [
    "general_deposito",
    "GENERAL DEPÓSITO",
    "command",
    "Fuerza combinada · refuerzos · avance por fases"
  ],
  [
    "duque_moneda",
    "DUQUE MONEDA",
    "wealth",
    "Lluvia dorada · órbitas · carga de capital"
  ],
  [
    "maestre_antidisturbios",
    "MAESTRE ANTIDISTURBIOS",
    "riot",
    "Muralla viviente · ariete · ondas de choque"
  ],
  [
    "oraculo_boveda",
    "ORÁCULO DE LA BÓVEDA",
    "vault",
    "Predice rutas · teleport · cerco geométrico"
  ],
  [
    "forjador_de_pan",
    "FORJADOR DE PAN",
    "bakery",
    "Horno de guerra · proyectiles densos · suelo ardiente"
  ],
  [
    "canciller_honk",
    "CANCILLER HONK",
    "command",
    "Órdenes encadenadas · fuego cruzado · escuadras"
  ],
  [
    "emperador_cajero",
    "EMPERADOR CAJERO",
    "finance",
    "Imperio de monedas · láser fiscal · embargo absoluto"
  ],
  [
    "reina_levadura",
    "REINA LEVADURA",
    "bakery",
    "Colonias de masa · espirales · explosión fermentada"
  ],
  [
    "titan_del_sello",
    "TITÁN DEL SELLO",
    "finance",
    "Sellos de impacto · minas · sentencia radial"
  ],
  [
    "director_omega",
    "DIRECTOR OMEGA",
    "tech",
    "IA de seguridad · barridos · salto de protocolo"
  ],
  [
    "mariscal_dorado",
    "MARISCAL DORADO",
    "wealth",
    "Ejército de capital · nova · cargas doradas"
  ],
  [
    "profeta_del_horno",
    "PROFETA DEL HORNO",
    "bakery",
    "Presagios de fuego · jaulas · espiral incandescente"
  ],
  [
    "leviatan_financiero",
    "LEVIATÁN FINANCIERO",
    "finance",
    "Deuda masiva · órbitas · presión incesante"
  ],
  [
    "duquesa_cerrojo",
    "DUQUESA CERROJO",
    "vault",
    "Bóveda móvil · cierres · teleport de castigo"
  ],
  [
    "regente_bagel",
    "REGENTE BAGEL",
    "war",
    "Artillería circular · persecución · cerco militar"
  ],
  [
    "general_caja_negra",
    "GENERAL CAJA NEGRA",
    "command",
    "Operación secreta · refuerzos · fuego en pinza"
  ],
  [
    "arconte_del_pan",
    "ARCONTE DEL PAN",
    "bakery",
    "Masa ritual · anillos dobles · horno de arena"
  ],
  [
    "gran_auditor",
    "GRAN AUDITOR",
    "finance",
    "Revisión total · sentencias · cero escapatoria"
  ],
  [
    "soberano_tostada",
    "SOBERANO TOSTADA",
    "tech",
    "Máquina regia · láseres · sobrecarga térmica"
  ],
  [
    "monarca_boveda",
    "MONARCA DE LA BÓVEDA",
    "vault",
    "Dominio territorial · jaulas · pulso blindado"
  ],
  [
    "comandante_absoluto",
    "COMANDANTE ABSOLUTO",
    "war",
    "Guerra total · cargas encadenadas · barridos"
  ],
  [
    "tesorero_inmortal",
    "TESORERO INMORTAL",
    "wealth",
    "Capital eterno · tormentas · anillos de monedas"
  ],
  [
    "guardian_del_nucleo",
    "GUARDIÁN DEL NÚCLEO",
    "tech",
    "Núcleo de seguridad · teleport · nova energética"
  ],
  [
    "ministro_de_hierro",
    "MINISTRO DE HIERRO",
    "riot",
    "Blindaje político · ariete · muro de proyectiles"
  ],
  [
    "rey_de_las_migajas",
    "REY DE LAS MIGAJAS",
    "wealth",
    "Corona de botín · jaulas doradas · ejecución radial"
  ],
  [
    "gran_mariscal_honk",
    "GRAN MARISCAL HONK",
    "war",
    "Doctrina total · cargas encadenadas · artillería circular"
  ],
  [
    "madre_de_la_boveda",
    "MADRE DE LA BÓVEDA",
    "vault",
    "Geometría imposible · jaulas móviles · salto de núcleo"
  ],
  [
    "zar_del_capital",
    "ZAR DEL CAPITAL",
    "wealth",
    "Tormenta bursátil · anillos dorados · embargo imperial"
  ],
  [
    "rector_del_horno",
    "RECTOR DEL HORNO",
    "bakery",
    "Horno absoluto · corredores de fuego · masa en espiral"
  ],
  [
    "primer_auditor",
    "PRIMER AUDITOR",
    "finance",
    "Auditoría suprema · sentencias cruzadas · cero margen"
  ],
  [
    "centurion_omega",
    "CENTURIÓN OMEGA",
    "tech",
    "Red de seguridad · teleport táctico · tormenta de pulsos"
  ],
  [
    "gran_comisaria",
    "GRAN COMISARIA",
    "command",
    "Cerco maestro · escuadras sincronizadas · fuego de ejecución"
  ],
  [
    "bastion_imperial",
    "BASTIÓN IMPERIAL",
    "riot",
    "Fortaleza móvil · ondas de choque · muro final"
  ]
];

export const MINIBOSSES:Record<string,BossDef>=Object.fromEntries(MINI_SEEDS.map((s,i)=>{const d=build(s,i,'mini');return [d.id,d];}));
export const SUBBOSSES:Record<string,BossDef>=Object.fromEntries(SUB_SEEDS.map((s,i)=>{const d=build(s,i,'sub');return [d.id,d];}));
const ROTATING_BOSSES:Record<string,BossDef>=Object.fromEntries(BOSS_SEEDS.map((s,i)=>{const d=build(s,i,'boss');return [d.id,d];}));

export const FINAL_BOSS_ID='bread_banker';
export const FINAL_BOSS:BossDef={
  id:FINAL_BOSS_ID,
  name:'EL GRAN JEFE DEL BANCO',
  subtitle:'Dueño del banco · tres fases · autoridad absoluta sobre toda la bóveda',
  hp:560,speed:1.18,size:44,phases:3,family:'wealth',
  accent:'#f4d03f',secondary:'#fff1a3',floorBand:5,finalBoss:true,
  pattern:{
    signature:'FINAL:wealth:warp:nova:crossfire:cage:summon:spiral',
    sequence:['warp','nova','crossfire','cage','summon','spiral'],
    projectile:'coin_proj',altProjectile:'briefcase',
    support:['banker_chicken','policia_capitan','dron_policial'],
    mobility:'ambush',tempo:.72,count:11,spread:.075,speed:3.15,phaseShift:2,hazardRadius:27,orbitBias:.12,
  },
};

export const BOSSES:Record<string,BossDef>={...ROTATING_BOSSES,[FINAL_BOSS_ID]:FINAL_BOSS};

function group(ids:string[],band:number){return ids.filter(id=>BOSSES[id]?.floorBand===band);}
function groupTier(record:Record<string,BossDef>,band:number){return Object.keys(record).filter(id=>record[id].floorBand===band);}

const rotatingIds=Object.keys(ROTATING_BOSSES);
export const FLOOR_BOSS_POOL:string[][]=[
  group(rotatingIds,0),group(rotatingIds,1),group(rotatingIds,2),group(rotatingIds,3),group(rotatingIds,4),[FINAL_BOSS_ID],
];
export const FLOOR_MINIBOSS_POOL:string[][]=[
  groupTier(MINIBOSSES,0),groupTier(MINIBOSSES,1),groupTier(MINIBOSSES,2),groupTier(MINIBOSSES,3),groupTier(MINIBOSSES,4),
  [...groupTier(MINIBOSSES,3),...groupTier(MINIBOSSES,4)],
];
export const FLOOR_SUBBOSS_POOL:string[][]=[
  groupTier(SUBBOSSES,0),groupTier(SUBBOSSES,1),groupTier(SUBBOSSES,2),groupTier(SUBBOSSES,3),groupTier(SUBBOSSES,4),
  [...groupTier(SUBBOSSES,3),...groupTier(SUBBOSSES,4)],
];

export function bossDef(id:string):BossDef|undefined{return BOSSES[id]??SUBBOSSES[id]??MINIBOSSES[id];}
export function rotatingBossIds(){return [...rotatingIds];}
