import type { AnimationSet, CharacterState, Facing } from './types';

export const CHIBI_FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

export type ChibiProductionClass = 'player' | 'common-enemy' | 'elite-enemy' | 'boss' | 'npc';

export interface ChibiClipProductionSpec {
  frames: number;
  frameDuration: number;
  loop: boolean;
  markers?: readonly { frame: number; event: string }[];
}

export type ChibiAnimationProductionPlan = Partial<Record<CharacterState, ChibiClipProductionSpec>>;

/**
 * v0.5+ visual target.
 * The player gets the richest animation budget because it is on-screen almost all the time.
 * Frame duration is measured in simulation ticks, matching AnimationClip.frameDuration.
 */
export const CHIBI_PLAYER_PLAN: ChibiAnimationProductionPlan = {
  idle: {
    frames: 12,
    frameDuration: 5,
    loop: true,
    markers: [{ frame: 8, event: 'blink' }],
  },
  walk: {
    frames: 16,
    frameDuration: 3,
    loop: true,
    markers: [
      { frame: 3, event: 'footstep' },
      { frame: 11, event: 'footstep' },
    ],
  },
  shoot: {
    frames: 12,
    frameDuration: 2,
    loop: false,
    markers: [
      { frame: 2, event: 'muzzle' },
      { frame: 3, event: 'recoil' },
    ],
  },
  dash: {
    frames: 16,
    frameDuration: 2,
    loop: false,
    markers: [
      { frame: 1, event: 'dash-start' },
      { frame: 5, event: 'dash-trail' },
      { frame: 10, event: 'dash-trail' },
      { frame: 14, event: 'dash-end' },
    ],
  },
  hurt: {
    frames: 8,
    frameDuration: 2,
    loop: false,
    markers: [{ frame: 0, event: 'hurt-impact' }],
  },
  down: {
    frames: 20,
    frameDuration: 3,
    loop: false,
    markers: [{ frame: 16, event: 'down-settle' }],
  },
  interact: {
    frames: 12,
    frameDuration: 4,
    loop: false,
    markers: [{ frame: 6, event: 'interact' }],
  },
  celebrate: {
    frames: 20,
    frameDuration: 3,
    loop: true,
    markers: [
      { frame: 4, event: 'celebrate-pop' },
      { frame: 14, event: 'celebrate-pop' },
    ],
  },
};

export const CHIBI_COMMON_ENEMY_PLAN: ChibiAnimationProductionPlan = {
  idle: { frames: 8, frameDuration: 5, loop: true },
  walk: {
    frames: 12,
    frameDuration: 3,
    loop: true,
    markers: [
      { frame: 2, event: 'footstep' },
      { frame: 8, event: 'footstep' },
    ],
  },
  shoot: {
    frames: 10,
    frameDuration: 2,
    loop: false,
    markers: [{ frame: 2, event: 'muzzle' }],
  },
  dash: { frames: 10, frameDuration: 2, loop: false },
  hurt: { frames: 6, frameDuration: 2, loop: false },
  down: { frames: 12, frameDuration: 3, loop: false },
};

export const CHIBI_ELITE_ENEMY_PLAN: ChibiAnimationProductionPlan = {
  idle: { frames: 10, frameDuration: 5, loop: true },
  walk: { frames: 14, frameDuration: 3, loop: true },
  shoot: { frames: 12, frameDuration: 2, loop: false },
  dash: { frames: 14, frameDuration: 2, loop: false },
  hurt: { frames: 8, frameDuration: 2, loop: false },
  down: { frames: 18, frameDuration: 3, loop: false },
};

export const CHIBI_BOSS_PLAN: ChibiAnimationProductionPlan = {
  idle: { frames: 12, frameDuration: 5, loop: true },
  walk: { frames: 16, frameDuration: 3, loop: true },
  shoot: { frames: 16, frameDuration: 2, loop: false },
  dash: { frames: 18, frameDuration: 2, loop: false },
  hurt: { frames: 10, frameDuration: 2, loop: false },
  down: { frames: 24, frameDuration: 3, loop: false },
  interact: { frames: 16, frameDuration: 3, loop: false },
  celebrate: { frames: 20, frameDuration: 3, loop: true },
};

export const CHIBI_NPC_PLAN: ChibiAnimationProductionPlan = {
  idle: { frames: 12, frameDuration: 6, loop: true },
  interact: { frames: 12, frameDuration: 4, loop: false },
  celebrate: { frames: 16, frameDuration: 4, loop: true },
};

export const CHIBI_PRODUCTION_PLANS: Record<ChibiProductionClass, ChibiAnimationProductionPlan> = {
  player: CHIBI_PLAYER_PLAN,
  'common-enemy': CHIBI_COMMON_ENEMY_PLAN,
  'elite-enemy': CHIBI_ELITE_ENEMY_PLAN,
  boss: CHIBI_BOSS_PLAN,
  npc: CHIBI_NPC_PLAN,
};

export const CHIBI_FRAME_BOX = {
  player: { w: 64, h: 64 },
  commonEnemy: { w: 64, h: 64 },
  eliteEnemy: { w: 72, h: 72 },
  boss: { w: 96, h: 96 },
  npc: { w: 64, h: 64 },
} as const;

export interface ChibiPlanSummary {
  clips: number;
  framesPerFacing: number;
  directionalFrames: number;
}

export function summarizeChibiPlan(plan: ChibiAnimationProductionPlan): ChibiPlanSummary {
  const specs = Object.values(plan).filter((value): value is ChibiClipProductionSpec => !!value);
  const framesPerFacing = specs.reduce((sum, spec) => sum + spec.frames, 0);
  return {
    clips: specs.length,
    framesPerFacing,
    directionalFrames: framesPerFacing * CHIBI_FACINGS.length,
  };
}

export const CHIBI_PLAYER_SUMMARY = summarizeChibiPlan(CHIBI_PLAYER_PLAN);

export interface ChibiCoverageIssue {
  state: CharacterState;
  facing: Facing;
  expectedFrames: number;
  actualFrames: number;
  reason: 'missing-clip' | 'insufficient-frames';
}

/**
 * Production gate: every authored facing must contain at least the frame count in the plan.
 * We intentionally do not accept left/right mirroring for the final player art because hair,
 * weapon pose, accessories and silhouettes may be asymmetric.
 */
export function validateChibiAnimationCoverage(
  animations: AnimationSet,
  plan: ChibiAnimationProductionPlan,
): ChibiCoverageIssue[] {
  const issues: ChibiCoverageIssue[] = [];

  for (const [state, spec] of Object.entries(plan) as [CharacterState, ChibiClipProductionSpec][]) {
    for (const facing of CHIBI_FACINGS) {
      const clip = animations[state]?.[facing];
      if (!clip) {
        issues.push({
          state,
          facing,
          expectedFrames: spec.frames,
          actualFrames: 0,
          reason: 'missing-clip',
        });
        continue;
      }
      if (clip.frames.length < spec.frames) {
        issues.push({
          state,
          facing,
          expectedFrames: spec.frames,
          actualFrames: clip.frames.length,
          reason: 'insufficient-frames',
        });
      }
    }
  }

  return issues;
}

export function frameName(
  actorId: string,
  layerId: string,
  state: CharacterState,
  facing: Facing,
  frame: number,
): string {
  return `${actorId}/${layerId}/${state}/${facing}/${String(frame).padStart(2, '0')}`;
}
