# Duck Heist — Working State

Last updated: 2026-09-13

## Stable production

- Version: **0.7.54**
- Build: **`0.7.54-menu-difficulty-audio`**
- Release commit: **`03aae86d7f54952855e1bd3fbf1479d97a53264f`**
- Production: **https://velcoregames.com**
- Hostinger production QA: passed on workflow run **`34802743151`**.

Production QA confirmed Hostinger serves the exact released inline v0.7.54 app byte-for-byte after trailing newline normalization. Real-browser checks confirmed the difficulty selector persists, global mute can be toggled without destroying the saved Master/Music/SFX levels, settings survive a reload, and the V16 gameplay baseline still passes horizontal/vertical movement, dash and multi-direction shooting with no browser/network errors. Candidate visual/behavior QA run `34802348309` independently verified the simplified menu and the redesigned Settings screen before promotion.

## Front-end / UI baseline

- v0.7.54 replaces the dashboard-like v0.7.53 main menu with a simpler roguelite front end: title/vault art remains dominant, navigation is a clean left-aligned vertical list, selection uses one strong gold accent, and only compact difficulty/audio status remains on the opposite side.
- Settings is organized around one prominent gameplay row plus Audio and Presentation groups instead of one long undifferentiated list.
- Difficulty is now a **real saved gameplay setting** with three modes: `RELAJADO`, `NORMAL`, and `IMPLACABLE`.
- `NORMAL` preserves the pre-v0.7.54 balance. `RELAJADO` reduces enemy health/damage/count pressure and spaces attacks slightly more. `IMPLACABLE` raises enemy health/damage/speed/count pressure and elite chance while shortening attack intervals.
- Difficulty still stacks with the existing six-floor security progression; choosing a mode does not remove per-floor scaling.
- `SILENCIAR TODO` is a persistent global mute. It sets effective master output to zero while retaining the user's Master/Music/SFX slider values, so unmuting restores the previous mix.
- Master, Music and SFX controls remain independently adjustable.
- Mouse and keyboard Settings hit-testing were updated to match the new two-column layout.
- v0.7.53's How To, Permanent Upgrades, Pause, floor-security and boss-alert redesigns remain in place.

## Protagonist / skins baseline

- Base duck has **no hair and no glasses**. This rule overrides older design notes that described hair/glasses.
- Base renderer: `canvas2d-chibi-atlas-v16`.
- Base atlas: 464 raster frames, 116 columns x 4 directions.
- Draw size: 46 px. Do not keep increasing scale without a clear A/B improvement.
- Current FX marker: `v16.8-death-focus`.
- Death presentation: short frozen visual down sequence before GAME OVER; gameplay/input is blocked during it, hitboxes remain unchanged.
- v0.7.47 improves death silhouette focus.
- v0.7.48 connects authored directional `celebrate` to `FLOOR_CLEAR`.
- v0.7.49 exposes all authored `interact` frames without extending gameplay switch timing.
- v0.7.50 connects successful real E interactions to presentation-only `interactVisualTimer`.
- v0.7.51 makes Victory and GAME OVER use the current V16 protagonist presentation.
- v0.7.52 is the verified skin-coherence baseline; non-default skins retain their identity/accessories through the modern skin path rather than being flattened into the base robber art.

## Recent stable progression

- 0.7.42: weapon perspective / front-back readability and combat presentation.
- 0.7.43: scale and hurt/down polish.
- 0.7.44: approved 46 px visual scale without hitbox change.
- 0.7.45: impact FX, recoil/muzzle polish.
- 0.7.46: real down-to-GAME_OVER presentation and death input lock.
- 0.7.47: death silhouette focus and cleaner death scene.
- 0.7.48: floor-clear celebration and visible spotlight transition.
- 0.7.49: complete authored interact recovery.
- 0.7.50: real E world interactions receive the authored player interaction cue.
- 0.7.51: Victory and GAME OVER use the current V16 protagonist presentation.
- 0.7.52: skin-coherence pass for the wardrobe/gameplay skin family.
- 0.7.53: first premium front-end pass for menu, Settings, How To, Upgrades, Pause, floor-security progression and boss alert.
- 0.7.54: simplified main menu plus real difficulty modes and persistent global mute/audio controls.

## Hard constraints

- Work on `main`.
- Deploy through the existing Hostinger flow; do not use Vercel or AppDeploy.
- Do not change hitboxes for visual convenience.
- Do not add hair or glasses to the base duck.
- `NORMAL` difficulty must remain the reference balance unless an intentional rebalance is separately approved.
- Do not declare an intermediate pass final.
- Keep production on the last verified build when a candidate is not clearly better.

## Next priority

The main menu and Settings now have the required functional baseline. Continue the front-end coherence audit on remaining non-gameplay surfaces such as Wardrobe, Collection, map/overlays and confirmation/modal screens. Preserve working navigation and gameplay while bringing those surfaces into the cleaner v0.7.54 language. Any future difficulty tuning should be measured separately from visual/UI work.

## Session startup

1. Read this file and `AGENTS.md`.
2. Inspect current `main`, `VERSION`, `index.html`, recent Actions and production build metadata.
3. Treat the latest verified production release as the rollback baseline.
4. Build candidates separately, compare visually at gameplay scale, then promote only if clearly better.
