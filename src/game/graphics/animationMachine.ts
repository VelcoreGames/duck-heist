import { AnimationCursor } from './animation';
import type { AnimationSet, CharacterState, Facing } from './types';

export interface ChibiAnimationSignals {
  moving?: boolean;
  shooting?: boolean;
  dashing?: boolean;
  hurt?: boolean;
  down?: boolean;
  interacting?: boolean;
  celebrating?: boolean;
}

export interface ChibiAnimationStateResult {
  state: CharacterState;
  facing: Facing;
  changed: boolean;
  stateTick: number;
}

export interface ChibiAnimationLocks {
  shoot: number;
  dash: number;
  hurt: number;
  interact: number;
  celebrate: number;
}

const DEFAULT_LOCKS: ChibiAnimationLocks = {
  shoot: 8,
  dash: 7,
  hurt: 10,
  interact: 10,
  celebrate: 18,
};

function desiredState(signals: ChibiAnimationSignals): CharacterState {
  if (signals.down) return 'down';
  if (signals.hurt) return 'hurt';
  if (signals.dashing) return 'dash';
  if (signals.shooting) return 'shoot';
  if (signals.interacting) return 'interact';
  if (signals.celebrating) return 'celebrate';
  if (signals.moving) return 'walk';
  return 'idle';
}

function lockDuration(state: CharacterState, locks: ChibiAnimationLocks): number {
  switch (state) {
    case 'shoot': return locks.shoot;
    case 'dash': return locks.dash;
    case 'hurt': return locks.hurt;
    case 'interact': return locks.interact;
    case 'celebrate': return locks.celebrate;
    case 'down': return Number.POSITIVE_INFINITY;
    default: return 0;
  }
}

function priority(state: CharacterState): number {
  switch (state) {
    case 'down': return 100;
    case 'hurt': return 90;
    case 'dash': return 80;
    case 'shoot': return 70;
    case 'interact': return 60;
    case 'celebrate': return 50;
    case 'walk': return 20;
    default: return 10;
  }
}

export class ChibiAnimationStateMachine {
  readonly cursor = new AnimationCursor();
  private state: CharacterState = 'idle';
  private facing: Facing = 'down';
  private enteredAt = 0;
  private lockedUntil = 0;
  private readonly locks: ChibiAnimationLocks;

  constructor(locks: Partial<ChibiAnimationLocks> = {}) {
    this.locks = { ...DEFAULT_LOCKS, ...locks };
  }

  update(signals: ChibiAnimationSignals, facing: Facing, tick: number, phase = 0): ChibiAnimationStateResult {
    const desired = desiredState(signals);
    const currentPriority = priority(this.state);
    const desiredPriority = priority(desired);
    const canInterrupt = desiredPriority > currentPriority || tick >= this.lockedUntil || desired === this.state;
    let changed = false;

    if (desired !== this.state && canInterrupt) {
      this.state = desired;
      this.enteredAt = tick;
      const lock = lockDuration(desired, this.locks);
      this.lockedUntil = Number.isFinite(lock) ? tick + lock : Number.POSITIVE_INFINITY;
      changed = true;
    }

    if (facing !== this.facing && this.state !== 'down') {
      this.facing = facing;
      changed = true;
    }

    this.cursor.set(this.state, this.facing, tick, phase);
    return {
      state: this.state,
      facing: this.facing,
      changed,
      stateTick: Math.max(0, tick - this.enteredAt),
    };
  }

  frame(animations: AnimationSet, tick: number): string | undefined {
    return this.cursor.frame(animations, tick);
  }

  events(animations: AnimationSet, tick: number): string[] {
    return this.cursor.events(animations, tick);
  }

  reset(tick = 0, facing: Facing = 'down'): void {
    this.state = 'idle';
    this.facing = facing;
    this.enteredAt = tick;
    this.lockedUntil = tick;
    this.cursor.set('idle', facing, tick);
  }
}
