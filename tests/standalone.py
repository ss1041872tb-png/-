from pathlib import Path
import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);page=b.new_page(viewport={'width':1280,'height':900});errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None);page.evaluate("()=>{window.URLSearchParams=class extends URLSearchParams{has(n){return n==='test'||super.has(n)}}}");page.set_content((Path(__file__).resolve().parents[1]/'dist/zhonghe-food-explorer-preview.html').read_text(),wait_until='load');page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').click();page.evaluate('const w=__explorer.world,p=w.buildings[0].entry;w.player.position.set(p.x,0,p.z)');page.wait_for_selector('#arcade:not([hidden])');assert page.locator('.arcade-plan li').count()==2;page.locator('#arcade-begin').click();page.evaluate('Math.random=()=>.5');r=page.locator('.water-board').bounding_box();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']*.7);page.wait_for_selector('#arcade-next',timeout=25000);assert page.locator('#count').inner_text()=='0';page.locator('#arcade-next').click()
 r=page.locator('.water-board').bounding_box();deadline=time.time()+70
 while page.locator('#reward').is_hidden():
  assert time.time()<deadline,'Retro shooter did not finish'
  s=page.evaluate('JSON.parse(JSON.stringify(__explorer.arcade.activeState))');enemies=[e for e in s['enemies'] if e['alive']];target=max(enemies,key=lambda e:e['y']) if enemies else {'x':200};page.mouse.move(r['x']+target['x']/400*r['width'],r['y']+r['height']*.8)
  if s['hp']<=0:page.mouse.click(r['x']+r['width']/2,r['y']+r['height']*.8)
  page.wait_for_timeout(30)
 page.wait_for_selector('#reward:not([hidden])');page.locator('#reward-done').click();assert page.locator('#count').inner_text()=='1';page.locator('#journal-toggle').click();page.locator('[data-shop-id="1"]').click();page.wait_for_function('document.getElementById("food-model").dataset.ready==="1"');assert not errors,errors;assert not external,external;print('PASS single-file two real games, food reward, collection and 3D dish; zero external requests and runtime errors');b.close()
