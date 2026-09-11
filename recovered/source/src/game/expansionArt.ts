import type { IconPainter, PixelPainter } from './itemArt';

const cream='#ffe4a3',gold='#ffc951',white='#ecf2e6',steel='#759eae',dark='#172332',red='#ef7864',blue='#6eafd0',purple='#b99ddb';
const loaf=(p:PixelPainter)=>{p.rect(4,8,16,12,'#98643a');p.oval(12,8,8,5,'#dca35a');p.rect(6,10,12,8,cream);};
const feather=(p:PixelPainter)=>{p.poly([[4,19],[7,8],[16,2],[20,4],[16,14],[8,19]],white);p.line(4,21,17,5,steel);p.line(10,12,8,8,steel);};
const coin=(p:PixelPainter,x:number,y:number)=>{p.oval(x,y,4,4,'#ba823f');p.oval(x,y-1,3,3,gold);p.dot(x-1,y-2,cream);};
const glasses=(p:PixelPainter)=>{p.rect(3,9,7,7,dark);p.rect(14,9,7,7,dark);p.rect(4,10,5,4,blue);p.rect(15,10,5,4,blue);p.line(10,11,14,11,steel);p.line(2,9,4,7,steel);};
const card=(p:PixelPainter,color=steel)=>{p.rect(3,6,18,14,color);p.rect(3,9,18,3,dark);p.rect(5,15,5,2,gold);};
const duck=(p:PixelPainter,x=4,y=6)=>{p.oval(x+6,y+9,6,4,gold);p.rect(x+6,y+2,6,7,gold);p.rect(x+11,y+5,4,2,'#df9846');p.dot(x+9,y+4,dark);};
const bottle=(p:PixelPainter,color:string)=>{p.rect(8,8,8,13,color);p.rect(9,3,6,5,color);p.rect(8,2,8,3,steel);p.rect(9,12,6,5,cream);};
const blueprint=(p:PixelPainter)=>{p.rect(3,4,18,17,'#294c71');p.rect(5,7,6,5,blue);p.rect(13,13,5,5,blue);p.line(8,12,8,16,white);p.line(8,16,13,16,white);};

export const EXPANSION_ART:Record<string,IconPainter> = {
  stolen_wallet:p=>{p.rect(3,6,18,14,'#71513f');p.rect(4,7,16,10,'#a77b52');p.rect(14,11,8,5,'#45382f');p.dot(16,13,gold);p.rect(6,3,9,4,'#80ac83');p.line(6,18,18,18,cream);},
  reinforced_loaf:p=>{loaf(p);p.rect(5,11,14,3,steel);p.rect(10,5,3,15,steel);p.dot(11,12,white);p.dot(11,18,white);},
  spring_feather:p=>{feather(p);for(let y=12;y<22;y+=3){p.line(13,y,20,y+2,gold);p.line(20,y+2,13,y+3,steel);}p.rect(11,20,11,2,dark);},
  pirate_sneakers:p=>{p.poly([[3,9],[10,7],[11,14],[19,15],[22,19],[3,19]],'#bb4d57');p.rect(3,19,19,3,white);p.line(6,11,10,11,white);p.line(6,14,10,14,white);p.rect(15,15,3,2,gold);},
  oxxo_coffee:p=>{p.poly([[6,8],[18,8],[16,21],[8,21]],white);p.rect(5,6,14,3,dark);p.rect(8,11,9,6,'#bd3b43');p.rect(8,11,9,1,gold);p.line(10,14,14,14,white);p.line(10,4,12,2,steel);p.line(15,4,16,2,steel);},
  crumpled_receipt:p=>{p.poly([[5,3],[18,3],[20,8],[17,12],[20,21],[14,19],[10,21],[5,19]],cream);p.line(7,6,16,6,steel);p.line(7,9,13,9,steel);p.line(9,12,17,12,'#a67c52');p.line(8,16,15,16,red);},
  cloned_card:p=>{p.rect(1,3,17,12,'#514761');card(p,'#73a69b');p.rect(6,14,3,3,white);p.rect(14,4,7,2,gold);p.rect(19,2,2,6,gold);},
  mint_gum:p=>{p.poly([[3,8],[8,5],[19,5],[22,9],[18,18],[7,18],[2,14]],'#8cc9b0');p.rect(7,7,10,9,white);p.poly([[9,13],[13,8],[16,12],[12,15]],'#4d987b');p.line(3,8,5,13,steel);},
  motorcycle_helmet:p=>{p.oval(12,11,9,8,'#b1644d');p.rect(4,12,16,8,'#d79c5c');p.rect(5,10,15,5,dark);p.rect(7,11,12,2,blue);p.rect(16,15,4,7,steel);p.line(6,6,13,4,cream);},
  lucky_crumbs:p=>{p.oval(12,15,9,6,'#476d55');p.rect(8,6,8,5,'#7dac6a');p.rect(8,10,8,2,cream);for(const[x,y]of[[4,4],[17,3],[11,2],[19,12]]){p.rect(x,y,3,3,gold);p.dot(x,y,white);}},
  stolen_backpack:p=>{p.rect(6,6,13,15,'#656ea0');p.oval(12,6,6,3,'#909cba');p.rect(8,13,9,6,'#c5975d');p.rect(3,8,3,12,dark);p.rect(19,8,2,12,dark);p.line(9,3,15,3,steel);p.dot(13,15,gold);},
  chocolate_bread:p=>{loaf(p);p.rect(5,7,14,4,'#5a362d');p.rect(7,10,3,5,'#5a362d');p.rect(14,9,3,4,'#5a362d');p.rect(8,7,4,1,'#c29676');p.rect(16,20,4,2,'#5a362d');},
  titanium_beak:p=>{p.poly([[4,6],[12,3],[22,12],[12,15],[5,17]],steel);p.line(5,7,18,11,white,2);p.line(5,17,19,15,dark,2);p.dot(11,8,'#335576');p.line(3,3,5,3,blue);},
  polarized_glasses:p=>{glasses(p);p.rect(4,10,5,3,'#805b9d');p.rect(15,10,5,3,'#805b9d');p.line(5,10,7,12,cream);p.line(16,10,18,12,cream);p.line(3,6,9,4,steel);},
  copper_feather:p=>{feather(p);p.poly([[7,13],[15,4],[20,4],[16,13],[9,17]],'#cd8b5f');p.line(5,20,17,6,'#f3c695');coin(p,18,19);},
  wet_socks:p=>{p.rect(4,5,5,12,blue);p.rect(4,14,9,5,blue);p.rect(13,3,5,10,white);p.rect(13,10,7,4,white);p.rect(4,6,5,2,cream);p.rect(13,4,5,2,red);p.oval(14,21,8,1,'#528599');},
  bouncing_egg:p=>{p.oval(12,11,6,8,white);p.rect(9,7,3,2,cream);p.line(4,18,7,21,blue,2);p.line(7,21,20,21,blue,2);p.line(18,18,21,21,blue);p.oval(12,12,2,3,gold);},
  goalkeeper_gloves:p=>{p.poly([[3,18],[3,11],[6,8],[7,4],[10,4],[11,14],[9,21]],white);p.poly([[13,21],[12,12],[15,4],[18,4],[18,9],[21,11],[21,19]],cream);p.rect(3,18,6,3,red);p.rect(14,18,6,3,red);},
  grandma_container:p=>{p.poly([[3,10],[21,10],[19,21],[5,21]],'#bc999d');p.rect(2,7,20,4,'#8e6889');p.rect(6,5,12,2,'#bda9c0');p.rect(6,14,12,4,cream);p.line(8,15,14,15,'#ab713d');},
  hard_bolillo:p=>{p.poly([[3,14],[12,4],[17,3],[21,7],[20,12],[10,21],[5,21]],'#ad7545');p.line(5,17,17,5,cream,3);p.line(9,11,14,15,'#65513e',2);p.line(13,7,17,10,'#65513e',2);},
  bank_blueprint:p=>{blueprint(p);p.rect(2,3,3,19,cream);p.rect(19,3,3,19,cream);p.rect(8,5,7,2,gold);p.rect(11,6,2,4,gold);},
  stolen_gps:p=>{p.rect(6,2,12,20,steel);p.rect(8,5,8,12,'#173d4c');p.line(10,15,10,10,blue);p.line(10,10,15,10,blue);p.rect(13,8,3,3,gold);p.dot(11,19,cream);p.line(16,2,20,1,steel);},
  stained_map:p=>{blueprint(p);p.oval(8,9,5,4,'#9a7555');p.oval(11,15,4,4,'#9a7555');p.rect(14,13,5,5,purple);p.line(16,12,16,19,white);p.line(13,16,20,16,white);},
  guard_glasses:p=>{glasses(p);p.rect(3,4,18,3,'#4f6e78');p.rect(8,3,8,2,steel);p.rect(10,5,4,3,gold);p.rect(4,12,5,2,'#7593ad');p.dot(18,19,red);},
  informant:p=>{p.oval(12,11,6,7,'#98a4a6');p.rect(5,4,15,3,dark);p.rect(8,1,9,5,'#3a4250');p.rect(7,10,11,3,dark);p.rect(17,13,5,2,gold);p.poly([[3,22],[6,16],[18,16],[21,22]],'#5c534d');},
  ground_pepper:p=>{bottle(p,'#947458');p.rect(8,2,8,2,steel);for(const[x,y]of[[2,5],[4,10],[19,4],[20,10],[5,15]])p.dot(x,y,dark);p.rect(11,12,2,3,dark);},
  extra_butter:p=>{p.rect(3,13,17,6,gold);p.rect(6,7,16,6,cream);p.rect(6,7,16,2,'#ffefa7');p.rect(4,15,6,1,white);p.line(9,3,9,5,steel);p.line(8,4,10,4,steel);},
  steel_wings:p=>{p.poly([[2,4],[10,9],[11,20],[5,17]],steel);p.poly([[22,4],[14,9],[13,20],[19,17]],steel);p.line(4,6,8,12,white,2);p.line(19,7,16,13,white,2);p.rect(10,9,4,5,dark);},
  burnt_bread:p=>{loaf(p);p.rect(6,10,12,8,'#554037');p.rect(8,11,3,3,'#251e25');p.rect(14,14,3,3,'#251e25');p.line(7,4,9,1,steel);p.line(14,3,16,1,steel);p.dot(18,18,red);},
  sticky_honey:p=>{p.rect(6,6,12,15,'#c58b3e');p.rect(5,4,14,3,gold);p.rect(8,10,8,7,cream);p.oval(12,13,3,2,'#a37532');p.rect(16,7,2,11,gold);p.oval(19,21,3,1,gold);},
  confetti_egg:p=>{p.oval(12,13,6,7,cream);p.poly([[7,10],[10,12],[13,9],[17,12],[18,18],[9,20]],white);for(const[x,y,col]of[[4,5,red],[11,2,blue],[19,4,gold],[3,15,purple],[20,16,red]] as [number,number,string][])p.rect(x,y,2,3,col);},
  portable_alarm:p=>{p.rect(7,4,10,15,red);p.rect(9,6,6,5,dark);p.rect(8,15,8,2,cream);p.rect(10,19,4,3,steel);p.line(17,3,20,1,red);p.line(5,6,2,4,red);},
  bread_bag:p=>{p.poly([[4,5],[8,7],[12,5],[17,7],[20,5],[19,21],[5,21]],'#b98655');loaf(p);p.rect(5,15,14,6,'#be925b');p.rect(9,17,6,2,cream);},
  lucky_duck:p=>{duck(p);p.oval(7,3,3,2,'#68a277');p.oval(11,3,3,2,'#68a277');p.line(9,4,11,9,'#68a277');p.rect(3,20,5,1,gold);},
  double_barrel:p=>{p.line(3,18,17,4,steel,3);p.line(7,21,21,7,steel,3);p.line(5,17,16,6,white);p.line(10,18,20,8,white);p.rect(3,18,7,4,'#ad8254');},
  spiral_feathers:p=>{feather(p);p.line(2,14,2,7,purple);p.line(2,7,6,3,purple);p.line(15,20,21,17,purple);p.line(21,17,21,8,purple);p.rect(19,6,4,2,gold);p.rect(1,13,4,2,gold);},
  infiltrator_chicken:p=>{p.oval(12,15,7,6,cream);p.rect(9,5,8,8,white);p.rect(10,2,3,4,red);p.rect(14,3,3,3,red);p.rect(8,8,10,3,dark);p.rect(17,11,4,3,gold);p.rect(5,17,13,3,'#756553');},
  bodyguard_duck:p=>{duck(p,1,5);p.poly([[13,9],[21,9],[21,17],[17,22],[13,17]],steel);p.rect(14,11,6,2,white);p.rect(3,10,11,3,dark);},
  infinite_baguette:p=>{p.line(3,18,15,5,'#d5a264',4);p.line(5,18,17,6,cream,2);p.oval(14,17,4,3,purple);p.oval(20,17,3,3,purple);p.oval(14,17,2,1,dark);p.oval(20,17,1,1,dark);},
  radioactive_crumbs:p=>{p.oval(12,16,10,5,'#446e45');p.oval(12,16,7,3,'#9fc575');p.rect(5,9,4,4,cream);p.rect(14,7,5,4,gold);p.rect(10,14,4,3,cream);p.line(4,5,6,3,'#a4d98d');},
  forbidden_bread:p=>{loaf(p);p.rect(6,9,12,9,'#6b386f');p.line(7,11,16,18,'#c97187',2);p.line(15,10,7,18,'#c97187',2);p.rect(3,3,4,2,red);p.rect(17,3,4,2,red);},
  crumb_crown:p=>{p.poly([[3,7],[8,11],[12,3],[16,11],[21,7],[19,19],[5,19]],gold);p.rect(5,17,14,4,'#bd934c');p.rect(7,18,3,2,cream);p.rect(13,18,3,2,cream);coin(p,20,3);},
  stolen_watch:p=>{p.rect(9,1,6,22,'#746050');p.oval(12,12,8,8,gold);p.oval(12,12,6,6,white);p.line(12,12,12,8,dark);p.line(12,12,16,14,dark);p.rect(20,10,2,4,steel);},
  bank_debt:p=>{p.rect(5,2,14,20,'#6b4179');p.rect(7,4,10,4,cream);p.line(8,11,16,11,red);p.line(8,14,16,14,red);p.line(10,17,14,21,gold);p.line(14,17,10,21,gold);},
  wanted_duck:p=>{p.rect(4,2,16,20,cream);p.rect(5,4,14,3,'#894b43');duck(p,3,6);p.rect(6,19,12,2,red);p.rect(4,11,2,3,purple);},
  expired_bread:p=>{loaf(p);p.oval(8,12,3,3,'#6b955f');p.oval(16,16,3,3,'#6b955f');p.dot(7,11,'#c9d8aa');p.rect(10,4,5,3,purple);p.line(3,3,5,1,steel);},
  overdraft_card:p=>{card(p,'#765078');p.line(6,14,15,14,red,2);p.line(11,11,11,18,red,2);p.rect(17,3,4,4,red);p.dot(18,4,cream);},
  fake_id:p=>{card(p,'#bac3a7');p.rect(5,10,5,6,blue);p.oval(7,11,2,2,cream);p.line(12,11,18,11,steel);p.line(12,14,17,14,steel);p.rect(9,2,6,4,steel);},
};