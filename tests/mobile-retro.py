import os,time,math,json
from playwright.sync_api import sync_playwright
BASE=os.getenv('EXPLORER_URL','http://127.0.0.1:8011')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/?test',wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').tap()
 for shop in [1,2]:
  page.evaluate('(id)=>{const w=__explorer.world,p=w.buildings[id-1].entry;w.player.position.set(p.x,0,p.z)}',shop);page.wait_for_selector('#arcade:not([hidden])');page.locator('#arcade-begin').tap();r=page.locator('.water-board').bounding_box()
  if shop==1:
   page.evaluate('Math.random=()=>.5');page.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']*.65);page.wait_for_selector('#arcade-next',timeout=25000);page.locator('#arcade-next').tap();r=page.locator('.water-board').bounding_box()
  deadline=time.time()+100
  while page.locator('#reward').is_hidden() and not page.locator('#arcade-next').count():
   assert time.time()<deadline,'mobile retro timeout'
   s=page.evaluate('JSON.parse(JSON.stringify(__explorer.arcade.activeState))')
   if s is None:break
   if shop==1:
    alive=[e for e in s['enemies'] if e['alive']];target=max(alive,key=lambda e:e['y']) if alive else {'x':200};x=target['x']
   else:x=s['ball']['x']+15*math.sin(s['time']*1.7)
   x=max(20,min(380,x));page.touchscreen.tap(r['x']+x/400*r['width'],r['y']+r['height']*.65);page.wait_for_timeout(50)
  if shop==1:page.wait_for_selector('#reward:not([hidden])');assert page.evaluate('__explorer.campaign.unlocked(1)')
  else:page.wait_for_selector('#arcade-next');assert page.evaluate('__explorer.campaign.count(2)===1')
  print('PASS mobile actual touch', 'bee formation shooter' if shop==1 else 'ball-and-paddle brick collisions',flush=True)
  if page.locator('#reward').is_visible():page.locator('#reward-done').tap()
  else:page.locator('#arcade-close').tap()
 # Exercise freshly loaded four-tone Simon logic on the phone as well.
 page.evaluate('const w=__explorer.world,p=w.buildings[9].entry;w.player.position.set(p.x,0,p.z)');page.wait_for_selector('#arcade:not([hidden])');page.locator('#arcade-begin').tap()
 for count in [2,3,4]:
  page.get_by_role('button',name='播放旋律',exact=True).tap();page.wait_for_timeout(count*650+100)
  for i in [0,2,1,3][:count]:page.locator(f'[data-note="{i}"]').tap()
 page.wait_for_selector('#arcade-next');print('PASS mobile four-tone visual memory',flush=True);page.locator('#arcade-close').tap();assert page.evaluate('__explorer.arcade.activeState===null');assert not errors,errors;print('PASS phone lifecycle and zero runtime errors');b.close()
