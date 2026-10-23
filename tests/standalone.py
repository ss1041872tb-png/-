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
 page.locator('#journal-toggle').click();page.locator('[data-shop-id="1"]').click()
 assert page.locator('#shop-name').inner_text()=='南勢角陽春麵'
 page.wait_for_function('document.getElementById("food-image").naturalWidth>0')
 assert page.locator('#count').inner_text()=='1'
 page.locator('#close').click()
 page.locator('#world canvas').focus();page.keyboard.down('w')
 page.wait_for_function('__explorer.world.player.position.z<-.3')
 page.keyboard.up('w')
 assert not errors,errors
 assert not external,external
 page.screenshot(path='/tmp/standalone-preview.png')
 print('PASS self-contained HTML in opaque-origin document: WebGL, card, embedded food image, stamp, keyboard movement; zero external requests and runtime errors')
 b.close()
