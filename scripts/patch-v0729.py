from pathlib import Path
import re

root = Path('.')
player_path = root / 'src/game/graphics/playerChibiRemastered.ts'
index_path = root / 'index.html'

src = player_path.read_text()
src = src.replace("  } else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 22) {", "  } else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 24) {", 1)

start = src.index('function poseFor(state: State, tick: number, _frame: number, dir: DuckDir): Pose {')
end = src.index('\nfunction sourceRect(dir: DuckDir, pose: Pose) {', start)
new_pose = r'''function poseFor(state: State, tick: number, _frame: number, dir: DuckDir): Pose {
  if (state === 'walk') {
    // Los 12 dibujos authored se recorren completos. El movimiento extra sólo
    // acompaña el peso: ya no deforma la silueta de forma agresiva.
    const cycle = tick % 24;
    const i = Math.floor(cycle / 2) % 12;
    const phase = (cycle / 24) * Math.PI * 2;
    const stride = Math.sin(phase);
    const plant = Math.cos(phase * 2);
    const lift = Math.abs(Math.sin(phase));
    const vertical = dir === 'up' || dir === 'down';
    const sideLean = dir === 'left' ? -.016 : dir === 'right' ? .016 : 0;
    return {
      authored: 'walk', index: i,
      scaleX: vertical ? 1 + plant * .012 : 1 + plant * .016,
      scaleY: vertical ? 1 - plant * .014 : 1 - plant * .018,
      rotation: vertical ? stride * .018 : sideLean + stride * .024,
      dx: vertical ? stride * .55 : stride * .72,
      dy: vertical ? -lift * 1.45 + plant * .12 : -lift * 1.62 + plant * .13,
    };
  }
  if (state === 'shoot') {
    // Ataque + recuperación authored: no congelar el frame 5 al final.
    const seq = [0,1,2,3,4,5,5,4,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const attackT = Math.min(1, tick / 4);
    const recoverT = tick <= 4 ? 1 : Math.max(0, 1 - (tick - 4) / 20);
    const attack = 1 - Math.pow(1 - attackT, 3);
    const kick = 4.75 * (tick <= 4 ? attack : Math.pow(recoverT, 1.6));
    const horizontal = dir === 'left' || dir === 'right';
    const dx = dir === 'left' ? kick : dir === 'right' ? -kick : 0;
    const dy = dir === 'up' ? kick * .82 : dir === 'down' ? -kick * .68 : 0;
    const recoilPeak = tick >= 2 && tick <= 7;
    return {
      authored: 'shoot', index: i,
      scaleX: recoilPeak ? (horizontal ? 1.042 : 1.028) : 1,
      scaleY: recoilPeak ? .958 : 1,
      rotation: dir === 'left' ? -.028 * (kick / 4.75) : dir === 'right' ? .028 * (kick / 4.75) : 0,
      dx, dy,
    };
  }
  if (state === 'interact') {
    const seq = [0,1,2,3,4,5,6,7,6,5,4,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const progress = Math.min(1, tick / 28);
    const arc = Math.sin(progress * Math.PI);
    return {
      authored: 'interact', index: i,
      scaleX: 1 + arc * .008,
      scaleY: 1 + arc * .012,
      rotation: Math.sin(progress * Math.PI * 2) * .009,
      dx: Math.sin(progress * Math.PI * 2) * .14,
      dy: -arc * 1.45,
    };
  }
  if (state === 'dash') {
    const i = Math.floor(tick * 1.2) % 12;
    const t = Math.min(1, tick / 10);
    const pulse = Math.sin(t * Math.PI);
    const horizontal = dir === 'left' || dir === 'right';
    return {
      authored: 'walk', index: i,
      scaleX: horizontal ? 1.035 + pulse * .035 : .985 - pulse * .012,
      scaleY: horizontal ? .978 - pulse * .012 : 1.035 + pulse * .035,
      rotation: 0,
      dx: 0,
      dy: horizontal ? -.55 : 0,
    };
  }
  if (state === 'hurt') {
    const seq = [2,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const snap = tick < 3 ? -1 : tick < 6 ? 1 : 0;
    return {
      authored: 'idle', index: i,
      scaleX: 1.018, scaleY: .984,
      rotation: snap * .018,
      dx: snap * .65,
      dy: -.58,
    };
  }
  if (state === 'down') {
    const t = Math.min(1, tick / 22);
    const ease = 1 - Math.pow(1 - t, 3);
    const fallSign = dir === 'left' || dir === 'up' ? -1 : 1;
    return {
      authored: 'idle', index: Math.min(3, Math.floor(tick / 6)),
      scaleX: 1 + ease * .08,
      scaleY: 1 - ease * .20,
      rotation: fallSign * ease * 1.22,
      dx: fallSign * ease * 2.45,
      dy: ease * 3.6,
    };
  }
  const i = Math.floor(tick / 10) % 4;
  const breathe = Math.sin(tick * .075);
  const settle = Math.cos(tick * .04);
  return {
    authored: 'idle', index: i,
    scaleX: 1 - breathe * .006,
    scaleY: 1 + breathe * .011,
    rotation: settle * .004,
    dx: settle * .10,
    dy: -breathe * .48,
  };
}
'''
src = src[:start] + new_pose + src[end:]

src = src.replace('    for (let i = 6; i >= 1; i--) {\n      const ghostAlpha = opacity * (.022 + (7 - i) * .024);\n      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 4.15, -v.y * i * 4.15);\n    }', "    for (let i = 4; i >= 1; i--) {\n      const ghostAlpha = opacity * (.028 + (5 - i) * .028);\n      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 4.4, -v.y * i * 4.4);\n    }", 1)
src = src.replace("  const authoredWeapon = state === 'shoot' || state === 'interact' || state === 'down';", "  const authoredWeapon = state === 'shoot' || state === 'interact';", 1)
src = src.replace("    if (tick <= 14) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.56, 1 - tick * .045), tick, pose.rotation);", "    if (tick <= 10) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.52, 1 - tick * .06), tick, pose.rotation);", 1)
src = src.replace("'canvas2d-chibi-remastered-v9'", "'canvas2d-chibi-remastered-v10'")
src = src.replace("'120-authored-remastered-v9'", "'120-authored-remastered-v10'")
player_path.write_text(src)

index = index_path.read_text()
if '0.7.28-chibi-combat-fx' not in index: raise SystemExit('v0.7.28 marker missing')
index = index.replace('0.7.28-chibi-combat-fx', '0.7.29-player-motion-v10')
index_path.write_text(index)
print('Applied v0.7.29 player motion v10 pass')
