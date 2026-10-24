import os,json,time,heapq
from collections import deque
from functools import lru_cache
from playwright.sync_api import sync_playwright
BASE=os.getenv('EXPLORER_URL','http://127.0.0.1:8011');passed=[]
def check(n,v=True):
 assert v,n
 passed.append(n);print('PASS',n,flush=True)
lines=[(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
@lru_cache(None)
def minimax(s,t):
 for m,v in [('○',1),('×',-1)]:
  if any(all(s[i]==m for i in l) for l in lines):return v
 if all(s):return 0
 scores=[]
 for i,v in enumerate(s):
  if not v:a=list(s);a[i]=t;scores.append(minimax(tuple(a),'×' if t=='○' else '○'))
 return (max if t=='○' else min)(scores)
def slider(start):
 goal=(1,2,3,4,5,6,7,8,0);q=[(0,0,start,[])];seen={start:0}
 while q:
  _,cost,s,path=heapq.heappop(q)
  if s==goal:return path
  z=s.index(0)
  for i in [z-3,z+3]+([z-1] if z%3 else [])+([z+1] if z%3<2 else []):
   if i<0 or i>=9:continue
   a=list(s);a[z],a[i]=a[i],a[z];a=tuple(a)
   if seen.get(a,999)<=cost+1:continue
   seen[a]=cost+1;h=sum(abs(j//3-(v-1)//3)+abs(j%3-(v-1)%3) for j,v in enumerate(a) if v);heapq.heappush(q,(cost+1+h,cost+1,a,path+[i]))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/?test',wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').click();check('Twenty distinct game types',page.evaluate('async()=>{const {plans}=await import("./src/campaign.js?v=6.0.0");return new Set(plans.flat()).size===20}') )
 def done():return page.locator('#arcade-next').count()>0 or page.locator('#reward').is_visible()
 def direction(label):page.locator(f'[data-direction="{label}"]').click()
 def solve(kind):
  if kind in ['water','galaga','breakout','rhythm','stack','runner','fishing','balance','orbit']:
   c=page.locator('.water-board');r=c.bounding_box();deadline=time.time()+100;last=0
   if kind=='water':page.evaluate('Math.random=()=>.5')
   while not done():
    assert time.time()<deadline,f'Timeout {kind}'
    s=page.evaluate('JSON.parse(JSON.stringify(__explorer.arcade.activeState))');x=200;tap=False
    if kind=='water':x=200
    elif kind=='galaga':
     alive=[e for e in s['enemies'] if e['alive']];e=max(alive,key=lambda e:e['y']) if alive else {'x':200};x=e['x'];tap=s['hp']<=0
    elif kind=='breakout':x=s['ball']['x']+15*math.sin(s.get('time',0)*1.7);tap=not s['launched']
    elif kind=='rhythm':tap=.44<s['phase']<.56
    elif kind=='stack':tap=abs(s['x']-s['baseX'])<min(8,s['width']/4)
    elif kind=='runner':tap=100<s['obstacle']<140 and s['y']>=239
    elif kind=='fishing':x=s['fish'];tap=not s['down']
    elif kind=='balance':x=200-(s['x']-200)*2-s['vx']*1.6
    elif kind=='orbit':tap=s['angle']<.2 or s['angle']>6.1
    x=max(20,min(380,x));px=r['x']+x/400*r['width'];py=r['y']+r['height']*.7;page.mouse.move(px,py)
    if tap and time.time()-last>.12:page.mouse.click(px,py);last=time.time()
    page.wait_for_timeout(25)
  elif kind=='tic':
   while not done():
    s=tuple(page.locator('.tic-board button').evaluate_all('(b)=>b.map(e=>e.textContent==="·"?"":e.textContent)'));opts=[]
    for i,v in enumerate(s):
     if not v:a=list(s);a[i]='○';opts.append((minimax(tuple(a),'×'),i))
    page.locator(f'[data-square="{max(opts)[1]}"]').click()
  elif kind=='blocks':
   page.locator('[data-piece="1"]').click();direction('↑');page.locator('[data-piece="2"]').click();direction('↓');direction('↓');page.locator('[data-piece="0"]').click()
   for _ in range(4):direction('→')
  elif kind=='memory':
   for a,b in [(0,6),(1,4),(2,7),(3,5)]:page.locator(f'[data-card="{a}"]').click();page.locator(f'[data-card="{b}"]').click()
  elif kind=='maze':
   s=page.evaluate('__explorer.arcade.activeState');q=deque([((0,0),[])]);seen={(0,0)}
   while q:
    (x,y),path=q.popleft()
    if (x,y)==(5,5):break
    for label,dx,dy in [('↑',0,-1),('←',-1,0),('↓',0,1),('→',1,0)]:
     nx=x+dx;ny=y+dy
     if 0<=nx<6 and 0<=ny<6 and s['rows'][ny][nx]=='0' and (nx,ny) not in seen:seen.add((nx,ny));q.append(((nx,ny),path+[label]))
   for label in path:direction(label)
  elif kind=='whack':
   while not done():page.get_by_role('button',name='🐹',exact=True).click()
  elif kind=='pipe':
   s=page.evaluate('__explorer.arcade.activeState')
   for i in s['route']:
    if done():break
    for _ in range(4):
     ports=page.evaluate('(i)=>__explorer.arcade.activeState.ports[i]',i)
     if sorted(ports)==sorted(s['required'][i]):break
     page.locator(f'[data-pipe="{i}"]').click()
     if done():break
  elif kind=='lights':
   for i in [0,4,8]:page.locator(f'[data-light="{i}"]').click()
  elif kind=='slide':
   s=tuple(page.evaluate('__explorer.arcade.activeState.cells'))
   for i in slider(s):page.locator(f'[data-tile="{i}"]').click()
  elif kind=='match3':
   while not done():
    page.get_by_role('button',name='重新洗牌（保留得分）').click();page.locator('[data-fruit="1"]').click();page.locator('[data-fruit="5"]').click()
  elif kind=='simon':
   for count in [2,3,4]:
    page.get_by_role('button',name='播放旋律',exact=True).click();page.wait_for_timeout(count*650+100)
    for i in [0,2,1,3][:count]:page.locator(f'[data-note="{i}"]').click()
  elif kind=='sokoban':
   for label in ['→','↓','→','↑']:direction(label)
  else:raise AssertionError(kind)
 import math
 for shop in range(1,11):
  page.evaluate('(id)=>{const w=__explorer.world,p=w.buildings[id-1].entry;w.player.position.set(p.x,0,p.z)}',shop);page.wait_for_selector('#arcade:not([hidden])');page.locator('#arcade-begin').click()
  for stage in range(2):
   kind=page.locator('#arcade').get_attribute('data-game');solve(kind);page.wait_for_function('(v)=>__explorer.campaign.count(v.id)===v.stage+1',arg={'id':shop,'stage':stage});check(f'{shop}.{stage+1} real {kind} completion')
   if stage==0:check('No early food',page.locator('#count').inner_text()==str(shop-1));page.locator('#arcade-next').click()
  page.wait_for_selector('#reward:not([hidden])');page.locator('#reward-done').click()
 check('Twenty distinct games and ten meals complete',page.locator('#count').inner_text()=='10' and page.locator('#task-count').inner_text()=='20');check('No runtime errors',not errors);print(json.dumps({'passed':len(passed),'errors':errors}));browser.close()
