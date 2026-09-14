from pathlib import Path
import json

# v4 originally tried to recover cursor PNGs from literal data URIs in the
# archived JS. The deployed AppDeploy build generated those PNGs at runtime.
# We captured its actual 12 computed cursor results in a browser and archived
# them in scripts/appdeploy-cursors.json. Execute the same v4 patch with that
# source substituted in-memory.
source = Path('scripts/patch-v0755-appdeploy-exact-ui-v4.py').read_text()
old = '''bundle = Path('appdeploy-live/assets/index-BgUNQzP_.js').read_text()
uris = []
for uri in re.findall(r'data:image/png;base64,[A-Za-z0-9+/=]+', bundle):
    if uri not in uris:
        uris.append(uri)
if len(uris) != 12:
    raise SystemExit(f'expected exactly 12 archived cursor PNGs, found {len(uris)}')

cursor_names = ['CLÁSICO','PUNTO','CRUZ TÁCTICA','CUAC','MIGA','PAN','MONEDA','DIAMANTE','HUEVO','PLUMA','BÓVEDA','CALAVERA']
'''
new = '''cursor_archive = json.loads(Path('scripts/appdeploy-cursors.json').read_text())
uris = cursor_archive['uris']
cursor_names = cursor_archive['names']
if len(uris) != 12 or len(cursor_names) != 12:
    raise SystemExit('archived AppDeploy cursor capture must contain exactly 12 styles')
'''
if source.count(old) != 1:
    raise SystemExit('v4 cursor source anchor mismatch')
source = 'import json\n' + source.replace(old, new, 1)
exec(compile(source, 'patch-v0755-appdeploy-exact-ui-v4b.generated.py', 'exec'), {'__name__':'__main__'})
