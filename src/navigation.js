import { bounds, road, branches } from './layout.js?v=6.7.0';
import { createRoutePlanner } from './route.js?v=6.7.0';
export function createNavigation(world,ui,campaign,onInteract,controls){
 const $=id=>document.getElementById(id),root=$('navigator'),content=$('map-content'),toggle=$('map-toggle'),planner=createRoutePlanner(world);
 const mapPosition=(x,z)=>({x:(x+bounds.x)/(bounds.x*2)*280,y:(z+bounds.z)/(bounds.z*2)*240});
 const path=[road,...branches].map(points=>points.map((p,i)=>{const m=mapPosition(...p);return `${i?'L':'M'}${m.x} ${m.y}`;}).join(' ')).join(' ');
 $('map-roads').setAttribute('d',path);$('map-sidewalk').setAttribute('d',path);
 const stops=world.buildings.map(b=>({shop:b.shop,building:b,map:mapPosition(b.x,b.z)}));
 let target=null,previous='',lastTick=-Infinity,lastHint='',route=[],manualTarget=false,lastAttempt=null;
 const position=stop=>stop.building.entry;
 function expand(open){content.hidden=!open;toggle.setAttribute('aria-expanded',String(open));$('map-chevron').textContent=open?'−':'＋';}
 const points=stops.map(stop=>{const button=document.createElement('button');button.className='map-shop';button.dataset.destinationId=stop.shop.id;button.textContent=stop.shop.id;button.style.left=`${stop.map.x/280*100}%`;button.style.top=`${stop.map.y/240*100}%`;button.addEventListener('click',()=>{choose(stop,true);update(0,true);});$('map-shops').append(button);return {button,stop};});
 function plan(){route=target?planner.plan(world.player.position,position(target)):[];lastAttempt={x:world.player.position.x,z:world.player.position.z};}
 function choose(stop,preview=false){target=stop;manualTarget=preview;lastHint='';world.setDestination(stop?.shop.id);plan();document.body.classList.add('exploring');$('destination-name').textContent=stop?stop.shop.name:'十道美食集齊，遊戲大師！';for(const point of points)point.button.setAttribute('aria-pressed',String(point.stop===stop));$('destination-info').disabled=!stop;if(preview&&stop){controls.showOverview(stop.shop);expand(false);}}
 function nearest(preview=false){const p=world.player.position,remaining=stops.filter(s=>!campaign.visited.has(s.shop.id));remaining.sort((a,b)=>Math.hypot(position(a).x-p.x,position(a).z-p.z)-Math.hypot(position(b).x-p.x,position(b).z-p.z)||a.shop.id-b.shop.id);choose(remaining[0]||null,preview);}
 toggle.addEventListener('click',()=>{document.body.classList.add('exploring');expand(content.hidden);update(0,true);});$('next-stop').addEventListener('click',()=>{nearest(true);update(0,true);});$('destination-open').addEventListener('click',()=>{if(target)onInteract(target.shop);});$('destination-info').addEventListener('click',()=>{if(target)ui.showShop(target.shop,false);});
 function remaining(p){let best=Infinity,index=0,nearest=p;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1))),q={x:a.x+t*dx,z:a.z+t*dz},d=Math.hypot(q.x-p.x,q.z-p.z);if(d<best){best=d;index=i;nearest=q;}}return{distance:best,points:route.length?[nearest,...route.slice(index)]:[]};}
 function update(time,force=false){if(!force&&time-lastTick<.12)return;lastTick=time;const signature=campaign.stages.join(',')+'/'+[...campaign.visited].join(',');if(signature!==previous){const first=!previous;previous=signature;planner.invalidate();for(const {button,stop}of points){const collected=campaign.visited.has(stop.shop.id);button.classList.toggle('collected',collected);button.setAttribute('aria-label',`${stop.shop.id} ${stop.shop.name}，${campaign.count(stop.shop.id)}/2 關，${collected?'已收藏':'未收藏'}，設為下一站並查看全景`);button.title=`${stop.shop.name}・${campaign.count(stop.shop.id)}/2 關`;}
  if(first||!target||!manualTarget&&campaign.visited.has(target.shop.id))nearest();else{world.setDestination(target.shop.id);plan();}
  $('next-stop').disabled=campaign.visited.size===10;$('next-stop').textContent=campaign.visited.size===10?'✓ 十店闖關與美食全收藏':'✦ 找下一家未探索的店';
 }
 const p=world.player.position,m=mapPosition(p.x,p.z);$('map-player').setAttribute('transform',`translate(${m.x} ${m.y}) rotate(${180-world.player.rotation.y*180/Math.PI})`);
 let active=remaining(p);if(target&&active.distance>2.2&&(!lastAttempt||Math.hypot(p.x-lastAttempt.x,p.z-lastAttempt.z)>1)){plan();active=remaining(p);}
 const end=target?position(target):p,distance=Math.hypot(end.x-p.x,end.z-p.z),arrived=!!target&&distance<3.4;
 const hint=target?(campaign.unlocked(target.shop.id)?'美食已收藏！可以查看店家資訊，或依小地圖重訪。':`依小地圖與發亮招牌找到店家；到門口挑戰剩下的 ${2-campaign.count(target.shop.id)} 關。`):'選擇店家可以重溫介紹，或在收集箱重新開始冒險。';
 const key=`${target?.shop.id}/${campaign.count(target?.shop.id)}/${arrived}`;if(lastHint!==key){$('destination-hint').textContent=hint;lastHint=key;}
 const length=active.points.slice(1).reduce((sum,b,i)=>sum+Math.hypot(b.x-active.points[i].x,b.z-active.points[i].z),0);
 $('destination-distance').textContent=target?`${target.building.district}・約 ${Math.ceil((length||distance)/.8)} 步`:'';$('destination-open').hidden=!arrived;$('destination-open').textContent=target&&campaign.unlocked(target.shop.id)?'重訪店家 →':'開啟兩關挑戰 →';
 $('map-direction').setAttribute('d',target?active.points.map((p,i)=>{const m=mapPosition(p.x,p.z);return `${i?'L':'M'}${m.x} ${m.y}`;}).join(' '):'');
 }
 expand(matchMedia('(min-width:701px) and (pointer:fine)').matches);const exploring=document.body.classList.contains('exploring');update(0,true);if(!exploring)document.body.classList.remove('exploring');root.hidden=false;
 return{update,select(id,preview=false){const stop=stops.find(s=>s.shop.id===id);if(stop){choose(stop,preview);update(0,true);}},get target(){return target;},get route(){return route;}};
}
