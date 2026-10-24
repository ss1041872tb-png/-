from pathlib import Path
import os,json,math
from playwright.sync_api import sync_playwright
BASE=os.getenv('EXPLORER_URL','http://127.0.0.1:8014');passed=[]
def check(n,v=True):
 assert v,n
 passed.append(n);print('PASS',n,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);page=b.new_page(viewport={'width':1280,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));external=[];page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None);page.evaluate("()=>{window.URLSearchParams=class extends URLSearchParams{has(n){return n==='test'||super.has(n)}}}");page.set_content((Path(__file__).resolve().parents[1]/'dist/zhonghe-food-explorer-preview.html').read_text(),wait_until='load');page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').click();page.evaluate('__explorer.ui.preferences.reducedMotion=true')
 # Sustained input must travel straight even while the camera turns behind the avatar.
 for angle in [0]:
  for key,local in [('w',(0,-1)),('d',(1,0)),('s',(0,1)),('a',(-1,0))]:
   page.evaluate('(a)=>{const e=__explorer;e.controls.clear();e.world.player.position.set(0,0,36);e.controls.view.angle=a;e.world.updateCamera(e.controls.view,true);window.start=e.world.player.position.clone();window.yaw=a}',angle)
   dx=local[0]*math.cos(angle)+local[1]*math.sin(angle);dz=-local[0]*math.sin(angle)+local[1]*math.cos(angle)
   page.locator('#world canvas').focus();page.keyboard.down(key);page.wait_for_function('__explorer.world.player.position.distanceTo(start)>1.5');page.keyboard.up(key)
   check(f'{key} follows heading without spiraling at {angle:.2f}',page.evaluate('(v)=>{const e=__explorer,p=e.world.player.position,dx=p.x-start.x,dz=p.z-start.z,target=Math.atan2(v.x,v.z)-Math.PI,delta=Math.atan2(Math.sin(e.controls.view.angle-target),Math.cos(e.controls.view.angle-target));return dx*v.x+dz*v.z>1&&Math.abs(dx*v.z-dz*v.x)<.08&&Math.abs(delta)<.01}',{'x':dx,'z':dz}))
 check('Default chase view is farther away',page.evaluate('__explorer.controls.view.distance===36&&__explorer.world.camera.position.distanceTo(__explorer.world.player.position)>25'))
 # Normal mode should ease the turn, and the camera should track the translated player.
 page.evaluate('const e=__explorer;e.controls.clear();e.ui.preferences.reducedMotion=false;e.world.player.position.set(0,0,36);e.controls.view.angle=0;window.start=e.world.player.position.clone()');page.keyboard.down('d');page.wait_for_function('__explorer.controls.view.angle<-.1');check('Turn eases instead of snapping',page.evaluate('__explorer.controls.view.angle> -Math.PI/2+.1'));page.wait_for_function('Math.abs(__explorer.controls.view.angle+Math.PI/2)<.07');page.keyboard.up('d');check('Camera reaches moving character heading',page.evaluate('__explorer.world.player.position.x>1&&Math.abs(__explorer.world.player.position.z-36)<.1'));page.evaluate('__explorer.ui.preferences.reducedMotion=true')
 # Several narrow-alley and door positions should keep a readable camera distance.
 check('Door approaches keep at least 12 units of camera space',page.evaluate('()=>{const e=__explorer;return e.world.buildings.every(b=>{e.world.player.position.set(b.approach.x,0,b.approach.z);e.controls.view.angle=b.lot.yaw; e.world.updateCamera(e.controls.view,true);return e.world.camera.position.distanceTo(e.world.player.position)>12})}'))
 # First-person repair: switch while intentionally overlapping a building edge.
 page.evaluate('const e=__explorer,b=e.world.buildings[0];e.world.player.position.set(b.x,0,b.z);');page.locator('#camera-mode').click();page.wait_for_function('!__explorer.world.player.visible');check('First person hides own head and marker',page.evaluate('!__explorer.world.player.visible'))
 check('Unsafe first-person spawn moves to nearest clear point',page.evaluate('const w=__explorer.world;w.canStand(w.player.position.x,w.player.position.z,.28)'))
 check('Eyes stay above actual surface',page.evaluate('const w=__explorer.world,p=w.player.position;Math.abs(w.camera.position.y-w.groundHeight(p.x,p.z)-1.85)<.001&&Math.abs(p.y+.105-w.groundHeight(p.x,p.z))<.001'))
 page.evaluate('const e=__explorer,b=e.world.buildings[1];e.world.player.position.set(b.x+5.2,0,b.z);e.controls.view.angle=Math.PI/2;e.world.updateCamera(e.controls.view,true)')
 # Use a registered building at a side edge; collision prevents walking into its interior.
 page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w');check('First-person collision keeps eye out of solid geometry',page.evaluate('const w=__explorer.world;w.canStand(w.player.position.x,w.player.position.z,.28)'))
 page.evaluate('__explorer.world.ensureSafePosition()');page.locator('#camera-mode').click();page.wait_for_function('__explorer.world.player.visible');check('Third-person avatar returns after mode switch')
 page.evaluate('__explorer.world.player.position.set(0,0,36)');angle=page.evaluate('__explorer.controls.view.angle');page.mouse.move(700,650);page.mouse.down();page.mouse.move(820,700,steps=6);page.mouse.up();check('Mouse drag changes view without gesture guessing',page.evaluate('__explorer.controls.view.angle')!=angle)
 assert not errors,errors
 assert not external,external
 print('PASS standalone chase camera, movement and grounded first-person; no external requests or errors');b.close()
