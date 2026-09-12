import type { AnimationClip, AnimationSet, CharacterState, Facing } from './types';

const FALLBACK_FACING: Facing[] = ['down', 'right', 'left', 'up'];

export function resolveClip(
  animations: AnimationSet,
  state: CharacterState,
  facing: Facing,
): AnimationClip | undefined {
  const stateClips = animations[state] ?? animations.idle;
  if (!stateClips) return undefined;
  const exact = stateClips[facing];
  if (exact) return exact;
  for (const fallback of FALLBACK_FACING) {
    const clip = stateClips[fallback];
    if (clip) return clip;
  }
  return undefined;
}

export function animationFrame(clip: AnimationClip, tick: number, phase = 0): string | undefined {
  if (!clip.frames.length) return undefined;
  const duration = Math.max(1, Math.round(clip.frameDuration));
  const raw = Math.floor(Math.max(0, tick + phase) / duration);
  const index = clip.loop === false ? Math.min(raw, clip.frames.length - 1) : raw % clip.frames.length;
  return clip.frames[index];
}

export function animationProgress(clip: AnimationClip, tick: number): number {
  if (!clip.frames.length) return 0;
  const duration = Math.max(1, Math.round(clip.frameDuration));
  const total = duration * clip.frames.length;
  return clip.loop === false
    ? Math.min(1, Math.max(0, tick) / total)
    : (Math.max(0, tick) % total) / total;
}

export class AnimationCursor {
  private state: CharacterState = 'idle';
  private facing: Facing = 'down';
  private startedAt = 0;

  set(state: CharacterState, facing: Facing, tick: number): void {
    if (this.state !== state || this.facing !== facing) {
      this.state = state;
      this.facing = facing;
      this.startedAt = tick;
    }
  }

  frame(animations: AnimationSet, tick: number): string | undefined {
    const clip = resolveClip(animations, this.state, this.facing);
    return clip ? animationFrame(clip, tick - this.startedAt) : undefined;
  }

  get currentState(): CharacterState {
    return this.state;
  }

  get currentFacing(): Facing {
    return this.facing;
  }
}
