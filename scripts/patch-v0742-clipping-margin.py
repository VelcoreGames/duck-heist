from pathlib import Path

GEN='scripts/generate-player-chibi-v16.py'
RUNTIME='src/game/graphics/playerChibiAtlasV16.ts'

gen=Path(GEN).read_text()
runtime=Path(RUNTIME).read_text()

# The compact V16.4 front projection was authored inside the safe frame area.
# Do not apply the old forced left shift; the workflow's strict alpha-margin
# scan is now the source of truth and will fail if any generated frame clips.
required=(
    "anchor=(47.0,41.5+bob*.18)",
    "front_gun_layer",
    "rear_gun_layer",
)
for token in required:
    if token not in gen:
        raise SystemExit(f'missing compact projection invariant: {token}')
if "feetX + 9.1" not in runtime:
    raise SystemExit('missing front muzzle alignment invariant')

print('compact front projection uses authored margins; strict atlas scan remains authoritative')
