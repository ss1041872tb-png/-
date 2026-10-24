// The new hunt uses a separate save; previous adventure passports remain untouched.
export const themes=[
 ['復古麵攤','#b46e43','麵碗','木抽屜',6],['薄荷涼麵屋','#65a795','芝麻','收銀櫃',3],['晨光豆漿坊','#ddb35f','豆漿','木抽屜',8],['香料烤餅屋','#aa718d','香料','收銀櫃',2],['竹編米糕舖','#9c9f56','蒸籠','木抽屜',7],['紅磚鍋貼館','#b95840','煎鍋','收銀櫃',4],['日式壽司吧','#6986a3','竹簾','木抽屜',9],['熱帶泰式屋','#63955b','檸檬','收銀櫃',5],['藍白米粉店','#639aa9','湯鍋','木抽屜',1],['炭火串燒屋','#725c57','炭火','收銀櫃',0]
];
export const hunts=themes.map(([theme,color,symbol,place,digit])=>[
 {name:`${digit} 號鑰匙`,place:'價目表',shape:'key',hint:`老闆留下「注意數字 ${digit}」。價目表只有一個 ${digit}，請靠近觀察並點它。`,digit,symbol},
 {name:`${symbol}祕方`,place,shape:'book',hint:`鑰匙吊牌寫著「${symbol}」。找同樣圖案的${place}，使用鑰匙打開，再點裡面的祕方。`,symbol}
]);
const key='zhonghe-room-detective-v4';
export function createCampaign(){
 const masks=Array(10).fill(0),visited=new Set(),listeners=new Set();let storageAvailable=true;
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===4)for(let i=0;i<10;i++){const mask=saved.found?.[i];if(Number.isInteger(mask)&&[0,1,3].includes(mask))masks[i]=mask;if(masks[i]===3)visited.add(i+1);}}catch{storageAvailable=false;}
 function persist(reason='progress'){try{localStorage.setItem(key,JSON.stringify({version:4,found:masks}));storageAvailable=true;}catch{storageAvailable=false;}for(const fn of listeners)fn(reason);}
 const count=id=>Number(!!(masks[id-1]&1))+Number(!!(masks[id-1]&2));
 return {visited,get stages(){return masks.map((_,i)=>count(i+1));},get storageAvailable(){return storageAvailable;},count,has(id,index){return !!(masks[id-1]&(1<<index));},unlocked(id){return masks[id-1]===3;},
 find(id,index){if(!hunts[id-1]||![0,1].includes(index)||masks[id-1]&(1<<index)||(index===1&&!(masks[id-1]&1)))return false;masks[id-1]|=1<<index;if(masks[id-1]===3)visited.add(id);persist();return true;},
 reset(){masks.fill(0);visited.clear();persist('reset');},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
}
