import { plans, gameNames } from './campaign.js?v=2.0.0';

export function createChallenges(campaign, ui, sound, world) {
 const panel=document.getElementById('quest'),area=document.getElementById('quest-game'),feedback=document.getElementById('quest-feedback');
 let shop=null,session=0,activeState=null;
 const timers=new Set();
 function clean(){session++;for(const timer of timers)clearTimeout(timer);timers.clear();area.replaceChildren();activeState=null;feedback.textContent='';}
 function later(fn,delay){const generation=session;const timer=setTimeout(()=>{timers.delete(timer);if(generation===session&&!panel.hidden)fn();},delay);timers.add(timer);}
 function button(label,action,options={}){const b=document.createElement('button');b.type='button';b.textContent=label;for(const [k,v]of Object.entries(options))b.dataset[k]=v;b.addEventListener('click',()=>{sound.play('click');action(b);});return b;}
 function message(text,wrong=false){feedback.textContent=text;if(wrong)sound.play('wrong');}
 function paragraph(text){const p=document.createElement('p');p.className='game-instructions';p.textContent=text;area.append(p);return p;}
 function grid(className){const g=document.createElement('div');g.className=className;area.append(g);return g;}
 function finish(type){if(!campaign.complete(shop.id,type))return;clean();world.setQuestProgress(campaign.stages);sound.play(campaign.unlocked(shop.id)?'unlock':'win');renderHeader();paragraph(campaign.unlocked(shop.id)?'三關完成！柵欄已打開，小橋已鋪好。回到街區，走過橋後點招牌收藏美食。':'這一關完成！進度已保存，可以繼續下一道街角任務。');const next=button(campaign.unlocked(shop.id)?'回街區，過橋探店 →':'挑戰下一關 →',()=>campaign.unlocked(shop.id)?ui.close():start());next.className='primary-button';next.id='quest-next';area.append(next);next.focus({preventScroll:true});}
 function renderHeader(){document.getElementById('quest-title').textContent=`${shop.name}・街角任務`;document.getElementById('quest-progress').replaceChildren(...plans[shop.id-1].map((type,i)=>{const e=document.createElement('span');e.className='quest-step'+(i<campaign.count(shop.id)?' done':'');e.textContent=`${i<campaign.count(shop.id)?'✓':i+1} ${gameNames[type]}`;return e;}));}
 function open(selected){shop=selected;clean();renderHeader();panel.dataset.game='intro';document.getElementById('quest-game-title').textContent='準備開始這一站的任務';ui.openPanel(panel,document.getElementById('quest-close'));paragraph('每家店有三道不同任務。通關後柵欄才會打開；最後要親自走過小橋、點招牌才能集章。已完成的關卡會保存，未完成的小遊戲離開後會重新開始。');const begin=button(`開始第 ${campaign.count(shop.id)+1} 關 →`,start);begin.id='quest-begin';begin.className='primary-button';area.append(begin);}
 function start(){clean();renderHeader();const type=plans[shop.id-1][campaign.count(shop.id)];if(!type){ui.close();return;}panel.dataset.game=type;document.getElementById('quest-game-title').textContent=gameNames[type];games[type](type);const first=area.querySelector('button');first?.focus({preventScroll:true});}
 const games={
  bridge(type){
   paragraph('先拿起積木，再旋轉到橋面標示的方向，放入相同顏色的橋墩。三塊都放好，小橋才完整。');
   const colors=['琥珀','薄荷','莓果'],required=[shop.id%4,(shop.id+1)%4,(shop.id+2)%4],placed=[false,false,false];let carried=null,rotation=0;
   activeState={type,placed,required};
   const inventory=grid('block-inventory'),slots=grid('bridge-slots');
   const selected=paragraph('手上還沒有積木。');
   const rotate=button('↻ 旋轉手上的積木',()=>{if(carried===null){message('先從材料箱拿一塊積木。',true);return;}rotation=(rotation+1)%4;describe();});rotate.dataset.action='rotate';area.append(rotate);
   function describe(){selected.textContent=carried===null?'手上還沒有積木。':`拿著 ${colors[carried]}積木，方向 ${rotation*90}°。`;}
   for(let i=0;i<3;i++){
    const piece=button(`${colors[i]}積木`,()=>{carried=i;rotation=0;describe();},{piece:i});piece.className=`block-piece block-${i}`;inventory.append(piece);
    const slot=button(`${colors[i]}橋墩・${required[i]*90}°`,()=>{if(carried!==i||rotation!==required[i]){message('顏色或方向還不對；拿起相同顏色的積木，轉到橋墩標示的角度。',true);return;}placed[i]=true;piece.disabled=true;slot.disabled=true;slot.textContent='✓ 橋面完成';slot.classList.add('placed');carried=null;describe();sound.play('place');if(placed.every(Boolean))finish(type);else message('放好了！繼續完成另外的橋墩。');},{slot:i});slots.append(slot);
   }
  },
  rps(type){
   paragraph('與巷口守門員猜拳，累積贏兩次就能過關。平手與落敗都可繼續，守門員會在你出拳時隨機出拳。');let wins=0;const names=['石頭','布','剪刀'],icons=['✊','✋','✌️'];const score=paragraph('目前勝場：0 / 2'),choices=grid('rps-choices');activeState={type,wins};
   names.forEach((name,i)=>choices.append(button(`${icons[i]} ${name}`,()=>{const opponent=Math.floor(Math.random()*3),win=(i-opponent+3)%3===1;if(win){wins++;activeState.wins=wins;sound.play('place');}message(`你出${name}，守門員出${names[opponent]}。${i===opponent?'平手，再來一次！':win?'你贏了！':'這次落敗，可以繼續挑戰。'}`,!win&&i!==opponent);score.textContent=`目前勝場：${wins} / 2`;if(wins===2)finish(type);},{move:i})));
  },
  puzzle(type){
   paragraph('點選空格旁的數字滑塊，將 1–8 排成由左到右、由上到下，空格留在右下角。初始盤面由完成盤面合法移動產生，一定有解。');
   const cells=[1,2,3,4,5,6,7,8,0];let blank=8,last=-1;
   for(let n=0;n<18+shop.id;n++){const options=[blank-3,blank+3,blank%3>0?blank-1:-1,blank%3<2?blank+1:-1].filter(i=>i>=0&&i<9&&i!==last);const next=options[(shop.id+n*7)%options.length];[cells[blank],cells[next]]=[cells[next],cells[blank]];last=blank;blank=next;}
   if(cells.every((n,i)=>n===(i+1)%9)){[cells[7],cells[8]]=[cells[8],cells[7]];blank=7;}
   const board=grid('sliding-board');activeState={type,cells};
   function render(){board.replaceChildren(...cells.map((value,i)=>{const b=button(value?String(value):'空格',()=>{if(!value)return;const adjacent=Math.abs(i-blank)===3||Math.floor(i/3)===Math.floor(blank/3)&&Math.abs(i-blank)===1;if(!adjacent){message('只能移動緊鄰空格的滑塊。',true);return;}[cells[i],cells[blank]]=[cells[blank],cells[i]];blank=i;sound.play('place');if(cells.every((n,j)=>n===(j+1)%9)){finish(type);return;}render();board.querySelector(`[data-cell="${blank}"]`)?.focus({preventScroll:true});},{cell:i,value});b.classList.toggle('empty',!value);b.setAttribute('aria-label',value?`第 ${i+1} 格，數字 ${value}`:'空格');return b;}));}render();
  },
  memory(type){
   paragraph('翻開卡片，找齊四對相同的美食。每次可翻兩張；不相同會蓋回，沒有時間限制。');
   const symbols=['🍜','🍣','🥟','🍢'],cards=[...symbols,...symbols];for(let i=cards.length-1;i>0;i--){const j=(shop.id*11+i*3)%(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}let first=null,busy=false;const matched=new Set(),board=grid('memory-board');activeState={type,cards,matched};
   cards.forEach((symbol,i)=>{const b=button('？',()=>{if(busy||matched.has(i)||first===i)return;b.textContent=symbol;b.setAttribute('aria-label',`第 ${i+1} 張，${symbol}`);b.classList.add('flipped');if(first===null){first=i;return;}const a=first;first=null;if(cards[a]===symbol){matched.add(a);matched.add(i);board.children[a].disabled=b.disabled=true;sound.play('place');if(matched.size===cards.length)finish(type);}else{busy=true;message('再記一下它們的位置。');later(()=>{for(const index of [a,i]){const cell=board.children[index];cell.textContent='？';cell.classList.remove('flipped');cell.setAttribute('aria-label',`翻開第 ${index+1} 張卡片`);}busy=false;},650);}},{card:i});b.setAttribute('aria-label',`翻開第 ${i+1} 張卡片`);board.append(b);});
  },
  order(type){
   const recipes=[['洗米','蒸煮','淋醬','擺盤'],['煮麵','瀝水','拌醬','上桌'],['備料','調味','煎烤','裝盤']];const recipe=recipes[(shop.id-1)%recipes.length];let position=0,started=false;paragraph('先記住主廚的四步料理順序，準備好再開始。順序不對會重來；隨時可以再看一次食譜。');const hint=paragraph(recipe.map((r,i)=>`${i+1}. ${r}`).join(' → ')),choices=grid('recipe-choices');activeState={type,recipe};
   const begin=button('我記好了，開始配餐',()=>{started=true;position=0;hint.textContent='食譜已收起，請按剛才的順序配餐。';for(const b of choices.children)b.disabled=false;begin.disabled=true;message('先做第一步吧。');},{action:'remember'});area.append(begin);
   [...recipe].reverse().forEach(word=>{const b=button(word,()=>{if(!started)return;if(word!==recipe[position]){position=0;message('順序不對，從第一步重來。也可按「再看食譜」。',true);return;}position++;sound.play('place');message(`已完成 ${position} / 4 步。`);if(position===4)finish(type);},{ingredient:word});b.disabled=true;choices.append(b);});
   area.append(button('再看一次食譜',()=>{started=false;position=0;hint.textContent=recipe.map((r,i)=>`${i+1}. ${r}`).join(' → ');for(const b of choices.children)b.disabled=true;begin.disabled=false;},{action:'reveal'}));
  },
  tictactoe(type){
   paragraph('你是 ○，守門員是 ×。先連成一線就贏；友誼賽平手也過關。若落敗可以重來，沒有次數限制。');const cells=Array(9).fill(''),board=grid('tic-board');let ended=false;activeState={type,cells};
   const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
   function won(mark){return lines.some(line=>line.every(i=>cells[i]===mark));}
   function ai(){const available=cells.map((v,i)=>!v?i:-1).filter(i=>i>=0);for(const mark of ['×','○'])for(const i of available){cells[i]=mark;const win=won(mark);cells[i]='';if(win)return i;}return available.includes(4)?4:available[0];}
   function render(){board.replaceChildren(...cells.map((mark,i)=>{const b=button(mark||'·',()=>{if(ended||cells[i])return;cells[i]='○';if(won('○')){finish(type);return;}if(cells.every(Boolean)){finish(type);return;}cells[ai()]='×';if(won('×')){ended=true;message('守門員這次連成一線，按下方按鈕再試一次。',true);}else if(cells.every(Boolean)){finish(type);return;}render();},{square:i});b.disabled=!!mark||ended;b.setAttribute('aria-label',`第 ${i+1} 格，${mark||'空白'}`);return b;}));}
   render();area.append(button('重新開始這一局',()=>{cells.fill('');ended=false;message('新的一局，你先下。');render();},{action:'retry'}));
  },
 };
 document.getElementById('quest-close').addEventListener('click',()=>{clean();ui.close();});
 document.addEventListener('explorer:panelclose',()=>{if(panel.hidden)clean();});
 return {open,get activeState(){return activeState;},get shop(){return shop;}};
}
