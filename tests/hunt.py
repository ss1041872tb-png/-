"""Browser acceptance for entering real rooms, twenty physical searches and food rewards."""
import os,json,heapq
from playwright.sync_api import sync_playwright
BASE=os.environ.get('EXPLORER_URL','http://127.0.0.1:8000');passed=[]
def check(name,value=True):
 assert value,name
 passed.append(name);print('PASS',name,flush=True)

def path_to(page,target):
 grid=page.evaluate('''()=>{const w=__explorer.world,points=[];for(let x=-12;x<=12;x++)for(let z=-10;z<=10;z++)if(w.canStand(x/2,z/2))points.push([x,z]);return {points,start:[Math.round(w.player.position.x*2),Math.round(w.player.position.z*2)]};}''')
 points=set(map(tuple,grid['points']));start=tuple(grid['start']);goal=min(points,key=lambda p:(p[0]/2-target[0])**2+(p[1]/2-target[1])**2);queue=[(0,start)];parents={start:None};cost={start:0}
 while queue:
  _,current=heapq.heappop(queue)
  if current==goal:break
  for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]:
   nxt=(current[0]+dx,current[1]+dz)
   if nxt in points and cost.get(nxt,999)>cost[current]+1:
    cost[nxt]=cost[current]+1;parents[nxt]=current;heapq.heappush(queue,(cost[nxt]+abs(nxt[0]-goal[0])+abs(nxt[1]-goal[1]),nxt))
 else:raise AssertionError('Room target unreachable')
 path=[];pos=goal
 while pos!=start:path.append(pos);pos=parents[pos]
 path.reverse();turns=[]
 for i,point in enumerate(path):
  if i==len(path)-1 or (point[0]-(path[i-1][0] if i else start[0]),point[1]-(path[i-1][1] if i else start[1]))!=(path[i+1][0]-point[0],path[i+1][1]-point[1]):turns.append(point)
 for x,z in turns:
  # Each segment is walked with real keyboard input, never teleported inside the room.
  px,pz=page.evaluate('[__explorer.world.player.position.x,__explorer.world.player.position.z]')
  axis='x' if abs(x/2-px)>abs(z/2-pz) else 'z';value=x/2 if axis=='x' else z/2;before=px if axis=='x' else pz;direction=1 if value>before else -1
  if abs(value-before)<.12:continue
  key=('d' if direction>0 else 'a') if axis=='x' else ('s' if direction>0 else 'w')
  page.locator('#world canvas').focus();page.keyboard.down(key)
  try:page.wait_for_function('(p)=>(__explorer.world.player.position[p.axis]-p.value)*p.direction>-.08',arg={'axis':axis,'value':value,'direction':direction},timeout=15000)
  finally:page.keyboard.up(key)

def approach_for(target):
 return (target['x'],target['z']+2.3) if target['z']<-4.5 else (target['x']-(2.3 if target['x']>0 else -2.3),target['z'])

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("localStorage.setItem('zhonghe-alley-adventure-v2',JSON.stringify({version:2,stages:Array(10).fill(3),visited:[1,2,3,4,5,6,7,8,9,10]}))")
 page.goto(BASE+'/?test',wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"')
 check('New hunt preserves old save without bypass',page.locator('#count').inner_text()=='0' and page.evaluate('JSON.parse(localStorage.getItem("zhonghe-alley-adventure-v2")).visited.length===10'))
 check('Audio remains locked before interaction',page.evaluate('__explorer.sound.state==="locked"&&!__explorer.sound.musicPlaying'))
 page.locator('#start-adventure').click();page.wait_for_function('__explorer.sound.musicPlaying');check('Relaxing background music starts with user interaction')
 page.locator('#journal-toggle').click();page.locator('[data-shop-id="10"]').click();check('Remote collection cannot enter room or award food',page.evaluate('__explorer.interior.active===null&&__explorer.campaign.visited.size===0'))
 for shop in range(1,11):
  page.evaluate('''id=>{const w=__explorer.world,b=w.buildings[id-1],p=b.entry;w.player.position.set(p.x+Math.sin(b.lot.yaw)*3.2,0,p.z+Math.cos(b.lot.yaw)*3.2);Object.assign(__explorer.controls.view,{follow:true,angle:w.buildings[id-1].lot.yaw,distance:48});w.updateCamera(__explorer.controls.view,true)}''',shop)
  page.wait_for_function('(id)=>!document.getElementById("door-hint").hidden&&document.getElementById("door-title").textContent.startsWith(__explorer.shops[id-1].name)',arg=shop);check(f'Shop {shop}: automatic door hint without click',page.locator('#door-title').inner_text().startswith(page.evaluate('(id)=>__explorer.shops[id-1].name',shop)))
  page.locator('#world canvas').focus();page.keyboard.down('w')
  try:page.wait_for_function('(id)=>__explorer.interior.active?.id===id',arg=shop,timeout=15000)
  finally:page.keyboard.up('w')
  check(f'Shop {shop}: physically walks across doorway',page.locator('#hunt-hud').is_visible() and page.locator('#navigator').is_hidden())
  check(f'Shop {shop}: distinct pair of items',page.locator('#hunt-items li').count()==2)
  targets=page.evaluate('__explorer.interior.targets.filter(t=>t.itemIndex>=0).map(t=>({index:t.index,x:t.x,z:t.z,itemIndex:t.itemIndex}))')
  # A distant ray click cannot collect an item.
  if shop==1:
   point=page.evaluate('''()=>{const w=__explorer.world,t=__explorer.interior.targets[0],v=t.meshes[1].getWorldPosition(w.player.position.clone()).project(w.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}}''');page.mouse.click(point['x'],point['y']);check('Distant furniture click cannot collect',page.evaluate('__explorer.campaign.count(1)===0'))
   # Prove the central island blocks movement.
   page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_function('__explorer.world.player.position.z<1.1');page.wait_for_timeout(500);page.keyboard.up('w');check('Interior furniture has real collision',page.evaluate('__explorer.world.player.position.z>.8'))
  for n,target in enumerate(targets):
   path_to(page,approach_for(target))
   if page.evaluate('(index)=>__explorer.interior.nearest()?.index===index',target['index']):page.keyboard.press('e')
   else:
    point=page.evaluate('''index=>{const w=__explorer.world,t=__explorer.interior.targets[index];__explorer.interior.scene.updateMatrixWorld(true);for(const mesh of [...t.meshes].reverse()){const v=mesh.getWorldPosition(w.player.position.clone()).project(w.camera),x=(v.x+1)*innerWidth/2,y=(1-v.y)*innerHeight/2;if(w.pick(x,y)?.index===index)return{x,y};}return null;}''',target['index'])
    assert point,f'Furniture {target["index"]} must be clickable'
    page.mouse.click(point['x'],point['y'])
   page.wait_for_function('(v)=>__explorer.campaign.has(v.id,v.index)',arg={'id':shop,'index':target['itemIndex']});check(f'Shop {shop}: actual search finds item {n+1}')
   if n==0:
    check(f'Shop {shop}: one item does not award food',not page.evaluate('(id)=>__explorer.campaign.visited.has(id)',shop))
    if shop==1:
     page.locator('#hunt-exit').click();page.reload(wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');check('Partial item progress persists',page.evaluate('__explorer.campaign.count(1)===1'))
     page.evaluate('const w=__explorer.world,p=w.buildings[0].entry;w.player.position.set(p.x,0,p.z)');page.wait_for_function('__explorer.interior.active?.id===1')
  page.wait_for_selector('#reward:not([hidden])');check(f'Shop {shop}: food automatically magnifies',page.locator('#reward-food').is_visible() and page.locator('#reward').get_attribute('data-phase')=='show')
  check(f'Shop {shop}: fireworks and celebration music',page.evaluate('(id)=>__explorer.celebration.activeShop===id&&__explorer.sound.celebrations===id',shop))
  if shop==1:page.screenshot(path='/tmp/hunt-reward.png')
  page.wait_for_selector('#reward[data-phase="collecting"]',timeout=8000);check(f'Shop {shop}: food automatically flies to collection box')
  page.locator('#reward').wait_for(state='hidden');check(f'Shop {shop}: exactly one collected meal',page.locator('#count').inner_text()==str(shop))
  page.locator('#hunt-exit').click();page.wait_for_function('__explorer.interior.active===null')
 page.locator('#journal-toggle').click();check('Twenty found objects and ten collected meals',page.locator('#task-count').inner_text()=='20' and page.locator('#completion').is_visible() and page.locator('.collection-food:visible').count()==10);page.screenshot(path='/tmp/hunt-collection.png');page.locator('[data-shop-id="7"]').click();page.wait_for_function('document.getElementById("food-model").dataset.ready==="7"');check('Collected meal opens rotatable 3D information card',page.locator('#drawer').is_visible());page.locator('#close').click()
 page.locator('#help-toggle').click();page.locator('#music-enabled').uncheck();check('Background music independently switches off',page.evaluate('!__explorer.sound.musicPlaying&&__explorer.sound.enabled'));page.locator('#music-enabled').check();page.wait_for_function('__explorer.sound.musicPlaying');page.locator('#help-done').click();page.locator('#sound-toggle').click();check('Master mute stops music and effects',page.evaluate('!__explorer.sound.enabled&&!__explorer.sound.musicPlaying'))
 page.reload(wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');check('Collected food and mute survive reload',page.locator('#count').inner_text()=='10' and page.evaluate('!__explorer.sound.enabled'))
 page.locator('#journal-toggle').click();page.locator('#reset-progress').click();page.locator('#reset-cancel').click();check('Reset cancellation keeps collection',page.locator('#count').inner_text()=='10');page.locator('#reset-progress').click();page.locator('#reset-confirm-button').click();page.keyboard.press('Escape');check('Confirmed reset only clears new hunt',page.locator('#count').inner_text()=='0' and page.evaluate('JSON.parse(localStorage.getItem("zhonghe-alley-adventure-v2")).visited.length===10'))
 context.close()
 mobile=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce');m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(BASE+'/?test',wait_until='networkidle');m.wait_for_function('document.body.dataset.ready==="true"');m.locator('#start-adventure').tap();m.evaluate('const w=__explorer.world,p=w.buildings[0].entry;w.player.position.set(p.x,0,p.z)');m.wait_for_function('__explorer.interior.active?.id===1');m.screenshot(path='/tmp/hunt-mobile.png')
 pos=m.evaluate('__explorer.world.player.position.x');pad=m.locator('[data-key="arrowleft"]').bounding_box();m.mouse.move(pad['x']+15,pad['y']+15);m.mouse.down();m.wait_for_function('(x)=>__explorer.world.player.position.x<x-.2',arg=pos);m.mouse.up();check('Mobile pad moves inside the actual room',m.evaluate('__explorer.controls.keys.size===0'));m.locator('#hunt-clue').tap();check('Mobile clue is readable', '💡' in m.locator('#hunt-hint').inner_text())
 for width,height in [(320,568),(844,390)]:
  m.set_viewport_size({'width':width,'height':height});check(f'Hunt fits {width}x{height}',m.evaluate('document.documentElement.scrollWidth===innerWidth') and m.locator('#hunt-exit').is_visible())
 # Complete a room through the mobile search button, with reduced-motion reward.
 m.set_viewport_size({'width':390,'height':844});path_to(m,(-3,-1.5));m.wait_for_function('__explorer.interior.nearest()?.index===0');m.locator('#interact').tap();m.wait_for_function('__explorer.campaign.count(1)===1');path_to(m,(-2,-2.5));m.wait_for_function('__explorer.interior.nearest()?.index===1');m.locator('#interact').tap();m.wait_for_selector('#reward:not([hidden])');check('Reduced-motion mobile ceremony keeps static reward',m.locator('#celebration-canvas').is_hidden() and m.locator('#reward-food').is_visible());m.locator('#reward').wait_for(state='hidden');check('Mobile food automatically reaches collection',m.locator('#count').inner_text()=='1')
 m.locator('#hunt-exit').tap();check('Mobile can exit without losing controls',m.evaluate('__explorer.interior.active===null'))
 fallback=b.new_context();f=fallback.new_page();f.on('pageerror',lambda e:errors.append(str(e)));f.route('**/vendor/three.module.js',lambda r:r.abort());f.goto(BASE,wait_until='networkidle');f.locator('#journal-toggle').click();f.locator('[data-shop-id="1"]').click();check('No-WebGL fallback shows data without awarding food',f.locator('#drawer').is_visible() and f.locator('#count').inner_text()=='0')
 check('No application runtime errors',not errors);print(json.dumps({'passed':len(passed),'errors':errors}));b.close()
