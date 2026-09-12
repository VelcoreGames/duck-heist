import type { CharacterState, Facing } from './types';

export interface ChibiMotionSample {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  recoilX: number;
  recoilY: number;
}

export interface ChibiMotionInput {
  state: CharacterState;
  facing: Facing;
  tick: number;
  speed?: number;
  recoil?: number;
  impact?: number;
  phase?: number;
}

const facingVector = (facing: Facing): readonly [number, number] => {
  switch (facing) {
    case 'up': return [0, -1];
    case 'left': return [-1, 0];
    case 'right': return [1, 0];
    default: return [0, 1];
  }
};

/**
 * Secondary animation for chibi characters. Values are intentionally subtle:
 * sprite frames remain the source of truth while this adds weight and impact.
 */
export function sampleChibiMotion(input: ChibiMotionInput): ChibiMotionSample {
  const tick = input.tick + (input.phase ?? 0);
  const speed = Math.max(0, Math.min(1.5, input.speed ?? 0));
  const impact = Math.max(0, Math.min(1, input.impact ?? 0));
  const recoil = Math.max(0, Math.min(1, input.recoil ?? 0));
  const [fx, fy] = facingVector(input.facing);
  let offsetX = 0;
  let offsetY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let rotation = 0;

  if (input.state === 'idle') {
    const breath = Math.sin(tick * 0.075);
    offsetY = breath > 0.7 ? -0.35 : 0;
    scaleY = 1 + breath * 0.008;
    scaleX = 1 - breath * 0.005;
  } else if (input.state === 'walk') {
    const step = Math.sin(tick * (0.30 + speed * 0.08));
    offsetY = -Math.abs(step) * (0.65 + speed * 0.35);
    rotation = step * 0.012 * Math.min(1, speed);
    scaleX = 1 + Math.abs(step) * 0.012;
    scaleY = 1 - Math.abs(step) * 0.010;
  } else if (input.state === 'dash') {
    scaleX = input.facing === 'left' || input.facing === 'right' ? 1.12 : 0.94;
    scaleY = input.facing === 'up' || input.facing === 'down' ? 1.10 : 0.92;
    offsetX = fx * 1.2;
    offsetY = fy * 1.2;
  } else if (input.state === 'hurt') {
    scaleX = 1.06;
    scaleY = 0.93;
    rotation = Math.sin(tick * 0.9) * 0.035 * impact;
  } else if (input.state === 'celebrate') {
    offsetY = -Math.abs(Math.sin(tick * 0.24)) * 2.2;
    rotation = Math.sin(tick * 0.18) * 0.045;
  }

  // Compression on impact, never large enough to distort the pixel silhouette badly.
  scaleX *= 1 + impact * 0.06;
  scaleY *= 1 - impact * 0.07;

  return {
    offsetX,
    offsetY,
    scaleX,
    scaleY,
    rotation,
    recoilX: -fx * recoil * 2.4,
    recoilY: -fy * recoil * 2.4,
  };
}
