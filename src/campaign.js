export const gameNames={water:'💧 杯子接水滴',shoot:'🎯 星星射擊',tic:'⭕ 巷口井字棋',blocks:'🧱 積木找出口'};
export const plans=[['water','shoot'],['blocks','water'],['tic','shoot'],['shoot','blocks'],['water','tic'],['blocks','shoot'],['tic','water'],['shoot','tic'],['water','blocks'],['blocks','tic']];
const key='zhonghe-arcade-v5';
export function createCampaign(){
 const stages=Array(10).fill(0),visited=new Set(),listeners=new Set();let storageAvailable=true;
 try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===5)for(let i=0;i<10;i++){if(Number.isInteger(s.stages?.[i])&&s.stages[i]>=0&&s.stages[i]<=2)stages[i]=s.stages[i];if(stages[i]===2)visited.add(i+1);}}catch{storageAvailable=false;}
 function save(reason='progress'){try{localStorage.setItem(key,JSON.stringify({version:5,stages}));storageAvailable=true;}catch{storageAvailable=false;}listeners.forEach(fn=>fn(reason));}
 return {stages,visited,get storageAvailable(){return storageAvailable;},count(id){return stages[id-1]||0;},unlocked(id){return stages[id-1]===2;},complete(id,type){if(plans[id-1]?.[stages[id-1]]!==type)return false;stages[id-1]++;if(stages[id-1]===2)visited.add(id);save();return true;},reset(){stages.fill(0);visited.clear();save('reset');},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
}
