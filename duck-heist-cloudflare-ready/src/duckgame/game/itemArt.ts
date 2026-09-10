// Every icon is authored on a 24 x 24 pixel grid. The same atlas serves the
// world, shop, tooltips, inventory and collection; there are no network assets.
import { EXPANSION_ART } from './expansionArt';
type Pixel = string | undefined;
export type IconPainter = (p: PixelPainter) => void;

export class PixelPainter {
  pixels: Pixel[] = Array(24 * 24);
  dot(x: number, y: number, color: string) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 1 && y >= 1 && x < 23 && y < 23) this.pixels[y * 24 + x] = color;
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.dot(i, j, color);
  }
  line(x: number, y: number, xx: number, yy: number, color: string, width = 1) {
    const steps = Math.max(Math.abs(xx - x), Math.abs(yy - y), 1);
    for (let i = 0; i <= steps; i++) this.rect(Math.round(x + (xx - x) * i / steps), Math.round(y + (yy - y) * i / steps), width, width, color);
  }
  oval(cx: number, cy: number, rx: number, ry: number, color: string) {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.dot(x, y, color);
    }
  }
  poly(points: number[][], color: string) {
    for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) this.dot(x, y, color);
    }
  }
}

const C = {
  crust: '#97522d', bread: '#de9c54', cream: '#ffe4a3', white: '#f8f0d7',
  gold: '#ffc951', light: '#fff6c1', steel: '#718b9c', silver: '#c4e1e4',
  red: '#e8574f', wine: '#8d343b', blue: '#4b9db5', navy: '#294f73',
  green: '#8cc367', dark: '#18212c', purple: '#b087d5', orange: '#f4944b',
};
const bread = (p: PixelPainter, x = 5, y = 6, w = 14, h = 14) => {
  p.rect(x, y + 3, w, h - 3, C.crust); p.oval(x + w / 2, y + 4, w / 2, 4, C.bread);
  p.rect(x + 2, y + 4, w - 4, h - 6, C.cream); p.dot(x + 4, y + 8, C.bread); p.dot(x + w - 5, y + h - 5, C.bread);
};
const feather = (p: PixelPainter, color = C.silver, lean = 0) => {
  p.poly([[5, 19], [6, 10], [14 + lean, 3], [18, 4], [18, 10], [10, 18]], color);
  p.line(4, 21, 16, 6, C.steel); p.line(9, 14, 7, 10, C.dark); p.line(12, 11, 17, 10, C.dark);
};
const egg = (p: PixelPainter, x = 12, y = 12, color = C.white, scale = 1) => {
  p.oval(x, y + 2, 5 * scale, 6 * scale, color); p.oval(x, y - 1, 3 * scale, 5 * scale, color);
  p.rect(x - 2, y - 3, 2, 3, C.light);
};
const duck = (p: PixelPainter, x = 4, y = 8, color = C.gold) => {
  p.oval(x + 7, y + 7, 6, 4, color); p.rect(x + 6, y + 1, 6, 6, color);
  p.rect(x + 11, y + 4, 4, 2, C.orange); p.dot(x + 9, y + 3, C.dark);
  p.rect(x + 4, y + 6, 4, 2, C.light); p.line(x + 1, y + 8, x, y + 5, color);
};
const spark = (p: PixelPainter, x: number, y: number, color = C.light) => {
  p.line(x - 2, y, x + 2, y, color); p.line(x, y - 2, x, y + 2, color);
};
const bottle = (p: PixelPainter, color: string, cap: string) => {
  p.rect(8, 8, 8, 13, color); p.rect(10, 3, 4, 6, color); p.rect(9, 2, 6, 3, cap);
  p.rect(9, 11, 6, 5, C.white); p.rect(9, 8, 1, 11, '#ffffff66');
};
const flame = (p: PixelPainter, x = 17, y = 8) => {
  p.poly([[x - 3, y + 3], [x - 1, y - 2], [x, y], [x + 2, y - 5], [x + 4, y + 3], [x + 1, y + 6]], C.red);
  p.poly([[x, y + 4], [x + 1, y], [x + 3, y + 4]], C.gold);
};
const magnet = (p: PixelPainter) => {
  p.rect(5, 5, 4, 13, C.red); p.rect(15, 5, 4, 13, C.blue); p.rect(8, 15, 8, 5, C.steel);
  p.rect(5, 4, 4, 4, C.silver); p.rect(15, 4, 4, 4, C.silver); p.rect(9, 18, 6, 1, C.silver);
};
const bag = (p: PixelPainter, color = C.bread) => {
  p.oval(12, 15, 7, 6, color); p.rect(8, 6, 8, 4, color); p.line(9, 10, 15, 10, C.crust, 2);
};
const shield = (p: PixelPainter, color = C.steel) => {
  p.poly([[5, 5], [12, 3], [20, 5], [19, 15], [12, 22], [5, 15]], color);
  p.line(7, 6, 12, 5, C.light); p.line(7, 6, 7, 14, C.light);
};
const cup = (p: PixelPainter, color = C.white) => {
  p.poly([[6, 8], [18, 8], [16, 21], [8, 21]], color); p.rect(5, 6, 14, 3, C.crust);
  p.line(9, 4, 11, 2, C.silver); p.line(14, 4, 16, 2, C.silver);
};
const bell = (p: PixelPainter, color = C.red) => {
  p.oval(12, 12, 7, 7, color); p.rect(4, 17, 16, 4, C.steel); p.rect(8, 8, 3, 4, C.light);
};
const map = (p: PixelPainter, color = C.blue) => {
  p.poly([[3, 5], [8, 3], [15, 6], [21, 4], [21, 19], [15, 21], [8, 18], [3, 20]], color);
  p.line(8, 5, 8, 17, C.silver); p.line(15, 7, 15, 19, C.silver);
  p.line(5, 12, 18, 12, C.light); p.rect(16, 8, 3, 3, C.gold);
};
const boot = (p: PixelPainter, x: number, y: number, color: string) => {
  p.rect(x, y, 5, 8, color); p.rect(x, y + 6, 8, 4, color); p.rect(x, y + 9, 9, 2, C.silver);
};
const yolk = (p: PixelPainter, x: number, y: number) => {
  p.oval(x, y, 4, 4, C.orange); p.oval(x, y - 1, 3, 3, C.gold); p.dot(x - 1, y - 2, C.light);
};

export const ITEM_ART: Record<string, IconPainter> = {
  ...EXPANSION_ART,
  bread_helmet: p => { bread(p, 3, 5, 18, 12); p.rect(2, 14, 20, 3, C.bread); p.rect(8, 15, 8, 6, C.dark); p.rect(16, 16, 2, 5, C.crust); },
  lucky_feather: p => { feather(p, C.green); spark(p, 19, 17); },
  greasy_wings: p => { p.poly([[3, 6], [10, 9], [11, 19], [5, 15]], C.gold); p.poly([[21, 6], [14, 9], [13, 19], [19, 15]], C.gold); p.line(5, 9, 8, 15, C.cream); p.line(18, 9, 16, 15, C.cream); p.oval(12, 20, 3, 1, C.orange); },
  double_yolk: p => { p.oval(12, 13, 10, 7, C.white); yolk(p, 7, 12); yolk(p, 16, 14); },
  mother_duck: p => { duck(p, 2, 6); duck(p, 10, 12, C.cream); p.dot(19, 4, C.red); p.line(18, 3, 20, 3, C.red); },
  bread_magnet: p => { magnet(p); bread(p, 8, 1, 7, 6); },
  hot_sauce: p => { bottle(p, C.red, C.green); flame(p, 18, 8); },
  butter: p => { p.poly([[3, 12], [16, 8], [21, 12], [8, 17]], C.light); p.poly([[3, 12], [8, 17], [21, 12], [21, 18], [8, 22], [3, 17]], C.gold); p.rect(9, 10, 7, 1, C.white); },
  toaster: p => { p.rect(3, 9, 18, 11, C.steel); p.rect(5, 11, 14, 7, C.silver); bread(p, 6, 3, 11, 9); p.rect(19, 12, 3, 3, C.red); },
  golden_beak: p => { p.poly([[4, 9], [14, 7], [22, 14], [13, 14], [5, 17]], C.gold); p.line(6, 15, 19, 15, C.orange); p.dot(12, 9, C.crust); spark(p, 6, 5); },
  angry_goose_feather: p => { feather(p, C.red); p.line(13, 5, 21, 2, C.gold, 2); p.line(16, 9, 21, 8, C.orange); },
  pond_water: p => { p.oval(12, 16, 10, 5, C.blue); p.oval(12, 16, 8, 3, C.navy); p.oval(9, 14, 4, 2, C.green); p.poly([[10, 9], [13, 4], [16, 9]], C.silver); },
  bread_crust: p => { shield(p, C.crust); bread(p, 7, 7, 10, 10); },
  donut_bribe: p => { p.rect(3, 13, 17, 7, C.green); p.rect(5, 15, 13, 3, C.navy); p.oval(14, 10, 7, 6, C.bread); p.oval(14, 9, 6, 4, '#eab0b3'); p.oval(14, 10, 2, 2, C.dark); p.dot(10, 7, C.white); },
  smoke_feather: p => { p.oval(8, 8, 5, 4, C.steel); p.oval(16, 5, 5, 3, C.silver); feather(p, '#adbdc8'); p.rect(5, 20, 5, 1, C.blue); },
  vault_map: p => { map(p); p.rect(8, 7, 8, 11, C.navy); p.rect(10, 9, 4, 7, C.gold); p.dot(12, 12, C.dark); },
  wide_belt: p => { p.rect(3, 8, 18, 10, C.crust); p.rect(9, 7, 8, 12, C.gold); p.rect(11, 9, 4, 8, C.dark); p.line(12, 12, 16, 12, C.silver); p.dot(6, 12, C.dark); },
  magnetic_crumbs: p => { magnet(p); p.rect(2, 1, 3, 2, C.bread); p.rect(20, 1, 2, 3, C.gold); p.line(9, 2, 11, 4, C.cream); p.rect(11, 8, 3, 3, C.bread); },
  soapy_feet: p => { boot(p, 4, 10, C.blue); boot(p, 13, 7, C.silver); p.oval(5, 5, 3, 3, C.silver); p.dot(5, 4, C.white); p.oval(11, 3, 2, 2, C.blue); },
  garlic_bread: p => { bread(p, 3, 8, 14, 13); p.line(5, 13, 15, 11, C.green, 2); p.oval(18, 10, 4, 5, C.white); p.line(18, 5, 17, 2, C.green); p.line(17, 7, 16, 12, C.bread); },
  steel_feathers: p => { feather(p); p.rect(4, 18, 6, 3, C.navy); p.dot(17, 4, C.white); p.line(13, 4, 17, 4, C.steel); },
  gas_coffee: p => { cup(p); p.rect(9, 11, 6, 5, C.red); p.line(12, 12, 10, 14, C.gold); p.line(10, 14, 13, 14, C.gold); p.dot(18, 3, C.gold); },
  tactical_mayo: p => { bottle(p, C.cream, C.navy); p.rect(8, 13, 8, 4, C.green); p.line(10, 13, 13, 16, C.navy); },
  eggshell: p => { p.poly([[4, 10], [8, 13], [11, 10], [15, 13], [20, 10], [19, 18], [15, 21], [8, 20], [5, 17]], C.white); p.rect(8, 17, 8, 2, C.silver); p.line(5, 4, 8, 6, C.white); p.line(16, 3, 19, 5, C.white); },
  debt: p => { p.rect(5, 3, 14, 18, C.cream); p.line(7, 7, 15, 7, C.crust); p.line(7, 10, 14, 10, C.crust); p.line(8, 18, 16, 12, C.red, 2); p.line(12, 12, 17, 12, C.red); },
  cardboard_vest: p => { p.poly([[5, 4], [9, 5], [12, 8], [15, 5], [19, 4], [20, 19], [4, 19]], C.bread); p.line(12, 9, 12, 19, C.crust); p.line(6, 12, 18, 12, C.cream, 2); p.dot(16, 16, C.dark); },
  stolen_map: p => { map(p, C.cream); p.line(4, 7, 18, 17, C.navy); p.line(7, 18, 17, 6, C.red); p.rect(16, 8, 3, 3, C.red); },
  monocle: p => { p.oval(10, 9, 7, 7, C.gold); p.oval(10, 9, 5, 5, C.blue); p.line(7, 6, 10, 5, C.white); p.line(16, 11, 20, 18, C.gold); p.oval(18, 20, 3, 2, C.gold); },
  broken_alarm: p => { bell(p); p.line(13, 5, 10, 10, C.dark, 2); p.line(10, 10, 14, 13, C.dark); p.line(14, 13, 11, 17, C.dark); p.rect(20, 5, 2, 2, C.orange); },
  toasted_bread: p => { bread(p); p.rect(8, 10, 8, 7, C.bread); p.line(9, 11, 14, 17, C.crust); p.line(14, 11, 9, 17, C.crust); p.line(7, 3, 9, 1, C.steel); },
  industrial_butter: p => { p.rect(4, 6, 16, 15, C.steel); p.rect(4, 5, 16, 4, C.gold); p.rect(7, 11, 10, 6, C.gold); p.line(9, 11, 14, 16, C.dark, 2); p.rect(8, 3, 8, 2, C.silver); },
  hard_egg: p => { egg(p); p.rect(7, 11, 10, 3, C.steel); p.rect(10, 10, 4, 5, C.silver); p.dot(11, 11, C.dark); },
  sharp_beak: p => { p.poly([[4, 5], [11, 4], [22, 12], [10, 16], [4, 13]], C.silver); p.line(5, 6, 19, 12, C.white); p.line(7, 15, 18, 14, C.steel); },
  aerodynamic_feather: p => { feather(p, C.blue, 2); p.line(2, 6, 7, 6, C.silver); p.line(2, 10, 5, 10, C.silver); p.line(16, 18, 21, 18, C.white); },
  running_feet: p => { boot(p, 3, 8, C.red); boot(p, 13, 11, C.red); p.line(3, 12, 7, 12, C.white); p.line(2, 5, 8, 5, C.orange); },
  wholegrain: p => { bread(p, 4, 6, 16, 15); for (const [x,y] of [[8,10],[14,9],[11,14],[16,16],[7,17]]) p.rect(x,y,2,1,C.crust); p.line(3, 2, 7, 7, C.gold); },
  suspicious_seeds: p => { p.poly([[5, 3], [19, 3], [18, 21], [6, 21]], C.cream); p.rect(6, 4, 12, 3, C.green); p.oval(11, 13, 2, 3, C.crust); p.oval(16, 16, 2, 2, C.gold); p.line(8, 8, 6, 10, C.dark); },
  tactical_napkin: p => { p.poly([[4, 4], [18, 4], [21, 17], [7, 21]], C.white); p.line(7, 5, 10, 18, C.silver); p.rect(10, 9, 9, 6, C.navy); p.line(12, 12, 17, 12, C.gold); },
  stolen_helmet: p => { p.oval(12, 11, 9, 7, C.navy); p.rect(3, 12, 18, 4, C.blue); p.rect(7, 15, 11, 5, C.silver); p.rect(10, 7, 4, 4, C.gold); p.line(8, 17, 15, 17, C.white); },
  fortunate_plume: p => { feather(p, C.cream); p.oval(17, 17, 3, 3, C.green); p.oval(14, 19, 3, 2, C.green); p.line(17, 18, 20, 22, C.green); },
  crumb_bag: p => { bag(p); p.rect(9, 13, 6, 5, C.cream); p.rect(17, 3, 3, 2, C.gold); p.rect(3, 19, 2, 2, C.cream); },
  clandestine_account: p => { p.rect(3, 5, 18, 14, C.navy); p.rect(3, 8, 18, 3, C.gold); p.rect(5, 13, 5, 3, C.green); p.line(15, 14, 19, 14, C.silver); },
  reinforced_shell: p => { egg(p, 12, 11, C.steel); p.rect(6, 8, 12, 3, C.silver); p.rect(10, 5, 3, 15, C.silver); p.dot(11, 8, C.dark); p.dot(11, 15, C.dark); },
  wet_bread: p => { bread(p, 3, 6, 15, 14); p.poly([[19, 7], [15, 15], [19, 19], [22, 16]], C.blue); p.line(6, 14, 13, 14, C.blue); },
  spicy_egg: p => { egg(p, 10, 13); flame(p, 17, 10); p.rect(9, 11, 3, 4, C.red); },
  honey_bread: p => { bread(p, 3, 6, 16, 13); p.rect(5, 9, 12, 3, C.gold); p.rect(8, 11, 3, 6, C.orange); p.oval(18, 19, 3, 2, C.gold); },
  faulty_alarm: p => { bell(p, C.blue); p.rect(5, 11, 14, 4, C.dark); p.rect(8, 12, 3, 2, C.gold); p.line(17, 3, 22, 1, C.red); },
  stolen_coupon: p => { p.rect(3, 7, 18, 12, C.green); p.rect(5, 9, 14, 8, C.cream); p.oval(7, 11, 1, 1, C.red); p.oval(16, 15, 1, 1, C.red); p.line(9, 15, 14, 11, C.red); p.rect(2, 12, 3, 3, C.dark); },
  ghost_feather: p => { feather(p, '#c8c3eb'); p.rect(10, 8, 2, 3, C.navy); p.rect(14, 6, 2, 3, C.navy); p.line(3, 18, 8, 18, C.purple); p.dot(19, 18, C.purple); },
  triple_yolk: p => { p.oval(12, 14, 10, 8, C.white); yolk(p, 8, 15); yolk(p, 17, 15); yolk(p, 12, 7); },
  blessed_bread: p => { bread(p, 6, 9, 12, 12); p.oval(12, 4, 8, 2, C.gold); p.oval(12, 4, 5, 1, C.dark); p.line(3, 12, 6, 15, C.white); p.line(20, 12, 18, 15, C.white); },
  pocket_duck: p => { p.rect(5, 11, 14, 10, C.navy); duck(p, 4, 1); p.rect(5, 13, 14, 3, C.blue); p.line(7, 16, 17, 16, C.silver); },
  large_family: p => { duck(p, 1, 2); duck(p, 8, 10, C.cream); p.rect(3, 18, 5, 3, C.orange); p.dot(4, 18, C.dark); },
  bottomless_bag: p => { bag(p, C.navy); p.oval(12, 8, 7, 3, C.purple); p.oval(12, 8, 5, 2, C.dark); p.rect(4, 3, 3, 2, C.gold); p.rect(17, 2, 2, 3, C.gold); },
  recharged_quack: p => { p.rect(6, 5, 12, 16, C.green); p.rect(9, 3, 6, 2, C.silver); p.poly([[14, 8], [9, 14], [13, 14], [10, 19], [17, 11], [13, 11]], C.gold); },
  ultra_quack: p => { p.poly([[4, 9], [9, 9], [18, 4], [18, 18], [9, 14], [4, 14]], C.gold); p.rect(8, 14, 4, 7, C.red); p.line(20, 6, 21, 4, C.light); p.line(20, 15, 22, 17, C.light); },
  turbo_feather: p => { p.rect(5, 11, 6, 9, C.navy); feather(p, C.red); flame(p, 5, 17); p.rect(12, 4, 4, 3, C.silver); },
  uranium_bread: p => { bread(p, 4, 5, 16, 16); p.rect(7, 9, 10, 9, C.green); p.oval(12, 13, 2, 2, C.dark); p.rect(11, 9, 3, 2, C.dark); p.rect(7, 14, 3, 3, C.dark); p.rect(15, 14, 3, 3, C.dark); },
  golden_egg: p => { egg(p, 12, 13, C.gold); p.line(8, 17, 16, 17, C.orange); spark(p, 5, 5); spark(p, 20, 9); },
  infinite_quack: p => { duck(p, 1, 7); p.oval(17, 5, 4, 3, C.purple); p.oval(10, 5, 4, 3, C.purple); p.oval(17, 5, 2, 1, C.dark); p.oval(10, 5, 2, 1, C.dark); },
  crumb_king: p => { p.poly([[3, 6], [7, 11], [12, 3], [17, 11], [21, 6], [19, 20], [5, 20]], C.gold); p.rect(7, 16, 3, 3, C.red); p.rect(15, 16, 3, 3, C.blue); },
  baguette_armor: p => { shield(p, C.crust); p.line(7, 7, 9, 17, C.bread, 3); p.line(13, 5, 15, 17, C.cream, 3); p.line(18, 7, 18, 14, C.bread, 2); },
  emergency_quack: p => { duck(p, 1, 7); p.line(19, 7, 21, 5, C.gold); p.line(20, 11, 22, 11, C.gold); p.line(19, 15, 21, 17, C.gold); },
  bread_bomb: p => { bread(p, 4, 10, 16, 11); p.rect(9, 6, 6, 5, C.dark); p.line(12, 7, 15, 3, C.crust); spark(p, 17, 3, C.orange); },
  duck_decoy: p => { p.oval(12, 20, 10, 2, C.blue); duck(p, 3, 6); p.line(5, 20, 20, 20, C.silver); },
  false_alarm: p => { bell(p); p.line(4, 4, 20, 20, C.white, 2); },
  coffee_machine: p => { p.rect(5, 4, 14, 17, C.steel); p.rect(7, 6, 10, 5, C.red); p.rect(9, 14, 7, 5, C.white); p.rect(11, 11, 2, 3, C.crust); p.dot(16, 8, C.light); },
  holy_crumb: p => { p.oval(12, 4, 7, 2, C.gold); p.rect(8, 10, 8, 8, C.cream); p.line(10, 9, 15, 9, C.bread); p.poly([[3, 12], [7, 15], [8, 19], [3, 17]], C.white); p.poly([[21, 12], [17, 15], [16, 19], [21, 17]], C.white); },
  megaphone: p => { p.poly([[3, 9], [9, 8], [20, 3], [20, 18], [9, 14], [3, 14]], C.silver); p.rect(8, 14, 4, 7, C.red); p.rect(18, 5, 3, 12, C.navy); },
  bread_grenade: p => { p.oval(12, 15, 7, 6, C.green); p.rect(9, 6, 6, 6, C.steel); p.line(15, 7, 20, 16, C.silver, 2); p.rect(7, 13, 10, 3, C.bread); },
  rubber_lure: p => { duck(p, 2, 5); p.rect(4, 18, 15, 3, C.red); p.rect(12, 2, 2, 4, C.navy); p.line(13, 2, 19, 2, C.silver); },
  stolen_siren: p => { bell(p, C.blue); p.rect(12, 5, 6, 11, C.red); p.line(3, 7, 1, 4, C.silver); p.line(20, 7, 22, 4, C.silver); },
  double_coffee: p => { cup(p, C.bread); p.rect(3, 14, 7, 7, C.white); p.rect(2, 13, 9, 2, C.navy); p.rect(11, 10, 4, 4, C.gold); },
  tray_shield: p => { shield(p, C.silver); p.poly([[8, 7], [17, 7], [17, 14], [12, 18], [8, 14]], C.steel); p.rect(10, 10, 4, 6, C.navy); },
  bread_box: p => { p.rect(3, 11, 18, 10, C.crust); p.rect(3, 11, 18, 3, C.bread); bread(p, 5, 4, 8, 11); bread(p, 12, 3, 8, 12); p.rect(9, 16, 6, 3, C.gold); },
  red_button: p => { p.poly([[3, 12], [12, 8], [21, 12], [21, 20], [3, 20]], C.steel); p.oval(12, 12, 7, 4, C.wine); p.oval(12, 10, 6, 4, C.red); p.rect(9, 7, 4, 1, C.light); },
  quack_blaster: p => { p.rect(3, 7, 16, 8, C.gold); p.rect(4, 15, 5, 6, C.crust); p.rect(17, 9, 5, 4, C.navy); p.oval(12, 9, 3, 3, C.light); p.dot(14, 9, C.dark); },
  breadcrumb_shotgun: p => { p.line(3, 17, 17, 7, C.crust, 3); p.line(10, 10, 20, 3, C.steel, 3); p.line(13, 12, 22, 6, C.silver, 2); p.rect(4, 18, 4, 3, C.bread); },
  feather_gun: p => { p.rect(3, 10, 18, 5, C.steel); p.rect(7, 15, 6, 6, C.navy); p.line(12, 5, 20, 5, C.silver, 2); p.line(13, 7, 20, 7, C.silver); feather(p, '#a8c8cf'); p.rect(3, 13, 6, 3, C.navy); },
  bread_boomerang: p => { p.poly([[3, 5], [8, 4], [12, 11], [20, 16], [20, 21], [10, 17], [6, 12]], C.crust); p.line(5, 6, 9, 12, C.cream, 2); p.line(9, 13, 18, 19, C.bread, 2); },
  rubber_duck_cannon: p => { p.rect(2, 13, 19, 6, C.blue); p.rect(7, 17, 6, 5, C.navy); duck(p, 3, 2); p.rect(19, 12, 3, 8, C.silver); },
  baguette_launcher: p => { p.line(4, 17, 20, 6, C.navy, 5); p.line(3, 13, 17, 3, C.bread, 3); p.line(4, 13, 18, 4, C.cream); p.rect(8, 16, 5, 6, C.steel); p.line(18, 5, 21, 9, C.silver, 2); },
  quack_laser: p => { p.rect(2, 8, 15, 8, C.navy); p.rect(5, 16, 5, 6, C.steel); p.rect(7, 10, 6, 4, C.gold); p.rect(16, 6, 3, 12, C.silver); p.rect(19, 10, 4, 3, C.light); },
  golden_egg_revolver: p => { p.rect(4, 8, 18, 4, C.gold); p.oval(10, 12, 5, 4, C.orange); p.oval(10, 11, 3, 3, C.light); p.poly([[5, 14], [11, 14], [9, 22], [3, 20]], C.crust); p.rect(19, 6, 2, 2, C.gold); },
  tactical_toaster: p => { p.rect(4, 8, 16, 12, C.steel); p.rect(6, 10, 5, 8, C.dark); p.rect(13, 10, 5, 8, C.dark); p.rect(7, 6, 3, 5, C.bread); p.rect(14, 5, 3, 6, C.orange); flame(p, 20, 8); },
  egg_cannon: p => { p.rect(3, 12, 16, 6, C.navy); egg(p, 16, 8, C.white, .8); p.rect(6, 16, 5, 5, C.steel); p.rect(18, 11, 4, 8, C.silver); },
  baguette_sniper: p => { p.line(2, 16, 20, 6, C.navy, 3); p.line(4, 14, 18, 5, C.bread, 2); p.rect(12, 4, 8, 3, C.steel); p.rect(16, 3, 3, 2, C.light); p.rect(6, 16, 4, 5, C.crust); },
  plasma_baker: p => { bread(p, 4, 8, 16, 12); p.rect(8, 11, 8, 6, C.purple); p.oval(12, 13, 3, 3, C.light); spark(p, 5, 5, C.purple); spark(p, 20, 7, C.gold); },
  homing_crumbs: p => { p.rect(4, 10, 14, 5, C.crust); p.rect(16, 11, 5, 3, C.steel); p.rect(6, 15, 4, 5, C.navy); for (const [x,y] of [[4,5],[10,3],[18,6]]) p.rect(x,y,3,2,C.bread); },
  butter_blaster: p => { p.rect(3,10,15,6,C.gold); p.rect(6,16,5,5,C.crust); p.rect(17,11,5,3,C.cream); p.oval(7,7,4,3,C.bread); p.dot(19,12,C.light); },
  croissant_cutter: p => { p.rect(3,12,14,5,C.steel); p.rect(6,17,5,4,C.navy); p.poly([[14,5],[19,4],[22,8],[18,12],[14,10],[17,8]],C.bread); p.line(15,6,19,10,C.cream,2); },
  vault_drill: p => { p.rect(3,10,11,8,C.navy); p.rect(6,17,5,5,C.steel); p.poly([[14,9],[22,12],[14,15]],C.silver); p.line(15,11,21,12,C.light); p.dot(7,13,C.red); },
  receipt_ripper: p => { p.rect(3,9,15,8,C.steel); p.rect(6,17,5,4,C.navy); p.rect(16,7,6,3,C.white); p.rect(17,10,5,2,C.cream); p.line(18,7,20,12,C.dark); },
  remote_bomb: p => { bread(p, 4, 10, 16, 11); p.rect(8, 6, 8, 5, C.red); p.rect(10, 4, 4, 3, C.steel); p.dot(12, 8, C.light); },
  butter_sprayer: p => { p.rect(6, 6, 10, 14, C.gold); p.rect(8, 3, 6, 4, C.silver); p.rect(16, 10, 5, 3, C.cream); p.rect(4, 18, 14, 3, C.bread); },
  crumb_drone: p => { p.oval(12, 13, 8, 5, C.gold); p.rect(4, 11, 4, 2, C.silver); p.rect(16, 11, 4, 2, C.silver); p.dot(10, 12, C.dark); p.rect(10, 16, 4, 3, C.navy); },
  emergency_bread: p => { bread(p); p.rect(9, 4, 6, 3, C.red); p.rect(11, 2, 2, 7, C.red); spark(p, 5, 4); },
  fake_alarm: p => { bell(p, C.red); p.rect(10, 4, 4, 3, C.silver); p.line(4, 6, 2, 3, C.gold); p.line(20, 6, 22, 3, C.gold); },
  hp: p => bread(p),
  sandwich: p => { p.rect(3, 7, 18, 4, C.bread); p.rect(4, 11, 16, 2, C.green); p.rect(5, 13, 14, 2, C.red); p.rect(4, 15, 16, 2, C.gold); p.rect(3, 17, 18, 4, C.cream); p.rect(5, 8, 12, 1, C.light); },
  baguette: p => { p.line(3, 18, 17, 4, C.crust, 4); p.line(4, 16, 16, 4, C.cream, 3); for(let i=0;i<3;i++) p.line(7+i*4,16-i*4,9+i*4,16-i*4,C.bread); },
  croissant: p => { p.poly([[3, 4], [7, 9], [12, 6], [17, 9], [21, 4], [21, 13], [17, 19], [7, 19], [3, 13]], C.bread); p.line(8, 10, 8, 17, C.cream); p.line(13, 9, 14, 17, C.cream); },
  torta: p => { p.rect(3, 9, 18, 12, C.bread); p.rect(3, 12, 18, 3, C.white); p.rect(3, 7, 18, 4, '#ec9bb4'); p.rect(6, 9, 3, 4, '#ec9bb4'); p.line(11, 2, 11, 7, C.gold, 2); p.dot(12, 1, C.red); },
  pan_dorado: p => { bread(p, 3, 6, 18, 15); p.rect(6, 10, 12, 7, C.gold); spark(p, 5, 3); spark(p, 21, 4); p.rect(10, 13, 4, 2, C.light); },
  crumb: p => { for(const [x,y] of [[4,12],[10,7],[16,14],[9,18],[18,5]]) { p.rect(x,y,4,3,C.bread); p.rect(x,y,2,1,C.cream); } },
  golden_crumb: p => { p.oval(12, 12, 9, 9, C.orange); p.oval(12, 11, 8, 8, C.gold); p.oval(12, 11, 5, 5, C.orange); p.rect(10, 6, 3, 10, C.gold); p.rect(9, 7, 7, 2, C.gold); spark(p, 4, 4); },
};

const ARSENAL_WEAPON_IDS=new Set<string>(["pico_percutor","nomina_42","gomera_migas","pistola_jarabe","paga_patos","tronador_costra","horno_recortado","molinillo_pan","escopeta_mermelada","rafaga_harina","subcuac_9","picoteadora_tactica","ventilador_servilletas","cinta_transportadora","mortero_masa","gran_bagueton","cazuela_volatil","cohete_croqueta","canon_levadura","rayo_mostaza","bobina_cuantica","arco_tostado","migaja_negra","sintetizador_cuac","paraguas_balistico","caja_registradora","impresora_multas","rodillo_cocina","iman_boveda","pato_orbital"]);
const arsenalIcon=(id:string):IconPainter=>p=>{let h=2166136261;for(const c of id){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}const cs=[C.gold,C.blue,C.green,C.red,C.purple,C.orange,C.silver],a=cs[Math.abs(h)%cs.length],b=cs[Math.abs(h>>4)%cs.length],n=13+(Math.abs(h>>8)%7),y=8+(Math.abs(h>>12)%5);p.rect(3,y,n,5,a);p.rect(6,y+5,5,7,C.dark);p.rect(n,y+1,Math.max(3,21-n),3,C.silver);p.line(5,y+1,Math.min(18,n+2),y+1,b);if(h&1)p.oval(10,y+2,3,3,C.light);if(h&2)p.poly([[n-2,y-2],[22,y+2],[n-2,y+6]],b);if(h&4)p.rect(8,y-3,7,2,C.steel);};
const mystery: IconPainter = p => {
  duck(p, 3, 8, '#a4a9ba'); p.rect(7, 3, 9, 2, C.light); p.rect(14, 5, 2, 3, C.light);
  p.rect(11, 7, 4, 2, C.light); p.rect(11, 9, 2, 2, C.light); p.rect(11, 13, 2, 2, C.light);
};
const cache = new Map<string, HTMLCanvasElement>();

export function getIconPixels(id:string){
  const p=new PixelPainter();const painter=ITEM_ART[id]??(ARSENAL_WEAPON_IDS.has(id)?arsenalIcon(id):mystery);painter(p);
  return p.pixels;
}

export function drawItemIcon(ctx: CanvasRenderingContext2D, x: number, y: number, id: string, size = 24, color = C.purple, silhouette = false) {
  const key = `${id}:${silhouette}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas'); canvas.width = canvas.height = 24;
    const c = canvas.getContext('2d');
    if (!c) return;
    let pixels: Pixel[];
    try { pixels = getIconPixels(id); } catch { pixels = getIconPixels('mystery'); }
    if(!pixels.some(Boolean)) pixels=getIconPixels('mystery');
    for(let yy=0;yy<24;yy++) for(let xx=0;xx<24;xx++) {
      if (!pixels[yy * 24 + xx]) continue;
      c.fillStyle = '#101723'; c.fillRect(xx-1,yy-1,3,3);
    }
    pixels.forEach((pixel, index) => {
      if (!pixel) return;
      c.fillStyle = silhouette ? '#42465b' : pixel;
      c.fillRect(index % 24, Math.floor(index / 24), 1, 1);
    });
    if (!silhouette || ITEM_ART[id]) cache.set(key, canvas);
  }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (!ITEM_ART[id]) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y + size - 1), size, 1); }
  ctx.drawImage(canvas, Math.round(x), Math.round(y), size, size); ctx.restore();
}