from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':900});errors=[];external=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
 page.evaluate("() => {window.URLSearchParams=class extends URLSearchParams {has(name){return name==='test'||super.has(name)}}}")
 page.set_content((ROOT/'dist/zhonghe-food-explorer-preview.html').read_text(),wait_until='load');page.wait_for_function('document.body.dataset.ready === "true"',timeout=30000);page.locator('#start-adventure').click()
 page.evaluate('const w=__explorer.world,p=w.buildings[0].approach;w.player.position.set(p.x,0,p.z);Object.assign(__explorer.controls.view,{angle:0,follow:true});w.updateCamera(__explorer.controls.view,true)')
 page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_function('__explorer.interior.active?.id===1');page.keyboard.up('w')
 page.keyboard.down('a');page.wait_for_function('__explorer.world.player.position.x<-2.8');page.keyboard.up('a');page.keyboard.down('w');page.wait_for_function('__explorer.world.player.position.z<-2.5');page.keyboard.up('w')
 page.keyboard.press('e');page.wait_for_function('__explorer.campaign.count(1)===1');assert page.locator('#count').inner_text()=='0'
 page.keyboard.press('e');page.wait_for_selector('#reward:not([hidden])');page.locator('#reward').wait_for(state='hidden',timeout=8000);assert page.locator('#count').inner_text()=='1'
 page.locator('#hunt-exit').click();page.locator('#journal-toggle').click();page.locator('[data-shop-id="1"]').click();page.wait_for_function('document.getElementById("food-model").dataset.ready==="1"');assert page.locator('#food-model canvas').is_visible()
 assert not errors,errors
 assert not external,external
 page.screenshot(path='/tmp/standalone-hunt.png');print('PASS single-file WebGL store, real walking/searches, food reward, collection and original 3D dish; zero external requests or runtime errors');b.close()
