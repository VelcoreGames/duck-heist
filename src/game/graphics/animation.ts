import type { AnimationClip, AnimationSet, CharacterState, Facing } from './types';

const FALLBACK_FACING: Facing[] = ['down', 'right', 'left', 'up'];

export interface ResolvedAnimationClip {
  clip: AnimationClip;
  sourceFacing: Facing;
  flipX: boolean;
}

export function resolveClipDetailed(
  animations: AnimationSet,
  state: CharacterState,
  facing: Facing,
): ResolvedAnimationClip | undefined {
  const stateClips = animations[state] ?? animations.idle;
  if (!stateClips) return undefined;

  const exact = stateClips[facing];
  if (exact) return { clip: exact, sourceFacing: facing, flipX: false };

  if (facing === 'left' || facing === 'right') {
    const mirroredFacing: Facing = facing === 'left' ? 'right' : 'left';
    const mirrored = stateClips[mirroredFacing];
    if (mirrored) return { clip: mirrored, sourceFacing: mirroredFacing, flipX: true };
  }

  for (const fallback of FALLBACK_FACING) {
    const clip = stateClips[fallback];
    if (clip) return { clip, sourceFacing: fallback, flipX: false };
  }
  return undefined;
}

export function resolveClip(
  animations: AnimationSet,
  state: CharacterState,
  facing: Facing,
): AnimationClip | undefined {
  return resolveClipDetailed(animations, state, facing)?.clip;
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
  private phase = 0;

  set(state: CharacterState, facing: Facing, tick: number, phase = 0): void {
    if (this.state !== state || this.facing !== facing) {
      this.state = state;
      this.facing = facing;
      this.startedAt = tick;
    }
    this.phase = phase;
  }

  frame(animations: AnimationSet, tick: number): string | undefined {
    const resolved = resolveClipDetailed(animations, this.state, this.facing);
    return resolved ? animationFrame(resolved.clip, tick - this.startedAt, this.phase) : undefined;
  }

  resolved(animations: AnimationSet): ResolvedAnimationClip | undefined {
    return resolveClipDetailed(animations, this.state, this.facing);
  }

  get currentState(): CharacterState {
    return this.state;
  }

  get currentFacing(): Facing {
    return this.facing;
  }
}
