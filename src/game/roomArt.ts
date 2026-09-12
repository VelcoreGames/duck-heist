import { TILE_SIZE, ROOM_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_DOOR } from './constants';
import type { FloorTheme } from './constants';

const T = TILE_SIZE;

function hash(x: number, y: number, s = 0) {
  return Math.abs((x * 73 + y * 37 + s * 19) * 2654435761) >>> 0;
}

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + .5, Math.round(y1) + .5);
  ctx.lineTo(Math.round(x2) + .5, Math.round(y2) + .5);
  ctx.stroke();
}

function drawLobbyWall(ctx: CanvasRenderingContext2D, px: number, py: number, x: number, y: number, theme: FloorTheme, h: number) {
  // Silueta oscura gruesa y panelado profundo, inspirado en un banco clásico chibi.
  r(ctx, px, py, T, T, '#10191b');
  r(ctx, px + 1, py + 1, T - 2, T - 2, theme.wall[(x + y) % 2]);

  // Franja superior crema que simula cornisa iluminada.
  r(ctx, px + 2, py + 2, T - 4, 4, '#d9c9a8');
  r(ctx, px + 3, py + 3, T - 6, 1, '#f3e5c0');
  r(ctx, px + 2, py + 6, T - 4, 2, '#b89958');

  // Paneles verticales verde petróleo con moldura de latón.
  r(ctx, px + 4, py + 9, T - 8, 10, '#2e4a4b');
  r(ctx, px + 5, py + 10, T - 10, 8, '#365456');
  r(ctx, px + 4, py + 9, T - 8, 1, '#6f8581');
  r(ctx, px + 4, py + 18, T - 8, 1, '#152729');
  if ((x + y) % 2 === 0) {
    r(ctx, px + 7, py + 11, 1, 6, 'rgba(255,255,255,.10)');
    r(ctx, px + T - 8, py + 11, 1, 6, 'rgba(0,0,0,.24)');
  }

  // Zócalo nogal que ayuda a que el muro tenga peso visual.
  r(ctx, px + 2, py + 20, T - 4, 10, '#4a3028');
  r(ctx, px + 3, py + 21, T - 6, 7, '#5b3c31');
  r(ctx, px + 3, py + 21, T - 6, 1, '#8b6250');
  r(ctx, px + 2, py + 29, T - 4, 2, '#261a17');

  // Un toque de desgaste controlado para evitar paredes planas.
  if (h % 7 === 0) r(ctx, px + 12, py + 13, 5, 1, 'rgba(255,255,255,.05)');
  if (h % 11 === 0) r(ctx, px + 8, py + 25, 8, 1, 'rgba(30,15,12,.18)');
}

function drawLobbyFloor(ctx: CanvasRenderingContext2D, px: number, py: number, x: number, y: number, theme: FloorTheme, h: number) {
  const checker = (x + y) % 2 === 0;
  const base = checker ? theme.floor[0] : theme.floor[1];
  r(ctx, px, py, T, T, base);

  // Junta profunda para que cada loseta se lea claramente a baja resolución.
  r(ctx, px, py, T, 2, '#a28d6a');
  r(ctx, px, py, 2, T, '#a28d6a');
  r(ctx, px + T - 1, py + 2, 1, T - 2, '#eee2c7');
  r(ctx, px + 2, py + T - 1, T - 2, 1, '#eee2c7');

  // Marco interior sutil, muy útil para el look de baldosa premium.
  r(ctx, px + 4, py + 4, T - 8, 1, 'rgba(255,255,255,.14)');
  r(ctx, px + 4, py + 4, 1, T - 8, 'rgba(255,255,255,.10)');
  r(ctx, px + 4, py + T - 5, T - 8, 1, 'rgba(71,52,34,.10)');
  r(ctx, px + T - 5, py + 4, 1, T - 8, 'rgba(71,52,34,.10)');

  // Vetas deterministas: nunca parpadean y evitan el aspecto de patrón generado barato.
  if (h % 5 === 0) {
    line(ctx, px + 6, py + 9, px + 16, py + 13, 'rgba(103,84,60,.15)');
    line(ctx, px + 16, py + 13, px + 24, py + 11, 'rgba(103,84,60,.11)');
  }
  if (h % 9 === 0) {
    line(ctx, px + 8, py + 24, px + 20, py + 20, 'rgba(255,255,255,.12)');
  }

  // Pequeño reflejo de pulido, deliberadamente pixelado.
  if (h % 4 === 0) r(ctx, px + 7, py + 7, 7, 2, 'rgba(255,248,225,.10)');
}

export function drawRichTile(
  ctx: CanvasRenderingContext2D, x: number, y: number, wall: boolean,
  theme: FloorTheme, gx: number, gy: number, frame: number,
) {
  const px = x * T, py = y * T;
  const h = hash(x + gx * 15, y + gy * 11, theme.deco.charCodeAt(0));
  const cleanStartRoom = gx === 0 && gy === 0;

  if (theme.deco === 'lobby') {
    if (wall) {
      drawLobbyWall(ctx, px, py, x, y, theme, h);
      if (!cleanStartRoom) drawWallProp(ctx, px, py, theme.deco, h, frame, y === 0, x === 0 || x === ROOM_WIDTH - 1);
    } else {
      drawLobbyFloor(ctx, px, py, x, y, theme, h);
    }
    return;
  }

  if (wall) {
    r(ctx, px, py, T, T, '#070910');
    r(ctx, px + 1, py + 1, T - 2, T - 2, theme.wall[(x + y) % 2]);
    r(ctx, px + 1, py + 1, T - 2, 3, 'rgba(255,255,255,.07)');
    r(ctx, px + 2, py + T - 6, T - 4, 5, 'rgba(0,0,0,.45)');
    r(ctx, px, py + 10, T, 1, 'rgba(0,0,0,.22)');
    r(ctx, px, py + 21, T, 1, 'rgba(0,0,0,.18)');
    if (h % 5 === 0) r(ctx, px + 6, py + 8, 4, 3, 'rgba(255,255,255,.05)');
    if (!cleanStartRoom) drawWallProp(ctx, px, py, theme.deco, h, frame, y === 0, x === 0 || x === ROOM_WIDTH - 1);
    return;
  }

  const checker = (x + y) % 2 === 0;
  r(ctx, px, py, T, T, checker ? theme.floor[0] : theme.floor[1]);
  r(ctx, px, py, T, 1, theme.floor[2]);
  r(ctx, px, py, 1, T, theme.floor[2]);
  r(ctx, px + T - 1, py + 1, 1, T - 1, 'rgba(255,255,255,.03)');

  if (theme.deco === 'security') {
    if (h % 6 === 0) r(ctx, px + 2, py + 2, T - 4, 2, 'rgba(79,157,216,.12)');
    if (h % 9 === 0) r(ctx, px + 12, py + 14, 8, 8, 'rgba(20,40,70,.25)');
  } else if (theme.deco === 'storage') {
    if (h % 5 === 0) r(ctx, px + 10, py + 16, 5, 4, 'rgba(0,0,0,.22)');
    if (h % 8 === 0) r(ctx, px + 6, py + 8, 9, 3, 'rgba(212,165,116,.12)');
  } else if (theme.deco === 'bakery') {
    if (h % 4 === 0) r(ctx, px + 7, py + 9, 5, 3, 'rgba(232,201,155,.14)');
    if (h % 10 === 0) r(ctx, px + 14, py + 18, 8, 2, 'rgba(255,100,40,.1)');
  } else if (theme.deco === 'vault') {
    if ((x + y) % 3 === 0) r(ctx, px + 4, py + 4, T - 8, T - 8, 'rgba(244,208,63,.05)');
    if (h % 6 === 0) r(ctx, px + 2, py + 14, T - 4, 2, 'rgba(180,190,200,.08)');
  } else if (theme.deco === 'golden') {
    if (h % 3 === 0) r(ctx, px + 6, py + 8, T - 12, T - 16, 'rgba(255,224,102,.1)');
    r(ctx, px + 3, py + 3, 2, 2, 'rgba(255,255,210,.12)');
  }
  if (h % 13 === 0) r(ctx, px + 5, py + 20, 14, 1, 'rgba(255,255,255,.04)');
}

function drawLobbySconce(ctx: CanvasRenderingContext2D, px: number, py: number, f: number, seed: number) {
  r(ctx, px + 14, py + 10, 4, 8, '#7d6334');
  r(ctx, px + 13, py + 9, 6, 3, '#c6a75d');
  const pulse = .70 + Math.sin(f * .045 + seed) * .08;
  ctx.globalAlpha = pulse;
  r(ctx, px + 13, py + 6, 6, 5, '#f9e7b6');
  r(ctx, px + 15, py + 5, 2, 2, '#fff5d7');
  ctx.globalAlpha = 1;
}

function drawWallProp(ctx: CanvasRenderingContext2D, px: number, py: number, deco: string, h: number, f: number, north: boolean, side: boolean) {
  if (!north && !side && h % 4 !== 0) return;
  const seed = h % 12;

  if (deco === 'lobby') {
    if (seed === 0 || seed === 6) {
      // Aplique de latón en lugar del antiguo ATM rectangular. Da identidad de banco premium.
      drawLobbySconce(ctx, px, py, f, h);
    } else if (seed === 1) {
      // Placa bancaria enmarcada.
      r(ctx, px + 5, py + 10, 22, 11, '#3a241d');
      r(ctx, px + 6, py + 11, 20, 9, '#c6a75d');
      r(ctx, px + 8, py + 13, 16, 5, '#274041');
      r(ctx, px + 12, py + 14, 8, 1, '#eadcae');
    } else if (seed === 2) {
      // Cuadro decorativo sobrio.
      r(ctx, px + 8, py + 9, 16, 13, '#51372b');
      r(ctx, px + 9, py + 10, 14, 11, '#d6c59c');
      r(ctx, px + 12, py + 13, 8, 5, '#758a78');
      r(ctx, px + 15, py + 12, 3, 7, '#314b45');
    } else if (seed === 3) {
      // Cartel de "wanted" deliberadamente caricaturesco.
      r(ctx, px + 9, py + 9, 14, 15, '#6d4b36');
      r(ctx, px + 10, py + 10, 12, 13, '#e4d2a6');
      r(ctx, px + 13, py + 12, 6, 5, '#d9b574');
      r(ctx, px + 12, py + 19, 8, 2, '#9b4b42');
    } else if (north && seed === 4) {
      // Cámara compacta de seguridad con LED.
      r(ctx, px + 11, py + 7, 9, 5, '#5b6969');
      r(ctx, px + 18, py + 8, 5, 3, '#1a2526');
      r(ctx, px + 21, py + 9, 2, 1, f % 50 < 25 ? '#ef7768' : '#6a3038');
    }
    return;
  }

  if (deco === 'security') {
    if (seed % 3 === 0) {
      r(ctx, px + 5, py + 7, 22, 16, '#0b1018'); r(ctx, px + 7, py + 9, 18, 12, '#12314f');
      r(ctx, px + 8, py + 10 + ((f >> 3) % 8), 16, 1, '#4f9dd8');
      r(ctx, px + 24, py + 8, 2, 2, f % 70 < 35 ? '#ff5b4f' : '#3a1a18');
    } else if (seed % 3 === 1) {
      r(ctx, px + 8, py + 8, 16, 18, '#1a2436'); r(ctx, px + 10, py + 10, 12, 3, '#4f7ad4');
      r(ctx, px + 10, py + 15, 12, 8, '#0e1624');
    }
  } else if (deco === 'storage') {
    if (seed % 3 === 0) { r(ctx, px + 6, py + 10, 20, 16, '#8B5A2B'); r(ctx, px + 8, py + 6, 8, 6, '#e8c99b'); r(ctx, px + 16, py + 7, 7, 5, '#d4a574'); }
    else { r(ctx, px + 8, py + 12, 16, 12, '#d9cba6'); r(ctx, px + 8, py + 12, 16, 3, '#b8a882'); }
  } else if (deco === 'bakery') {
    if (seed % 4 === 0) {
      r(ctx, px + 5, py + 8, 22, 18, '#3a2418');
      const glow = .45 + Math.sin(f * .1 + px) * .25;
      ctx.fillStyle = `rgba(255,120,40,${glow})`; ctx.fillRect(px + 8, py + 11, 16, 10);
      r(ctx, px + 10, py + 14, 12, 3, '#ffd08a');
    } else if (seed % 4 === 1) {
      r(ctx, px + 10, py + 4, 4, 20, '#6c5344'); r(ctx, px + 8, py + 6, 8, 3, '#8a94a0');
      ctx.globalAlpha = .25 + Math.sin(f * .08 + px) * .1; r(ctx, px + 12, py + 8, 6, 10, '#dfe6ee'); ctx.globalAlpha = 1;
    }
  } else if (deco === 'vault') {
    if (seed % 5 === 0) {
      r(ctx, px + 8, py + 5, 16, 5, '#4c5666');
      if (Math.sin(f * .05 + px) > 0) { ctx.fillStyle = 'rgba(255,59,48,.5)'; ctx.fillRect(px + 14, py + 10, 2, T - 10); }
    } else if (seed % 5 === 2) {
      r(ctx, px + 7, py + 9, 18, 14, '#f4d03f'); r(ctx, px + 9, py + 11, 14, 10, '#8a6a10');
    }
  } else if (deco === 'golden') {
    r(ctx, px + 6, py + 7, 20, 16, '#ffe066'); r(ctx, px + 9, py + 10, 14, 10, '#8a6a10');
    r(ctx, px + 12, py + 12, 3, 3, '#fff3b0');
  }
}

function drawLobbyAtmosphere(ctx: CanvasRenderingContext2D, frame: number) {
  // Dos focos cálidos laterales y uno central amplio. No añaden colisión ni props.
  const lights: readonly [number, number, number][] = [[112, 48, 82], [240, 42, 110], [368, 48, 82]];
  for (const [lx, ly, radius] of lights) {
    const g = ctx.createRadialGradient(lx, ly, 5, lx, ly + 42, radius);
    g.addColorStop(0, `rgba(255,231,174,${.19 + Math.sin(frame * .025 + lx) * .015})`);
    g.addColorStop(.42, 'rgba(240,205,137,.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - radius, ly - 16, radius * 2, radius * 1.55);
  }

  // Pulido del mármol: franjas muy suaves y estáticas en espacio de pantalla.
  ctx.globalAlpha = .055;
  r(ctx, 48, 112, 384, 2, '#fff8e8');
  r(ctx, 80, 240, 320, 1, '#fff8e8');
  ctx.globalAlpha = 1;
}

export function drawRoomAtmosphere(ctx: CanvasRenderingContext2D, deco: string, frame: number, special = false) {
  if (deco === 'lobby') {
    drawLobbyAtmosphere(ctx, frame);
  } else {
    const lights = deco === 'security' ? [[80, 40], [240, 36], [400, 40]]
      : deco === 'bakery' ? [[90, 52], [390, 52]]
      : deco === 'vault' ? [[240, 40]]
      : deco === 'golden' ? [[160, 44], [320, 44]]
      : [[140, 50], [340, 50]];
    for (const [lx, ly] of lights) {
      const g = ctx.createRadialGradient(lx, ly, 4, lx, ly + 40, 90);
      const col = deco === 'bakery' ? '255,140,60' : deco === 'golden' || deco === 'vault' ? '244,208,63' : deco === 'security' ? '79,157,216' : '200,220,240';
      g.addColorStop(0, `rgba(${col},${.16 + Math.sin(frame * .04 + lx) * .04})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 90, ly - 10, 180, 160);
    }
  }

  if (deco === 'bakery' || deco === 'storage') {
    for (let i = 0; i < 10; i++) {
      const t = (frame * 0.4 + i * 37) % 220;
      ctx.globalAlpha = .12;
      r(ctx, 40 + (i * 41 % 400), 300 - t * .6, 2, 2, deco === 'bakery' ? '#e8c99b' : '#cbb89a');
    }
    ctx.globalAlpha = 1;
  }

  if (special) {
    const g = ctx.createRadialGradient(240, 176, 20, 240, 176, 180);
    g.addColorStop(0, 'rgba(180,80,220,.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

export function drawInnerWallShadow(ctx: CanvasRenderingContext2D) {
  // Sombra interior más profunda para que los muros se sientan altos, no como tiles planos.
  const top = ctx.createLinearGradient(0, T, 0, T + 12);
  top.addColorStop(0, 'rgba(9,12,12,.38)');
  top.addColorStop(1, 'rgba(9,12,12,0)');
  ctx.fillStyle = top;
  ctx.fillRect(T, T, CANVAS_WIDTH - T * 2, 12);

  const left = ctx.createLinearGradient(T, 0, T + 10, 0);
  left.addColorStop(0, 'rgba(9,12,12,.28)');
  left.addColorStop(1, 'rgba(9,12,12,0)');
  ctx.fillStyle = left;
  ctx.fillRect(T, T, 10, CANVAS_HEIGHT - T * 2);

  // Pequeño rebote de luz inferior: ayuda a separar suelo y pared.
  ctx.fillStyle = 'rgba(255,244,216,.045)';
  ctx.fillRect(T, CANVAS_HEIGHT - T - 4, CANVAS_WIDTH - T * 2, 3);
}

export { TILE_DOOR };
