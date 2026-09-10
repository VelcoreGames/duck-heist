import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const replaceOnce=(src,re,to,label)=>{const next=src.replace(re,to);if(next===src)throw new Error('Boss combat patch failed: '+label);return next;};
const BOSS_AI=`function updateBossAI(engine: GameEngine, boss: Enemy, room: MapRoom, content: RoomContent) {
  const player=engine.player;
  const px=player.x+7,py=player.y+8;
  const bx=boss.x+boss.size/2,by=boss.y+boss.size/2;
  const pct=boss.hp/boss.maxHp;
  const aimed=Math.atan2(py-by,px-bx);
  const shootFan=(count:number,spread:number,speed:number,type:string,center=aimed)=>{for(let i=0;i<count;i++){const off=count===1?0:(i-(count-1)/2)*(spread/(count-1));enemyShoot(engine,boss,center+off,speed,type);}};
  const shootRing=(count:number,speed:number,type:string,offset=engine.frame*.014)=>{for(let i=0;i<count;i++)enemyShoot(engine,boss,(i/count)*Math.PI*2+offset,speed,type);};
  const summon=(pool:string[],cap:number)=>{if(content.enemies.length>=cap)return;const spots=freeTiles(room.layout,2);const s=spots[rngInt(0,Math.max(0,spots.length-1))];if(s)content.enemies.push(makeEnemy(pick(pool),floorScale(engine.map.floorIndex,room.distance),s.x,s.y,false));};

  if(MINIBOSSES[boss.bossType]) {
    const enraged=pct<.52;
    if(enraged&&boss.bossPhase===0){boss.bossPhase=1;boss.attackTimer=54;boss.stunned=16;engine.roomLabel='¡SE ENFURECE! · '+(MINIBOSSES[boss.bossType]?.name??'');engine.roomLabelTimer=62;spawn(engine,bx,by,'spark',12,'#f5bb6d');playBossRoar();}
    boss.attackTimer--;
    const telegraphWindow=enraged?27:34;
    if(boss.attackTimer>0&&boss.attackTimer<telegraphWindow){boss.telegraph=1-boss.attackTimer/telegraphWindow;boss.moveAngle=aimed;if(boss.attackTimer===telegraphWindow-1)playDanger('aim');}
    if(boss.attackTimer<=0){
      const type=boss.bossType;
      if(type==='sargento_migajas'){
        shootFan(enraged?7:5,.72,enraged?2.75:2.55,'buckshot');boss.moveAngle=aimed;boss.moveTimer=enraged?18:14;
        if(enraged&&content.enemies.length<3)summon(['policia_pato','policia_rapido'],3);
      } else if(type==='tax_collector'){
        shootFan(enraged?5:3,.5,2.9,'briefcase');if(enraged)shootFan(3,.34,2.35,'coin_proj',aimed+.16);boss.moveAngle=aimed;boss.moveTimer=14;
      } else if(type==='el_auditor'){
        shootFan(enraged?7:5,.64,2.5,'coin_proj');content.puddles.push({x:bx+Math.cos(aimed)*44,y:by+Math.sin(aimed)*44,life:enraged?165:135,kind:'fire',radius:18});
      } else if(type==='cajero_3000'){
        shootFan(enraged?7:5,.58,2.55,'coin_proj');enemyShoot(engine,boss,aimed,4.2,'drone_shot');if(enraged)shootRing(6,1.9,'coin_proj',engine.frame*.018);
      } else if(type==='ganso_antidisturbios'){
        boss.shieldAngle=aimed;boss.moveAngle=aimed;boss.moveTimer=enraged?28:22;playDanger('charge');if(enraged)shootFan(3,.5,2.15,'enemy_bullet',aimed+Math.PI);
      } else if(type==='dron_centinela'){
        shootRing(enraged?12:8,enraged?2.35:2.15,'drone_shot');if(enraged)shootFan(3,.42,3.15,'drone_shot');
        if(content.enemies.filter(en=>en.type==='dron_policial').length<(enraged?2:1))summon(['dron_policial'],enraged?4:3);
      } else {
        shootFan(enraged?5:3,.66,enraged?2.75:2.5,'dough_ball');content.puddles.push({x:bx,y:by,life:enraged?175:145,kind:'fire',radius:enraged?26:22});if(enraged)content.puddles.push({x:bx+Math.cos(aimed)*50,y:by+Math.sin(aimed)*50,life:120,kind:'fire',radius:16});
      }
      const base=type==='dron_centinela'?104:type==='ganso_antidisturbios'?112:type==='sargento_migajas'?116:124;
      boss.attackTimer=Math.max(76,base-(enraged?18:0));boss.telegraph=0;
    }
    if(boss.moveTimer>0){boss.moveTimer--;const dash=boss.bossType==='ganso_antidisturbios'?4.0:3.35;moveEnemy(boss,room,Math.cos(boss.moveAngle)*dash,Math.sin(boss.moveAngle)*dash);}
    else if(boss.attackTimer>telegraphWindow){const strafe=boss.bossType==='dron_centinela'?0.46:0.3;moveEnemy(boss,room,Math.cos(aimed+(boss.id%2?1:-1)*.72)*boss.speed*strafe,Math.sin(aimed+(boss.id%2?1:-1)*.72)*boss.speed*strafe);}
    if(boss.bossType==='ganso_antidisturbios')boss.shieldAngle=boss.moveAngle;
    return;
  }

  const phase=pct<.34?2:pct<.68?1:0;
  if(phase>boss.bossPhase){boss.bossPhase=phase;boss.attackTimer=58;boss.stunned=18;engine.roomLabel='FASE '+(phase+1)+' · '+(BOSSES[boss.bossType]?.name??'');engine.roomLabelTimer=72;spawn(engine,bx,by,'spark',20,phase===2?'#ff6b57':'#f5bb6d');engine.shakeIntensity=Math.max(engine.shakeIntensity,5);playBossRoar();}
  const pattern=engine.map.floorIndex;
  boss.attackTimer--;
  const telegraphWindow=Math.max(23,34-boss.bossPhase*4);
  if(boss.attackTimer>0&&boss.attackTimer<telegraphWindow){boss.telegraph=1-boss.attackTimer/telegraphWindow;if(boss.attackTimer===telegraphWindow-1)playDanger(boss.bossType==='captain_honk'||boss.bossType==='general_ganso'?'charge':'aim');}

  if(boss.attackTimer<=0){
    const p=boss.bossPhase;
    const type=boss.bossType;
    const atk=rngInt(0,p>=1?4:3);
    boss.telegraph=0;
    if(type==='captain_honk'){
      if(atk===0){boss.moveAngle=aimed;boss.moveTimer=24+p*4;}
      else if(atk===1)shootFan(5+p*2,.72,2.7+p*.15,'enemy_bullet');
      else if(atk===2)shootRing(8+p*2,2.15+p*.1,'enemy_bullet');
      else if(atk===3){shootFan(3+p,.5,3.2,'enemy_bullet');boss.moveAngle=aimed;boss.moveTimer=15;}
      else summon(['policia_rapido','policia_pato'],3+p);
    } else if(type==='comisario_pico_duro'){
      if(atk===0)shootFan(5+p*2,.82,2.75,'enemy_bullet');
      else if(atk===1)shootRing(8+p*2,2.05+p*.12,'enemy_bullet',engine.frame*.01);
      else if(atk===2){summon(['policia_pato','policia_escopeta'],3+p);shootFan(3,.34,3.05,'enemy_bullet');}
      else if(atk===3){boss.moveAngle=aimed+Math.PI/2*(boss.id%2?1:-1);boss.moveTimer=22;}
      else {shootFan(5,.5,3.15,'enemy_bullet',aimed-.2);shootFan(5,.5,3.15,'enemy_bullet',aimed+.2);}
    } else if(type==='toaster_9000'){
      if(atk===0)shootRing(10+p*3,1.9+p*.1,'toast',engine.frame*.012);
      else if(atk===1){shootFan(5+p*2,.75,2.55,'toast');content.puddles.push({x:bx,y:by,life:150,kind:'fire',radius:24+p*2});}
      else if(atk===2)shootRing(6+p*2,2.55,'enemy_bullet',engine.frame*.03);
      else if(atk===3){content.puddles.push({x:bx+Math.cos(aimed)*52,y:by+Math.sin(aimed)*52,life:155,kind:'fire',radius:20});boss.moveAngle=aimed+Math.PI;boss.moveTimer=16;}
      else {shootFan(7,.9,2.8,'toast');content.puddles.push({x:bx,y:by,life:180,kind:'fire',radius:28});}
    } else if(type==='general_ganso'){
      if(atk===0){boss.moveAngle=aimed;boss.moveTimer=28+p*5;}
      else if(atk===1)shootFan(5+p*2,.62,3.0+p*.12,'enemy_bullet');
      else if(atk===2){shootRing(8+p*3,2.3,'enemy_bullet');boss.moveAngle=aimed;boss.moveTimer=12;}
      else if(atk===3){boss.moveAngle=aimed;boss.moveTimer=18;shootFan(3,.42,2.7,'enemy_bullet',aimed+Math.PI);}
      else {summon(['policia_rapido'],3+p);shootRing(8,2.0,'enemy_bullet');}
    } else if(type==='don_levadura'){
      if(atk===0)shootFan(5+p*2,.88,2.55+p*.1,'dough_ball');
      else if(atk===1){shootRing(8+p*2,1.95,'dough_ball');content.puddles.push({x:bx,y:by,life:165,kind:'fire',radius:24});}
      else if(atk===2){content.puddles.push({x:bx+Math.cos(aimed)*48,y:by+Math.sin(aimed)*48,life:170,kind:'fire',radius:22});shootFan(3,.4,3.1,'dough_ball');}
      else if(atk===3){boss.moveAngle=aimed+Math.PI;boss.moveTimer=20;shootFan(5,.56,2.8,'dough_ball');}
      else shootRing(12,2.15,'dough_ball',engine.frame*.026);
    } else if(type==='director_seguridad'){
      if(atk===0)shootFan(5+p*2,.7,3.05,'drone_shot');
      else if(atk===1)shootRing(8+p*3,2.25,'drone_shot',engine.frame*.02);
      else if(atk===2){summon(['dron_policial','policia_francotirador'],3+p);shootFan(3,.38,3.4,'coin_proj');}
      else if(atk===3){shootFan(5,.5,3.6,'drone_shot');boss.moveAngle=aimed+Math.PI/2;boss.moveTimer=18;}
      else {shootRing(12,2.4,'coin_proj');summon(['dron_policial'],4);}
    } else {
      if(atk===0)shootFan(5+p*2,.75,2.9+p*.12,'coin_proj');
      else if(atk===1)shootRing(10+p*3,2.15+p*.1,'coin_proj',engine.frame*.018);
      else if(atk===2){shootFan(3+p*2,.46,3.45,'coin_proj');boss.moveAngle=aimed;boss.moveTimer=15;}
      else if(atk===3){summon(['policia_pato','policia_rapido','dron_policial'],3+p);shootRing(8,2.25,'coin_proj');}
      else {shootFan(7,.8,3.15,'coin_proj',aimed-.22);shootFan(7,.8,3.15,'coin_proj',aimed+.22);}
    }
    engine.shakeIntensity=Math.max(engine.shakeIntensity,atk===0?3:4+p);
    const raw=boss.attackCooldown-p*14-pattern*2;
    boss.attackTimer=Math.max(48,Math.min(88,Math.round(raw)));
  }

  const speedMult=1+boss.bossPhase*.18;
  if(boss.moveTimer>0){boss.moveTimer--;const charge=(boss.bossType==='captain_honk'||boss.bossType==='general_ganso')?2.85:2.35;moveEnemy(boss,room,Math.cos(boss.moveAngle)*boss.speed*speedMult*charge,Math.sin(boss.moveAngle)*boss.speed*speedMult*charge);}
  else if(boss.attackTimer>telegraphWindow){const orbit=(boss.id%2?1:-1)*(.48+boss.bossPhase*.08);const moveAng=aimed+orbit;const pace=(boss.bossType==='toaster_9000'||boss.bossType==='director_seguridad')?.22:.31;moveEnemy(boss,room,Math.cos(moveAng)*boss.speed*speedMult*pace,Math.sin(moveAng)*boss.speed*speedMult*pace);}
}
`;
export function applyDuckBossCombat(gameDir){const file=path.join(gameDir,'game','engine.ts');let s=readFileSync(file,'utf8');s=replaceOnce(s,/function updateBossAI\(engine: GameEngine, boss: Enemy, room: MapRoom, content: RoomContent\) \{[\s\S]*?\n\}\n\n\/\/ ---------------------------------------------------------------------------\n\/\/ DAÑO/,BOSS_AI+'\n// ---------------------------------------------------------------------------\n// DAÑO','boss AI');writeFileSync(file,s,'utf8');}
