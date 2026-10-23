// The new hunt uses a separate save; previous adventure passports remain untouched.
export const hunts=[
 [{name:'祖傳湯匙',place:'木抽屜',hint:'老闆說，祖傳的工具總放在木頭抽屜裡。',shape:'spoon'},{name:'秘方手札',place:'書架',hint:'寫滿麵香祕密的那本，和食譜放在一起。',shape:'book'}],
 [{name:'芝麻醬罐',place:'調味架',hint:'香氣最濃的那一罐，待在調味料旁邊。',shape:'jar'},{name:'涼麵竹籤',place:'木抽屜',hint:'細長的小工具，收在抽屜裡。',shape:'key'}],
 [{name:'豆漿量杯',place:'工作檯',hint:'早起的師傅，總把量杯留在料理的地方。',shape:'jar'},{name:'燒餅印章',place:'收銀櫃',hint:'結帳時蓋的印章，就在收銀處。',shape:'stamp'}],
 [{name:'香料寶罐',place:'調味架',hint:'金黃色香料和其他調味料待在一起。',shape:'jar'},{name:'烤餅食譜',place:'書架',hint:'翻翻書架，也許會找到烤餅的祕密。',shape:'book'}],
 [{name:'蒸籠鑰匙',place:'木抽屜',hint:'開蒸籠的小鑰匙，藏在木頭抽屜裡。',shape:'key'},{name:'米糕古方',place:'書架',hint:'那張老紙條被夾在食譜之間。',shape:'book'}],
 [{name:'煎鍋鏟',place:'工作檯',hint:'煎出金黃脆皮的好幫手，還在料理檯上。',shape:'spoon'},{name:'鍋貼醬罐',place:'調味架',hint:'找找調味架上的特製醬汁。',shape:'jar'}],
 [{name:'壽司竹簾',place:'工作檯',hint:'師傅捲壽司的地方，就是它的家。',shape:'book'},{name:'山葵印章',place:'收銀櫃',hint:'山葵造型的小印章，放在結帳處。',shape:'stamp'}],
 [{name:'泰式香料罐',place:'調味架',hint:'酸辣的祕密藏在調味料之間。',shape:'jar'},{name:'香茅手札',place:'書架',hint:'有香茅圖案的筆記本，混在書本裡。',shape:'book'}],
 [{name:'老湯勺',place:'工作檯',hint:'舀出好滋味的老朋友，就在料理檯上。',shape:'spoon'},{name:'米粉竹盒鑰匙',place:'木抽屜',hint:'竹盒上鎖了，找找木抽屜裡的鑰匙。',shape:'key'}],
 [{name:'炭火夾',place:'工作檯',hint:'控火達人的工具，留在工作檯旁。',shape:'spoon'},{name:'串燒祕醬',place:'調味架',hint:'刷出香氣的那罐醬，藏在調味架上。',shape:'jar'}],
];
const key='zhonghe-room-hunt-v3';
export function createCampaign(){
 const masks=Array(10).fill(0),visited=new Set(),listeners=new Set();let storageAvailable=true;
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===3)for(let i=0;i<10;i++){const mask=saved.found?.[i];if(Number.isInteger(mask)&&mask>=0&&mask<=3)masks[i]=mask;if(masks[i]===3)visited.add(i+1);}}catch{storageAvailable=false;}
 function persist(reason='progress'){try{localStorage.setItem(key,JSON.stringify({version:3,found:masks}));storageAvailable=true;}catch{storageAvailable=false;}for(const fn of listeners)fn(reason);}
 const count=id=>Number(!!(masks[id-1]&1))+Number(!!(masks[id-1]&2));
 return {visited,get stages(){return masks.map((_,i)=>count(i+1));},get storageAvailable(){return storageAvailable;},count,has(id,index){return !!(masks[id-1]&(1<<index));},unlocked(id){return masks[id-1]===3;},
 find(id,index){if(!hunts[id-1]||![0,1].includes(index)||masks[id-1]&(1<<index))return false;masks[id-1]|=1<<index;if(masks[id-1]===3)visited.add(id);persist();return true;},
 reset(){masks.fill(0);visited.clear();persist('reset');},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
}
