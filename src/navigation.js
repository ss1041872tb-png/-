import { bounds, road, branches } from './layout.js?v=4.0.0';
export function createNavigation(world,ui,campaign,onInteract){
 const $=id=>document.getElementById(id),root=$('navigator'),content=$('map-content'),toggle=$('map-toggle');
 const mapPosition=(x,z)=>({x:(x+bounds.x)/(bounds.x*2)*280,y:(z+bounds.z)/(bounds.z*2)*240});
 const path=[road,...branches].map(points=>points.map((p,i)=>{const m=mapPosition(...p);return `${i?'L':'M'}${m.x} ${m.y}`;}).join(' ')).join(' ');
 $('map-roads').setAttribute('d',path);$('map-sidewalk').setAttribute('d',path);
 const stops=world.buildings.map(b=>({shop:b.shop,building:b,map:mapPosition(b.x,b.z)}));
 let target=null,previous='',lastTick=-Infinity,lastHint='';
 const position=stop=>stop.building.entry;
 function expand(open){content.hidden=!open;toggle.setAttribute('aria-expanded',String(open));$('map-chevron').textContent=open?'−':'＋';}
 const points=stops.map(stop=>{const button=document.createElement('button');button.className='map-shop';button.dataset.destinationId=stop.shop.id;button.textContent=stop.shop.id;button.style.left=`${stop.map.x/280*100}%`;button.style.top=`${stop.map.y/240*100}%`;button.addEventListener('click',()=>{choose(stop);update(0,true);});$('map-shops').append(button);return {button,stop};});
 function choose(stop){target=stop;lastHint='';world.setDestination(stop?.shop.id);document.body.classList.add('exploring');$('destination-name').textContent=stop?stop.shop.name:'十道美食集齊，尋寶大師！';for(const point of points)point.button.setAttribute('aria-pressed',String(point.stop===stop));}
 function nearest(){const p=world.player.position,remaining=stops.filter(s=>!campaign.visited.has(s.shop.id));remaining.sort((a,b)=>Math.hypot(position(a).x-p.x,position(a).z-p.z)-Math.hypot(position(b).x-p.x,position(b).z-p.z)||a.shop.id-b.shop.id);choose(remaining[0]||null);}
 toggle.addEventListener('click',()=>{document.body.classList.add('exploring');expand(content.hidden);update(0,true);});$('next-stop').addEventListener('click',()=>{nearest();update(0,true);});$('destination-open').addEventListener('click',()=>{if(target)onInteract(target.shop);});
 function update(time,force=false){if(!force&&time-lastTick<.12)return;lastTick=time;const signature=campaign.stages.join(',')+'/'+[...campaign.visited].join(',');if(signature!==previous){const first=!previous;previous=signature;for(const {button,stop}of points){const collected=campaign.visited.has(stop.shop.id);button.classList.toggle('collected',collected);button.setAttribute('aria-label',`${stop.shop.id} ${stop.shop.name}，${campaign.count(stop.shop.id)}/2 物品，${collected?'已收藏':'未收藏'}，設為下一站`);button.title=`${stop.shop.name}・${campaign.count(stop.shop.id)}/2 物品`;}
  if(first||!target||campaign.visited.has(target.shop.id))nearest();else world.setDestination(target.shop.id);
  $('next-stop').disabled=campaign.visited.size===10;$('next-stop').textContent=campaign.visited.size===10?'✓ 十店尋寶與美食全收藏':'✦ 找下一家未探索的店';
 }
 const p=world.player.position,m=mapPosition(p.x,p.z);$('map-player').setAttribute('transform',`translate(${m.x} ${m.y}) rotate(${180-world.player.rotation.y*180/Math.PI})`);
 const end=target?position(target):p,distance=Math.hypot(end.x-p.x,end.z-p.z),arrived=!!target&&distance<(campaign.unlocked(target.shop.id)?1:3.8);
 const hint=target?(campaign.unlocked(target.shop.id)?'美食已收藏！可以重訪店內。':`還有 ${2-campaign.count(target.shop.id)} 件物品；走到門口，進店搜尋。`):'選擇店家可以重溫介紹，或在收集箱重新開始冒險。';
 const key=`${target?.shop.id}/${campaign.count(target?.shop.id)}/${arrived}`;if(lastHint!==key){$('destination-hint').textContent=hint;lastHint=key;}
 $('destination-distance').textContent=target?`${target.building.district}・約 ${Math.ceil(distance/.8)} 步`:'';$('destination-open').hidden=!arrived;$('destination-open').textContent=target&&campaign.unlocked(target.shop.id)?'重訪店家 →':'走進店內尋寶 →';
 const e=mapPosition(end.x,end.z);$('map-direction').setAttribute('d',target?`M${m.x} ${m.y}L${e.x} ${e.y}`:'');
 }
 expand(matchMedia('(min-width: 701px)').matches);const exploring=document.body.classList.contains('exploring');update(0,true);if(!exploring)document.body.classList.remove('exploring');root.hidden=false;
 return{update,select(id){const stop=stops.find(s=>s.shop.id===id);if(stop){choose(stop);update(0,true);}},get target(){return target;}};
}
