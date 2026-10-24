import os,json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('EXPLORER_URL','http://127.0.0.1:8008');checks=[]
def check(name,value=True):
 assert value,name
 checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/?test',wait_until='networkidle');page.wait_for_function('document.body.dataset.ready==="true"');page.locator('#start-adventure').click()
 def clickmesh(expr):
  pos=page.evaluate('''expr=>{const w=__explorer.world,m=eval(expr);__explorer.interior.scene.updateMatrixWorld(true);const v=m.getWorldPosition(w.player.position.clone()).project(w.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2,pick:w.pick((v.x+1)*innerWidth/2,(1-v.y)*innerHeight/2)}}''',expr)
  page.touchscreen.tap(pos['x'],pos['y'])
 for id in range(1,2):
  page.evaluate('(id)=>{const w=__explorer.world,p=w.buildings[id-1].entry;w.player.position.set(p.x,0,p.z)}',id);page.wait_for_function('(id)=>__explorer.interior.active?.id===id',arg=id)
  page.locator('#hud-collapse').tap()
  # Position near the physical cabinet for ray-based inspection; no campaign mutation.
  page.evaluate('const w=__explorer.world,t=__explorer.interior.targets.find(t=>t.correct);w.player.position.set(t.x,0,t.z+2.5)');name=page.evaluate('__explorer.interior.targets.find(t=>t.correct).name');page.get_by_role('button',name=name,exact=True).click();page.wait_for_selector('#inspection:not([hidden])');clickmesh('__explorer.interior.targets.find(t=>t.correct).door.children[0]');check(f'{id} locked second stage',page.evaluate('__explorer.campaign.count(__explorer.interior.active.id)===0'));page.locator('#inspection-close').click()
  page.evaluate('__explorer.world.player.position.set(0,0,-3)');page.mouse.move(min(900,page.viewport_size["width"]-20),600);page.mouse.wheel(0,1000);page.wait_for_function('__explorer.world.camera.fov>70');page.get_by_role('button',name='牆上價目表',exact=True).click()
  digit=page.evaluate('(id)=>[6,3,8,2,7,4,9,5,1,0][id-1]',id)
  wrong=page.evaluate('(d)=>__explorer.interior.targets.find(t=>t.menu).digits.findIndex(m=>m.userData.search.digit!==d)',digit);clickmesh(f'__explorer.interior.targets.find(t=>t.menu).digits[{wrong}]');check(f'{id} rejects wrong digit',page.evaluate('(id)=>__explorer.campaign.count(id)===0',id))
  right=page.evaluate('(d)=>__explorer.interior.targets.find(t=>t.menu).digits.findIndex(m=>m.userData.search.digit===d)',digit);clickmesh(f'__explorer.interior.targets.find(t=>t.menu).digits[{right}]');page.wait_for_function('(id)=>__explorer.campaign.has(id,0)',arg=id);check(f'{id} key shown in information panel',page.locator('#hunt-items img').count()==1);page.locator('#inspection-close').click()
  page.evaluate('const w=__explorer.world,t=__explorer.interior.targets.find(t=>t.correct);w.player.position.set(t.x,0,t.z+2.5)');page.get_by_role('button',name=name,exact=True).click();clickmesh('__explorer.interior.targets.find(t=>t.correct).door.children[0]');page.wait_for_function('__explorer.interior.openAmount>.95');check(f'{id} furniture physically opens',page.evaluate('const t=__explorer.interior.targets.find(t=>t.correct);t.drawer?t.door.position.z>t.z+1.5:t.door.rotation.y<-1'))
  clickmesh('__explorer.interior.targets.find(t=>t.correct).treasure');page.wait_for_selector('#reward:not([hidden])');check(f'{id} linked chain awards food',page.evaluate('(id)=>__explorer.campaign.unlocked(id)',id));page.locator('#reward-done').click();page.locator('#hud-collapse').tap();page.locator('#hunt-exit').click();page.wait_for_timeout(1050)
 assert not errors,errors
 print('PASS phone actual touch: numeric clue, illustrated key, opening drawer and recipe reward');b.close()
