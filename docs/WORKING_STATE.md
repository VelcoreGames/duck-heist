# Duck Heist — Working State

Last updated: 2026-09-13

## Stable production

- Version: **0.7.47**
- Build: **`0.7.47-chibi-v16-death-focus`**
- Release commit: **`ccf22012985c18698aa2973c10521798f91796bc`**
- Production: **https://velcoregames.com**
- Hostinger production QA: passed on workflow run **`34789448680`**.

Production QA confirmed V16, 464 raster frames, idle, horizontal/vertical movement, dash, multi-direction shooting, natural death/down, GAME OVER and restart, with no browser/network errors.

## Protagonist baseline

- Base duck has **no hair and no glasses**. This rule overrides older design notes that described hair/glasses.
- Renderer: `canvas2d-chibi-atlas-v16`.
- Atlas: 464 raster frames, 116 columns x 4 directions.
- Draw size: 46 px. Do not keep increasing scale without a clear A/B improvement.
- Current FX marker: `v16.8-death-focus`.
- Death presentation: short frozen visual down sequence before GAME OVER; gameplay/input is blocked during it, hitboxes remain unchanged.
- v0.7.47 removes the generic red low-HP/damage wash once the player is dead and adds a restrained local death focus so the down silhouette remains readable near enemies.

## Recent stable progression

- 0.7.42: weapon perspective / front-back readability and combat presentation.
- 0.7.43: scale and hurt/down polish.
- 0.7.44: approved 46 px visual scale without hitbox change.
- 0.7.45: impact FX, recoil/muzzle polish.
- 0.7.46: real down-to-GAME_OVER presentation and death input lock.
- 0.7.47: death silhouette focus and cleaner death scene.

## Hard constraints

- Work on `main`.
- Deploy through the existing Hostinger flow; do not use Vercel or AppDeploy.
- Do not change gameplay/hitboxes for visual convenience.
- Do not add hair or glasses to the base duck.
- Do not declare an intermediate pass final.
- Keep production on the last verified build when a candidate is not clearly better.

## Next priority

The core protagonist states are now production-verified. Do not keep changing scale/death by inertia. Audit the remaining protagonist presentation states and transitions for a real gap before creating the next candidate, especially interaction/weapon-switch and any authored celebration/reward animation that is not yet connected to real gameplay. If there is no meaningful protagonist gain, move to the next highest-impact chibi coherence issue in the game while preserving the v0.7.47 player baseline.

## Session startup

1. Read this file and `AGENTS.md`.
2. Inspect current `main`, `VERSION`, `index.html`, recent Actions and production build metadata.
3. Treat the latest verified production release as the rollback baseline.
4. Build candidates separately, compare visually at gameplay scale, then promote only if clearly better.
