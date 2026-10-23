"""Browser acceptance: real challenge controls, no calls to campaign.complete()."""
import os,heapq,re,json
from functools import lru_cache
from playwright.sync_api import sync_playwright
BASE=os.environ.get('EXPLORER_URL','http://127.0.0.1:8000')
passed=[]
def check(name,value=True):
 assert value,name
 passed.append(name);print('PASS',name,flush=True)

def solve_slider(start):
 target=(1,2,3,4,5,6,7,8,0)
 def h(state):return sum(abs(i//3-(v-1)//3)+abs(i%3-(v-1)%3) for i,v in enumerate(state) if v)
 queue=[(h(start),0,start,[])];seen={start:0}
 while queue:
  _,g,state,path=heapq.heappop(queue)
  if state==target:return path
  if g>seen[state]:continue
  blank=state.index(0)
  for i in [blank-3,blank+3]+([blank-1] if blank%3 else [])+([blank+1] if blank%3<2 else []):
   if not 0<=i<9:continue
   nxt=list(state);nxt[blank],nxt[i]=nxt[i],nxt[blank];nxt=tuple(nxt)
   if seen.get(nxt,999)>g+1:seen[nxt]=g+1;heapq.heappush(queue,(g+1+h(nxt),g+1,nxt,path+[i]))
 raise AssertionError('Unsolvable sliding board')
lines=[(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
@lru_cache(None)
def minimax(state,turn):
 for mark,score in [('○',1),('×',-1)]:
  if any(all(state[i]==mark for i in line) for line in lines):return score
 if all(state):return 0
 scores=[]
 for i in range(9):
  if not state[i]:s=list(state);s[i]=turn;scores.append(minimax(tuple(s),'×' if turn=='○' else '○'))
 return (max if turn=='○' else min)(scores)

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("localStorage.setItem('zhonghe-food-passport-v1','[1,2,3,4,5,6,7,8,9,10]')")
 page.goto(BASE+'/?test',wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"')
 check('New campaign preserves old passport without bypass',page.locator('#count').inner_text()=='0' and page.evaluate("JSON.parse(localStorage.getItem('zhonghe-food-passport-v1')).length===10"))
 check('Ten shops occupy bending alleys and four orientations',page.evaluate('new Set(__explorer.world.buildings.map(b=>b.z)).size>=8 && new Set(__explorer.world.buildings.map(b=>b.lot.yaw)).size===4'))
 check('Cars, scooters and four NPC roles',page.evaluate("__explorer.world.vehicles.some(v=>v.type==='car')&&__explorer.world.vehicles.some(v=>v.type==='scooter')&&new Set(__explorer.world.npcs.map(n=>n.g.userData.type)).size===4"))
 before=page.evaluate('__explorer.world.vehicles[0].g.position.toArray()');page.wait_for_function('(p)=>__explorer.world.vehicles[0].g.position.distanceTo({x:p[0],y:p[1],z:p[2]})>.05',arg=before)
 check('Traffic actually advances along roads')
 check('Player overhead marker remains readable through buildings',page.evaluate('__explorer.world.playerMarker.parent===__explorer.world.player&&__explorer.world.playerMarker.material.depthTest===false&&__explorer.world.playerMarker.material.sizeAttenuation===false'))
 # Validate the screen direction after all four camera rotations, using projected positions.
 page.locator('#start-adventure').click()
 for angle in [0,1.5708,3.14159,4.71239]:
  for key,axis,sign in [('w','y',1),('d','x',1)]:
   page.evaluate('(a)=>{const w=__explorer.world;w.player.position.set(0,0,36);Object.assign(__explorer.controls.view,{angle:a,follow:true,distance:48});w.updateCamera(__explorer.controls.view,true);window.moveStart=w.player.position.clone();}',angle)
   page.locator('#world canvas').focus();page.keyboard.down(key);page.wait_for_function('__explorer.world.player.position.distanceTo(moveStart)>.3');page.keyboard.up(key)
   check(f'Camera-relative {key} at {angle:.2f} radians',page.evaluate('(axis)=>{const w=__explorer.world,a=moveStart.clone().project(w.camera),b=w.player.position.clone().project(w.camera);return b[axis]>a[axis]+.001}',axis))
 page.evaluate('const w=__explorer.world;w.player.position.set(0,0,36)')
 angle=page.evaluate('__explorer.controls.view.angle');page.mouse.move(700,700);page.mouse.down();page.mouse.move(1000,700,steps=8);page.mouse.up()
 check('Actual mouse drag changes camera angle',abs(page.evaluate('__explorer.controls.view.angle')-angle)>.5)
 page.wait_for_timeout(700);page.evaluate('window.moveStart=__explorer.world.player.position.clone()');page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_function('__explorer.world.player.position.distanceTo(moveStart)>.3');page.keyboard.up('w')
 check('Forward follows camera after real mouse drag',page.evaluate('const w=__explorer.world;w.player.position.clone().project(w.camera).y>moveStart.clone().project(w.camera).y'))
 page.screenshot(path='/tmp/adventure-overview.png')
 page.locator('#journal-toggle').click();page.locator('[data-shop-id="10"]').click()
 check('Remote passport cannot open challenges or collect',page.locator('#quest').is_hidden() and page.locator('#count').inner_text()=='0')
 page.evaluate('const w=__explorer.world,p=w.buildings[0].approach;w.player.position.set(p.x,0,p.z);Object.assign(__explorer.controls.view,{angle:0,follow:true});w.updateCamera(__explorer.controls.view,true)')
 page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_function('__explorer.world.player.position.z<26')
 page.wait_for_function('__explorer.world.player.userData.limbs.every(l=>l.leg.rotation.x===0)')
 page.keyboard.up('w')
 check('Locked water gap physically stops player',page.evaluate('__explorer.world.player.position.z>24.5 && __explorer.campaign.count(1)===0'))
 def approach(shop_id):
  page.evaluate('''id=>{const w=__explorer.world,p=w.buildings[id-1].approach;w.player.position.set(p.x,0,p.z);__explorer.controls.focusPlayer();__explorer.controls.view.angle=0;w.updateCamera(__explorer.controls.view,true)}''',shop_id)
  page.locator('#world canvas').focus();page.keyboard.press('e');page.wait_for_selector('#quest:not([hidden])');page.locator('#quest-begin').click()
 def solve_game(shop_id):
  kind=page.locator('#quest').get_attribute('data-game');count=page.evaluate('(id)=>__explorer.campaign.count(id)',shop_id)
  if kind=='bridge':
   page.locator('[data-slot="0"]').click();check(f'Bridge rejects placing without a block ({shop_id})','方向' in page.locator('#quest-feedback').inner_text())
   for i in range(3):
    angle=int(re.search(r'(\d+)°',page.locator(f'[data-slot="{i}"]').inner_text())[1])
    page.locator(f'[data-piece="{i}"]').click()
    for _ in range(angle//90):page.locator('[data-action="rotate"]').click()
    page.locator(f'[data-slot="{i}"]').click()
  elif kind=='rps':
   page.evaluate('Math.random=()=>.01')
   page.locator('[data-move="2"]').click();check(f'RPS loss does not advance ({shop_id})',page.evaluate('(id)=>__explorer.campaign.count(id)',shop_id)==count)
   page.locator('[data-move="1"]').click();page.locator('[data-move="1"]').click()
  elif kind=='puzzle':
   state=tuple(int(x) for x in page.locator('.sliding-board button').evaluate_all('(buttons)=>buttons.map(b=>b.dataset.value)'))
   for index in solve_slider(state):page.locator(f'[data-cell="{index}"]').click()
  elif kind=='order':
   recipe=re.findall(r'\d+\.\s*([^→]+)',page.locator('#quest-game .game-instructions').nth(1).inner_text());recipe=[r.strip() for r in recipe]
   page.locator('[data-action="remember"]').click();page.locator(f'[data-ingredient="{recipe[-1]}"]').click()
   check(f'Wrong recipe does not advance ({shop_id})',page.evaluate('(id)=>__explorer.campaign.count(id)',shop_id)==count)
   for word in recipe:page.locator(f'[data-ingredient="{word}"]').click()
  elif kind=='tictactoe':
   for _ in range(5):
    if not page.locator('.tic-board button').count():break
    state=tuple(page.locator('.tic-board button').evaluate_all('(buttons)=>buttons.map(b=>b.textContent==="·"?"":b.textContent)'))
    options=[]
    for i,value in enumerate(state):
     if not value:s=list(state);s[i]='○';options.append((minimax(tuple(s),'×'),i))
    page.locator(f'[data-square="{max(options)[1]}"]').click()
  elif kind=='memory':
   known={};matched=set()
   for _ in range(20):
    if not page.locator('.memory-board').count():break
    available=[i for i in range(8) if i not in matched]
    known_pair=next(((a,b) for a in available for b in available if a<b and a in known and b in known and known[a]==known[b]),None)
    a,b=known_pair if known_pair else (next((i for i in available if i not in known),available[0]),None)
    page.locator(f'[data-card="{a}"]').click();known[a]=page.locator(f'[data-card="{a}"]').inner_text()
    if b is None:b=next((i for i in available if i!=a and known.get(i)==known[a]),next(i for i in available if i!=a))
    page.locator(f'[data-card="{b}"]').click()
    if not page.locator('.memory-board').count():break
    known[b]=page.locator(f'[data-card="{b}"]').inner_text()
    if known[a]==known[b]:matched.update([a,b])
    else:page.wait_for_timeout(750)
  else:raise AssertionError(kind)
  page.wait_for_function('(p)=>__explorer.campaign.count(p.id)===p.count+1',arg={'id':shop_id,'count':count})
  check(f'Shop {shop_id} actual {kind} completion')
  check(f'Shop {shop_id} stage does not award premature stamp',not page.evaluate('(id)=>__explorer.campaign.visited.has(id)',shop_id))
 approach(1);solve_game(1);page.locator('#quest-close').click();page.reload(wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"')
 check('Partial completed stage survives reload',page.evaluate('__explorer.campaign.count(1)===1') and page.locator('#count').inner_text()=='0')
 for shop_id in range(1,11):
  approach(shop_id)
  while page.evaluate('(id)=>__explorer.campaign.count(id)',shop_id)<3:
   solve_game(shop_id)
   if page.evaluate('(id)=>__explorer.campaign.count(id)',shop_id)<3:page.locator('#quest-next').click()
  check(f'Shop {shop_id} celebration with original music',page.evaluate('(id)=>__explorer.celebration.activeShop===id&&__explorer.celebration.total===id&&__explorer.sound.celebrations===id',shop_id) and page.locator('#celebration-banner').is_visible())
  if shop_id==1:page.screenshot(path='/tmp/celebration.png')
  page.locator('#quest-next').click()
  check(f'Shop {shop_id} unlocks without automatic stamp',page.locator('#count').inner_text()==str(shop_id-1))
  # Drive the first bridge with actual keys; remaining sign checks position at the doorway.
  if shop_id==1:
   page.locator('#world canvas').focus();page.keyboard.down('w');page.wait_for_function('Math.abs(__explorer.world.player.position.z-__explorer.world.buildings[0].entry.z)<.8');page.keyboard.up('w')
   check('Player really crosses unlocked bridge',page.evaluate('__explorer.world.player.position.z<23'))
  else:page.evaluate('id=>{const w=__explorer.world,p=w.buildings[id-1].entry;w.player.position.set(p.x,0,p.z)}',shop_id)
  point=page.evaluate('''id=>{const w=__explorer.world,b=w.buildings[id-1];Object.assign(__explorer.controls.view,{follow:true,angle:b.lot.yaw,pitch:.8,distance:32});w.updateCamera(__explorer.controls.view,true);w.scene.updateMatrixWorld(true);for(const face of b.faces){const v=face.getWorldPosition(w.player.position.clone()).project(w.camera),x=(v.x+1)*innerWidth/2,y=(1-v.y)*innerHeight/2;if(w.pick(x,y)?.id===id)return{x,y};}return null}''',shop_id)
  assert point,f'Sign occlusion shop {shop_id}'
  page.mouse.move(point['x'],point['y']);page.mouse.click(point['x'],point['y']);page.wait_for_selector('#drawer:not([hidden])')
  check(f'Shop {shop_id} real sign awards exactly one badge',page.locator('#count').inner_text()==str(shop_id))
  page.wait_for_function('(id)=>document.getElementById("food-model").dataset.ready===String(id)',arg=shop_id)
  check(f'Shop {shop_id} interactive original 3D food model',page.locator('#food-model canvas').is_visible() and '原創 3D' in page.locator('#image-note').inner_text() and '非店家實拍' in page.locator('#image-note').inner_text())
  if shop_id==7:
   before_food=page.locator('#food-model').screenshot();page.locator('#food-right').click()
   check('Food rotation button changes rendered viewpoint',page.locator('#food-model').screenshot()!=before_food)
   before_food=page.locator('#food-model').screenshot();food_box=page.locator('#food-model').bounding_box();page.mouse.move(food_box['x']+100,food_box['y']+150);page.mouse.down();page.mouse.move(food_box['x']+190,food_box['y']+150,steps=5);page.mouse.up()
   check('Actual food drag changes rendered viewpoint',page.locator('#food-model').screenshot()!=before_food)
  else:page.locator('#food-right').click();page.locator('#food-left').click()
  if shop_id in [1,6,7]:page.screenshot(path=f'/tmp/food-card-{shop_id}.png')
  page.locator('#close').click()
 page.locator('#journal-toggle').click();check('All 30 stages and 10 badges complete',page.locator('#task-count').inner_text()=='30' and page.locator('#completion').is_visible())
 page.screenshot(path='/tmp/adventure-completion.png')
 page.locator('#reset-progress').click();page.locator('#reset-cancel').click();check('Cancel reset retains adventure',page.locator('#task-count').inner_text()=='30')
 page.locator('#reset-progress').click();page.locator('#reset-confirm-button').click();page.keyboard.press('Escape')
 check('Reset clears celebration',page.evaluate('__explorer.celebration.activeShop===null') and page.locator('#celebration-banner').is_hidden())
 check('Reset returns player outside barriers and preserves legacy data',page.evaluate('__explorer.world.player.position.x===__explorer.world.spawn.x&&__explorer.campaign.stages.every(n=>n===0)&&JSON.parse(localStorage.getItem("zhonghe-food-passport-v1")).length===10'))
 check('Audio starts only after interaction',page.evaluate('__explorer.sound.state==="running"'))
 page.locator('#sound-toggle').click();check('Sound can be muted',page.evaluate('!__explorer.sound.enabled'))
 page.reload(wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');check('Mute and reset persist',page.evaluate('!__explorer.sound.enabled&&__explorer.campaign.stages.every(n=>n===0)'))
 page.locator('#help-toggle').click();page.locator('#power-saving').check();page.locator('#reduced-motion').check();check('Power saving and reduced motion still apply',page.evaluate('!__explorer.world.renderer.shadowMap.enabled&&__explorer.ui.preferences.reducedMotion'))
 page.locator('#help-done').click();page.evaluate('__explorer.celebration.launch(__explorer.shops[0])')
 check('Reduced motion ceremony is static and respects mute',page.locator('#celebration-banner').is_visible() and page.locator('#celebration-canvas').is_hidden() and page.evaluate('!__explorer.sound.enabled'))
 context.close()
 mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(BASE+'/?test',wait_until='networkidle');m.wait_for_function('document.body.dataset.ready==="true"')
 m.locator('#start-adventure').tap();up=m.locator('[data-key="arrowup"]').bounding_box();z=m.evaluate('__explorer.world.player.position.z');m.mouse.move(up['x']+20,up['y']+20);m.mouse.down();m.wait_for_function('(z)=>__explorer.world.player.position.z<z-.2',arg=z);m.mouse.move(350,450);m.mouse.up();check('Mobile direction pad releases outside control',m.evaluate('__explorer.controls.keys.size===0'))
 cdp=mobile.new_cdp_session(m);zoom=m.evaluate('__explorer.controls.view.distance');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':140,'y':400,'id':1},{'x':250,'y':400,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':100,'y':400,'id':1},{'x':290,'y':400,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});check('Mobile pinch zoom does not start remote quest',m.evaluate('__explorer.controls.view.distance')<zoom and m.locator('#quest').is_hidden())
 m.evaluate('const w=__explorer.world,p=w.buildings[0].approach;w.player.position.set(p.x,0,p.z);Object.assign(__explorer.controls.view,{angle:0,follow:true});w.updateCamera(__explorer.controls.view,true)');m.wait_for_selector('#interact:not([hidden])');m.locator('#interact').tap();m.locator('#quest-begin').tap();check('Mobile contextual action opens challenge',m.locator('#quest').is_visible() and m.locator('.bridge-slots').is_visible())
 check('Large mission goal and subheadings on mobile',m.locator('.mission-guide h4').count()==2 and m.locator('.game-instructions').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)>=17'))
 m.screenshot(path='/tmp/adventure-mobile-quest.png')
 m.keyboard.press('Shift+Tab');check('Challenge focus remains in dialog',m.locator('#quest').evaluate('(e)=>e.contains(document.activeElement)'))
 for width,height in [(320,568),(844,390)]:
  m.set_viewport_size({'width':width,'height':height});check(f'Challenge fits {width}x{height}',m.locator('#quest').evaluate('(e)=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().bottom<=innerHeight') and m.evaluate('document.documentElement.scrollWidth===innerWidth'))
 m.locator('#quest-close').tap();mobile.close()
 fallback=browser.new_context();f=fallback.new_page();f.on('pageerror',lambda e:errors.append(str(e)));f.route('**/vendor/three.module.js',lambda r:r.abort());f.goto(BASE,wait_until='networkidle');f.wait_for_selector('#error:not([hidden])');f.locator('#journal-toggle').click();f.locator('[data-shop-id="1"]').click();check('No-WebGL fallback shows data without bypassing quests',f.locator('#drawer').is_visible() and f.locator('#count').inner_text()=='0');f.wait_for_function('document.getElementById("food-image").naturalWidth>0');check('Food fallback uses original 3D render without WebGL',f.locator('#food-image').is_visible() and f.locator('#food-image').get_attribute('src').endswith('.png'));fallback.close()
 if errors:print('ERRORS',errors)
 check('No application runtime errors',not errors)
 print(json.dumps({'passed':len(passed),'errors':errors},ensure_ascii=False));browser.close()
