import { createArcade } from './arcade.js?v=6.0.0';
import { createCelebration } from './celebration.js?v=6.0.0';
import { shops } from './data.js?v=6.0.0';
import { createUI } from './ui.js?v=6.0.0';
import { createControls } from './controls.js?v=6.0.0';
import { createNavigation } from './navigation.js?v=6.0.0';
import { createCampaign } from './campaign.js?v=6.0.0';
import { createSound } from './sound.js?v=6.0.0';
import { createReward } from './reward.js?v=6.0.0';
const loading=document.getElementById('loading');
function fail(message){loading.hidden=true;document.getElementById('error').hidden=false;document.getElementById('error-message').textContent=message;}
document.getElementById('retry').addEventListener('click',()=>location.reload());
const campaign=createCampaign(),sound=createSound();let controls,worldInstance,navigation,arcade,graphicsAvailable=true,sceneDirty=true;
function requestShop(shop){sound.play('click');if(!worldInstance||!graphicsAvailable){ui.showShop(shop,false);return;}navigation.select(shop.id);if(Math.hypot(worldInstance.player.position.x-worldInstance.buildings[shop.id-1].entry.x,worldInstance.player.position.z-worldInstance.buildings[shop.id-1].entry.z)<3.4){if(campaign.unlocked(shop.id))ui.showShop(shop,false);else arcade.open(shop);return;}ui.close();controls.focusPlayer();ui.toast('跟著路標走到店門口，就會自動顯示遊戲關卡與獎勵美食。');}
const ui=createUI(shops,paused=>{controls?.setPaused(paused||!graphicsAvailable);sceneDirty=true;},p=>{worldInstance?.setPreferences(p);sceneDirty=true;},{campaign,sound,requestShop});
const celebration=createCelebration(sound,ui.preferences),reward=createReward(ui,celebration);
const timeout=setTimeout(()=>fail('載入時間較長，請確認網站檔案完整並重新載入。'),20000);
try{
 const {createWorld}=await import('./world.js?v=6.0.0');const world=createWorld(document.getElementById('world'),shops);worldInstance=world;world.setPreferences(ui.preferences);arcade=createArcade(campaign,ui,sound,reward);
 function nearestDoor(){const p=world.player.position;return world.buildings.map(b=>({b,distance:Math.hypot(p.x-b.entry.x,p.z-b.entry.z)})).filter(o=>o.distance<3.4).sort((a,b)=>a.distance-b.distance)[0];}
 function interact(){const door=nearestDoor();if(door){if(campaign.unlocked(door.b.shop.id))ui.showShop(door.b.shop,false);else arcade.open(door.b.shop);}}
 controls=createControls(world,{select:requestShop,interact});controls.setPaused(ui.paused);navigation=createNavigation(world,ui,campaign,requestShop);
 campaign.subscribe(reason=>{sceneDirty=true;if(reason==='reset'){reward.cancel();celebration.clear();arcade.clean();controls.clear();world.player.position.set(world.spawn.x,0,world.spawn.z);controls.view.follow=false;controls.view.distance=136;world.updateCamera(controls.view,true);}});world.updateCamera(controls.view,true);
 document.getElementById('reset-view').addEventListener('click',()=>{arcade.clean();world.player.position.set(world.spawn.x,0,world.spawn.z);Object.assign(controls.view,{follow:false,distance:136,angle:.48,pitch:.95});world.updateCamera(controls.view,true);});
 const actionButton=document.getElementById('interact'),doorHint=document.getElementById('door-hint');actionButton.addEventListener('click',interact);
 world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsAvailable=false;controls.setPaused(true);document.getElementById('navigator').hidden=true;actionButton.hidden=true;fail('3D 顯示連線中斷，請重新載入。已完成的關卡與美食進度仍會保留。');});
 window.addEventListener('resize',()=>{world.resize();world.updateCamera(controls.view,true);sceneDirty=true;});
 let previous=performance.now(),elapsed=0,lastTraffic=0,lastDoor=0,lastAction='';
 function animate(now){requestAnimationFrame(animate);if(ui.preferences.powerSaving&&now-previous<1000/30)return;const dt=Math.min((now-previous)/1000,.04);previous=now;elapsed+=dt;
  if(!document.hidden&&graphicsAvailable){const keys=controls.keys;let x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));let didMove=false;
   if(!ui.paused&&(x||z)){const n=Math.hypot(x,z),m=world.camera.matrixWorld.elements,rn=Math.hypot(m[0],m[2])||1,rx=m[0]/rn,rz=m[2]/rn,speed=7,dx=(x*rx-z*rz)/n*dt*speed,dz=(x*rz+z*rx)/n*dt*speed;x=dx;z=dz;const p=world.player.position,oldX=p.x,oldZ=p.z;const clear=(nx,nz)=>world.canStand(nx,nz);if(clear(p.x+x,p.z))p.x+=x;if(clear(p.x,p.z+z))p.z+=z;didMove=p.x!==oldX||p.z!==oldZ;world.player.rotation.y=Math.atan2(x,z);if(didMove)sound.play('step');}
   world.walk(world.player,didMove&&!ui.preferences.reducedMotion,elapsed);
   if(!ui.paused){const door=nearestDoor();doorHint.hidden=true;if(!door){lastDoor=0;}else if(lastDoor!==door.b.shop.id){lastDoor=door.b.shop.id;if(!campaign.unlocked(door.b.shop.id))arcade.open(door.b.shop);}}
   navigation.update(elapsed);
   if(!ui.preferences.reducedMotion&&!ui.paused){world.updateNPCs(dt,elapsed);world.updateTraffic(dt);}
   if(elapsed-lastTraffic>5&&!ui.paused&&world.vehicles.some(v=>Math.hypot(v.g.position.x-world.player.position.x,v.g.position.z-world.player.position.z)<8)){sound.play('car');lastTraffic=elapsed;}
   const door=nearestDoor();actionButton.hidden=ui.paused||!door;actionButton.textContent=door?(campaign.unlocked(door.b.shop.id)?'查看已收藏美食':'開啟兩關挑戰'):'';
   if(!ui.paused||sceneDirty){world.updateCamera(controls.view,ui.preferences.reducedMotion);world.setSigns(campaign.visited,controls.hovered);world.renderer.render(world.scene,world.camera);sceneDirty=false;}

  }
 }
 clearTimeout(timeout);loading.hidden=true;document.getElementById('error').hidden=true;document.body.dataset.ready='true';requestAnimationFrame(animate);
 if(new URLSearchParams(location.search).has('test'))window.__explorer={world,controls,ui,shops,navigation,campaign,arcade,sound,celebration,reward};
}catch(error){clearTimeout(timeout);graphicsAvailable=false;console.error('街角遊戲載入失敗',error);fail('無法建立 3D 街區。請使用支援 WebGL 的瀏覽器。收集箱仍可查閱店家資料，無法略過關卡獲得美食。');}
