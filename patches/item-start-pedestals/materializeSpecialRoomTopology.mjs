import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const HELPER=`
function duckNormalizeStartItemTopology(rooms:any){
  const list=[...rooms.values()] as any[];
  const start=list.find((r:any)=>r.type===RoomType.START);
  if(!start)return;
  const byKey=new Map<string,any>(list.map((r:any)=>[\`${r.gx},${r.gy}\`,r]));
  const vec:Record<string,[number,number]>={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0]};
  const linked=(r:any)=>{
    const out:any[]=[];
    for(const d of (r.doors??[]) as string[]){
      const v=vec[d];
      if(!v)continue;
      const q=byKey.get(\`${r.gx+v[0]},${r.gy+v[1]}\`);
      if(q)out.push(q);
    }
    return out;
  };
  const directItem=linked(start).find((r:any)=>r.type===RoomType.ITEM);
  if(!directItem)return;
  const isSpecial=(r:any)=>r.type!==RoomType.NORMAL&&r.type!==RoomType.START;
  const candidates=list.filter((r:any)=>{
    if(r.type!==RoomType.NORMAL||r===start)return false;
    const ns=linked(r);
    if(ns.length!==1)return false;
    const parent=ns[0];
    if(!parent||parent.type!==RoomType.NORMAL)return false;
    if(linked(start).includes(r))return false;
    if(linked(parent).some((n:any)=>isSpecial(n)))return false;
    return true;
  });
  candidates.sort((a:any,b:any)=>{
    const da=Math.abs(a.gx-start.gx)+Math.abs(a.gy-start.gy);
    const db=Math.abs(b.gx-start.gx)+Math.abs(b.gy-start.gy);
    if(db!==da)return db-da;
    if(a.gy!==b.gy)return a.gy-b.gy;
    return a.gx-b.gx;
  });
  const target=candidates[0];
  if(!target){
    console.warn('[Duck Heist] No hubo dead end seguro para reubicar OBJETOS.');
    return;
  }
  directItem.type=RoomType.NORMAL;
  target.type=RoomType.ITEM;
}
`;

export function applyDuckSpecialRoomTopology(gameDir){
  const file=path.join(gameDir,'game','mapgen.ts');
  let src=readFileSync(file,'utf8');
  if(src.includes('function duckNormalizeStartItemTopology('))throw new Error('Special room topology patch already materialized.');
  const anchor='if (room.type === RoomType.ITEM || room.type === RoomType.SHOP || room.type === RoomType.GUN_VAN ||';
  const at=src.indexOf(anchor);
  if(at<0)throw new Error('Special room topology patch failed: layout anchor not found.');
  const before=src.slice(0,at);
  const loop=/for\s*\(\s*const\s+room\s+of\s+([A-Za-z_$][\w$]*)\.values\(\)\s*\)\s*\{/g;
  let match,last=null;
  while((match=loop.exec(before))!==null)last=match;
  if(!last)throw new Error('Special room topology patch failed: room layout loop not found.');
  const roomsVar=last[1];
  const lineStart=src.lastIndexOf('\n',at)+1;
  const line=src.slice(lineStart,at);
  const indent=(line.match(/^\s*/)??[''])[0];
  src=src.slice(0,lineStart)+`${indent}duckNormalizeStartItemTopology(${roomsVar});\n`+src.slice(lineStart);
  src+='\n'+HELPER+'\n';
  writeFileSync(file,src,'utf8');
}
