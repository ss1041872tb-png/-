// Coordinates describe the fictional scene, never real-world geography.
export function createNavigation(world, ui) {
  const $ = id => document.getElementById(id);
  const root = $('navigator'), content = $('map-content'), toggle = $('map-toggle');
  const mapPosition = (x, z) => ({ x: (x + 42) / 84 * 280, y: (z + 25) / 50 * 160 });
  const stops = world.buildings.map(building => ({
    shop: building.shop, x: building.x, z: Math.sign(building.z) * 8,
    map: mapPosition(building.x, building.z),
  }));
  let target = null, previousCount = -1, lastTick = -Infinity, lastHint = '';
  function expand(open) {
    content.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    $('map-chevron').textContent = open ? '−' : '＋';
  }
  const points = stops.map(stop => {
    const button = document.createElement('button'); button.className = 'map-shop';
    button.dataset.destinationId = stop.shop.id; button.textContent = stop.shop.id;
    button.style.left = `${stop.map.x / 280 * 100}%`; button.style.top = `${stop.map.y / 160 * 100}%`;
    button.addEventListener('click', () => { choose(stop); update(0, true); });
    $('map-shops').append(button); return { button, stop };
  });
  function choose(stop) {
    target = stop; lastHint = ''; world.setDestination(stop?.shop.id);
    document.body.classList.add('exploring');
    $('destination-name').textContent = stop ? stop.shop.name : '十站達成，美食旅人！';
    for (const point of points) {
      point.button.setAttribute('aria-pressed', String(point.stop === stop));
    }
  }
  function nearest() {
    const p = world.player.position;
    const remaining = stops.filter(stop => !ui.visited.has(stop.shop.id));
    remaining.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z) || a.shop.id - b.shop.id);
    choose(remaining[0] || null);
  }
  toggle.addEventListener('click', () => {
    document.body.classList.add('exploring'); expand(content.hidden); update(0, true);
  });
  $('next-stop').addEventListener('click', () => { nearest(); update(0, true); });
  $('destination-open').addEventListener('click', () => {
    // Recheck distance: moving away or changing targets must not leave a stale action.
    if (target && Math.hypot(world.player.position.x - target.x, world.player.position.z - target.z) < 2.3) ui.showShop(target.shop);
  });
  function update(time, force = false) {
    if (!force && time - lastTick < .12) return;
    lastTick = time;
    if (previousCount !== ui.visited.size) {
      const firstUpdate = previousCount < 0;
      previousCount = ui.visited.size;
      for (const { button, stop } of points) {
        const collected = ui.visited.has(stop.shop.id);
        button.classList.toggle('collected', collected);
        button.setAttribute('aria-label', `${stop.shop.id} ${stop.shop.name}，${collected ? '已收藏' : '未收藏'}，設為下一站`);
        button.title = stop.shop.name;
      }
      if (firstUpdate || !target || ui.visited.has(target.shop.id)) nearest();
      $('next-stop').disabled = ui.visited.size === stops.length;
      $('next-stop').textContent = ui.visited.size === stops.length ? '✓ 十家美食已全數收藏' : '✦ 找未探索的店家';
    }
    const p = world.player.position, point = mapPosition(p.x, p.z);
    $('map-player').setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${180 - world.player.rotation.y * 180 / Math.PI})`);
    const distance = target ? Math.hypot(p.x - target.x, p.z - target.z) : Infinity;
    const arrived = distance < 2.3;
    const hint = target ? arrived ? '到店前了！點選招牌或下方按鈕收藏。' : '沿街步行，跟著金色路標前進。' : '點選地圖上的店家，重溫喜歡的味道。';
    // Screen readers announce state transitions, not a changing distance every frame.
    const hintKey = `${target?.shop.id || 0}/${arrived}`;
    if (hintKey !== lastHint) { $('destination-hint').textContent = hint; lastHint = hintKey; }
    $('destination-distance').textContent = target && !arrived ? `場景距離約 ${Math.ceil(distance / .8)} 步` : '';
    $('destination-open').hidden = !arrived;
    const end = target ? mapPosition(target.x, target.z) : point;
    $('map-direction').setAttribute('d', target ? `M${point.x} ${point.y}L${end.x} ${end.y}` : '');
  }
  expand(matchMedia('(min-width: 701px)').matches);
  // Initial selection should not dismiss the welcome title before the player interacts.
  const wasExploring = document.body.classList.contains('exploring');
  update(0, true);
  if (!wasExploring) document.body.classList.remove('exploring');
  root.hidden = false;
  return { update, get target() { return target; } };
}
