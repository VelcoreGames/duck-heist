# Duck Heist — Working State

Last updated: 2026-09-13

## Stable production

- Version: **0.7.53**
- Build: **`0.7.53-premium-menu-ui`**
- Release commit: **`cf97aa2bd9187e409c79e923bc9dff7aadf58a20`**
- Production: **https://velcoregames.com**
- Hostinger production QA: passed on workflow run **`34798852791`**.

Production QA confirmed Hostinger serves the exact released inline v0.7.53 app byte-for-byte after trailing newline normalization. Real browser navigation confirmed the redesigned main menu, Settings and How To screens are reachable through the existing controls, and the V16 gameplay baseline still passes horizontal/vertical movement, dash, multi-direction shooting and pause with no browser/network errors. Candidate visual QA run `34798592783` captured and verified the redesigned Main Menu, Settings, How To, Permanent Upgrades, Pause, floor security progression and boss security alert before promotion.

## Front-end / UI baseline

- v0.7.53 introduces a dedicated premium front-end design system instead of changing shared HUD primitives globally.
- Main Menu: numbered heist-navigation cards plus an `EXPEDIENTE DEL ATRACO` summary panel.
- Settings: modern rounded rows, selected-state treatment and premium meters while preserving all existing settings behavior.
- How To: two-column quick manual with controls and heist rules.
- Permanent Upgrades: modern cards, level indicators and currency presentation; purchase logic is unchanged.
- Pause: premium navigation and a compact controls card; existing pause actions and hitboxes remain unchanged.
- Floor Intro: `NIVEL DE SEGURIDAD` presentation with six visual progression segments. There is **no separate gameplay difficulty selector** in the current engine; security/difficulty scales automatically by floor and the UI now communicates that accurately instead of inventing a new mode.
- Boss Intro: `ALERTA DE SEGURIDAD` presentation aligned to the new front-end style.
- The redesign is presentation-only: no gameplay rules, state machine, controls or hitboxes were changed for v0.7.53.

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
- v0.7.52 is the verified skin-coherence baseline immediately preceding the UI pass; non-default skins retain their identity/accessories through the modern skin path rather than being flattened into the base robber art.

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
- 0.7.53: premium front-end redesign for menu, Settings, How To, Upgrades, Pause, floor-security progression and boss alert.

## Hard constraints

- Work on `main`.
- Deploy through the existing Hostinger flow; do not use Vercel or AppDeploy.
- Do not change gameplay/hitboxes for visual convenience.
- Do not add hair or glasses to the base duck.
- Do not invent a difficulty selector unless gameplay design explicitly adds difficulty modes later.
- Do not declare an intermediate pass final.
- Keep production on the last verified build when a candidate is not clearly better.

## Next priority

The core menu/configuration/progression presentation is now modernized and production-verified. Continue the front-end coherence audit rather than returning immediately to protagonist micro-polish. Inspect remaining non-gameplay surfaces such as Wardrobe, Collection, map/overlays and any confirmation/modal screens against the v0.7.53 premium language. Preserve their navigation geometry and logic unless a separate gameplay/UI behavior change is explicitly justified. Promote only changes that are visibly cleaner and still pass production smoke.

## Session startup

1. Read this file and `AGENTS.md`.
2. Inspect current `main`, `VERSION`, `index.html`, recent Actions and production build metadata.
3. Treat the latest verified production release as the rollback baseline.
4. Build candidates separately, compare visually at gameplay scale, then promote only if clearly better.
