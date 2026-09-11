# Content Audit

`catalog.ts` exposes `auditContent()`, an internal manifest of every obtainable
passive, active, weapon, food and currency. Each row checks its ID, name,
description, rarity, custom sprite, category, effect and pickup behavior.

All item icons are authored in `itemArt.ts` on a 24 x 24 pixel grid. Unknown
IDs use a mystery duck icon, never a blank rectangle. The atlas is cached and
shared by pickups, pedestals, HUD, shop, tooltips and Collection.

Open the game with `?auditoria=1` to run the internal checks. The report is
shown below the game and is available as `window.duckHeistAudit`. The checks
use isolated engines, disable audio, and never write to localStorage.

Checks cover the complete content manifest, modifier registration, active
cooldowns, 72 procedural floor layouts, seed reproducibility, the west item
room, reciprocal doors, a single deep boss, two weapon slots, both wheel
directions, replacement of either slot, cancellation, dropped weapons,
dash without shots, healing pickup behavior, boss loot, stairs, loadout
preservation and permanent-save migration.

The es-MX / full-map update adds checks for M toggle, closing with Escape,
returning to the pause menu, frozen combat/cooldowns, secret visibility,
known-room BFS paths, inspection without teleporting, map-item reveals,
GPS destinations, persistent shop status, every new passive, exhausted
non-stackable item pools, distinct offense/defense/utility choices,
first-purchase discounts, first-hit mitigation, cooldown zero crossings,
alert modifiers, gamepad deadzones and localization terminology.

All 24 room templates are checked for open entrance lanes on all six floor
themes. `floorMap.ts` owns both minimap and full-map discovery and symbols.
`expansion.ts` declares 48 new non-stackable objects; `expansionArt.ts`
provides their authored pixel icons. Temporary alert, routes, room memory,
overdraft debt and buffs are deliberately excluded from permanent saves.

Browser controls: M opens/closes the map, Escape closes it, WASD/arrows/mouse
inspect rooms. A standard gamepad can use View for the map, Start for pause,
left stick for movement, right stick + RT to shoot, B to evade, A to interact,
Y for the active item and LB/RB to cycle weapons. Unmapped controllers are
ignored rather than guessing their layout. Hardware validation is required.

Verification note: production compilation was run successfully. The interactive
audit is provided for browser execution; no physical-controller, audio-output,
or live-browser test session was available in this editing environment.

Manual checks still matter: sound balance, mouse feel, controller/display
scaling, and fight balance cannot be established by registry checks alone.