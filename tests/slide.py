"""Real mouse/touch regressions for the number puzzle, hints and saved rewards."""
import os,json
from pathlib import Path
from collections import deque
from playwright.sync_api import sync_playwright
BASE=os.getenv('EXPLORER_URL','http://127.0.0.1:8000');SINGLE=os.getenv('EXPLORER_SINGLE')=='1';passed=[]
def check(name,value=True):
 assert value,name
 passed.append(name);print('PASS',name,flush=True)
def shortest(start):
 q=deque([(tuple(start),[])]);seen={tuple(start)}
 while q:
  cells,path=q.popleft()
  if cells==(1,2,3,4,5,6,7,8,0):return path
  blank=cells.index(0)
  for tile in range(9):
   if abs(tile//3-blank//3)+abs(tile%3-blank%3)!=1:continue
   nxt=list(cells);nxt[tile],nxt[blank]=nxt[blank],nxt[tile];nxt=tuple(nxt)
   if nxt not in seen:seen.add(nxt);q.append((nxt,path+[tile]))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);errors=[];external=[]
 for phone in ([False] if SINGLE else [False,True]):
  context=browser.new_context(viewport={'width':390 if phone else 1280,'height':844 if phone else 900},has_touch=phone,is_mobile=phone);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  if SINGLE:
   page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
   page.evaluate("()=>{window.URLSearchParams=class extends URLSearchParams{has(n){return n==='test'||super.has(n)}}}")
   page.set_content((Path(__file__).resolve().parents[1]/'dist/zhonghe-food-explorer-preview.html').read_text(),wait_until='load')
  else:page.goto(BASE+'/?test',wait_until='networkidle')
  page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').click();page.evaluate('__explorer.ui.preferences.reducedMotion=true')
  def click(selector):getattr(page.locator(selector),'tap' if phone else 'click')()
  def cells():return page.evaluate('__explorer.arcade.activeState.cells.slice()')
  def button(name):getattr(page.get_by_role('button',name=name,exact=True),'tap' if phone else 'click')()
  def enter():
   page.evaluate('const w=__explorer.world,p=w.buildings[6].entry;w.player.position.set(p.x,0,p.z)');page.wait_for_selector('#arcade:not([hidden])');click('#arcade-begin');page.wait_for_selector('.slide-board')
  enter();prefix='Phone' if phone else 'Desktop';initial=cells();route=shortest(initial)
  check(prefix+': original board has a legal 12-step solution',len(route)==12)
  check(prefix+': target arrangement and touch-sized tiles are readable',page.locator('.slide-goal').is_visible() and page.locator('[data-tile="0"]').bounding_box()['width']>=48)
  blank=initial.index(0);legal=[i for i in range(9) if abs(i//3-blank//3)+abs(i%3-blank%3)==1]
  check(prefix+': only adjacent tiles are enabled, including no row-wrap',page.locator('.slide-board button').evaluate_all('(es)=>es.flatMap((e,i)=>e.disabled?[]:[i])')==legal)
  # Dispatch an invalid activation too: the move handler must reject it.
  bad=next(i for i in range(9) if i not in legal and i!=blank);page.locator(f'[data-tile="{bad}"]').dispatch_event('click');check(prefix+': invalid move leaves the board and progress untouched',cells()==initial and page.evaluate('__explorer.campaign.count(7)===0'))
  click(f'[data-tile="{route[0]}"]');button('復原一步');check(prefix+': undo restores the exact board',cells()==initial)
  click(f'[data-tile="{route[0]}"]');button('重新開始');check(prefix+': restart restores a solvable board and clears undo',cells()==initial and page.get_by_role('button',name='復原一步',exact=True).is_disabled())
  button('提示下一步');page.wait_for_selector('.slide-hint');check(prefix+': hint marks one legal tile without awarding progress',page.locator('.slide-hint').count()==1 and page.evaluate('__explorer.campaign.count(7)===0'))
  if SINGLE:page.locator('.slide-hint').scroll_into_view_if_needed();page.screenshot(path='/tmp/v68-slide-preview.png')
  click('#arcade-close');check(prefix+': leaving cancels the game without awarding progress',page.evaluate('__explorer.arcade.activeState===null&&__explorer.campaign.count(7)===0'))
  click('#interact');click('#arcade-begin')
  if phone:
   steps=0
   while page.locator('.slide-board').count():
    assert steps<32,'Hints must reach the goal'
    current=cells();button('提示下一步');page.wait_for_selector('.slide-hint');tile=int(page.locator('.slide-hint').get_attribute('data-tile'));z=current.index(0)
    assert abs(tile//3-z//3)+abs(tile%3-z%3)==1
    click('.slide-hint');steps+=1
   check('Phone: repeated hint-and-tap reaches the goal in 12 legal moves',steps==12)
  else:
   for tile in shortest(cells()):click(f'[data-tile="{tile}"]')
   check('Desktop: actual number tile clicks reach the goal',page.locator('#arcade-next').is_visible())
  check(prefix+': sorting awards first stage only and saves it',page.evaluate('__explorer.campaign.count(7)===1&&__explorer.campaign.visited.size===0&&JSON.parse(localStorage.getItem("zhonghe-arcade-v6")).stages[6]===1') if not SINGLE else page.evaluate('__explorer.campaign.count(7)===1&&__explorer.campaign.visited.size===0'))
  click('#arcade-next');page.wait_for_selector('[data-fruit="1"]')
  for _ in range(3):
   button('重新洗牌（保留得分）');click('[data-fruit="1"]');click('[data-fruit="5"]')
  page.wait_for_selector('#reward:not([hidden])');check(prefix+': completing the real second game grants the meal and celebration',page.evaluate('__explorer.campaign.count(7)===2&&__explorer.campaign.visited.has(7)') and page.locator('#reward-food').is_visible());click('#reward-done')
  if not SINGLE:
   page.reload(wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');check(prefix+': completed meal persists after reload',page.evaluate('__explorer.campaign.stages.every((n,i)=>n===(i===6?2:0))'))
  if not phone and not SINGLE:
   result=page.evaluate('''async()=>{
    const {solveSlide,slideNeighbors}=await import('./src/slide-puzzle.js?v=6.8.0');
    const cells=[8,6,7,2,5,4,3,0,1],search=solveSlide(cells);let result,yields=0;
    do{result=search.next();if(!result.done){yields++;await new Promise(r=>setTimeout(r,0));}}while(!result.done);
    for(const tile of result.value){const z=cells.indexOf(0);if(!slideNeighbors(z).includes(tile))return false;[cells[tile],cells[z]]=[cells[z],cells[tile]];}
    return result.value.length===31&&cells.join('')==='123456780'&&yields>0;
   }''');check('Hardest 31-move board has a legal shortest hint path and yields to the browser',result)
  check(prefix+': responsive board does not overflow',page.evaluate('document.documentElement.scrollWidth===innerWidth'))
  context.close()
 if SINGLE:check('Standalone puzzle uses zero external requests',not external)
 check('No browser runtime errors',not errors);print(json.dumps({'passed':len(passed),'errors':errors}));browser.close()
