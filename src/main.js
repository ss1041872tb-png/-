import { createCelebration } from './celebration.js?v=3.0.0';
import { shops } from './data.js?v=3.0.0';
import { createUI } from './ui.js?v=3.0.0';
import { createControls } from './controls.js?v=3.0.0';
import { createNavigation } from './navigation.js?v=3.0.0';
import { createCampaign, hunts } from './campaign.js?v=3.0.0';
import { createSound } from './sound.js?v=3.0.0';
import { createReward } from './reward.js?v=3.0.0';
const loading=document.getElementById('loading');
function fail(message){loading.hidden=true;document.getElementById('error').hidden=false;document.getElementById('error-message').textContent=message;}
document.getElementById('retry').addEventListener('click',()=>location.reload());
const campaign=createCampaign(),sound=createSound();let controls,worldInstance,navigation,interior,graphicsAvailable=true,sceneDirty=true;
function requestShop(shop){if(shop.kind==='search'){interior.inspect(shop);return;}sound.play('click');if(!worldInstance||!graphicsAvailable){ui.showShop(shop,false);return;}if(interior.active){if(interior.active.id===shop.id&&campaign.unlocked(shop.id))ui.showShop(shop,false);return;}
 navigation.select(shop.id);ui.close();controls.focusPlayer();ui.toast('跟著路標走到店門口，提示會自動出現；繼續往前走進店內。');
}
const ui=createUI(shops,paused=>{controls?.setPaused(paused||!graphicsAvailable);sceneDirty=true;},p=>{worldInstance?.setPreferences(p);sceneDirty=true;},{campaign,sound,requestShop});
const celebration=createCelebration(sound,ui.preferences),reward=createReward(ui,celebration);
const timeout=setTimeout(()=>fail('載入時間較長，請確認網站檔案完整並重新載入。'),20000);
try{
 const [{createWorld},{createInterior}]=await Promise.all([import('./world.js?v=3.0.0'),import('./interior.js?v=3.0.0')]);const world=createWorld(document.getElementById('world'),shops);worldInstance=world;world.setPreferences(ui.preferences);
 interior=createInterior(world,campaign,ui,sound,shop=>reward.show(shop));
 function nearestDoor(){const p=world.player.position;return world.buildings.map(b=>({b,distance:Math.hypot(p.x-b.entry.x,p.z-b.entry.z)})).filter(o=>o.distance<3.4).sort((a,b)=>a.distance-b.distance)[0];}
 function interact(){if(interior.active){const target=interior.nearest();if(target)interior.inspect(target);else ui.toast('走近家具，才能搜尋藏在裡面的物品。');}else{ui.toast('繼續往店門方向走，就會進入店內。');}}
 controls=createControls(world,{select:requestShop,interact});interior.setControls(controls);controls.setPaused(ui.paused);navigation=createNavigation(world,ui,campaign,requestShop);
 campaign.subscribe(reason=>{sceneDirty=true;if(reason==='reset'){reward.cancel();celebration.clear();interior.exit(true);controls.clear();world.player.position.set(world.spawn.x,0,world.spawn.z);controls.view.follow=false;controls.view.distance=136;world.updateCamera(controls.view,true);}else interior.refresh();});world.updateCamera(controls.view,true);
 document.getElementById('reset-view').addEventListener('click',()=>{interior.exit(true);world.player.position.set(world.spawn.x,0,world.spawn.z);Object.assign(controls.view,{follow:false,distance:136,angle:.48,pitch:.95});world.updateCamera(controls.view,true);});
 const actionButton=document.getElementById('interact'),doorHint=document.getElementById('door-hint');actionButton.addEventListener('click',interact);
 world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsAvailable=false;controls.setPaused(true);document.getElementById('navigator').hidden=true;actionButton.hidden=true;fail('3D 顯示連線中斷，請重新載入。已找到的物品與美食進度仍會保留。');});
 window.addEventListener('resize',()=>{world.resize();world.updateCamera(controls.view,true);sceneDirty=true;});
 let previous=performance.now(),elapsed=0,lastTraffic=0,lastDoor=0,lastAction='';
 function animate(now){requestAnimationFrame(animate);if(ui.preferences.powerSaving&&now-previous<1000/30)return;const dt=Math.min((now-previous)/1000,.04);previous=now;elapsed+=dt;
  if(!document.hidden&&graphicsAvailable){const keys=controls.keys;let x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));let didMove=false;
   if(!ui.paused&&(x||z)){const n=Math.hypot(x,z),m=world.camera.matrixWorld.elements,rn=Math.hypot(m[0],m[2])||1,rx=m[0]/rn,rz=m[2]/rn,speed=interior.active?4.6:7,dx=(x*rx-z*rz)/n*dt*speed,dz=(x*rz+z*rx)/n*dt*speed;x=dx;z=dz;const p=world.player.position,oldX=p.x,oldZ=p.z;const clear=(nx,nz)=>world.canStand(nx,nz)&&(interior.active||!world.npcs.some(n=>Math.hypot(nx-n.g.position.x,nz-n.g.position.z)<.95));if(clear(p.x+x,p.z))p.x+=x;if(clear(p.x,p.z+z))p.z+=z;didMove=p.x!==oldX||p.z!==oldZ;world.player.rotation.y=Math.atan2(x,z);if(didMove)sound.play('step');}
   world.walk(world.player,didMove&&!ui.preferences.reducedMotion,elapsed);
   if(!ui.paused){if(interior.active){interior.tick();doorHint.hidden=true;}else{const door=nearestDoor();doorHint.hidden=!door;if(door){if(lastDoor!==door.b.shop.id){lastDoor=door.b.shop.id;document.getElementById('door-title').textContent=`${door.b.shop.name} · 尋寶邀請`;document.getElementById('door-items').textContent=hunts[door.b.shop.id-1].map(i=>i.name).join(' ＋ ');}if(door.distance<1.05)interior.enter(door.b.shop);}else lastDoor=0;}}
   document.getElementById('navigator').hidden=!!interior.active;if(!interior.active)navigation.update(elapsed);
   if(!ui.preferences.reducedMotion&&!ui.paused&&!interior.active){world.updateNPCs(dt,elapsed);world.updateTraffic(dt);}
   if(elapsed-lastTraffic>5&&!ui.paused&&!interior.active&&world.vehicles.some(v=>Math.hypot(v.g.position.x-world.player.position.x,v.g.position.z-world.player.position.z)<8)){sound.play('car');lastTraffic=elapsed;}
   const action=interior.active?interior.nearest():null,key=action?`${action.kind}/${action.name}`:'';actionButton.hidden=ui.paused||!action;if(key!==lastAction){lastAction=key;if(action)actionButton.textContent=action.kind==='exit'?'🚪 走回街區':`E｜搜尋${action.name}`;}
   if(!ui.paused||sceneDirty){world.updateCamera(controls.view,ui.preferences.reducedMotion);if(!interior.active)world.setSigns(campaign.visited,controls.hovered);world.renderer.render(interior.active?interior.scene:world.scene,world.camera);sceneDirty=false;}
  }
 }
 clearTimeout(timeout);loading.hidden=true;document.getElementById('error').hidden=true;document.body.dataset.ready='true';requestAnimationFrame(animate);
 if(new URLSearchParams(location.search).has('test'))window.__explorer={world,controls,ui,shops,navigation,campaign,interior,sound,celebration,reward};
}catch(error){clearTimeout(timeout);graphicsAvailable=false;console.error('尋寶街區載入失敗',error);fail('無法建立 3D 街區。請使用支援 WebGL 的瀏覽器。收集箱仍可查閱店家資料，無法略過尋寶獲得美食。');}
