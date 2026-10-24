const foods=['noodles','cold-noodles','breakfast','naan','rice','dumplings','sushi','thai','soup','skewers'];
export function foodImage(id){return `assets/food-3d/${foods[id-1]}.png`;}
export function createFoodView(){
 const host=document.getElementById('food-model'),image=document.getElementById('food-image');let renderer=null,pending=null,generation=0,drag=null;
 async function show(shop,prefs){const token=++generation;image.src=foodImage(shop.id);image.alt=`${shop.tags[0]}原創 3D 餐點示意，非店家實拍`;image.hidden=false;host.hidden=true;for(const b of document.querySelectorAll(".food-turn button"))b.disabled=true;delete host.dataset.ready;
  try{pending??=import('./food-models.js?v=6.3.0');const module=await pending;if(token!==generation)return;renderer??=module.createFoodRenderer(host);host.hidden=false;renderer.show(shop.id,prefs);image.hidden=true;for(const b of document.querySelectorAll(".food-turn button"))b.disabled=false;}catch{host.hidden=true;image.hidden=false;}
 }
 function hide(){generation++;if(drag&&host.hasPointerCapture(drag.id))host.releasePointerCapture(drag.id);drag=null;renderer?.hide();}
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX};host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;renderer?.rotate((e.clientX-drag.x)*.012);drag.x=e.clientX;});
 for(const kind of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(kind,()=>{drag=null;});
 document.getElementById('food-left').addEventListener('click',()=>renderer?.rotate(-Math.PI/6));document.getElementById('food-right').addEventListener('click',()=>renderer?.rotate(Math.PI/6));
 return {show,hide};
}
