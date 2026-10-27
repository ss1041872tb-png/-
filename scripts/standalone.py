"""Create a single HTML preview that runs from file:// without a web server."""
from pathlib import Path
import base64
import hashlib
import json

root = Path(__file__).resolve().parents[1]
def encode(text):
    return base64.b64encode(text.encode('utf-8')).decode('ascii')

provenance = json.loads((root / 'vendor/provenance.json').read_text())
assert hashlib.sha256((root / 'vendor/three.module.js').read_bytes()).hexdigest() == provenance['module_sha256']
foods = {p.stem: 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode('ascii') for p in sorted((root / 'assets/food-3d').glob('*.png'))}
modules = []
for name, path, imports in [
    ('three','vendor/three.module.js',{}),('data','src/data.js',{}),('layout','src/layout.js',{}),
    ('campaign','src/campaign.js',{}),('sound','src/sound.js',{}),
    ('food-models','src/food-models.js',{'../vendor/three.module.js':'three'}),('food-view','src/food-view.js',{'./food-models.js':'food-models'}),('celebration','src/celebration.js',{}),
    ('ui','src/ui.js',{'./food-view.js':'food-view'}),('controls','src/controls.js',{}),
    ('reward','src/reward.js',{'./food-view.js':'food-view'}),
    ('slide-puzzle','src/slide-puzzle.js',{}),
    ('newgames','src/newgames.js',{'./slide-puzzle.js':'slide-puzzle'}),
    ('arcade','src/arcade.js',{'./campaign.js':'campaign','./food-view.js':'food-view','./newgames.js':'newgames'}),
    ('route','src/route.js',{'./layout.js':'layout'}),
    ('navigation','src/navigation.js',{'./layout.js':'layout','./route.js':'route'}),
    ('world','src/world.js',{'../vendor/three.module.js':'three','./layout.js':'layout',}),
    ('main','src/main.js',{'./data.js':'data','./ui.js':'ui','./controls.js':'controls','./navigation.js':'navigation','./campaign.js':'campaign','./sound.js':'sound','./reward.js':'reward','./arcade.js':'arcade','./world.js':'world','./celebration.js':'celebration'}),
]:
    source = (root / path).read_text()
    if name == 'food-view':
        source = 'const embeddedFood = ' + json.dumps(foods) + ';\n' + source
        source = source.replace('`assets/food-3d/${foods[id-1]}.png`', 'embeddedFood[foods[id-1]]')
    modules.append({'name': name, 'source': encode(source), 'imports': imports})
bootstrap = '''
// Embedded original source modules, Three.js and food artwork. No external requests.
(async () => {
  const modules = MODULES;
  const urls = {};
  for (const module of modules) {
    let source = new TextDecoder().decode(Uint8Array.from(atob(module.source), c => c.charCodeAt(0)));
    for (const [specifier, dependency] of Object.entries(module.imports)) {
      source = source.replaceAll("'" + specifier + "?v=6.8.0'", JSON.stringify(urls[dependency])).replaceAll("'" + specifier + "'", JSON.stringify(urls[dependency]));
    }
    urls[module.name] = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  }
  await import(urls.main);
})().catch(error => {
  console.error(error);
  document.getElementById('loading').hidden = true;
  document.getElementById('error').hidden = false;
  document.getElementById('error-message').textContent = '無法啟動預覽，請以最新版 Chrome 或 Edge 開啟這份 HTML 檔案。';
});
'''.replace('MODULES', json.dumps(modules, separators=(',', ':')))
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="styles.css?v=6.8.0">', '<style>\n' + (root / 'styles.css').read_text() + '</style>')
html = html.replace('<script type="module" src="src/main.js?v=6.8.0"></script>', '<script>\n' + bootstrap + '</script>')
license_text = (root / 'vendor/THREE-LICENSE.txt').read_text()
html = '<!-- Single-file local preview. Three.js 0.160.1: ' + license_text.replace('--', '—') + '-->\n' + html
output = root / 'dist/zhonghe-food-explorer-preview.html'
output.parent.mkdir(exist_ok=True)
output.write_text(html)
print(f'{output}: {output.stat().st_size} bytes; no HTTP server required')
