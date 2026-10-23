from pathlib import Path
from playwright.sync_api import sync_playwright

# Managed Chromium blocks file://; test the HTML in an opaque-origin document.
ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800})
 errors=[];external=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
 page.evaluate("() => {window.URLSearchParams=class extends URLSearchParams {has(name){return name==='test'||super.has(name)}}}")
 page.set_content((ROOT / 'dist/zhonghe-food-explorer-preview.html').read_text(),wait_until='load')
 page.wait_for_function('document.body.dataset.ready === "true"',timeout=30000)
 assert page.locator('#world canvas').is_visible()
 page.evaluate('const w=__explorer.world,p=w.buildings[0].approach;w.player.position.set(p.x,0,p.z)')
 page.keyboard.press('e');page.locator('#quest-begin').click()
 for i in range(3):
  angle=int(page.locator(f'[data-slot="{i}"]').inner_text().split('・')[1].replace('°',''))
  page.locator(f'[data-piece="{i}"]').click()
  for _ in range(angle//90):page.locator('[data-action="rotate"]').click()
  page.locator(f'[data-slot="{i}"]').click()
 assert page.evaluate('__explorer.campaign.count(1)===1')
 assert page.locator('#count').inner_text()=='0'
 page.locator('#quest-close').click()
 page.locator('#world canvas').focus();page.keyboard.down('w')
 page.wait_for_function('__explorer.world.player.position.z<27')
 page.keyboard.up('w')
 assert not errors,errors
 assert not external,external
 page.screenshot(path='/tmp/standalone-preview.png')
 print('PASS self-contained HTML in opaque-origin document: WebGL, embedded challenge modules, real bridge stage, gated stamps, keyboard movement; zero external requests and runtime errors')
 b.close()
