# Duck Heist — Working State

Last updated: 2026-09-13

## Stable production

- Version: **0.7.49**
- Build: **`0.7.49-chibi-v16-interact-recovery`**
- Release commit: **`d012b0ca9a50cd77a4379559a3377198f7c49fc0`**
- Production: **https://velcoregames.com**
- Hostinger production QA: passed on workflow run **`34790946498`**.

Production QA confirmed Hostinger serves the exact released inline v0.7.49 app after newline normalization. Playwright confirmed V16, 464 raster frames, idle, horizontal/vertical movement, dash, multi-direction shooting, natural death/down, GAME OVER and restart, with no browser/network errors. Candidate QA run `34790736203` confirmed normal and short equip paths expose all 12 authored `interact` frames; movement takes over immediately when the gameplay switch timer ends, and hurt/dash/shoot retain higher presentation priority.

## Protagonist baseline

- Base duck has **no hair and no glasses**. This rule overrides older design notes that described hair/glasses.
- Renderer: `canvas2d-chibi-atlas-v16`.
- Atlas: 464 raster frames, 116 columns x 4 directions.
- Draw size: 46 px. Do not keep increasing scale without a clear A/B improvement.
- Current FX marker: `v16.8-death-focus`.
- Death presentation: short frozen visual down sequence before GAME OVER; gameplay/input is blocked during it, hitboxes remain unchanged.
- v0.7.47 removes the generic red low-HP/damage wash once the player is dead and adds a restrained local death focus so the down silhouette remains readable near enemies.
- v0.7.48 connects the authored 16-frame directional `celebrate` state to `FLOOR_CLEAR` and keeps the player visible under a restrained spotlight during the floor-complete transition.
- v0.7.49 plays the authored 12-frame `interact` weapon/equip gesture completely without extending gameplay switch timing; short stationary equips get only a visual recovery, while movement/shoot/dash/hurt still interrupt correctly.

## Recent stable progression

- 0.7.42: weapon perspective / front-back readability and combat presentation.
- 0.7.43: scale and hurt/down polish.
- 0.7.44: approved 46 px visual scale without hitbox change.
- 0.7.45: impact FX, recoil/muzzle polish.
- 0.7.46: real down-to-GAME_OVER presentation and death input lock.
- 0.7.47: death silhouette focus and cleaner death scene.
- 0.7.48: authored floor-clear celebration connected to real presentation flow, with a visible spotlight transition.
- 0.7.49: full authored interact recovery for weapon/equip presentation without changing gameplay timing.

## Hard constraints

- Work on `main`.
- Deploy through the existing Hostinger flow; do not use Vercel or AppDeploy.
- Do not change gameplay/hitboxes for visual convenience.
- Do not add hair or glasses to the base duck.
- Do not declare an intermediate pass final.
- Keep production on the last verified build when a candidate is not clearly better.

## Next priority

The core V16 protagonist presentation is now production-verified across idle, walk, shoot, dash, hurt, down, weapon/equip interact and floor-clear celebrate. Before modifying the protagonist again, audit whether real `E` interactions with chests, pedestals, events/NPCs and stairs provide an authored player interaction cue. If those actions currently occur with no player gesture, connect the existing V16 `interact` presentation without changing interaction timing or gameplay. If they are already covered or the gain is negligible, move to the next highest-impact chibi coherence issue outside the protagonist.

## Session startup

1. Read this file and `AGENTS.md`.
2. Inspect current `main`, `VERSION`, `index.html`, recent Actions and production build metadata.
3. Treat the latest verified production release as the rollback baseline.
4. Build candidates separately, compare visually at gameplay scale, then promote only if clearly better.
