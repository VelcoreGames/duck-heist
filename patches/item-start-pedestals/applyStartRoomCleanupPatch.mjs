import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const target=process.argv[2]??'src/gameplay/materializeBankRoomLogic.mjs';
const file=path.resolve(process.cwd(),target);
let src=readFileSync(file,'utf8');

function once(from,to,label){
  const at=src.indexOf(from);
  if(at<0)throw new Error(`START cleanup patch: ${label} not found`);
  if(src.indexOf(from,at+from.length)>=0)throw new Error(`START cleanup patch: ${label} is not unique`);
  src=src.slice(0,at)+to+src.slice(at+from.length);
}

once(
  "if(room.type===RoomType.START){plant(70,112);plant(410,112);lamp(112,100);lamp(368,100);add(65,270,58,10);add(357,270,58,10);return z;}",
  "if(room.type===RoomType.START)return z;",
  'START reserved decor'
);

once(
  "if(room.type===RoomType.START)return{id:'arrival_foyer',items:floor>=4?[['column',88,116],['column',392,116],['lounge',136,244],['lounge',344,244]]:[['bench',136,244],['bench',344,244],['plant',88,116],['plant',392,116]]};",
  "if(room.type===RoomType.START)return{id:'arrival_foyer',items:[]};",
  'START room plan'
);

once(
  "function ensureBankProps(engine:GameEngine,room:MapRoom,content:RoomContent){if(content.bankProps)return;content.bankProps=[];content.bankLayout='clear';if(room.type===RoomType.BOSS||room.type===RoomType.GUN_VAN)return;",
  "function ensureBankProps(engine:GameEngine,room:MapRoom,content:RoomContent){if(content.bankProps)return;content.bankProps=[];content.bankLayout='clear';if(room.type===RoomType.START){content.bankLayout='arrival_foyer';return;}if(room.type===RoomType.BOSS||room.type===RoomType.GUN_VAN)return;",
  'START hard prop guard'
);

once(
  "const minCount=special?3:7;",
  "const minCount=room.type===RoomType.START?0:special?3:7;",
  'START filler guard'
);

writeFileSync(file,src,'utf8');
console.log(`Patched ${target}: START room now has no freestanding bank props.`);
