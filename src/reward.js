import { foodImage } from './food-view.js?v=6.1.0';
export function createReward(ui,celebration){
 const panel=document.getElementById('reward'),image=document.getElementById('reward-food');let timer=0,flight=null,generation=0;
 function cancel(){generation++;clearTimeout(timer);flight?.cancel();flight=null;image.style.transform='';panel.dataset.phase='';}
 function finish(){cancel();if(!panel.hidden)ui.close();const box=document.getElementById('journal-toggle');box.classList.remove('box-pop');void box.offsetWidth;if(!ui.preferences.reducedMotion)box.classList.add('box-pop');ui.toast('📦 招牌美食已自動放進收集箱！');}
 function show(shop){cancel();const token=generation;image.src=foodImage(shop.id);image.alt=`${shop.tags[0]}原創 3D 餐點`;document.getElementById('reward-title').textContent=`獲得 ${shop.tags[0]}！`;document.getElementById('reward-shop').textContent=`${shop.name} · 兩關挑戰成功`;ui.openPanel(panel,document.getElementById('reward-done'));panel.dataset.phase='show';celebration.launch(shop);
  timer=setTimeout(()=>{if(token!==generation||panel.hidden)return;panel.dataset.phase='collecting';if(ui.preferences.reducedMotion){finish();return;}const from=image.getBoundingClientRect(),to=document.getElementById('journal-toggle').getBoundingClientRect();flight=image.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.x+to.width/2-from.x-from.width/2}px,${to.y+to.height/2-from.y-from.height/2}px) scale(.08)`,opacity:.25}],{duration:850,easing:'cubic-bezier(.45,0,.2,1)',fill:'forwards'});flight.onfinish=()=>{if(token===generation)finish();};},2400);
 }
 document.getElementById('reward-done').addEventListener('click',finish);document.addEventListener('explorer:panelclose',()=>{if(panel.hidden)cancel();});return {show,cancel};
}
