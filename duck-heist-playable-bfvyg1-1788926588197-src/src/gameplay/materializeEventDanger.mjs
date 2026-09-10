import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const one=(s,re,to,label)=>{
  const hits=typeof re==='string'?s.split(re).length-1:[...s.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))].length;
  if(hits!==1)throw new Error('Event danger patch failed: '+label+' matches '+hits);
  return s.replace(re,to);
};

function addNamedImport(src,moduleName,name){
  const re=new RegExp("import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*['\\\"]"+moduleName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"['\\\"];");
  const m=src.match(re);if(!m)throw new Error('Event danger patch failed: import '+moduleName);
  if(new RegExp('(?:^|[,\\s])'+name+'(?:[,\\s]|$)').test(m[1]))return src;
  const names=m[1].trim().replace(/,\s*$/,'');
  return src.replace(m[0],"import { "+names+", "+name+" } from '"+moduleName+"';");
}

function functionRange(src,signature){
  const start=src.indexOf(signature);if(start<0)throw new Error('Event danger patch failed: '+signature);
  const open=src.indexOf('{',start);if(open<0)throw new Error('Event danger patch failed: '+signature+' open');
  let depth=0,quote='',esc=false,line=false,block=false;
  for(let i=open;i<src.length;i++){
    const ch=src[i],n=src[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&n==='/'){block=false;i++;}continue;}
    if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&n==='/'){line=true;i++;continue;}
    if(ch==='/'&&n==='*'){block=true;i++;continue;}
    if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'&&--depth===0)return {start,end:i+1};
  }
  throw new Error('Event danger patch failed: '+signature+' range');
}

function patchEventFrequency(src){
  const re=/(assign(?:Middle|DeadEndOrRandom)\([^;\n]*RoomType\.EVENT[^;\n]*\);)/g;
  const hits=[...src.matchAll(re)];
  if(hits.length!==1)throw new Error('Event danger patch failed: EVENT assignment matches '+hits.length);
  return src.replace(re,'if(random()<.38){$1}');
}

const ENGINE_HELPERS=`function dangerEventPool(floor:number){
  const pools=[['policia_pato','policia_rapido'],['policia_pato','policia_rapido','policia_escopeta'],['policia_rapido','policia_escopeta','dron_policial'],['policia_escopeta','dron_policial','policia_francotirador'],['policia_escopeta','dron_policial','policia_francotirador','policia_rapido'],['policia_escopeta','dron_policial','policia_francotirador','policia_rapido']];
  return pools[Math.max(0,Math.min(5,floor))];
}
function dangerEventSpawn(engine:GameEngine,room:MapRoom,content:RoomContent,count:number){
  const c:any=content,floor=Math.max(0,Math.min(5,engine.map.floorIndex)),pool=dangerEventPool(floor);
  ensureBankProps(engine,room,content);
  const spots=freeTiles(room.layout,2).filter(s=>{
    const wx=s.x*TILE_SIZE+TILE_SIZE/2,wy=s.y*TILE_SIZE+TILE_SIZE/2;
    if(Math.hypot(wx-(engine.player.x+7),wy-(engine.player.y+8))<105)return false;
    if((room.doors??[]).some(dir=>{const d=DOOR_TILE[dir];return Math.hypot(s.x-d.x,s.y-d.y)<2.7;}))return false;
    if((c.bankProps??[]).some((p:any)=>!p.broken&&wx>p.x-20&&wx<p.x+p.w+20&&wy>p.y-20&&wy<p.y+p.h+20))return false;
    if(c.event&&!c.event.used&&Math.hypot(wx-c.event.x,wy-c.event.y)<56)return false;
    return true;
  });
  for(let i=0;i<count&&spots.length;i++){
    const si=Math.floor(Math.random()*spots.length),s=spots.splice(si,1)[0],type=pool[Math.floor(Math.random()*pool.length)];
    content.enemies.push(makeEnemy(type,floorScale(engine.map.floorIndex,room.distance),s.x,s.y,false));
  }
}
function updateDangerEventRoom(engine:GameEngine){
  if(engine.state!==GameState.PLAYING)return;
  const room=currentRoomOf(engine),content=getContentOf(engine,room),c:any=content,ee:any=engine;
  const highRisk=room.type===RoomType.EVENT&&!c.cafe;
  if(!highRisk){
    if(ee.dangerEventMusic){ee.dangerEventMusic=false;setMusic(room.type===RoomType.BOSS?'boss':'run',engine.map.floorIndex);}
    return;
  }
  if(c.dangerEventDone){
    if(ee.dangerEventMusic){ee.dangerEventMusic=false;setMusic('run',engine.map.floorIndex);}
    return;
  }
  const floor=Math.max(0,Math.min(5,engine.map.floorIndex));
  if(!c.dangerEventStarted){
    c.dangerEventStarted=true;c.dangerEventActive=true;c.dangerEventTotal=(20+floor*2)*60;c.dangerEventTimer=c.dangerEventTotal;c.dangerEventWave=false;c.dangerEventPressure=0;
    dangerEventSpawn(engine,room,content,4+(floor>=2?1:0)+(floor>=4?1:0));
    room.cleared=false;engine.roomLabel='EVENTO DE ALTO RIESGO';engine.roomLabelTimer=90;engine.shakeIntensity=Math.max(engine.shakeIntensity,2.5);
  }
  if(!c.dangerEventActive)return;
  ee.dangerEventMusic=true;setMusic('event',floor);room.cleared=false;
  if(c.dangerEventTimer>0)c.dangerEventTimer--;
  const elapsed=c.dangerEventTotal-c.dangerEventTimer;
  if(!c.dangerEventWave&&elapsed>=c.dangerEventTotal*.5){
    c.dangerEventWave=true;dangerEventSpawn(engine,room,content,2+(floor>=3?1:0));engine.roomLabel='¡REFUERZOS EN CAMINO!';engine.roomLabelTimer=72;engine.shakeIntensity=Math.max(engine.shakeIntensity,3);
  }
  if(c.dangerEventTimer>0&&content.enemies.length===0&&engine.frame>c.dangerEventPressure){
    c.dangerEventPressure=engine.frame+210;dangerEventSpawn(engine,room,content,2+(floor>=4?1:0));
  }
  if(c.dangerEventTimer<=0&&content.enemies.length===0){
    c.dangerEventActive=false;c.dangerEventDone=true;ee.dangerEventMusic=false;setMusic('run',floor);engine.toast='EVENTO SUPERADO';engine.toastTimer=90;
  }
}`;

const HUD_HELPER=`function drawDangerEventHUD(engine:GameEngine){
  const room=currentRoomOf(engine),content:any=getContentOf(engine,room);
  if(room.type!==RoomType.EVENT||content.cafe||!content.dangerEventActive)return;
  const ctx=engine.ui!,en=getLocale()==='en-US',left=Math.max(0,content.enemies.length),timer=Math.max(0,content.dangerEventTimer??0),total=Math.max(1,content.dangerEventTotal??1),sec=(timer/60).toFixed(1),pulse=.55+.45*Math.sin(engine.frame*.13),x=92,y=27,w=296,h=61;
  ctx.save();ctx.fillStyle='rgba(14,8,10,.90)';ctx.fillRect(x,y,w,h);ctx.strokeStyle='rgba(255,79,67,'+(.7+pulse*.3)+')';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.fillStyle='rgba(255,79,67,.16)';ctx.fillRect(x+5,y+5,w-10,11);
  text(ctx,en?'HIGH-RISK EVENT':'EVENTO DE ALTO RIESGO',240,y+13,7.2,'#ff786b','center',true);
  if(timer>0)titleText(ctx,(en?'SURVIVE ':'SOBREVIVE ')+sec+' s',240,y+36,13.5,'#fff0c2');
  else titleText(ctx,en?'FINISH THE SECURITY':'ELIMINA A LOS RESTANTES',240,y+36,11.5,'#fff0c2');
  text(ctx,en?('SECURITY LEFT: '+left):('SEGURIDAD RESTANTE: '+left),240,y+49,6.8,left>0?'#ffb36b':'#86e3a0','center',true);
  ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+14,y+54,w-28,4);ctx.fillStyle=timer>0?'#e75c4c':'#d7ae4b';ctx.fillRect(x+14,y+54,(w-28)*(timer>0?timer/total:Math.min(1,left?0:1)),4);ctx.restore();
}`;

function patchHud(src){
  const sig='function drawHUD(engine: GameEngine) {',r=functionRange(src,sig),fn=src.slice(r.start,r.end),patched=fn.slice(0,-1)+'  drawDangerEventHUD(engine);\n}';
  return src.slice(0,r.start)+HUD_HELPER+'\n'+patched+src.slice(r.end);
}

function patchAudio(src){
  const before=src;
  src=src.replace(/'menu'\s*\|\s*'run'\s*\|\s*'boss'\s*\|\s*'off'/g,"'menu'|'run'|'boss'|'event'|'off'");
  if(src===before)throw new Error('Event danger patch failed: audio mood union');
  src=one(src,"combatEnergy=mood==='boss'?1:0;","combatEnergy=(mood==='boss'||mood==='event')?1:0;",'audio energy');
  src=one(src,"const bpm=mood==='boss'?Math.max(132,t.bpm+24):mood==='menu'?78:t.bpm;","const bpm=mood==='event'?Math.max(148,t.bpm+38):mood==='boss'?Math.max(132,t.bpm+24):mood==='menu'?78:t.bpm;",'event bpm');
  src=one(src,"  switch(t.color){","  if(musicMood==='event'){if(r<.42){musicNoise(.085,.018,0,500,5200);blip('square',92,70,.16,.021,0,'music');}else if(r<.78){blip('sawtooth',440,330,.11,.013,0,'music');blip('sawtooth',622,466,.11,.011,.07,'music');}else{musicNoise(.13,.012,0,900,6200);blip('triangle',176,124,.18,.014,0,'music');}return;}\n  switch(t.color){",'event ambience');
  src=one(src,"const t=FLOOR_THEMES[musicFloor];combatEnergy=Math.max(mood==='boss'?.8:0,combatEnergy-.025);","if(mood==='event'){const t=FLOOR_THEMES[musicFloor],root=Math.max(55,t.root*.5);if(step%2===0){blip('square',root,root*.82,sec*.72,.024,0,'music');musicNoise(.04,.013,0,1300,6500);}if(step%4===1){blip('sawtooth',hz(t.root,1),hz(t.root,6),sec*.82,.014,0,'music');}if(step%8===6){blip('sine',760,430,sec*1.8,.018,0,'music');blip('square',95,62,sec*.9,.016,.08,'music');}return;}const t=FLOOR_THEMES[musicFloor];combatEnergy=Math.max(mood==='boss'?.8:0,combatEnergy-.025);",'event music pattern');
  return src;
}

export function applyDuckEventDanger(gameDir){
  let file=path.join(gameDir,'game','mapgen.ts'),s=readFileSync(file,'utf8');s=patchEventFrequency(s);writeFileSync(file,s,'utf8');

  file=path.join(gameDir,'game','audio.ts');s=readFileSync(file,'utf8');s=patchAudio(s);writeFileSync(file,s,'utf8');

  file=path.join(gameDir,'game','engine.ts');s=readFileSync(file,'utf8');s=addNamedImport(s,'./audio','setMusic');
  s=one(s,/export function updateEngine\(engine:\s*GameEngine\)\s*\{/,m=>ENGINE_HELPERS+'\n'+m+'\n  updateDangerEventRoom(engine);','engine event update');
  s=one(s,/  const cost=event\.kind==='safe'\?[^\n]+;/,m=>"  if(currentRoomOf(engine).type===RoomType.EVENT&&!content.cafe&&(content as any).dangerEventActive){event.message='Primero sobrevive al operativo.';playDeny();return;}\n"+m,'event interaction lock');
  writeFileSync(file,s,'utf8');

  file=path.join(gameDir,'game','render.ts');s=readFileSync(file,'utf8');s=addNamedImport(s,'../localization/runtime','getLocale');s=patchHud(s);writeFileSync(file,s,'utf8');
}
