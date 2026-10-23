"""Exercise the final batched 3D food gallery and offline-image fallback."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('EXPLORER_URL','http://127.0.0.1:8000')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/?test',wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"')
 for shop in range(1,11):
  page.evaluate('(id)=>__explorer.ui.showShop(__explorer.shops[id-1],false)',shop)
  page.wait_for_function('(id)=>document.getElementById("food-model").dataset.ready===String(id)',arg=shop)
  image=page.locator('#food-model').screenshot();page.locator('#food-right').tap()
  assert image!=page.locator('#food-model').screenshot(),f'Model {shop} did not rotate'
  assert page.locator('#count').inner_text()=='0'
  print('PASS mobile original 3D food and rendered rotation',shop,flush=True)
 page.locator('#close').tap();assert page.locator('#food-model').get_attribute('data-ready') is None
 # Main street remains functional when only the optional food module is unavailable.
 f=b.new_page();f.on('pageerror',lambda e:errors.append(str(e)));f.route('**/src/food-models.js*',lambda r:r.abort());f.goto(BASE+'/?test',wait_until='networkidle');f.wait_for_function('document.body.dataset.ready==="true"')
 f.evaluate('__explorer.ui.showShop(__explorer.shops[0],false)');f.wait_for_function('document.getElementById("food-image").naturalWidth>0')
 assert f.locator('#food-image').is_visible() and f.locator('#food-model').is_hidden()
 assert f.locator('#food-left').is_disabled() and f.locator('#count').inner_text()=='0'
 assert not errors,errors
 print('PASS original-model PNG fallback; working street; no runtime errors')
 b.close()
