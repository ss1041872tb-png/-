import { shops } from './data.js?v=2.0.0';
import { createUI } from './ui.js?v=2.0.0';
import { createControls } from './controls.js?v=2.0.0';
import { createNavigation } from './navigation.js?v=2.0.0';
import { createCampaign } from './campaign.js?v=2.0.0';
import { createSound } from './sound.js?v=2.0.0';
import { createChallenges } from './challenges.js?v=2.0.0';
const loading=document.getElementById('loading');
function fail(message){loading.hidden=true;document.getElementById('error').hidden=false;document.getElementById('error-message').textContent=message;}
document.getElementById('retry').addEventListener('click',()=>location.reload());
const campaign=createCampaign(),sound=createSound();let controls,worldInstance,navigation,challenges,graphicsAvailable=true,sceneDirty=true;
function requestShop(shop){sound.play('click');if(!worldInstance||!graphicsAvailable){ui.showShop(shop,false);return;}const b=worldInstance.buildings[shop.id-1],p=worldInstance.player.position,unlocked=campaign.unlocked(shop.id),point=unlocked?b.entry:b.approach,distance=Math.hypot(point.x-p.x,point.z-p.z);navigation.select(shop.id);
 if(distance>(unlocked?1:3.8)){ui.close();ui.toast(unlocked?'小橋已打開，請走到招牌前收藏美食。':'先走到這家店前的金色路標，再按 E 或「開始闖關」。');controls.focusPlayer();return;}
 if(unlocked)ui.showShop(shop,true);else challenges.open(shop);
}
const ui=createUI(shops,paused=>{controls?.setPaused(paused||!graphicsAvailable);sceneDirty=true;},p=>{worldInstance?.setPreferences(p);sceneDirty=true;},{campaign,sound,requestShop});
const timeout=setTimeout(()=>fail('載入時間較長，請確認網站檔案完整並重新載入。'),20000);
try{
 const {createWorld}=await import('./world.js?v=2.0.0');const world=createWorld(document.getElementById('world'),shops);worldInstance=world;world.setPreferences(ui.preferences);world.setQuestProgress(campaign.stages);
 function nearestAction(){const p=world.player.position;return world.buildings.map(b=>{const unlocked=campaign.unlocked(b.shop.id),point=unlocked?b.entry:b.approach;return {b,unlocked,distance:Math.hypot(p.x-point.x,p.z-point.z)};}).filter(o=>o.distance<(o.unlocked?1:3.8)).sort((a,b)=>a.distance-b.distance)[0];}
 controls=createControls(world,{select:requestShop,interact:()=>{const action=nearestAction();if(action)requestShop(action.b.shop);else ui.toast('走近店前的金色路標，才能開始街角任務。');}});controls.setPaused(ui.paused);
 challenges=createChallenges(campaign,ui,sound,world);navigation=createNavigation(world,ui,campaign,requestShop);
 campaign.subscribe(reason=>{sceneDirty=true;world.setQuestProgress(campaign.stages);if(reason==='reset'){controls.clear();world.player.position.set(world.spawn.x,0,world.spawn.z);controls.view.follow=false;controls.view.distance=136;world.updateCamera(controls.view,true);}});world.updateCamera(controls.view,true);
 const interact=document.getElementById('interact');interact.addEventListener('click',()=>{const action=nearestAction();if(action)requestShop(action.b.shop);});
 world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsAvailable=false;controls.setPaused(true);document.getElementById('navigator').hidden=true;interact.hidden=true;fail('3D 顯示連線中斷，請重新載入。護照仍可查閱店家資料，但不會略過關卡集章。');});
 window.addEventListener('resize',()=>{world.resize();world.updateCamera(controls.view,true);sceneDirty=true;});
 let previous=performance.now(),elapsed=0,lastAction=-1,lastTraffic=0;
 function animate(now){requestAnimationFrame(animate);if(ui.preferences.powerSaving&&now-previous<1000/30)return;const dt=Math.min((now-previous)/1000,.04);previous=now;elapsed+=dt;
  if(!document.hidden&&graphicsAvailable){const keys=controls.keys;let x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));let didMove=false;
   if(!ui.paused&&(x||z)){const n=Math.hypot(x,z);x=x/n*dt*7;z=z/n*dt*7;const p=world.player.position,oldX=p.x,oldZ=p.z;const clear=(nx,nz)=>world.canStand(nx,nz)&&!world.npcs.some(n=>Math.hypot(nx-n.g.position.x,nz-n.g.position.z)<.95);if(clear(p.x+x,p.z))p.x+=x;if(clear(p.x,p.z+z))p.z+=z;didMove=p.x!==oldX||p.z!==oldZ;world.player.rotation.y=Math.atan2(x,z);if(didMove)sound.play('step');}
   world.walk(world.player,didMove&&!ui.preferences.reducedMotion,elapsed);navigation.update(elapsed);
   if(!ui.preferences.reducedMotion&&!ui.paused){world.updateNPCs(dt,elapsed);world.updateTraffic(dt);}
   if(elapsed-lastTraffic>5&&!ui.paused&&world.vehicles.some(v=>Math.hypot(v.g.position.x-world.player.position.x,v.g.position.z-world.player.position.z)<8)){sound.play('car');lastTraffic=elapsed;}
   const action=nearestAction(),id=action?.b.shop.id||0,actionKey=`${id}/${campaign.count(id)}`;interact.hidden=ui.paused||!action;if(actionKey!==lastAction){lastAction=actionKey;if(action)interact.textContent=action.unlocked?`✦ 點招牌・${action.b.shop.name}`:`E｜${action.b.shop.name}・闖關 ${campaign.count(id)}/3`;}
   if(!ui.paused||sceneDirty){world.updateCamera(controls.view,ui.preferences.reducedMotion);world.setSigns(campaign.visited,controls.hovered);world.renderer.render(world.scene,world.camera);sceneDirty=false;}
  }
 }
 world.renderer.render(world.scene,world.camera);clearTimeout(timeout);loading.hidden=true;document.getElementById('error').hidden=true;document.body.dataset.ready='true';requestAnimationFrame(animate);
 if(new URLSearchParams(location.search).has('test'))window.__explorer={world,controls,ui,shops,navigation,campaign,challenges,sound};
}catch(error){clearTimeout(timeout);graphicsAvailable=false;console.error('巷弄冒險載入失敗',error);fail('無法建立 3D 街區。請使用支援 WebGL 的瀏覽器。美食護照仍可查閱店家，但無法進行闖關。');}
