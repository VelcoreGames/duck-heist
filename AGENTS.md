# Duck Heist — Development Guardrails

This repository is the source of truth for DUCK HEIST.

## Branch and release

- Work directly on `main` unless the user explicitly requests otherwise.
- Production is `https://velcoregames.com` and is deployed through the existing Hostinger flow fed by `web-release/` / `dist/`.
- Do not use Vercel or AppDeploy for this project.
- Before starting work, inspect current `main`, `VERSION`, the build meta in `index.html`, recent Actions, and `docs/WORKING_STATE.md`.
- Do not call a candidate final. Promote only after TypeScript/build checks and in-game QA; verify the exact build again in production after Hostinger switches.

## Protagonist — hard rules

- The base duck is clean: **no hair and no glasses**.
- Do not silently add hats, eyewear, hair, or other identity-changing accessories to the base duck.
- Preserve the premium chibi silhouette, four-direction readability, stable foot pivot, weapon integration, recoil, muzzle, dash, hurt and down readability.
- Never change gameplay hitboxes merely to fit art. Visual scale and collision remain decoupled.
- Preserve existing gameplay behavior unless a task explicitly targets gameplay.
- Validate visual work inside the real game at gameplay scale, not only in sprite sheets.

## Current V16 baseline

- Renderer: `canvas2d-chibi-atlas-v16`.
- Raster atlas: 464 frames total, four explicit directions.
- Current visual draw scale is 46 px; do not increase it automatically.
- The base V16 atlas and generator must retain the explicit no-hair / no-glasses guarantees.

## QA expectations

For protagonist releases, validate at minimum:

- exact build metadata;
- V16 renderer and 464-frame atlas;
- idle;
- horizontal and vertical walk;
- dash;
- shooting in multiple directions;
- hurt/down when touched by the change;
- no browser console errors, failed requests, or bad HTTP responses;
- production after Hostinger has switched to the release build.

Do not alter hitboxes or physics to make a visual QA pass.

## Handoff

Keep `docs/WORKING_STATE.md` concise and current after meaningful stable releases. It exists so a new normal chat or a Work session can resume from GitHub without depending on a long conversation transcript.
