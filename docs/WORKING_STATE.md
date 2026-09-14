# Duck Heist — Working State

Last updated: 2026-09-13

## Stable production

- Version: **0.7.50**
- Build: **`0.7.50-chibi-v16-world-interact`**
- Release commit: **`4e2cd9721f3544bc50e65c783b23c6f3716ec08a`**
- Production: **https://velcoregames.com**
- Hostinger production QA: passed on workflow run **`34795114769`**.

Production QA confirmed Hostinger serves the exact released inline v0.7.50 app byte-for-byte after trailing newline normalization. Playwright confirmed V16, 464 raster frames, idle, vertical/horizontal walk, dash and multi-direction shooting with no browser/network errors. Candidate QA run `34791186832` verified a real E interaction on a chest triggers the authored `interact` gesture, its presentation-only timer does not alter `switchAnim` or gameplay rules, movement prevents sliding, and shoot/dash retain priority. Death/down/GAME OVER/restart remain covered by successful v0.7.49 production QA run `34790946498`; v0.7.50 does not modify damage or death logic.

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
- v0.7.50 adds `interactVisualTimer` as presentation-only state and connects successful real E interactions such as pickups, pedestals, choices, events, chest opening and shop/equipment actions to the existing authored `interact` gesture without gating gameplay.

## Recent stable progression

- 0.7.42: weapon perspective / front-back readability and combat presentation.
- 0.7.43: scale and hurt/down polish.
- 0.7.44: approved 46 px visual scale without hitbox change.
- 0.7.45: impact FX, recoil/muzzle polish.
- 0.7.46: real down-to-GAME_OVER presentation and death input lock.
- 0.7.47: death silhouette focus and cleaner death scene.
- 0.7.48: authored floor-clear celebration connected to real presentation flow, with a visible spotlight transition.
- 0.7.49: full authored interact recovery for weapon/equip presentation without changing gameplay timing.
- 0.7.50: real E world interactions now receive the authored player interaction cue through a presentation-only timer.

## Hard constraints

- Work on `main`.
- Deploy through the existing Hostinger flow; do not use Vercel or AppDeploy.
- Do not change gameplay/hitboxes for visual convenience.
- Do not add hair or glasses to the base duck.
- Do not declare an intermediate pass final.
- Keep production on the last verified build when a candidate is not clearly better.

## Next priority

The in-world V16 protagonist presentation is now production-verified across idle, walk, shoot, dash, hurt, down, weapon/equip interact, real E interactions and floor-clear celebrate. Stop iterating scale/death/interact by inertia. The next concrete coherence gap is outside normal gameplay: Victory still renders the legacy `drawDuck`, and GAME OVER still renders legacy `drawDuckSkin` instead of the current V16 presentation path. Build the next candidate around terminal-screen V16 coherence only, preserve all terminal stats/buttons/timers and gameplay, compare screenshots at real UI scale, and promote only if clearly cleaner. Wardrobe legacy previews are a separate later audit.

## Session startup

1. Read this file and `AGENTS.md`.
2. Inspect current `main`, `VERSION`, `index.html`, recent Actions and production build metadata.
3. Treat the latest verified production release as the rollback baseline.
4. Build candidates separately, compare visually at gameplay scale, then promote only if clearly better.
