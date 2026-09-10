export function seededRandom(seed:string) {
  let state=2166136261;
  for(let i=0;i<seed.length;i++) state=Math.imul(state^seed.charCodeAt(i),16777619);
  return () => {
    state|=0;state=(state+0x6d2b79f5)|0;
    let t=Math.imul(state^(state>>>15),1|state);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}