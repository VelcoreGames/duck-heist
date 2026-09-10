import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const target=process.argv[2]??'src/gameplay/materializeDirectRewards.mjs';
const file=path.resolve(process.cwd(),target);
let src=readFileSync(file,'utf8');

function once(from,to,label){
  const at=src.indexOf(from);
  if(at<0)throw new Error(`DirectRewards patch: ${label} not found`);
  if(src.indexOf(from,at+from.length)>=0)throw new Error(`DirectRewards patch: ${label} is not unique`);
  src=src.slice(0,at)+to+src.slice(at+from.length);
}

once(
  "function drawSpecialRoomPedestalLayer(ctx:CanvasRenderingContext2D,content:any,f:number,engine:GameEngine){const room=currentRoomOf(engine);if(room.type===RoomType.ITEM){for(const ped of visibleGreekItemPedestals(content))drawGreekItemPedestal(ctx,ped,f,engine);}else if(room.type===RoomType.EVENT&&!content.cafe&&content.event){const event=content.event;drawPedestal(ctx,event.x-4,event.y+9,f,event.used,eventPedestalColor(event.kind));}}",
  "function drawSpecialRoomPedestalLayer(ctx:CanvasRenderingContext2D,content:any,f:number,engine:GameEngine){const room=currentRoomOf(engine);if(room.type===RoomType.EVENT&&!content.cafe&&content.event){const event=content.event;drawPedestal(ctx,event.x-4,event.y+9,f,event.used,eventPedestalColor(event.kind));}}",
  'base layer'
);

once(
  "function drawItemRoomRewardForeground(ctx:CanvasRenderingContext2D,content:any,f:number,engine:GameEngine,pl:any){if(currentRoomOf(engine).type!==RoomType.ITEM)return;for(const ped of visibleGreekItemPedestals(content)){if(!greekRewardOccludesPlayer(ped,pl))continue;ctx.save();ctx.beginPath();ctx.rect(pl.x-9,pl.y-11,32,36);ctx.clip();drawGreekItemPedestal(ctx,ped,f,engine);drawPedestalFull(ctx,ped,f,engine);ctx.restore();}}`;",
  "function drawItemRoomRewardForeground(ctx:CanvasRenderingContext2D,content:any,f:number,engine:GameEngine,pl:any){if(currentRoomOf(engine).type!==RoomType.ITEM)return;for(const ped of visibleGreekItemPedestals(content)){if(!greekRewardOccludesPlayer(ped,pl))continue;ctx.save();ctx.beginPath();ctx.rect(pl.x-9,pl.y-11,32,36);ctx.clip();drawPedestalFull(ctx,ped,f,engine);ctx.restore();}}`;",
  'foreground depth'
);

once(
  "const original=src.slice(range.start,range.end),patched=replaceGenericPedestal(original);if(patched===original)throw new Error('Direct rewards patch failed: no change');src=src.slice(0,range.start)+GREEK_VIS+'\\n'+patched+src.slice(range.end);",
  "const original=src.slice(range.start,range.end);let patched=replaceGenericPedestal(original);patched=patched.replace(signature,signature+'\\n  if(currentRoomOf(engine).type===RoomType.ITEM&&!ped.taken)drawGreekItemPedestal(ctx,ped,f,engine);');if(patched===original)throw new Error('Direct rewards patch failed: no change');src=src.slice(0,range.start)+GREEK_VIS+'\\n'+patched+src.slice(range.end);",
  'drawPedestalFull hook'
);

once(
  "src=stripResidualGenericPedestals(src);writeFileSync(file,src);}",
  "writeFileSync(file,src);}",
  'global pedestal cleanup removal'
);

writeFileSync(file,src,'utf8');
console.log(`Patched ${target}`);
