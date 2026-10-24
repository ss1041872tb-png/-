export const gameNames={water:'💧 杯子接水滴',galaga:'🚀 復古小蜜蜂',breakout:'🏓 反彈球打磚塊',tic:'⭕ 巷口井字棋',blocks:'🧱 積木找出口',memory:'🍣 美食翻翻樂',maze:'🧭 巷道迷宮',rhythm:'🥁 節奏煎鍋',stack:'🏗️ 疊高高',whack:'🐹 打地鼠',pipe:'🔧 接通水管',lights:'💡 熄燈大師',slide:'🔢 九宮格滑塊',match3:'🍒 水果三消',runner:'🏃 跳躍送餐員',fishing:'🎣 精準釣魚',balance:'⚖️ 平衡餐盤',orbit:'🪐 星環穿越',simon:'🎵 旋律記憶',sokoban:'📦 推箱入庫'};
export const plans=[['water','galaga'],['breakout','tic'],['blocks','memory'],['maze','rhythm'],['stack','whack'],['pipe','lights'],['slide','match3'],['runner','fishing'],['balance','orbit'],['simon','sokoban']];
const key='zhonghe-arcade-v6';
export function createCampaign(){
 const stages=Array(10).fill(0),visited=new Set(),listeners=new Set();let storageAvailable=true;
 try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===6)for(let i=0;i<10;i++){if(Number.isInteger(s.stages?.[i])&&s.stages[i]>=0&&s.stages[i]<=2)stages[i]=s.stages[i];if(stages[i]===2)visited.add(i+1);}}catch{storageAvailable=false;}
 function save(reason='progress'){try{localStorage.setItem(key,JSON.stringify({version:6,stages}));storageAvailable=true;}catch{storageAvailable=false;}listeners.forEach(fn=>fn(reason));}
 return {stages,visited,get storageAvailable(){return storageAvailable;},count(id){return stages[id-1]||0;},unlocked(id){return stages[id-1]===2;},complete(id,type){if(plans[id-1]?.[stages[id-1]]!==type)return false;stages[id-1]++;if(stages[id-1]===2)visited.add(id);save();return true;},reset(){stages.fill(0);visited.clear();save('reset');},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
}
