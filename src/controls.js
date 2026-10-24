export function createControls(world,callbacks){
 const canvas=world.renderer.domElement,keys=new Set(),stick={x:0,z:0};
 const view={angle:.48,pitch:.8,lookPitch:0,distance:136,follow:false,firstPerson:false,panX:0,panY:0,zoom:1};
 // Keep a held direction in world space while the chase camera turns behind it.
 // Recomputing from the moving camera every frame would make A/S/D walk in circles.
 let moveBasis=null,followTarget=null,lookUntil=0;
 function movement(x,z){
  if(!x&&!z){moveBasis=null;return{x:0,z:0};}
  if(moveBasis===null||view.firstPerson)moveBasis=view.angle;
  const length=Math.max(1,Math.hypot(x,z));x/=length;z/=length;
  return{x:x*Math.cos(moveBasis)+z*Math.sin(moveBasis),z:-x*Math.sin(moveBasis)+z*Math.cos(moveBasis)};
 }
 function followMovement(x,z,moved,dt,reduced){
  if(view.firstPerson||!view.follow)return;
  if(pointer?.moved||performance.now()<lookUntil){followTarget=null;return;}
  if(moved)followTarget=Math.atan2(x,z)-Math.PI;
  if(followTarget===null)return;
  const delta=Math.atan2(Math.sin(followTarget-view.angle),Math.cos(followTarget-view.angle));
  const step=reduced?delta:Math.max(-dt*2,Math.min(dt*2,delta*(1-Math.exp(-dt*4))));
  view.angle+=step;
  if(Math.abs(delta)<.001)followTarget=null;
 }
 let paused=false,pointer=null,hovered=null,pinch=0,gesture=false,stickId=null;const pointers=new Map(),joystick=document.getElementById('joystick'),thumb=document.getElementById('joystick-thumb'),label=document.getElementById('hover-label');
 function clear(){moveBasis=null;followTarget=null;lookUntil=0;keys.clear();pointer=null;for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();pinch=0;gesture=false;if(stickId!==null&&joystick.hasPointerCapture(stickId))joystick.releasePointerCapture(stickId);stickId=null;stick.x=stick.z=0;thumb.style.transform='translate(0,0)';hovered=null;label.hidden=true;}
 function focusPlayer(){if(!view.follow){view.follow=true;view.distance=36;view.panX=view.panY=0;world.updateCamera(view,true);}document.body.classList.add('exploring');}
 const movementKeys=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright']);
 window.addEventListener('keydown',e=>{if(!movementKeys.has(e.key.toLowerCase())||paused||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;e.preventDefault();focusPlayer();keys.add(e.key.toLowerCase());});window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(!keys.size&&!stick.x&&!stick.z)moveBasis=null;});window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 function separation(){const a=[...pointers.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
 canvas.addEventListener('pointerdown',e=>{if(e.button===1){e.preventDefault();return;}if(paused||e.button!==0)return;e.preventDefault();document.body.classList.add('exploring');pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size>1){pointer=null;gesture=true;pinch=separation();return;}pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.focus({preventScroll:true});});
 canvas.addEventListener('pointermove',e=>{if(paused)return;if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){const distance=separation();if(pinch>0&&distance>0)view.zoom=Math.max(.65,Math.min(2.5,view.zoom*distance/pinch));pinch=distance;return;}if(gesture)return;if(pointer?.id===e.pointerId){const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>5)pointer.moved=true;if(pointer.moved){focusPlayer();const turn=-dx*.005;view.angle+=turn;if(moveBasis!==null)moveBasis+=turn;followTarget=null;lookUntil=performance.now()+1000;if(view.firstPerson)view.lookPitch=Math.max(-1.05,Math.min(.9,view.lookPitch-dy*.004));else view.pitch=Math.max(.35,Math.min(1.15,view.pitch+dy*.004));label.hidden=true;hovered=null;}pointer.x=e.clientX;pointer.y=e.clientY;}else if(e.pointerType!=='touch'){hovered=world.pick(e.clientX,e.clientY);canvas.style.cursor=hovered?'pointer':'grab';label.hidden=!hovered;if(hovered){label.textContent=hovered.name+' ↗';label.style.left=`${Math.max(8,Math.min(innerWidth-245,e.clientX+15))}px`;label.style.top=`${Math.min(innerHeight-55,e.clientY+18)}px`;}}});
 function release(e){const clicked=pointer?.id===e.pointerId&&!pointer.moved&&!gesture;pointers.delete(e.pointerId);if(pointer?.id===e.pointerId)pointer=null;if(pointers.size<2)pinch=0;if(!pointers.size)gesture=false;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(clicked&&!paused){const shop=world.pick(e.clientX,e.clientY);if(shop)callbacks.select(shop);}}
 canvas.addEventListener('auxclick',e=>e.preventDefault());canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',clear);canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(pointer?.id===e.pointerId)pointer=null;if(!pointers.size){gesture=false;pinch=0;}});canvas.addEventListener('wheel',e=>{if(paused)return;e.preventDefault();view.zoom=Math.max(.65,Math.min(2.5,view.zoom*Math.exp(-e.deltaY*.0015)));},{passive:false});
 function updateStick(e){const r=joystick.getBoundingClientRect(),radius=r.width*.34,dx=e.clientX-r.x-r.width/2,dy=e.clientY-r.y-r.height/2,len=Math.hypot(dx,dy),scale=Math.min(1,radius/(len||1));const nx=dx*scale/radius,nz=dy*scale/radius;stick.x=Math.abs(nx)<.12?0:nx;stick.z=Math.abs(nz)<.12?0:nz;thumb.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
 joystick.addEventListener('pointerdown',e=>{if(paused||stickId!==null)return;e.preventDefault();focusPlayer();stickId=e.pointerId;joystick.setPointerCapture(e.pointerId);updateStick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e);});for(const kind of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(kind,e=>{if(e.pointerId!==stickId)return;stickId=null;stick.x=stick.z=0;if(!keys.size)moveBasis=null;thumb.style.transform='translate(0,0)';});
 function syncMode(){const b=document.getElementById('camera-mode');b.textContent=view.firstPerson?'第三人稱':'第一人稱';b.setAttribute('aria-pressed',String(view.firstPerson));}
 document.getElementById('camera-mode').addEventListener('click',()=>{clear();focusPlayer();view.firstPerson=!view.firstPerson;view.lookPitch=0;view.zoom=1;view.panX=view.panY=0;if(view.firstPerson)world.ensureSafePosition();world.updateCamera(view,true);syncMode();});
 document.getElementById('center-camera').addEventListener('click',()=>{clear();focusPlayer();view.distance=36;view.pitch=.8;view.lookPitch=0;view.zoom=1;if(!view.firstPerson)view.angle=world.player.rotation.y-Math.PI;world.updateCamera(view,true);});
 document.getElementById('reset-view').addEventListener('click',()=>{clear();Object.assign(view,{angle:.48,pitch:.8,lookPitch:0,distance:136,follow:false,firstPerson:false,panX:0,panY:0,zoom:1});world.player.position.set(world.spawn.x,0,world.spawn.z);world.updateCamera(view,true);document.body.classList.remove('exploring');syncMode();});document.getElementById('start-adventure').addEventListener('click',focusPlayer);
 return {keys,stick,view,clear,focusPlayer,movement,followMovement,get hovered(){return hovered;},setPaused(value){paused=value;clear();}};
}
