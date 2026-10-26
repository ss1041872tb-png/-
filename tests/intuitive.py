"""Real browser regressions for fixed-view movement, mobile input and visible pipe paths."""
import os,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.getenv('EXPLORER_URL','http://127.0.0.1:8000')
SINGLE=os.getenv('EXPLORER_SINGLE')=='1'
passed=[]
def check(name,value=True):
 assert value,name
 passed.append(name);print('PASS',name,flush=True)
def start(page):
 if SINGLE:
  page.evaluate("()=>{window.URLSearchParams=class extends URLSearchParams{has(n){return n==='test'||super.has(n)}}}")
  page.set_content((Path(__file__).resolve().parents[1]/'dist/zhonghe-food-explorer-preview.html').read_text(),wait_until='load')
 else:page.goto(BASE+'/?test',wait_until='networkidle')
 try:page.wait_for_function('document.body.dataset.ready==="true"')
 except Exception:
  print('STARTUP STATE',page.locator('#error-message').text_content(),flush=True)
  raise
 page.locator('#start-adventure').click()
def place(page,angle=0):
 page.evaluate('(a)=>{const e=__explorer;e.controls.clear();e.world.player.position.set(0,0,36);e.controls.view.angle=a;e.world.updateCamera(e.controls.view,true);window.start=e.world.player.position.clone();window.yaw=a}',angle)
def open_pipe(page,touch=False):
 page.evaluate('const w=__explorer.world,p=w.buildings[5].entry;w.player.position.set(p.x,0,p.z)')
 page.wait_for_selector('#arcade:not([hidden])');getattr(page.locator('#arcade-begin'),'tap' if touch else 'click')()
 page.wait_for_selector('[data-pipe="3"]')
def solve_pipe(page,touch=False):
 state=page.evaluate('__explorer.arcade.activeState')
 for i in state['route']:
  for _ in range(4):
   if page.locator('#arcade-next').count():return
   ports=page.evaluate('(i)=>__explorer.arcade.activeState.ports[i]',i)
   if sorted(ports)==sorted(state['required'][i]):break
   getattr(page.locator(f'[data-pipe="{i}"]'),'tap' if touch else 'click')()
 page.wait_for_selector('#arcade-next')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':900});errors=[];external=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 if SINGLE:page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
 start(page);page.evaluate('__explorer.ui.preferences.reducedMotion=true')
 for angle in [0,.75,math.pi/2,math.pi-.01]:
  directions=[('w',0,-1),('s',0,1),('a',-1,0),('d',1,0)] if angle<1 else [('ArrowUp',0,-1),('ArrowDown',0,1),('ArrowLeft',-1,0),('ArrowRight',1,0)]
  for key,x,z in directions:
   place(page,angle);page.locator('#world canvas').focus();page.keyboard.down(key);page.wait_for_function('__explorer.world.player.position.distanceTo(start)>.55');page.keyboard.up(key)
   check(f'{key} walks in screen direction and turns only the avatar at {angle:.2f}',page.evaluate('(v)=>{const e=__explorer,p=e.world.player.position,dx=p.x-start.x,dz=p.z-start.z,wx=v.x*Math.cos(yaw)+v.z*Math.sin(yaw),wz=-v.x*Math.sin(yaw)+v.z*Math.cos(yaw),target=Math.atan2(wx,wz);return e.controls.view.angle===yaw&&dx*wx+dz*wz>.5&&Math.abs(dx*wz-dz*wx)<.001&&Math.abs(Math.atan2(Math.sin(e.world.player.rotation.y-target),Math.cos(e.world.player.rotation.y-target)))<.001}',{'x':x,'z':z}))
 # Turning the avatar must leave the camera's entire orientation unchanged.
 for reduced in [False,True]:
  place(page,0)
  page.evaluate('(v)=>{__explorer.ui.preferences.reducedMotion=v;window.samples=[];window.record=true;function tick(){const e=__explorer,w=e.world;samples.push({a:e.controls.view.angle,y:w.camera.position.y,q:w.camera.quaternion.toArray()});if(record)requestAnimationFrame(tick)}requestAnimationFrame(tick)}',reduced)
  for key in ['a','d','ArrowLeft','ArrowRight']:
   page.evaluate('window.previousPosition=__explorer.world.player.position.clone()');page.keyboard.down(key);page.wait_for_function('__explorer.world.player.position.distanceTo(previousPosition)>.55');page.keyboard.up(key)
  page.evaluate('window.record=false')
  check(f'No camera rotation, pitch change or vertical bob while walking ({reduced})',page.evaluate('samples.length>3&&samples.every(s=>s.a===0&&Math.abs(s.y-samples[0].y)<1e-9&&s.q.every((v,i)=>Math.abs(v-samples[0].q[i])<1e-9))'))
  page.evaluate('window.stopped=__explorer.controls.view.angle;window.stopPosition=__explorer.world.player.position.clone()');page.wait_for_timeout(500)
  check(f'Releasing input stops movement without automatic recentering ({reduced})',page.evaluate('__explorer.controls.view.angle===stopped&&__explorer.world.player.position.distanceTo(stopPosition)<.001'))
 # Diagonal walking keeps the same speed as walking straight, across actual frames.
 place(page);page.evaluate('const e=__explorer,original=e.controls.movement;window.walkTime=0;e.controls.movement=(x,z,dt)=>{if(e.controls.keys.size)walkTime+=dt;return original(x,z,dt)}');page.keyboard.down('w');page.keyboard.down('d');page.evaluate('window.walkTime=0;window.start=__explorer.world.player.position.clone()');page.wait_for_function('walkTime>.2');diagonal=page.evaluate('const p=__explorer.world.player.position;Math.abs(Math.hypot(p.x-start.x,p.z-start.z)/walkTime-4.5)<.001&&p.x>start.x&&p.z<start.z&&__explorer.controls.view.angle===0');page.keyboard.up('w');page.keyboard.up('d')
 check('Diagonal speed stays at 4.5 units per second',diagonal)
 # Sweep all shop approaches through a full circle; previous building avoidance jumped here.
 check('All ten shop approaches retain fixed camera geometry',page.evaluate('()=>{const e=__explorer,w=e.world,v=e.controls.view;for(const b of w.buildings){w.player.position.set(b.approach.x,0,b.approach.z);for(let n=0;n<36;n++){v.angle=n*Math.PI/18;w.updateCamera(v,true);const dx=w.camera.position.x-w.player.position.x,dy=w.camera.position.y-1.1,dz=w.camera.position.z-w.player.position.z;if(Math.abs(Math.hypot(dx,dy,dz)-36)>1e-6||Math.abs(Math.atan2(dy,Math.hypot(dx,dz))-.8)>1e-6)return false;}}return true}'))
 place(page);page.evaluate('window.face=__explorer.world.player.rotation.y');page.mouse.move(700,600);page.mouse.down();page.mouse.move(800,620,steps=5);page.mouse.up()
 check('Only explicit mouse drag rotates the camera, keeping avatar facing',page.evaluate('const e=__explorer;Math.abs(e.controls.view.angle)> .1&&e.world.player.rotation.y===face'));page.evaluate('window.manualYaw=__explorer.controls.view.angle')
 page.mouse.wheel(0,-100);check('Mouse wheel still zooms',page.evaluate('__explorer.controls.view.zoom>1'))
 page.locator('#center-camera').click();check('Reset distance does not rotate the camera',page.evaluate('__explorer.controls.view.zoom===1&&__explorer.controls.view.distance===36&&__explorer.controls.view.pitch===.8&&__explorer.controls.view.angle===manualYaw'))
 # First-person standing and steering use the same heading, without rendering our own head.
 page.evaluate('const w=__explorer.world,b=w.buildings[0];w.player.position.set(b.x,0,b.z)');page.locator('#camera-mode').click();page.wait_for_function('__explorer.controls.view.firstPerson')
 check('First person hides avatar and relocates unsafe positions',page.evaluate('const w=__explorer.world;!w.player.visible&&w.canStand(w.player.position.x,w.player.position.z,.28)'))
 check('Feet and eyes stay on the actual ground',page.evaluate('const w=__explorer.world,p=w.player.position,h=w.groundHeight(p.x,p.z);Math.abs(p.y+.105-h)<1e-6&&Math.abs(w.camera.position.y-h-1.85)<1e-6'))
 place(page);page.keyboard.down('a');page.wait_for_function('__explorer.world.player.position.x<-.55');page.keyboard.up('a')
 check('First-person left input strafes without rotating the view',page.evaluate('__explorer.controls.view.angle===0&&Math.abs(__explorer.world.player.position.z-36)<.001'))
 page.evaluate('const e=__explorer,b=e.world.buildings[1];e.world.player.position.set(b.x+5.2,0,b.z);e.controls.view.angle=Math.PI/2');page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w')
 check('First-person wall protection remains enabled',page.evaluate('const w=__explorer.world;w.canStand(w.player.position.x,w.player.position.z,.28)'))
 page.locator('#camera-mode').click();page.wait_for_function('__explorer.world.player.visible')
 # Play the real pipe puzzle using only tile clicks, not campaign completion shortcuts.
 open_pipe(page)
 check('Pipe uses nine continuous diagrams without arrow pairs',page.locator('.pipe-tile svg').count()==9 and page.locator('.pipe-tile').evaluate_all('(es)=>es.every(e=>!/[↑→↓←]/.test(e.textContent)&&e.querySelectorAll("path").length===3)'))
 check('Water inlet and outlet are visibly labelled',page.locator('.pipe-terminal.source').inner_text()=='💧進水口' and page.locator('.pipe-terminal.sink').inner_text()=='出水口🥤')
 original=page.evaluate('__explorer.arcade.activeState.ports[0]');page.locator('[data-pipe="0"]').focus();page.keyboard.press('Space')
 check('Keyboard activation rotates one pipe clockwise',page.evaluate('__explorer.arcade.activeState.ports[0]')==[(d+1)%4 for d in original])
 for _ in range(4):
  if sorted(page.evaluate('__explorer.arcade.activeState.ports[3]'))==[0,3]:break
  page.locator('[data-pipe="3"]').click()
 check('Connected pipe segments show flowing blue water',page.locator('.pipe-tile.wet').count()>0 and '已接通' in page.locator('.pipe-status').inner_text())
 check('Partial connections do not award progress',page.evaluate('__explorer.campaign.count(6)===0'))
 if not SINGLE:
  # Closing the incomplete puzzle must clear controls and leave saved progress untouched.
  page.locator('#arcade-close').click();check('Closing puzzle clears live game state',page.evaluate('__explorer.arcade.activeState===null&&__explorer.controls.keys.size===0'))
  page.locator('#interact').click();page.locator('#arcade-begin').click()
 solve_pipe(page);check('Real pipe solution completes first stage only',page.evaluate('__explorer.campaign.count(6)===1&&__explorer.campaign.visited.size===0'))
 if not SINGLE:
  page.reload(wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"')
  check('Saved pipe progress survives reload without altering other stores',page.evaluate('__explorer.campaign.stages.every((v,i)=>v===(i===5?1:0))'))
 if SINGLE:
  check('Single-file preview makes zero external requests',not external)
 else:
  page.close() # Release the desktop WebGL context before the phone acceptance.
  m=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);m.on('pageerror',lambda e:errors.append(str(e)));start(m);place(m);m.evaluate('__explorer.ui.preferences.reducedMotion=true')
  r=m.locator('#joystick').bounding_box();cx=r['x']+r['width']/2;cy=r['y']+r['height']/2;cdp=m.context.new_cdp_session(m)
  def event(kind,points):
   cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':x,'y':y} for i,x,y in points]});m.wait_for_timeout(40)
  event('touchStart',[(1,cx,cy)]);event('touchMove',[(1,cx+38,cy)]);m.wait_for_function('__explorer.world.player.position.x>start.x+.55');event('touchEnd',[])
  check('Phone horizontal stick walks right with fixed camera and avatar facing right',m.evaluate('const e=__explorer;e.controls.view.angle===0&&Math.abs(e.world.player.position.z-36)<.001&&Math.abs(Math.sin(e.world.player.rotation.y-Math.PI/2))<.001'))
  m.evaluate('window.yaw=__explorer.controls.view.angle;window.start=__explorer.world.player.position.clone()');event('touchStart',[(1,cx,cy)]);event('touchMove',[(1,cx,cy+38)]);m.wait_for_function('__explorer.world.player.position.z>start.z+.5');event('touchEnd',[])
  check('Phone backward movement does not flip the camera',m.evaluate('__explorer.controls.view.angle===yaw'))
  place(m);event('touchStart',[(1,cx,cy)]);event('touchMove',[(1,cx+25,cy-25)]);m.wait_for_function('__explorer.world.player.position.x>start.x+.3&&__explorer.world.player.position.z<start.z-.3')
  check('Phone diagonal stick moves diagonally without camera rotation',m.evaluate('__explorer.controls.stick.x>.3&&__explorer.controls.stick.z<-.3&&__explorer.controls.view.angle===0'))
  event('touchEnd',[]);place(m);event('touchStart',[(1,cx,cy)]);event('touchMove',[(1,cx,cy-38)]);m.wait_for_function('__explorer.world.player.position.distanceTo(start)>.3')
  event('touchStart',[(1,cx,cy-38),(2,230,400)]);event('touchMove',[(1,cx,cy-38),(2,290,430)]);m.wait_for_function('__explorer.controls.view.angle<-.1&&__explorer.controls.stick.z<-.5')
  check('Phone right-hand look works while left hand walks',m.evaluate('__explorer.controls.stick.z<-.5'))
  event('touchEnd',[]);m.wait_for_function('__explorer.controls.stick.z===0&&__explorer.controls.stick.x===0');m.evaluate('window.start=__explorer.world.player.position.clone();window.yaw=__explorer.controls.view.angle');m.wait_for_timeout(1100)
  check('Releasing phone controls stops movement and all automatic turning',m.evaluate('__explorer.world.player.position.distanceTo(start)<.01&&__explorer.controls.view.angle===yaw'))
  m.evaluate('window.zoom=__explorer.controls.view.zoom');event('touchStart',[(2,180,420),(3,270,420)]);event('touchMove',[(2,150,420),(3,300,420)]);event('touchEnd',[]);m.wait_for_function('__explorer.controls.view.zoom>zoom');check('Phone pinch zoom remains available')
  m.locator('#help-toggle').tap();check('Modal clears stick and keys',m.evaluate('__explorer.controls.keys.size===0&&__explorer.controls.stick.z===0'));m.locator('#help-done').tap()
  for w,h in [(320,568),(844,390),(390,844)]:
   m.set_viewport_size({'width':w,'height':h});check(f'Mobile controls fit {w}x{h}',m.locator('#joystick').is_visible() and m.evaluate('document.documentElement.scrollWidth===innerWidth'))
  open_pipe(m,True)
  check('Phone pipe tiles have readable touch targets',m.locator('[data-pipe="0"]').bounding_box()['width']>=48)
  m.screenshot(path='/tmp/stable-pipe-mobile.png');solve_pipe(m,True);check('Actual touch solves pipe puzzle on phone',m.evaluate('__explorer.campaign.count(6)===1'))
  m.locator('#arcade-close').tap();m.locator('#center-camera').tap();m.screenshot(path='/tmp/stable-controls-mobile.png')
 check('No browser runtime errors',not errors);print(json.dumps({'passed':len(passed),'errors':errors}));b.close()
