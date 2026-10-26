"""A short directional press must face the avatar correctly without spinning the view."""
import os,math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);s=b.new_page(viewport={'width':1280,'height':900});errors=[];s.on('pageerror',lambda e:errors.append(str(e)));s.goto(os.getenv('EXPLORER_URL','http://127.0.0.1:8000')+'/?test',wait_until='networkidle');s.wait_for_function('document.body.dataset.ready==="true"');s.locator('#start-adventure').click()
 for key,x,z in [('ArrowLeft',-1,0),('ArrowRight',1,0),('ArrowUp',0,-1),('ArrowDown',0,1)]:
  s.evaluate('const e=__explorer;e.ui.preferences.reducedMotion=false;e.controls.clear();e.world.player.position.set(0,0,36);e.world.player.rotation.y=0;e.controls.view.angle=.4;e.world.updateCamera(e.controls.view,true);window.start=e.world.player.position.clone()')
  s.locator('#world canvas').focus();s.keyboard.down(key);s.wait_for_function('__explorer.world.player.position.distanceTo(start)>.02');s.keyboard.up(key)
  expected=math.atan2(x*math.cos(.4)+z*math.sin(.4),-x*math.sin(.4)+z*math.cos(.4))
  assert s.evaluate('(a)=>{const e=__explorer;return e.controls.view.angle===.4&&Math.abs(Math.atan2(Math.sin(e.world.player.rotation.y-a),Math.cos(e.world.player.rotation.y-a)))<1e-8}',expected),key
  print('PASS short press faces avatar immediately, fixed camera:',key,flush=True)
 assert not errors,errors;b.close()
