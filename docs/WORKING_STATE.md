# Duck Heist — Working State

Last updated: 2026-09-13

## Stable production

- Version: **0.7.48**
- Build: **`0.7.48-chibi-v16-floor-celebrate`**
- Release commit: **`c10f300f52b10d93736d1f1591bcea6635941fe0`**
- Production: **https://velcoregames.com**
- Hostinger production QA: passed on workflow run **`34790350454`**.

Production QA confirmed the deployed inline bundle contains the v0.7.48 celebration/FLOOR_CLEAR release and expected V16 markers. Playwright confirmed V16, 464 raster frames, idle, horizontal/vertical movement, dash, multi-direction shooting, natural death/down, GAME OVER and restart, with no browser/network errors. The floor-clear celebration itself passed candidate visual QA before promotion and its released code is present in the Hostinger inline bundle.

## Protagonist baseline

- Base duck has **no hair and no glasses**. This rule overrides older design notes that described hair/glasses.
- Renderer: `canvas2d-chibi-atlas-v16`.
- Atlas: 464 raster frames, 116 columns x 4 directions.
- Draw size: 46 px. Do not keep increasing scale without a clear A/B improvement.
- Current FX marker: `v16.8-death-focus`.
- Death presentation: short frozen visual down sequence before GAME OVER; gameplay/input is blocked during it, hitboxes remain unchanged.
- v0.7.47 removes the generic red low-HP/damage wash once the player is dead and adds a restrained local death focus so the down silhouette remains readable near enemies.
- v0.7.48 connects the authored 16-frame directional `celebrate` state to `FLOOR_CLEAR` and keeps the player visible under a restrained spotlight during the floor-complete transition.

## Recent stable progression

- 0.7.42: weapon perspective / front-back readability and combat presentation.
- 0.7.43: scale and hurt/down polish.
- 0.7.44: approved 46 px visual scale without hitbox change.
- 0.7.45: impact FX, recoil/muzzle polish.
- 0.7.46: real down-to-GAME_OVER presentation and death input lock.
- 0.7.47: death silhouette focus and cleaner death scene.
- 0.7.48: authored floor-clear celebration connected to real presentation flow, with a visible spotlight transition.

## Hard constraints

- Work on `main`.
- Deploy through the existing Hostinger flow; do not use Vercel or AppDeploy.
- Do not change gameplay/hitboxes for visual convenience.
- Do not add hair or glasses to the base duck.
- Do not declare an intermediate pass final.
- Keep production on the last verified build when a candidate is not clearly better.

## Next priority

The remaining concrete protagonist gap is `interact`: weapon-switch/equip currently drives `switchAnim` for roughly 10–14 engine frames while the V16 authored interact animation contains 12 frames at two ticks per frame, so normal weapon switching can exit the state before the full authored sequence is seen. Fix this at renderer/presentation level so the complete interact recovery can play without changing weapon timing, fire rules, input, hitboxes or gameplay. Then validate weapon-switch interruption by shoot/dash/hurt and compare at gameplay scale. If that pass is not clearly better, keep v0.7.48 and move to the next highest-impact chibi coherence issue.

## Session startup

1. Read this file and `AGENTS.md`.
2. Inspect current `main`, `VERSION`, `index.html`, recent Actions and production build metadata.
3. Treat the latest verified production release as the rollback baseline.
4. Build candidates separately, compare visually at gameplay scale, then promote only if clearly better.
