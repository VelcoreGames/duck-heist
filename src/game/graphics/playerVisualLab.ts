import type { DuckDir } from '../types';
import { drawChibiPlayerRemastered } from './playerChibiRemastered';

type Ctx = CanvasRenderingContext2D;

const DIRS: DuckDir[] = ['down', 'up', 'left', 'right'];
const KEYS = Array.from({ length: 28 }, () => ({}));

function label(ctx: Ctx, text: string, x: number, y: number): void {
  ctx.save();
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(18,24,28,.78)';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = '#fff3d1';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function floor(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, 0, 0, 352);
  g.addColorStop(0, '#ead9bd');
  g.addColorStop(1, '#cdb28c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 352);
  ctx.strokeStyle = 'rgba(113,88,61,.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 480; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 352); ctx.stroke();
  }
  for (let y = 0; y <= 352; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(480, y); ctx.stroke();
  }
}

export function isPlayerVisualLab(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('playerlab') === '1';
}

export function drawPlayerVisualLab(ctx: Ctx, frame: number): void {
  floor(ctx);
  ctx.save();
  ctx.fillStyle = '#18383a';
  ctx.fillRect(0, 0, 480, 24);
  ctx.fillStyle = '#f2d287';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('PLAYER VISUAL LAB · v15 · 120 AUTHORED', 10, 15);
  ctx.restore();

  // Row 1: four-direction walk. The synthetic position moves enough to advance
  // the real distance-synchronised gait used in gameplay.
  DIRS.forEach((dir, i) => {
    const baseX = 48 + i * 120;
    const phase = frame * .055;
    const travel = Math.sin(phase) * 11;
    const x = baseX + (dir === 'left' || dir === 'right' ? travel : 0);
    const y = 76 + (dir === 'up' || dir === 'down' ? travel : 0);
    drawChibiPlayerRemastered({
      ctx, x: x - 8, y: y - 18, frame, dir, moving: true,
      hurt: false, dashing: false, shooting: false, runtimeKey: KEYS[i], shotSequence: 0,
    });
    label(ctx, `WALK ${dir.toUpperCase()}`, baseX + 8, 108);
  });

  // Row 2: live combat states. Shot sequence changes every 30 frames so recoil
  // is guaranteed to enter the persistent shoot state regardless of refresh rate.
  DIRS.forEach((dir, i) => {
    const baseX = 48 + i * 120;
    const cycle = frame % 60;
    drawChibiPlayerRemastered({
      ctx, x: baseX, y: 138, frame, dir, moving: false,
      hurt: false, dashing: false, shooting: cycle < 14,
      runtimeKey: KEYS[4 + i], shotSequence: Math.floor(frame / 30),
    });
    label(ctx, `SHOOT ${dir.toUpperCase()}`, baseX + 8, 188);
  });

  // Row 3: dash / hurt / interact / down side by side.
  const states = [
    { name: 'DASH', dashing: frame % 48 < 14, hurt: false, dead: false, interacting: false, dir: 'right' as DuckDir },
    { name: 'HURT', dashing: false, hurt: frame % 48 < 10, dead: false, interacting: false, dir: 'down' as DuckDir },
    { name: 'INTERACT', dashing: false, hurt: false, dead: false, interacting: true, dir: 'left' as DuckDir },
    { name: 'DOWN', dashing: false, hurt: false, dead: true, interacting: false, dir: 'right' as DuckDir },
  ];
  states.forEach((s, i) => {
    const baseX = 48 + i * 120;
    drawChibiPlayerRemastered({
      ctx, x: baseX, y: 235, frame, dir: s.dir, moving: false,
      hurt: s.hurt, dashing: s.dashing, shooting: false, dead: s.dead,
      interacting: s.interacting, runtimeKey: KEYS[8 + i], shotSequence: 0,
    });
    label(ctx, s.name, baseX + 8, 286);
  });

  // Bottom: idle quartet to inspect silhouette, scale and weapon attachment.
  DIRS.forEach((dir, i) => {
    const x = 78 + i * 108;
    drawChibiPlayerRemastered({
      ctx, x, y: 302, frame, dir, moving: false,
      hurt: false, dashing: false, shooting: false, runtimeKey: KEYS[12 + i], shotSequence: 0,
    });
  });

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.duckHeistPlayerLab = 'v1';
  }
}
