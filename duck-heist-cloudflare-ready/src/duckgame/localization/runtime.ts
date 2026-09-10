import { EN } from './en';
export type Locale='es-MX'|'en-US';
const STORAGE_KEY='duckheist_locale';
function readLocale():Locale{try{return localStorage.getItem(STORAGE_KEY)==='en-US'?'en-US':'es-MX';}catch{return 'es-MX';}}
let locale:Locale=readLocale();
export function getLocale():Locale{return locale;}
export function setLocale(next:Locale){locale=next;try{localStorage.setItem(STORAGE_KEY,next);}catch{}if(typeof document!=='undefined')document.documentElement.lang=next==='en-US'?'en':'es-MX';}
const rules:[RegExp,string][]=[[/^PISO (\d+)\/6$/,'FLOOR $1/6'],[/^PISO (\d+)$/,'FLOOR $1'],[/^ASPECTOS (\d+) \/ (\d+)$/,'ASPECTS $1 / $2'],[/^DESCUBIERTOS · (\d+) \/ (\d+)$/,'DISCOVERED · $1 / $2'],[/^MONEDAS: (\d+)$/,'COINS: $1'],[/^Monedas: (\d+)$/,'Coins: $1'],[/^MIGAJAS: (\d+)$/,'CRUMBS: $1'],[/^DAÑO (.+)$/,'DAMAGE $1'],[/^PRECIO (.+)$/,'PRICE $1'],[/^COMPRAR ASPECTO · (\d+)$/,'BUY ASPECT · $1']];
export function translateText(input:string):string{if(locale==='es-MX'||!input)return input;const exact=EN[input];if(exact)return exact;for(const [re,to] of rules)if(re.test(input))return input.replace(re,to);return input;}
if(typeof document!=='undefined')document.documentElement.lang=locale==='en-US'?'en':'es-MX';