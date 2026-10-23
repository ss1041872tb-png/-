import * as THREE from '../vendor/three.module.js';
import { lots, bounds, spawn, road, branches, roadLength, roadAt, localPoint, toLocal, distanceToRoad } from './layout.js?v=2.1.0';
import { plans } from './campaign.js?v=2.1.0';

export function createWorld(container, shops) {
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b8d5d2');scene.fog=new THREE.Fog('#b8d5d2',160,290);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D 彎巷冒險；WASD 移動，E 在店前闖關，拖曳旋轉視角。');container.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,350);
 scene.add(new THREE.HemisphereLight('#fff0d2','#73948b',2));
 const sun=new THREE.DirectionalLight('#ffedc3',2.6);sun.position.set(-45,80,40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-80,right:80,top:75,bottom:-75,far:200});sun.shadow.normalBias=.06;scene.add(sun);
 const materials=new Map(),boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.IcosahedronGeometry(1,1);
 function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);}
 function box(w,h,d,color,x,y,z,parent=scene){const m=new THREE.Mesh(boxGeo,typeof color==='string'?mat(color):color);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function ball(r,color,x,y,z,parent=scene){const m=new THREE.Mesh(sphereGeo,mat(color));m.scale.setScalar(r);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 const obstacles=[];
 function obstacle(x,z,w,d,yaw=0){obstacles.push({x,z,w:w/2,d:d/2,yaw});}
 function localObstacle(lot,x,z,w,d){const p=localPoint(lot,x,z);obstacle(p.x,p.z,w,d,lot.yaw);}
 box(126,2.5,106,'#8daba0',0,-1.8,0);box(124,.35,104,'#a8c495',0,-.35,0);
 function ribbon(path,width,y,color){
  const vertices=[],indices=[],closed=path[0][0]===path.at(-1)[0]&&path[0][1]===path.at(-1)[1];
  for(let i=0;i<path.length;i++){
   const p=path[i],before=path[i-1]||(closed?path.at(-2):p),after=path[i+1]||(closed?path[1]:p);
   const dx=after[0]-before[0],dz=after[1]-before[1],length=Math.hypot(dx,dz)||1,nx=-dz/length,nz=dx/length;
   vertices.push(p[0]+nx*width/2,y,p[1]+nz*width/2,p[0]-nx*width/2,y,p[1]-nz*width/2);
   if(i){const n=i*2;indices.push(n-2,n,n-1,n-1,n,n+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,mat(color));mesh.receiveShadow=true;scene.add(mesh);
 }
 function drawRoad(path){ribbon(path,10.4,.1,'#d8cbb0');ribbon(path,6.8,.15,'#657b78');let carry=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);for(let t=carry;t<len;t+=4.5){box(1.3,.018,.1,'#f3d578',a[0]+dx*t/len,.18,a[1]+dz*t/len).rotation.y=-Math.atan2(dz,dx);}carry=(carry-len)%4.5;if(carry<0)carry+=4.5;}}
 drawRoad(road);branches.forEach(drawRoad);
 for(const [x,z,rotate] of [[-20,19,0],[-7,8,Math.PI/2],[4,-3,0],[26,-22,0],[53,12,0]])for(let n=-2;n<=2;n++){
  const stripe=box(5.3,.025,.5,'#f7edd1',x,.17,z+n*.95);if(rotate){stripe.position.set(x+n*.95,.17,z);stripe.rotation.y=rotate;}
 }
 const palette=['#e7aa79','#75aaa2','#edc46c','#c299b1','#77a6bb','#d98e75','#a4b66b','#cba489','#dcaa87','#789d92'];
 const signMeshes=[],buildings=[];
 function label(text,number,background='#24493f'){
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#ffe3a1';ctx.lineWidth=9;ctx.strokeRect(12,12,1000,232);ctx.fillStyle='#fff3d4';ctx.textAlign='center';ctx.textBaseline='middle';let size=82;do{ctx.font=`800 ${size--}px "Noto Sans TC",sans-serif`;}while(ctx.measureText(text).width>940);ctx.fillText(text,512,104);ctx.font='26px sans-serif';ctx.fillStyle='#ebcf91';ctx.fillText(`巷 弄 任 務  /  ${String(number).padStart(2,'0')}`,512,201);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }
 shops.forEach((shop,i)=>{
  const lot=lots[i],{x,z,yaw}=lot,g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;scene.add(g);const h=5.4+(i%3)*.65;
  box(9.4,h,7.1,palette[i],0,h/2+.2,0,g);localObstacle(lot,0,0,9.5,7.2);
  box(9.9,.3,7.6,'#f1e3bd',0,h+.35,0,g);box(8.8,.17,6.6,'#748d82',0,h+.58,0,g);
  box(10,.22,2.2,'#f4dfb0',0,3.25,4.1,g);
  for(let n=0;n<10;n++)box(.95,.14,1.8,n%2?'#f4d49a':'#ad6551',-4.4+n*.98,3.46,4.3,g);
  for(const px of [-4.3,4.3]){box(.25,3.05,.25,'#f4e4be',px,1.65,4.7,g);localObstacle(lot,px,4.7,.3,.3);ball(.3,'#d86c41',px,2.8,4.3,g);box(.05,.4,.05,'#5e6d5b',px,3.15,4.3,g);}
  for(const px of [-3,0,3]){box(2.2,2.5,.12,'#3c6f6d',px,1.6,3.6,g);box(.08,2.5,.16,'#f6ddb1',px,1.6,3.7,g);box(1.4,.9,.08,'#5c827b',px,h-1,-3.58,g);}
  box(1.5,.7,.5,'#e8ddbd',3.4,h-.8,3.8,g);for(let n=0;n<4;n++)box(1.1,.04,.03,'#8d9c8c',3.4,h-1+n*.12,4.07,g);
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,1.1,10),mat('#cbd2bd'));tank.position.set(-3.1,h+1.15,-1.7);g.add(tank);
  // The pond and side fences form a real barrier; unlocking builds a traversable bridge.
  box(10,.08,4.3,'#dfcfab',0,.04,5.8,g);box(9.8,.05,1.7,'#69b4c0',0,.12,6.4,g);
  for(const side of [-1,1]){box(.18,1.1,4.2,'#9d7958',side*5.05,.65,5.7,g);localObstacle(lot,side*5.05,5.7,.25,4.2);}
  const frameMat=new THREE.MeshStandardMaterial({color:'#eed9a2',emissive:'#f2ba4e',emissiveIntensity:.12});
  const frame=box(9.8,2.55,.35,frameMat,0,h+2.05,0,g);frame.userData.shop=shop;
  const signMaterial=new THREE.MeshBasicMaterial({map:label(shop.name,shop.id)}),faces=[];
  for(const side of [-1,1]){const face=new THREE.Mesh(new THREE.PlaneGeometry(9.4,2.2),signMaterial);face.position.set(0,h+2.05,side*.2);face.rotation.y=side===1?0:Math.PI;face.userData.shop=shop;g.add(face);faces.push(face);signMeshes.push(face);}
  signMeshes.push(frame);
  const checkpoint=new THREE.Mesh(new THREE.PlaneGeometry(2.8,.8),new THREE.MeshBasicMaterial({map:label(`${shop.id} 闖關`,shop.id,'#9c6935'),side:THREE.DoubleSide}));checkpoint.position.set(2.1,1.9,10.5);checkpoint.userData.shop=shop;g.add(checkpoint);box(.12,1.8,.12,'#77684c',2.1,.9,10.5,g);
  buildings.push({g,x,z,h,lot,shop,frame,frameMat,signMaterial,faces,approach:localPoint(lot,0,10.5),entry:localPoint(lot,0,4.8),district:lot.district});
 });
 // Small residential blocks fill the pockets between the zigzag alleys.
 for(let x=-48;x<=44;x+=15)for(let z=-35;z<=31;z+=16){if(distanceToRoad(x,z)<10||lots.some(l=>Math.hypot(x-l.x,z-l.z)<13))continue;const h=6+(Math.abs(x+z)%5);box(7,h,6,['#a6bab0','#c9be99','#aeb6bd'][Math.abs(x+z)%3],x,h/2,z);box(7.5,.2,6.5,'#f1e0b8',x,h+.1,z);obstacle(x,z,7,6);for(let y=2;y<h;y+=2.1)for(const dx of [-1.8,1.8])box(1.1,.85,.09,'#5b827c',x+dx,y,z+3.1);}
 const decor=[];
 for(let n=0;n<28;n++){const p=roadAt(n*roadLength/28,5.9);if(lots.some(l=>Math.hypot(p.x-l.x,p.z-l.z)<10))continue;box(1.1,.45,1.1,'#aa8d68',p.x,.3,p.z);box(.22,2.2,.22,'#8a654a',p.x,1.4,p.z);ball(1.1,n%2?'#719a68':'#8ab379',p.x,3,p.z);obstacle(p.x,p.z,1.1,1.1);decor.push(p);}
 for(let n=0;n<22;n++){const p=roadAt(n*roadLength/22,-4.7);if(lots.some(l=>Math.hypot(p.x-l.x,p.z-l.z)<8))continue;box(.12,4.7,.12,'#44695f',p.x,2.4,p.z);box(.8,.15,.45,'#ffedaa',p.x+.3,4.8,p.z);obstacle(p.x,p.z,.25,.25);}
 // Batch static props; animated people, traffic, gates and signs remain separate.
 scene.updateMatrixWorld(true);const batches=new Map();scene.traverse(o=>{if(!o.isMesh||o.userData.shop||![boxGeo,sphereGeo].includes(o.geometry))return;const k=o.geometry.uuid+o.material.uuid;if(!batches.has(k))batches.set(k,[]);batches.get(k).push(o);});
 for(const meshes of batches.values()){const batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);meshes.forEach((m,i)=>{batch.setMatrixAt(i,m.matrixWorld);m.removeFromParent();});batch.castShadow=true;batch.receiveShadow=true;scene.add(batch);}
 const gates=buildings.map(b=>{const group=new THREE.Group();b.g.add(group);const barrier=box(9.7,1,.18,'#b96649',0,.9,7.5,group);const planks=[];for(let n=0;n<3;n++)planks.push(box(3.5,.16,.54,'#bd925b',0,.23,5.85+n*.55,group));const flags=[];for(let n=0;n<3;n++)flags.push(ball(.17,'#edc979',-1+n,1.7,7.5,group));return{group,barrier,planks,flags,count:-1};});
  function person(type, color) {
    const g = new THREE.Group(); scene.add(g);
    const torso = box(.65, .85, .42, color, 0, 1.37, 0, g);
    ball(.36, '#e9ba91', 0, 2.02, 0, g); ball(.36, '#4f5143', 0, 2.18, -.055, g);
    const limbs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * .18, .98, 0); g.add(leg);
      box(.23, .72, .24, '#48615e', 0, -.38, 0, leg); box(.26, .17, .4, '#f1e7cc', 0, -.79, .07, leg);
      const arm = new THREE.Group(); arm.position.set(side * .43, 1.7, 0); g.add(arm);
      box(.2, .63, .22, color, 0, -.3, 0, arm); ball(.12, '#e9ba91', 0, -.65, 0, arm);
      limbs.push({ leg, arm, side });
    }
    if (type === '學生') box(.48, .65, .23, '#b39163', 0, 1.4, -.34, g);
    if (type === '上班族') { box(.12, .46, .04, '#c48365', 0, 1.48, .24, g); box(.35, .42, .17, '#715e4b', .7, .8, 0, g); }
    if (type === '遊客') { box(.9, .1, .75, '#e6ce93', 0, 2.35, 0, g); box(.55, .25, .48, '#e6ce93', 0, 2.5, 0, g); box(.3, .25, .14, '#4b655f', 0, 1.4, .3, g); }
    if (type === '店員') { box(.48, .7, .04, '#f3e6c4', 0, 1.15, .24, g); box(.6, .25, .5, '#fff3d3', 0, 2.4, 0, g); }
    g.userData = { limbs, torso, type }; return g;
  }

 const player=person('旅人','#e3a13d');player.position.set(spawn.x,0,spawn.z);
 const markerCanvas=document.createElement('canvas');markerCanvas.width=192;markerCanvas.height=192;const markerContext=markerCanvas.getContext('2d');markerContext.fillStyle='#203d37';markerContext.beginPath();markerContext.moveTo(20,66);markerContext.lineTo(172,66);markerContext.lineTo(96,176);markerContext.closePath();markerContext.lineWidth=13;markerContext.strokeStyle='#fff9dc';markerContext.stroke();markerContext.fill();markerContext.fillStyle='#ffe08a';markerContext.beginPath();markerContext.moveTo(48,82);markerContext.lineTo(144,82);markerContext.lineTo(96,148);markerContext.fill();markerContext.font='bold 38px sans-serif';markerContext.textAlign='center';markerContext.fillStyle='#203d37';markerContext.fillText('你在這',96,45);
 const playerMarker=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(markerCanvas),depthTest:false,depthWrite:false,transparent:true,sizeAttenuation:false}));playerMarker.scale.set(.078,.078,1);playerMarker.position.y=3.7;playerMarker.renderOrder=999;playerMarker.raycast=()=>{};player.add(playerMarker);
 const halo=new THREE.Mesh(new THREE.RingGeometry(.6,.76,28),new THREE.MeshBasicMaterial({color:'#ffec9f',side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.y=.17;player.add(halo);
 const npcs=[];for(let i=0;i<16;i++){const g=person(['學生','上班族','遊客'][i%3],['#6d9eac','#eee3c5','#c57561'][i%3]);g.scale.setScalar(.85);const t=i*roadLength/16,p=roadAt(t,2.9);g.position.set(p.x,.08,p.z);g.rotation.y=p.yaw;npcs.push({g,t,phase:i});}
 for(const i of [0,3,6,9]){const b=buildings[i],g=person('店員','#779d80'),p=localPoint(b.lot,-3.5,4.6);g.position.set(p.x,.1,p.z);g.rotation.y=b.lot.yaw;npcs.push({g,stationary:true,phase:i});}
 function vehicle(type,color){const g=new THREE.Group();scene.add(g);const scooter=type==='scooter';box(scooter?.62:1.75,scooter?.65:.75,scooter?1.45:3.25,color,0,.72,0,g);box(scooter?.6:1.48,scooter?.22:.65,scooter?.75:1.65,scooter?'#3d5953':'#476d74',0,1.25,0,g);
  for(const x of scooter?[0]:[-.85,.85])for(const z of scooter?[-.65,.65]:[-1.05,1.05]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(scooter?.28:.36,scooter?.28:.36,.18,10),mat('#354841'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.38,z);g.add(wheel);}
  if(scooter){box(.65,.9,.2,color,0,1,.64,g);box(.9,.08,.1,'#536c60',0,1.55,.65,g);}else{box(1.5,.2,.13,'#ffefbe',0,.84,1.65,g);box(1.5,.2,.12,'#b45846',0,.84,-1.65,g);}return g;
 }
 const vehicles=[];for(let i=0;i<7;i++){const type=i<3?'car':'scooter',g=vehicle(type,['#d67d56','#dfbd63','#679d9f','#c2aa72','#79a489','#ad7b88','#758eab'][i]),t=35+i*roadLength/7,p=roadAt(t,-1.1);g.position.set(p.x,.05,p.z);g.rotation.y=p.yaw;vehicles.push({g,t,type,speed:type==='car'?3:3.6});}
 for(const i of [1,4,8]){const b=buildings[i],p=localPoint(b.lot,-6.5,-1),g=vehicle('scooter','#8aab9a');g.position.set(p.x,0,p.z);g.rotation.y=b.lot.yaw+.4;obstacle(p.x,p.z,1.5,2,b.lot.yaw);}
 let questCounts=Array(10).fill(0);
 function setQuestProgress(counts){questCounts=counts;gates.forEach((gate,i)=>{if(gate.count===counts[i])return;gate.count=counts[i];gate.barrier.visible=counts[i]<3;const bridgeIndex=plans[i].indexOf('bridge');gate.planks.forEach(m=>m.visible=counts[i]===3||bridgeIndex>=0&&counts[i]>bridgeIndex);gate.flags.forEach((m,n)=>m.material=mat(n<counts[i]?'#83b571':'#edc979'));});}
 function staticClear(x,z,r=.43){if(Math.abs(x)>bounds.x-1||Math.abs(z)>bounds.z-1)return false;if(obstacles.some(o=>{const p=toLocal(o,x,z);return Math.abs(p.x)<o.w+r&&Math.abs(p.z)<o.d+r;}))return false;for(let i=0;i<lots.length;i++){const p=toLocal(lots[i],x,z);if(Math.abs(p.x)<5&&p.z>5.45-r&&p.z<7.15+r&&(questCounts[i]<3||Math.abs(p.x)>1.75-r))return false;}return true;}
 function canStand(x,z,r=.43){return staticClear(x,z,r)&&!vehicles.some(v=>Math.hypot(v.g.position.x-x,v.g.position.z-z)<(v.type==='car'?1.7:1)+r);}
 function walk(g,moving,t,phase=0){const swing=moving?Math.sin(t*9+phase)*.5:0;for(const l of g.userData.limbs){l.leg.rotation.x=swing*l.side;l.arm.rotation.x=-swing*l.side*.75;}g.userData.torso.position.y=1.37+(moving?Math.abs(Math.sin(t*9+phase))*.035:0);}
 function updateNPCs(dt,t){for(const n of npcs){if(n.stationary){n.g.userData.limbs[0].arm.rotation.z=Math.sin(t*1.5+n.phase)*.1;continue;}const next=roadAt(n.t+dt*1.55,2.9),blocked=!staticClear(next.x,next.z,.28)||Math.hypot(next.x-player.position.x,next.z-player.position.z)<1.2||npcs.some(o=>o!==n&&Math.hypot(next.x-o.g.position.x,next.z-o.g.position.z)<1);if(!blocked){n.t+=dt*1.55;n.g.position.set(next.x,.08,next.z);}const delta=Math.atan2(Math.sin(next.yaw-n.g.rotation.y),Math.cos(next.yaw-n.g.rotation.y));n.g.rotation.y+=delta*Math.min(1,dt*9);walk(n.g,!blocked,t,n.phase);}}
 function updateTraffic(dt){for(const v of vehicles){const next=roadAt(v.t+dt*v.speed,-1.1);if(Math.hypot(next.x-player.position.x,next.z-player.position.z)<3||vehicles.some(o=>o!==v&&Math.hypot(next.x-o.g.position.x,next.z-o.g.position.z)<4.5))continue;v.t+=dt*v.speed;v.g.position.set(next.x,.05,next.z);v.g.rotation.y+=Math.atan2(Math.sin(next.yaw-v.g.rotation.y),Math.cos(next.yaw-v.g.rotation.y))*Math.min(1,dt*7);}}
 const marker=new THREE.Group();scene.add(marker);const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,28),new THREE.MeshBasicMaterial({color:'#ffd173',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.22;ring.raycast=()=>{};marker.add(ring);marker.visible=false;
 function setDestination(id){const b=buildings.find(b=>b.shop.id===id);marker.visible=!!b;if(b){const p=questCounts[id-1]===3?b.entry:b.approach;marker.position.set(p.x,0,p.z);}}
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function pick(x,y){const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(scene.children,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});return hit?.object.userData.shop||null;}
 const look=new THREE.Vector3(),desired=new THREE.Vector3();
 function updateCamera(view,snap=false){const distance=view.distance*(innerWidth<700?1.25:1);look.set(view.follow?player.position.x:0,0,view.follow?player.position.z:0);desired.set(look.x+Math.sin(view.angle)*Math.cos(view.pitch)*distance,Math.sin(view.pitch)*distance,look.z+Math.cos(view.angle)*Math.cos(view.pitch)*distance);if(snap)camera.position.copy(desired);else camera.position.lerp(desired,.1);camera.lookAt(look);camera.updateMatrixWorld();}
 function setSigns(visited,hovered){buildings.forEach((b,i)=>{const active=hovered?.id===b.shop.id;b.frameMat.emissiveIntensity=active?1.4:questCounts[i]===3?.55:.12;b.signMaterial.color.set(visited.has(b.shop.id)?'#d0edb4':questCounts[i]===3?'#fff4cb':'#d9d5bf');});}
 let powerSaving=false;function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(powerSaving?1:Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);}
 function setPreferences(p){powerSaving=p.powerSaving;renderer.shadowMap.enabled=!powerSaving;renderer.shadowMap.needsUpdate=true;resize();}
 setQuestProgress(questCounts);
 return {scene,renderer,camera,player,playerMarker,npcs,vehicles,buildings,signMeshes,canStand,staticClear,pick,walk,updateNPCs,updateTraffic,updateCamera,setSigns,setPreferences,resize,setDestination,destinationMarker:marker,setQuestProgress,spawn};
}
