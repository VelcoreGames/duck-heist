import type { KeyBindings } from './types';

export type ControlAction = keyof KeyBindings;

export const DEFAULT_BINDINGS:KeyBindings = {
  moveUp:'w', moveDown:'s', moveLeft:'a', moveRight:'d',
  shootUp:'arrowup', shootDown:'arrowdown', shootLeft:'arrowleft', shootRight:'arrowright',
  interact:'e', dash:'shift', active:' ', map:'m', pause:'escape', recycle:'r', weapon1:'1', weapon2:'2',
};

export const CONTROL_ROWS:{id:ControlAction;label:string;group:'MOVIMIENTO'|'DISPARO'|'ACCIONES'}[] = [
  {id:'moveUp',label:'MOVER ARRIBA',group:'MOVIMIENTO'},
  {id:'moveDown',label:'MOVER ABAJO',group:'MOVIMIENTO'},
  {id:'moveLeft',label:'MOVER IZQUIERDA',group:'MOVIMIENTO'},
  {id:'moveRight',label:'MOVER DERECHA',group:'MOVIMIENTO'},
  {id:'shootUp',label:'DISPARAR ARRIBA',group:'DISPARO'},
  {id:'shootDown',label:'DISPARAR ABAJO',group:'DISPARO'},
  {id:'shootLeft',label:'DISPARAR IZQUIERDA',group:'DISPARO'},
  {id:'shootRight',label:'DISPARAR DERECHA',group:'DISPARO'},
  {id:'interact',label:'INTERACTUAR',group:'ACCIONES'},
  {id:'dash',label:'ESQUIVAR',group:'ACCIONES'},
  {id:'active',label:'OBJETO ACTIVO',group:'ACCIONES'},
  {id:'map',label:'MAPA',group:'ACCIONES'},
  {id:'pause',label:'PAUSA',group:'ACCIONES'},
  {id:'recycle',label:'RECICLAR BOTÍN SIN FIN',group:'ACCIONES'},
  {id:'weapon1',label:'ARMA 1',group:'ACCIONES'},
  {id:'weapon2',label:'ARMA 2',group:'ACCIONES'},
];

const allowed=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<24?v:null;
export function normalizeBindings(raw:unknown):KeyBindings {
  const out={...DEFAULT_BINDINGS};
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)) {
    const src=raw as Record<string,unknown>;
    for(const row of CONTROL_ROWS){
      const v=allowed(src[row.id]);
      if(v) out[row.id]=v.toLowerCase();
    }
  }
  return out;
}

export function keyLabel(key:string) {
  const k=key.toLowerCase();
  const labels:Record<string,string>={
    ' ':'ESPACIO',arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→',
    shift:'SHIFT',control:'CTRL',alt:'ALT',escape:'ESC',enter:'ENTER',tab:'TAB',
    backspace:'RETROCESO',
  };
  return labels[k] ?? k.length===1?k.toUpperCase():k.toUpperCase();
}

export function remapBinding(bindings:KeyBindings,action:ControlAction,nextKey:string) {
  const key=nextKey.toLowerCase();
  const old=bindings[action];
  const conflict=(Object.keys(bindings) as ControlAction[]).find(a=>a!==action&&bindings[a]===key);
  bindings[action]=key;
  if(conflict) bindings[conflict]=old;
}
