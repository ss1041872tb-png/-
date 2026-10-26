import { createFoodView, foodImage } from './food-view.js?v=6.7.0';
export function createUI(shops, onPause, onPreferences = () => {}, services = {}) {
  const $ = id => document.getElementById(id);
  const foodView=createFoodView();
  const drawer = $('drawer'), journal = $('journal'), help = $('help');
  const panels = [drawer, journal, help, $('reward'), $('arcade')];
  const preferences = { powerSaving: false, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  const preferencesKey = 'zhonghe-food-preferences-v1';
  try {
    const saved = JSON.parse(localStorage.getItem(preferencesKey));
    if (saved && typeof saved.powerSaving === 'boolean') preferences.powerSaving = saved.powerSaving;
    if (saved && typeof saved.reducedMotion === 'boolean') preferences.reducedMotion = saved.reducedMotion;
  } catch { /* Unavailable storage does not prevent changing settings for this session. */ }
  document.body.classList.toggle('reduce-effects',preferences.reducedMotion);
  $('power-saving').checked = preferences.powerSaving;
  $('reduced-motion').checked = preferences.reducedMotion;
  const background = [...document.querySelectorAll('#world, .topbar, .intro, .bottom-bar, #mobile, #navigator, #interact, #hunt-hud, #door-hint, #furniture-labels, #inspection, .camera-toolbar, #overview-hint')];
  const visited = services.campaign.visited;let selectedShop=null;
  let returnFocus = null, toastTimer;
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3600);
  }
  const buttons = shops.map(shop => {
    const button = document.createElement('button'); button.className = 'badge'; button.dataset.shopId = shop.id;
    const icon = document.createElement('span'); icon.textContent = shop.emoji; const picture=document.createElement('img');picture.src=foodImage(shop.id);picture.alt=shop.tags[0]+'原創 3D 美食';picture.className='collection-food';picture.hidden=true;icon.append(picture);
    const name = document.createElement('div'); name.append(document.createTextNode(shop.name));
    const state = document.createElement('small'); name.append(state); button.append(icon, name);
    button.addEventListener('click', () => showShop(shop,false)); $('badges').append(button);
    return { button, state, shop, picture };
  });
  function updateProgress() {
    $('count').textContent = visited.size;
    $('journal-toggle').setAttribute('aria-label', `美食收集箱，已收藏 ${visited.size} / 10 道美食`);
    for (const { button, state, shop, picture } of buttons) {
      const collected = visited.has(shop.id); button.classList.toggle('collected', collected);picture.hidden=!collected;
      state.textContent = collected ? '✓ 已收藏' : `◇ ${services.campaign.count(shop.id)} / 2 關・查看店家資訊`;
    }
    $('storage-notice').hidden = services.campaign.storageAvailable;
    $('task-count').textContent = services.campaign.stages.reduce((a,b)=>a+b,0);
    $('completion').hidden = visited.size !== shops.length;
    $('reset-progress').disabled = visited.size === 0 && services.campaign.stages.every(n=>n===0);
    $('achievement').textContent = visited.size === 10 ? '🏆 十站達成！你是中和美食旅人。' : `已收藏 ${visited.size} / 10 道美食，下一站也值得期待。`;
  }
  function close(restore = true) {
    foodView.hide();
    const wasOpen = panels.some(panel => !panel.hidden);
    panels.forEach(panel => { panel.hidden = true; });
    $('reset-confirm').hidden = true; document.body.classList.remove('panel-open');
    $('journal-toggle').setAttribute('aria-expanded', 'false');
    background.forEach(element => { element.inert = false; });
    onPause(false);
    document.dispatchEvent(new Event('explorer:panelclose'));
    if (restore && wasOpen && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
  function openPanel(panel, focusTarget) {
    foodView.hide();
    if (panels.every(p => p.hidden)) returnFocus = document.activeElement;
    panels.forEach(p => { p.hidden = true; }); panel.hidden = false;
    document.body.classList.add('panel-open');
    background.forEach(element => { element.inert = true; });
    onPause(true);
    $('journal-toggle').setAttribute('aria-expanded', String(panel === journal));
    focusTarget.focus({ preventScroll: true });
  }
  function showShop(shop, collect = true) {
    if (collect && !services.campaign.unlocked(shop.id)) { services.requestShop(shop); return; }
    document.body.classList.add('exploring');selectedShop=shop;
    const isNew = collect && !visited.has(shop.id);
    if (collect) updateProgress();
    $('stamp').textContent = collect ? '✓ 已收集招牌美食' : visited.has(shop.id)?'✓ 已收藏招牌美食':'資料預覽・門口闖關獲得美食';
    $('shop-name').textContent = shop.name; $('category').textContent = shop.category;
    $('description').textContent = shop.description; $('address').textContent = shop.address;
    $('shop-number').textContent = `TASTY STOP ${String(shop.id).padStart(2, '0')} / 10`;
    $('image-note').textContent='原創 3D 餐點示意・非店家實拍';
    services.sound.play(isNew ? 'win' : 'click');
    $('tags').replaceChildren(...shop.tags.map(tag => { const span = document.createElement('span'); span.className = 'tag'; span.textContent = tag; return span; }));
    const query=encodeURIComponent(shop.name+' '+shop.address);
    $('navigation').href=`https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=walking`;
    $('map-listing').href=`https://www.google.com/maps/search/?api=1&query=${query}`;
    $('web-info').href=`https://www.google.com/search?q=${encodeURIComponent(shop.name+' '+shop.address+' 營業時間 菜單')}`;
    $('food-reviews').href=`https://www.google.com/search?q=${encodeURIComponent(shop.name+' '+shop.address+' 食記 評價')}`;
    updateProgress(); openPanel(drawer, $('close')); foodView.show(shop,preferences);
    if (isNew) toast(visited.size === 10 ? '🏆 十站達成！獲得「中和美食旅人」成就！' : `✦ 已收藏 ${shop.name} · ${visited.size} / 10`);
  }
  $('shop-guide').addEventListener('click',()=>{if(selectedShop)services.guideShop(selectedShop);});
  $('close').addEventListener('click', () => close());
  $('journal-close').addEventListener('click', () => close());
  $('help-close').addEventListener('click', () => close());
  $('help-done').addEventListener('click', () => { document.body.classList.add('exploring'); close(); });
  $('help-toggle').addEventListener('click', () => openPanel(help, $('help-close')));
  $('journal-toggle').addEventListener('click', () => {
    if (!journal.hidden) close(); else { close(false); openPanel(journal, $('journal-close')); }
  });
  $('reset-progress').addEventListener('click', () => {
    $('reset-confirm').hidden = false; $('reset-cancel').focus();
  });
  $('reset-cancel').addEventListener('click', () => {
    $('reset-confirm').hidden = true; $('reset-progress').focus();
  });
  $('reset-confirm-button').addEventListener('click', () => {
    services.campaign.reset(); updateProgress();
    $('reset-confirm').hidden = true; $('journal-close').focus();
    toast('美食收集箱已重新開始，下一個街角見！');
  });
  for (const [id, key] of [['power-saving', 'powerSaving'], ['reduced-motion', 'reducedMotion']]) {
    $(id).addEventListener('change', () => {
      preferences[key] = $(id).checked;
      try { localStorage.setItem(preferencesKey, JSON.stringify(preferences)); }
      catch { toast('這次設定已套用；瀏覽器暫時無法永久儲存。'); }
      document.body.classList.toggle('reduce-effects',preferences.reducedMotion);
      onPreferences(preferences);
    });
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); return; }
    const panel = panels.find(p => !p.hidden);
    if (event.key !== 'Tab' || !panel) return;
    const items = [...panel.querySelectorAll('button:not(:disabled), a[href], input')].filter(e => e.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  function updateSound() {
    $('sound-toggle').textContent = services.sound.enabled ? '🔊' : '🔇';
    $('sound-toggle').setAttribute('aria-pressed', String(services.sound.enabled));
    $('sound-toggle').setAttribute('aria-label', services.sound.enabled ? '關閉音效' : '開啟音效');
    $('music-enabled').checked=services.sound.musicEnabled; $('sound-enabled').checked = services.sound.enabled; $('sound-volume').value = services.sound.volume;
  }
  $('sound-toggle').addEventListener('click',()=>{services.sound.setEnabled(!services.sound.enabled);updateSound();services.sound.play('click');});
  $('sound-enabled').addEventListener('change',()=>{services.sound.setEnabled($('sound-enabled').checked);updateSound();});
  $('music-enabled').addEventListener('change',()=>services.sound.setMusicEnabled($('music-enabled').checked));
  $('sound-volume').addEventListener('input',()=>services.sound.setVolume($('sound-volume').value));
  services.campaign.subscribe(updateProgress); updateSound();
  updateProgress();
  return { visited, preferences, showShop, close, toast, openPanel, get paused() { return panels.some(panel => !panel.hidden); } };
}
