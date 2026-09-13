from pathlib import Path

path = Path('scripts/patch-v0714.py')
source = path.read_text()
bad = "  ctx.restore();\n}\"\nif old_shadow not in props:"
good = "  ctx.restore();\n}\"\"\"\nif old_shadow not in props:"
if bad not in source:
    raise SystemExit('Expected broken v0.7.14 triple quote marker not found')
fixed = source.replace(bad, good, 1)
compile(fixed, str(path), 'exec')
exec(compile(fixed, str(path), 'exec'))
