import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const replaceOnce=(src,re,to,label)=>{const next=src.replace(re,to);if(next===src)throw new Error('Pickup safety patch failed: '+label);return next;};

const helper=`function resolveInteractableSpacing(engine:GameEngine){
  const content:any=engine.contents.get(engine.currentKey);if(!content)return;
  const found:{o:any;ox:number;oy:number;r:number}[]=[];const seen=new Set<any>();
  const add=(o:any,ox=0,oy=0,r=22)=>{if(!o||typeof o!=='object'||seen.has(o)||!Number.isFinite(o.x)||!Number.isFinite(o.y))return;seen.add(o);found.push({o,ox,oy,r});};
  // Sólo objetos que realmente requieren E. Pickups automáticos (migajas, monedas y comida) quedan fuera.
  for(const it of content.items??[])add(it,8,8);
  if(content.pedestal&&!content.pedestal.taken)add(content.pedestal,12,0,24);
  for(const ped of content.choices??[])if(!ped.taken)add(ped,12,0,24);
  for(const shop of content.shopItems??[])if(!shop.sold)add(shop,0,0);
  if(!found.length)return;
  const clampX=(x:number)=>Math.max(42,Math.min(CANVAS_WIDTH-42,x));const clampY=(y:number)=>Math.max(48,Math.min(CANVAS_HEIGHT-42,y));
  const center=(e:{o:any;ox:number;oy:number;r:number})=>({x:e.o.x+e.ox,y:e.o.y+e.oy});
  const place=(e:{o:any;ox:number;oy:number;r:number},x:number,y:number)=>{e.o.x=clampX(x)-e.ox;e.o.y=clampY(y)-e.oy;};
  const st:any=content.stairs;const hasStairs=!!st;const sx=hasStairs?st.x+16:0,sy=hasStairs?st.y+16:0;
  const keepStairsClear=()=>{if(!hasStairs)return;for(let i=0;i<found.length;i++){const e=found[i],c=center(e),dx=c.x-sx,dy=c.y-sy,d=Math.hypot(dx,dy);if(d<58){const a=d>.01?Math.atan2(dy,dx):((i*2.399963229728653)%6.283185307179586);place(e,sx+Math.cos(a)*64,sy+Math.sin(a)*60);}}};
  keepStairsClear();
  for(let pass=0;pass<6;pass++){for(let i=0;i<found.length;i++)for(let j=i+1;j<found.length;j++){const a=found[i],b=found[j],ca=center(a),cb=center(b),dx=cb.x-ca.x,dy=cb.y-ca.y,d=Math.hypot(dx,dy),need=Math.max(38,a.r+b.r);if(d<need){const ang=d>.01?Math.atan2(dy,dx):(((j+1)*1.61803398875)%6.283185307179586),push=(need-d)/2+.75,cx=Math.cos(ang)*push,cy=Math.sin(ang)*push;place(a,ca.x-cx,ca.y-cy);place(b,cb.x+cx,cb.y+cy);}}keepStairsClear();}const zones=found.map(e=>{const c=center(e);return{x:c.x,y:c.y,r:e.r+6};});const ev:any=content.event;if(ev&&!ev.used)zones.push({x:ev.x,y:ev.y,r:32});if(hasStairs)zones.push({x:sx,y:sy,r:34});if(content.bankProps?.length)content.bankProps=content.bankProps.filter((p:any)=>!zones.some(z=>z.x+z.r>p.x-6&&z.x-z.r<p.x+p.w+6&&z.y+z.r>p.y-6&&z.y-z.r<p.y+p.h+6));
}`;

export function applyDuckPickupSafety(gameDir){
  const renderFile=path.join(gameDir,'game','render.ts');let r=readFileSync(renderFile,'utf8');
  if(!r.includes('function resolveInteractableSpacing(')){const anchor='export function renderWorld(engine: GameEngine) {';if(!r.includes(anchor))throw new Error('Pickup safety patch failed: renderWorld anchor');r=r.replace(anchor,helper+'\n\n'+anchor+'\n  resolveInteractableSpacing(engine);');}
  writeFileSync(renderFile,r,'utf8');

  const engineFile=path.join(gameDir,'game','engine.ts');let e=readFileSync(engineFile,'utf8');
  e=replaceOnce(e,/  if \(content\.pedestal && !content\.pedestal\.taken\) \{[\s\S]*?\n  \}\n\n  if\(content\.choices && !content\.choiceTaken && !engine\.swap\) \{[\s\S]*?\n  \}\n  if\(content\.event/,`  if (content.pedestal && !content.pedestal.taken) {
    const ped=content.pedestal;
    const close=dist(ped.x+12,ped.y,player.x+7,player.y+8)<28;
    const autoFood=!!ped.isFood&&player.hp<player.maxHp;
    if(close&&(autoFood||(!ped.isFood&&engine.keys['e']))){
      let ok=true;
      if(ped.isFood){healPlayer(engine,foodHeal(ped.itemId));playHeal();}
      else if(ped.isWeapon)ok=tryGiveWeapon(engine,ped.itemId,'pedestal',-1,ped.x,ped.y-20);
      else if(ACTIVE_ITEMS[ped.itemId]&&player.activeItem&&player.activeItem!==ped.itemId)ok=offerActiveSwap(engine,ped.itemId,'pedestal',-1,ped.x,ped.y);
      else grantItem(engine,ped.itemId,false,!!ACTIVE_ITEMS[ped.itemId]);
      if(ok){ped.taken=true;spawn(engine,ped.x+12,ped.y,'spark',20,'#f4d03f');engine.shakeIntensity=Math.max(engine.shakeIntensity,2);}
      engine.keys['e']=false;
    }
  }

  if(content.choices&&!content.choiceTaken&&!engine.swap){
    for(let i=0;i<content.choices.length;i++){
      const ped=content.choices[i],close=!ped.taken&&dist(ped.x+12,ped.y,player.x+7,player.y+8)<28;
      const autoFood=!!ped.isFood&&player.hp<player.maxHp;
      if(close&&(autoFood||(!ped.isFood&&engine.keys.e))){
        let ok=true;
        if(ped.isFood){healPlayer(engine,foodHeal(ped.itemId));playHeal();}
        else if(ped.isWeapon)ok=tryGiveWeapon(engine,ped.itemId,'choice',i,ped.x,ped.y);
        else grantItem(engine,ped.itemId,false,!!ACTIVE_ITEMS[ped.itemId]);
        if(ok){finishChoice(content);spawn(engine,ped.x+12,ped.y,'spark',14,'#cbaeef');}
        engine.keys.e=false;break;
      }
    }
  }
  if(content.event`,'automatic healing food');
  writeFileSync(engineFile,e,'utf8');
}
