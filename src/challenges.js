import { plans, gameNames } from './campaign.js?v=2.1.0';

export function createChallenges(campaign, ui, sound, world, celebration) {
 const panel=document.getElementById('quest'),area=document.getElementById('quest-game'),feedback=document.getElementById('quest-feedback');
 let shop=null,session=0,activeState=null;
 const timers=new Set();
 function clean(){session++;for(const timer of timers)clearTimeout(timer);timers.clear();area.replaceChildren();activeState=null;feedback.textContent='';}
 function later(fn,delay){const generation=session;const timer=setTimeout(()=>{timers.delete(timer);if(generation===session&&!panel.hidden)fn();},delay);timers.add(timer);}
 function button(label,action,options={}){const b=document.createElement('button');b.type='button';b.textContent=label;for(const [k,v]of Object.entries(options))b.dataset[k]=v;b.addEventListener('click',()=>{sound.play('click');action(b);});return b;}
 function message(text,wrong=false){feedback.textContent=text;if(wrong)sound.play('wrong');}
 function paragraph(text){const p=document.createElement('p');p.className='game-instructions';p.textContent=text;area.append(p);return p;}
 function instructions(goal,steps,tip){const box=document.createElement('section');box.className='mission-guide';const heading=document.createElement('h4');heading.textContent='🎯 這關的目標';box.append(heading);const p=paragraph(goal);box.append(p);const how=document.createElement('h4');how.textContent='🎮 跟著這樣玩';box.append(how);const list=document.createElement('ol');for(const text of steps){const item=document.createElement('li');item.textContent=text;list.append(item);}box.append(list);if(tip){const note=document.createElement('div');note.className='mission-tip';note.textContent='💡 '+tip;box.append(note);}area.append(box);}
 function grid(className){const g=document.createElement('div');g.className=className;area.append(g);return g;}
 function finish(type){if(!campaign.complete(shop.id,type))return;clean();world.setQuestProgress(campaign.stages);if(campaign.unlocked(shop.id))celebration.launch(shop);else sound.play('win');renderHeader();document.getElementById('quest-game-title').textContent=campaign.unlocked(shop.id)?'🏆 三關制霸！開橋迎賓':'✨ 挑戰成功，太棒了！';if(campaign.unlocked(shop.id)){const medal=document.createElement('div');medal.className='victory-medal';const icon=document.createElement('span');icon.textContent='✦';icon.setAttribute('aria-hidden','true');const text=document.createElement('strong');text.textContent=`${shop.emoji} ${shop.name} · 挑戰達成 3 / 3`;medal.append(icon,text);area.append(medal);}paragraph(campaign.unlocked(shop.id)?'三關完成！柵欄已打開，小橋已鋪好。回到街區，走過橋後點招牌收藏美食。':'這一關完成！進度已保存，可以繼續下一道街角任務。');const next=button(campaign.unlocked(shop.id)?'回街區，過橋探店 →':'挑戰下一關 →',()=>campaign.unlocked(shop.id)?ui.close():start());next.className='primary-button';next.id='quest-next';area.append(next);next.focus({preventScroll:true});}
 function renderHeader(){document.getElementById('quest-title').textContent=`${shop.name}・街角任務`;document.getElementById('quest-progress').replaceChildren(...plans[shop.id-1].map((type,i)=>{const e=document.createElement('span');e.className='quest-step'+(i<campaign.count(shop.id)?' done':'');e.textContent=`${i<campaign.count(shop.id)?'✓':i+1} ${gameNames[type]}`;return e;}));}
 function open(selected){shop=selected;clean();renderHeader();panel.dataset.game='intro';document.getElementById('quest-game-title').textContent='準備開始這一站的任務';ui.openPanel(panel,document.getElementById('quest-close'));paragraph('每家店有三道不同任務。通關後柵欄才會打開；最後要親自走過小橋、點招牌才能集章。已完成的關卡會保存，未完成的小遊戲離開後會重新開始。');const begin=button(`開始第 ${campaign.count(shop.id)+1} 關 →`,start);begin.id='quest-begin';begin.className='primary-button';area.append(begin);}
 function start(){clean();renderHeader();const type=plans[shop.id-1][campaign.count(shop.id)];if(!type){ui.close();return;}panel.dataset.game=type;document.getElementById('quest-game-title').textContent=gameNames[type];games[type](type);const first=area.querySelector('button');first?.focus({preventScroll:true});}
 const games={
  bridge(type){
   instructions('拼好三塊橋面，幫大家搭一座小橋！',['從材料箱選一塊積木。','按「旋轉」，對準橋墩標示的角度。','點相同顏色的橋墩放下，完成三塊。'],'顏色和角度都要正確；放錯可以繼續試。');
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
   instructions('贏下兩次猜拳，成為街角猜拳王！',['選石頭、布或剪刀，守門員同時隨機出拳。','累積贏兩次就過關，平手與落敗可繼續。'],'石頭勝剪刀 · 剪刀勝布 · 布勝石頭。');let wins=0;const names=['石頭','布','剪刀'],icons=['✊','✋','✌️'];const score=paragraph('目前勝場：0 / 2'),choices=grid('rps-choices');activeState={type,wins};
   names.forEach((name,i)=>choices.append(button(`${icons[i]} ${name}`,()=>{const opponent=Math.floor(Math.random()*3),win=(i-opponent+3)%3===1;if(win){wins++;activeState.wins=wins;sound.play('place');}message(`你出${name}，守門員出${names[opponent]}。${i===opponent?'平手，再來一次！':win?'你贏了！':'這次落敗，可以繼續挑戰。'}`,!win&&i!==opponent);score.textContent=`目前勝場：${wins} / 2`;if(wins===2)finish(type);},{move:i})));
  },
  puzzle(type){
   instructions('把數字送回家：排成 1～8，空格留在右下角！',['只點緊鄰空格的數字，把它滑進空格。','完成 1・2・3 ／ 4・5・6 ／ 7・8・空格。'],'盤面一定有解，不限時間，慢慢想就好。');
   const cells=[1,2,3,4,5,6,7,8,0];let blank=8,last=-1;
   for(let n=0;n<18+shop.id;n++){const options=[blank-3,blank+3,blank%3>0?blank-1:-1,blank%3<2?blank+1:-1].filter(i=>i>=0&&i<9&&i!==last);const next=options[(shop.id+n*7)%options.length];[cells[blank],cells[next]]=[cells[next],cells[blank]];last=blank;blank=next;}
   if(cells.every((n,i)=>n===(i+1)%9)){[cells[7],cells[8]]=[cells[8],cells[7]];blank=7;}
   const board=grid('sliding-board');activeState={type,cells};
   function render(){board.replaceChildren(...cells.map((value,i)=>{const b=button(value?String(value):'空格',()=>{if(!value)return;const adjacent=Math.abs(i-blank)===3||Math.floor(i/3)===Math.floor(blank/3)&&Math.abs(i-blank)===1;if(!adjacent){message('只能移動緊鄰空格的滑塊。',true);return;}[cells[i],cells[blank]]=[cells[blank],cells[i]];blank=i;sound.play('place');if(cells.every((n,j)=>n===(j+1)%9)){finish(type);return;}render();board.querySelector(`[data-cell="${blank}"]`)?.focus({preventScroll:true});},{cell:i,value});b.classList.toggle('empty',!value);b.setAttribute('aria-label',value?`第 ${i+1} 格，數字 ${value}`:'空格');return b;}));}render();
  },
  memory(type){
   instructions('找齊四對美食，喚醒你的好記性！',['每次點開兩張卡片。','相同就留下，不同會蓋回。','記住位置，把四對全部找出來。'],'沒有倒數，翻錯也不扣分。');
   const symbols=['🍜','🍣','🥟','🍢'],cards=[...symbols,...symbols];for(let i=cards.length-1;i>0;i--){const j=(shop.id*11+i*3)%(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}let first=null,busy=false;const matched=new Set(),board=grid('memory-board');activeState={type,cards,matched};
   cards.forEach((symbol,i)=>{const b=button('？',()=>{if(busy||matched.has(i)||first===i)return;b.textContent=symbol;b.setAttribute('aria-label',`第 ${i+1} 張，${symbol}`);b.classList.add('flipped');if(first===null){first=i;return;}const a=first;first=null;if(cards[a]===symbol){matched.add(a);matched.add(i);board.children[a].disabled=b.disabled=true;sound.play('place');if(matched.size===cards.length)finish(type);}else{busy=true;message('再記一下它們的位置。');later(()=>{for(const index of [a,i]){const cell=board.children[index];cell.textContent='？';cell.classList.remove('flipped');cell.setAttribute('aria-label',`翻開第 ${index+1} 張卡片`);}busy=false;},650);}},{card:i});b.setAttribute('aria-label',`翻開第 ${i+1} 張卡片`);board.append(b);});
  },
  order(type){
   const recipes=[['洗米','蒸煮','淋醬','擺盤'],['煮麵','瀝水','拌醬','上桌'],['備料','調味','煎烤','裝盤']];const recipe=recipes[(shop.id-1)%recipes.length];let position=0,started=false;instructions('記住四步食譜，當一次街角小主廚！',['先讀下方食譜，再按「我記好了」。','依剛才的順序點選四個料理步驟。'],'忘記可以再看食譜，順序錯了從第一步重來。');const hint=paragraph(recipe.map((r,i)=>`${i+1}. ${r}`).join(' → ')),choices=grid('recipe-choices');activeState={type,recipe};
   const begin=button('我記好了，開始配餐',()=>{started=true;position=0;hint.textContent='食譜已收起，請按剛才的順序配餐。';for(const b of choices.children)b.disabled=false;begin.disabled=true;message('先做第一步吧。');},{action:'remember'});area.append(begin);
   [...recipe].reverse().forEach(word=>{const b=button(word,()=>{if(!started)return;if(word!==recipe[position]){position=0;message('順序不對，從第一步重來。也可按「再看食譜」。',true);return;}position++;sound.play('place');message(`已完成 ${position} / 4 步。`);if(position===4)finish(type);},{ingredient:word});b.disabled=true;choices.append(b);});
   area.append(button('再看一次食譜',()=>{started=false;position=0;hint.textContent=recipe.map((r,i)=>`${i+1}. ${r}`).join(' → ');for(const b of choices.children)b.disabled=true;begin.disabled=false;},{action:'reveal'}));
  },
  tictactoe(type){
   instructions('你是 ○，來一場友善的巷口井字棋！',['點空格放 ○，守門員接著放 ×。','橫、直或斜連成三格就獲勝。','平手也過關；落敗可按按鈕再試。'],'沒有次數限制，先搶中心或角落試試。');const cells=Array(9).fill(''),board=grid('tic-board');let ended=false;activeState={type,cells};
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
