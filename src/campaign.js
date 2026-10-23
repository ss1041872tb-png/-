export const plans = [
 ['bridge','rps','memory'],['puzzle','order','rps'],['memory','tictactoe','order'],['rps','puzzle','bridge'],['order','memory','tictactoe'],
 ['bridge','puzzle','rps'],['tictactoe','bridge','memory'],['puzzle','order','memory'],['rps','bridge','tictactoe'],['memory','tictactoe','puzzle'],
];
export const gameNames = {bridge:'搬積木・搭小橋',rps:'街角猜拳王',memory:'美食翻翻樂',puzzle:'九宮格滑塊',tictactoe:'巷口井字棋',order:'主廚配餐記憶'};
const key='zhonghe-alley-adventure-v2';
export function createCampaign(){
 const stages=Array(10).fill(0),visited=new Set(),listeners=new Set();let storageAvailable=true;
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===2){for(let i=0;i<10;i++)if(Number.isInteger(saved.stages?.[i])&&saved.stages[i]>=0&&saved.stages[i]<=3)stages[i]=saved.stages[i];for(const id of saved.visited||[])if(Number.isInteger(id)&&id>=1&&id<=10&&stages[id-1]===3)visited.add(id);}}catch{storageAvailable=false;}
 function persist(reason='progress'){try{localStorage.setItem(key,JSON.stringify({version:2,stages,visited:[...visited]}));storageAvailable=true;}catch{storageAvailable=false;}for(const listener of listeners)listener(reason);}
 return {stages,visited,get storageAvailable(){return storageAvailable;},count(id){return stages[id-1]||0;},unlocked(id){return stages[id-1]===3;},
 complete(id,type){if(plans[id-1]?.[stages[id-1]]!==type)return false;stages[id-1]++;persist();return true;},
 collect(id){if(stages[id-1]!==3)return false;visited.add(id);persist();return true;},
 reset(){stages.fill(0);visited.clear();persist('reset');},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
 };
}
