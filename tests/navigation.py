"""Browser acceptance: all store links, walkable arrows, overview and synchronized steering without ground arrows."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.getenv('EXPLORER_URL','http://127.0.0.1:8000');SINGLE=os.getenv('EXPLORER_SINGLE')=='1';passed=[]
def check(name,value=True):
 assert value,name
 passed.append(name);print('PASS',name,flush=True)
def start(page):
 if SINGLE:
  page.evaluate("()=>{window.URLSearchParams=class extends URLSearchParams{has(n){return n==='test'||super.has(n)}}}")
  page.set_content((Path(__file__).resolve().parents[1]/'dist/zhonghe-food-explorer-preview.html').read_text(),wait_until='load')
 else:page.goto(BASE+'/?test',wait_until='networkidle')
 page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').click();page.evaluate('__explorer.ui.preferences.reducedMotion=true')
def choose(page,id,touch=False):
 if page.locator('#map-content').is_hidden():getattr(page.locator('#map-toggle'),'tap' if touch else 'click')()
 getattr(page.locator(f'[data-destination-id="{id}"]'),'tap' if touch else 'click')()
 page.wait_for_function('(id)=>__explorer.world.destinationId===id&&__explorer.controls.view.overview===true&&__explorer.world.buildings[id-1].led.visible',arg=id)
def good_route(page):
 return page.evaluate('()=>{const e=__explorer,r=e.navigation.route,w=e.world;if(r.length<2)return false;for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/.2);for(let j=0;j<=n;j++)if(!w.staticClear(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n,.1))return false;}return true}')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);page=b.new_page(viewport={'width':1280,'height':900});errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)))
 if SINGLE:page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
 start(page);page.evaluate('window.origin=__explorer.world.player.position.clone();window.heading=__explorer.world.player.rotation.y')
 for id in range(1,11):
  choose(page,id)
  check(f'Store {id}: minimap route and exclusive LED border',good_route(page) and page.evaluate('(id)=>__explorer.world.buildings.every(b=>b.led.visible===(b.shop.id===id))',id))
  check(f'Store {id}: full town overview keeps player location and heading',page.evaluate('const e=__explorer,w=e.world;Math.hypot(w.player.position.x-origin.x,w.player.position.z-origin.z)<1e-6&&!e.controls.view.follow&&!e.controls.view.firstPerson&&Math.abs(w.player.rotation.y-heading)<1e-6&&w.buildings.every(b=>{const p=b.frame.getWorldPosition(w.player.position.clone()).project(w.camera);return Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1})'))
  if page.locator('#map-content').is_hidden():page.locator('#map-toggle').click()
  page.locator('#destination-info').click();page.wait_for_selector('#drawer:not([hidden])')
  check(f'Store {id}: real destination URLs and preview without progress',page.evaluate('(id)=>{const s=__explorer.shops[id-1],dir=new URL(document.getElementById("navigation").href),map=new URL(document.getElementById("map-listing").href),web=new URL(document.getElementById("web-info").href),reviews=new URL(document.getElementById("food-reviews").href);return document.getElementById("shop-name").textContent===s.name&&document.getElementById("address").textContent===s.address&&dir.searchParams.get("destination")===s.name+" "+s.address&&dir.searchParams.get("travelmode")==="walking"&&map.searchParams.get("query")===s.name+" "+s.address&&web.searchParams.get("q").includes(s.address)&&reviews.searchParams.get("q").includes(s.name)&&["navigation","map-listing","web-info","food-reviews"].every(id=>{const a=document.getElementById(id);return a.target==="_blank"&&a.rel.includes("noopener")})&&__explorer.campaign.stages.every(n=>n===0)}',id))
  page.locator('#close').click()
 check('Ground guidance geometry and APIs are removed',page.evaluate('()=>{const w=__explorer.world;let arrows=0;w.scene.traverse(o=>{if(o.geometry?.type==="ShapeGeometry")arrows++});return arrows===0&&w.guidance===undefined&&w.setGuidePath===undefined&&w.destinationMarker===undefined}'))
 # Walking input returns to the previous view, while keeping the selected shop.
 page.keyboard.down('ArrowLeft');page.wait_for_function('__explorer.controls.view.follow&&!__explorer.controls.view.overview');page.keyboard.up('ArrowLeft')
 check('Direction key restores follow view without losing destination',page.evaluate('const e=__explorer;e.controls.view.distance===36&&e.navigation.target.shop.id===10&&e.world.destinationId===10&&document.getElementById("overview-hint").hidden'))
 page.evaluate('const e=__explorer;e.world.player.position.set(0,0,36);e.navigation.update(0,true)')
 check('Leaving the route replans from the actual player position',page.evaluate('Math.abs(__explorer.navigation.route[0].x)<.01&&Math.abs(__explorer.navigation.route[0].z-36)<.01') and good_route(page))
 # Compare traveled distance against the actual frame time accumulated by the controls.
 page.evaluate('const e=__explorer,original=e.controls.movement;e.controls.movement=(x,z,dt)=>{if(e.controls.keys.has("w"))window.walkTime+=dt;if(e.controls.keys.has("d"))window.turnTime+=dt;return original(x,z,dt)};window.walkTime=0;window.turnTime=0;e.controls.clear();e.controls.view.angle=0;e.world.player.position.set(0,0,36);window.start=e.world.player.position.clone()')
 page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_function('walkTime>.2');page.keyboard.up('w')
 check('Third-person walking is now 4.5 units per second',page.evaluate('const p=__explorer.world.player.position;Math.abs(Math.hypot(p.x-start.x,p.z-start.z)/walkTime-4.5)<.001'))
 page.evaluate('window.startD=__explorer.world.player.position.clone()');page.keyboard.down('d');page.wait_for_function('turnTime>.15');page.keyboard.up('d');check('D turns character and camera together at 1.05 radians per second',page.evaluate('const e=__explorer;Math.abs(e.controls.view.angle/turnTime+1.05)<.001&&Math.abs(e.world.player.rotation.y-e.controls.view.angle-Math.PI)<.001&&e.world.player.position.distanceTo(startD)<.001'))
 page.locator('#camera-mode').click();page.evaluate('window.walkTime=0;window.start=__explorer.world.player.position.clone()');page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_function('walkTime>.2');page.keyboard.up('w')
 check('First-person walking is now 3.6 units per second',page.evaluate('const p=__explorer.world.player.position;Math.abs(Math.hypot(p.x-start.x,p.z-start.z)/walkTime-3.6)<.001'))
 choose(page,4);page.keyboard.down('ArrowUp');page.wait_for_function('__explorer.controls.view.firstPerson&&__explorer.controls.view.follow');page.keyboard.up('ArrowUp');check('Overview restores the chosen first-person mode',page.evaluate('!__explorer.world.player.visible&&__explorer.world.destinationId===4'))
 choose(page,5);page.locator('#camera-mode').click();check('First-person button matches its label during overview',page.evaluate('__explorer.controls.view.firstPerson&&__explorer.controls.view.follow&&!__explorer.controls.view.overview'))
 page.locator('#camera-mode').click();choose(page,9);page.evaluate('__explorer.ui.preferences.reducedMotion=false');page.wait_for_timeout(100);page.evaluate('window.glow=__explorer.world.buildings[8].ledMat.opacity');page.wait_for_function('Math.abs(__explorer.world.buildings[8].ledMat.opacity-glow)>.02')
 check('Selected sign LED still pulses gently',page.evaluate('Math.abs(__explorer.world.buildings[8].ledMat.opacity-glow)>.02'))
 page.evaluate('__explorer.ui.preferences.reducedMotion=true');page.wait_for_function('__explorer.world.buildings[8].ledMat.opacity===1');page.wait_for_timeout(120);check('Reduced motion keeps navigation lights steady',page.evaluate('__explorer.world.buildings[8].ledMat.opacity===1'))
 # An uncollected store is accessible directly from the collection, too.
 page.locator('#journal-toggle').click();page.locator('[data-shop-id="7"]').click();page.wait_for_selector('#drawer:not([hidden])');check('Uncollected store information is accessible from the collection',page.locator('#shop-name').inner_text()=='橋壽司' and '永和區' in page.locator('#address').inner_text())
 page.locator('#shop-guide').click();page.wait_for_function('__explorer.controls.view.overview&&__explorer.world.destinationId===7');check('Information card can set the in-game destination',page.locator('#drawer').is_hidden())
 if SINGLE:check('Standalone navigation loads without external requests',not external)
 else:
  page.screenshot(path='/tmp/navigation-overview-desktop.png')
  m=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);m.on('pageerror',lambda e:errors.append(str(e)));start(m);m.evaluate('window.origin=__explorer.world.player.position.clone();window.heading=__explorer.world.player.rotation.y')
  choose(m,10,True);check('Phone selection shows full overview and collapses the map',m.locator('#map-content').is_hidden() and m.evaluate('__explorer.world.buildings.every(b=>{const p=b.frame.getWorldPosition(__explorer.world.player.position.clone()).project(__explorer.world.camera);return Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1})'))
  m.screenshot(path='/tmp/navigation-overview-mobile.png')
  r=m.locator('#joystick').bounding_box();cx=r['x']+r['width']/2;cy=r['y']+r['height']/2;cdp=m.context.new_cdp_session(m)
  def touch(kind,pts):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':x,'y':y} for i,x,y in pts]})
  touch('touchStart',[(1,cx,cy-30)]);m.wait_for_function('__explorer.controls.view.follow&&!__explorer.controls.view.overview');touch('touchEnd',[]);m.wait_for_function('__explorer.controls.stick.z===0');check('Phone joystick resumes normal view and stops on release',m.evaluate('__explorer.world.destinationId===10&&__explorer.controls.view.distance===36'))
  choose(m,6,True);m.locator('#map-toggle').tap();m.locator('#destination-info').tap();m.wait_for_selector('#drawer:not([hidden])');check('Phone can access store links before clearing any game',m.locator('#web-info').get_attribute('href').startswith('https://www.google.com/search?') and m.evaluate('__explorer.campaign.stages.every(n=>n===0)'))
  m.wait_for_function('document.getElementById("food-model").dataset.ready==="6"')
  touch('touchStart',[(2,180,650)])
  for y in [600,540,480,420,360,300]:touch('touchMove',[(2,180,y)])
  touch('touchEnd',[]);m.wait_for_function('document.getElementById("drawer").scrollTop>100')
  check('Phone can scroll to web links while the close button stays reachable',m.locator('#close').bounding_box()['y']<150)
  m.screenshot(path='/tmp/navigation-info-mobile.png');m.locator('#close').tap()
  for w,h in [(320,568),(844,390)]:m.set_viewport_size({'width':w,'height':h});check(f'Navigation fits {w}x{h}',m.evaluate('document.documentElement.scrollWidth===innerWidth'))
 check('All previews preserve saved game progress',page.evaluate('__explorer.campaign.stages.every(n=>n===0)&&__explorer.campaign.visited.size===0'))
 check('No browser runtime errors',not errors);print(json.dumps({'passed':len(passed),'errors':errors}));b.close()
