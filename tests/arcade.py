import os,json,math
from functools import lru_cache
from playwright.sync_api import sync_playwright
BASE=os.getenv('EXPLORER_URL','http://127.0.0.1:8010');passed=[]
def check(name,value=True):
 assert value,name
 passed.append(name);print('PASS',name,flush=True)
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
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);ctx=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference');page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/?test',wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').click()
 angle=page.evaluate('__explorer.controls.view.angle');page.mouse.move(700,700);page.mouse.down();page.mouse.move(800,730,steps=5);page.mouse.up();check('Desktop left drag rotates',page.evaluate('__explorer.controls.view.angle')!=angle and page.evaluate('__explorer.controls.view.panX===0'))
 angle=page.evaluate('__explorer.controls.view.angle');page.mouse.down(button='middle');page.mouse.move(700,680,steps=5);page.mouse.up(button='middle');check('Desktop middle drag pans',page.evaluate('(a)=>__explorer.controls.view.angle===a&&__explorer.controls.view.panX!==0&&__explorer.controls.view.panY!==0',angle))
 def solve():
  kind=page.locator('#arcade').get_attribute('data-game')
  if kind=='water':
   page.evaluate('Math.random=()=>.5');canvas=page.locator('.water-board');r=canvas.bounding_box();page.mouse.move(r['x']+r['width']/2,r['y']+r['height']*.7);page.wait_for_function('!__explorer.arcade.activeState||__explorer.arcade.activeState.score>=10',timeout=25000)
  elif kind=='shoot':
   for _ in range(10):page.locator('.shoot-target').click()
  elif kind=='blocks':
   page.locator('[data-piece="1"]').click();page.locator('[data-direction="↑"]').click();page.locator('[data-piece="2"]').click();page.locator('[data-direction="↓"]').click();page.locator('[data-direction="↓"]').click();page.locator('[data-piece="0"]').click()
   for _ in range(4):page.locator('[data-direction="→"]').click()
  elif kind=='tic':
   for _ in range(5):
    if not page.locator('.tic-board button').count():break
    state=tuple(page.locator('.tic-board button').evaluate_all('(bs)=>bs.map(b=>b.textContent==="·"?"":b.textContent)'));options=[]
    for i,v in enumerate(state):
     if not v:s=list(state);s[i]='○';options.append((minimax(tuple(s),'×'),i))
    page.locator(f'[data-square="{max(options)[1]}"]').click()
  else:raise AssertionError(kind)
  return kind
 for shop in range(1,11):
  page.evaluate('(id)=>{const w=__explorer.world,p=w.buildings[id-1].entry;w.player.position.set(p.x,0,p.z)}',shop);page.wait_for_selector('#arcade:not([hidden])');check(f'{shop} automatic two-game and food preview',page.locator('.arcade-plan li').count()==2 and page.locator('#arcade-reward-image').is_visible());page.locator('#arcade-begin').click();kind=solve();page.wait_for_selector('#arcade-next');check(f'{shop} actual {kind} stage one saved',page.evaluate('(id)=>__explorer.campaign.count(id)===1&&!__explorer.campaign.visited.has(id)',shop));page.locator('#arcade-next').click();kind=solve();page.wait_for_selector('#reward:not([hidden])');check(f'{shop} actual {kind} awards food and celebration',page.evaluate('(id)=>__explorer.campaign.count(id)===2&&__explorer.celebration.activeShop===id',shop));page.locator('#reward-done').click();page.wait_for_timeout(200);check(f'{shop} close does not reopen completed game',page.locator('#arcade').is_hidden())
 check('Twenty games and ten foods complete',page.locator('#task-count').inner_text()=='20' and page.locator('#count').inner_text()=='10');page.reload(wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');check('Arcade progress persists',page.locator('#count').inner_text()=='10');ctx.close()
 mobile=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(BASE+'/?test',wait_until='networkidle');m.wait_for_function('document.body.dataset.ready==="true"');m.locator('#start-adventure').tap();cdp=mobile.new_cdp_session(m)
 def touch(points):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':points[0][0],'y':points[0][1],'id':1}]})
  for x,y in points[1:]:cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y,'id':1}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 angle=m.evaluate('__explorer.controls.view.angle');touch([(120+i*8,460+i*3) for i in range(14)]);check('Mobile straight drag pans without rotation',m.evaluate('(a)=>__explorer.controls.view.angle===a&&__explorer.controls.view.panX!==0',angle));m.locator('#center-camera').tap();angle=m.evaluate('__explorer.controls.view.angle');touch([(200+45*math.cos(i*math.pi/12),480+45*math.sin(i*math.pi/12)) for i in range(25)]);check('Mobile circle rotates and restores pan offset',m.evaluate('(a)=>Math.abs(__explorer.controls.view.angle-a)>2&&__explorer.controls.view.panX===0&&__explorer.controls.view.panY===0',angle))
 m.evaluate('const w=__explorer.world,p=w.buildings[0].entry;w.player.position.set(p.x,0,p.z)');m.wait_for_selector('#arcade:not([hidden])');m.locator('#arcade-begin').tap();m.evaluate('Math.random=()=>.5');canvas=m.locator('.water-board');r=canvas.bounding_box();m.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']*.7);m.wait_for_selector('#arcade-next',timeout=25000);check('Mobile cup catches ten real drops using touch');m.locator('#arcade-close').tap();m.wait_for_timeout(300);check('Closing prompt does not immediately trap mobile player',m.locator('#arcade').is_hidden())
 for width,height in [(320,568),(844,390)]:
  m.set_viewport_size({'width':width,'height':height});m.locator('#interact').tap();check(f'Game dialog fits {width}x{height}',m.evaluate('document.documentElement.scrollWidth===innerWidth') and m.locator('#arcade').evaluate('e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().bottom<=innerHeight+1'));m.locator('#arcade-close').tap()
 check('No application errors',not errors);print(json.dumps({'passed':len(passed),'errors':errors}));b.close()
