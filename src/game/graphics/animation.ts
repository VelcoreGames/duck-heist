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

export function animationFrameIndex(clip: AnimationClip, tick: number, phase = 0): number {
  if (!clip.frames.length) return -1;
  const duration = Math.max(1, Math.round(clip.frameDuration));
  const raw = Math.floor(Math.max(0, tick + phase) / duration);
  return clip.loop === false ? Math.min(raw, clip.frames.length - 1) : raw % clip.frames.length;
}

export function animationFrame(clip: AnimationClip, tick: number, phase = 0): string | undefined {
  const index = animationFrameIndex(clip, tick, phase);
  return index < 0 ? undefined : clip.frames[index];
}

export function animationProgress(clip: AnimationClip, tick: number): number {
  if (!clip.frames.length) return 0;
  const duration = Math.max(1, Math.round(clip.frameDuration));
  const total = duration * clip.frames.length;
  return clip.loop === false
    ? Math.min(1, Math.max(0, tick) / total)
    : (Math.max(0, tick) % total) / total;
}

/** Eventos visuales sincronizados a frames: footstep, muzzle, blink, cloth, etc. */
export function animationEventsBetween(
  clip: AnimationClip,
  previousTick: number,
  currentTick: number,
  phase = 0,
): string[] {
  if (!clip.markers?.length || !clip.frames.length || currentTick <= previousTick) return [];
  const duration = Math.max(1, Math.round(clip.frameDuration));
  const total = duration * clip.frames.length;
  const events: string[] = [];
  const start = Math.floor(Math.max(0, previousTick + phase));
  const end = Math.floor(Math.max(0, currentTick + phase));

  for (let t = start + 1; t <= end; t++) {
    const local = clip.loop === false ? Math.min(t, total - 1) : t % total;
    if (local % duration !== 0) continue;
    const frame = Math.floor(local / duration);
    for (const marker of clip.markers) if (marker.frame === frame) events.push(marker.event);
  }
  return events;
}

export class AnimationCursor {
  private state: CharacterState = 'idle';
  private facing: Facing = 'down';
  private startedAt = 0;
  private phase = 0;
  private lastSampleTick = 0;

  set(state: CharacterState, facing: Facing, tick: number, phase = 0): void {
    if (this.state !== state || this.facing !== facing) {
      this.state = state;
      this.facing = facing;
      this.startedAt = tick;
      this.lastSampleTick = tick;
    }
    this.phase = phase;
  }

  frame(animations: AnimationSet, tick: number): string | undefined {
    const resolved = resolveClipDetailed(animations, this.state, this.facing);
    return resolved ? animationFrame(resolved.clip, tick - this.startedAt, this.phase) : undefined;
  }

  events(animations: AnimationSet, tick: number): string[] {
    const resolved = resolveClipDetailed(animations, this.state, this.facing);
    if (!resolved) {
      this.lastSampleTick = tick;
      return [];
    }
    const events = animationEventsBetween(
      resolved.clip,
      this.lastSampleTick - this.startedAt,
      tick - this.startedAt,
      this.phase,
    );
    this.lastSampleTick = tick;
    return events;
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
