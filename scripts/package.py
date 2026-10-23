"""Create a deployable static-site ZIP without Git metadata or development files."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parents[1]
files = [root / name for name in ['index.html', 'styles.css', 'README.md', 'CREDITS.md']]
for directory, pattern in [('src', '*.js'), ('assets', '*.svg'), ('vendor', '*')]:
    files.extend(p for p in (root / directory).glob(pattern) if p.is_file())
files.sort()
provenance = json.loads((root / 'vendor/provenance.json').read_text())
assert sha256((root / 'vendor/three.module.js').read_bytes()).hexdigest() == provenance['module_sha256'], 'Three.js integrity mismatch'
output = root / 'dist/zhonghe-food-explorer.zip'
output.parent.mkdir(exist_ok=True)
manifest = {p.relative_to(root).as_posix(): sha256(p.read_bytes()).hexdigest() for p in files}
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for path, data in [(p.relative_to(root).as_posix(), p.read_bytes()) for p in files] + [('manifest.sha256.json', (json.dumps(manifest, indent=2) + '\n').encode())]:
        info = ZipInfo(path, (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data)
print(f'{output}: {len(files)} files, {output.stat().st_size} bytes')
