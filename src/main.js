import { shops } from './data.js';
import { createUI } from './ui.js';
import { createControls } from './controls.js';
import { createNavigation } from './navigation.js';

const loading = document.getElementById('loading');
function fail(message) {
  loading.hidden = true; document.getElementById('error').hidden = false;
  document.getElementById('error-message').textContent = message;
}
document.getElementById('retry').addEventListener('click', () => location.reload());
let controls, worldInstance;
let graphicsAvailable = true;
const ui = createUI(shops, paused => controls?.setPaused(paused || !graphicsAvailable), preferences => worldInstance?.setPreferences(preferences));
const timeout = setTimeout(() => fail('載入時間較長，請確認網站檔案完整並重新載入。'), 20000);
try {
  const { createWorld } = await import('./world.js');
  const world = createWorld(document.getElementById('world'), shops);
  worldInstance = world; world.setPreferences(ui.preferences);
  controls = createControls(world, { select: shop => ui.showShop(shop) });
  controls.setPaused(ui.paused);
  const navigation = createNavigation(world, ui);
  world.updateCamera(controls.view, true);
  world.renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault(); graphicsAvailable = false; controls.setPaused(true);
    document.getElementById('navigator').hidden = true; fail('3D 顯示連線已中斷，請關閉其他高負載分頁後重新載入。');
  });
  window.addEventListener('resize', () => { world.resize(); world.updateCamera(controls.view, true); });
  let previous = performance.now(), elapsed = 0;
  function animate(now) {
    requestAnimationFrame(animate);
    if (ui.preferences.powerSaving && now - previous < 1000 / 30) return;
    const dt = Math.min((now - previous) / 1000, .04); previous = now; elapsed += dt;
    if (!document.hidden && graphicsAvailable) {
      const keys = controls.keys;
      let x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      let z = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
      const moving = !ui.paused && !!(x || z);
      let didMove = false;
      if (moving) {
        const n = Math.hypot(x, z); x = x / n * dt * 7; z = z / n * dt * 7;
        const pos = world.player.position, oldX = pos.x, oldZ = pos.z;
        const clear = (nx, nz) => world.canStand(nx, nz) && !world.npcs.some(npc => Math.hypot(nx - npc.g.position.x, nz - npc.g.position.z) < .95);
        if (clear(pos.x + x, pos.z)) pos.x += x;
        if (clear(pos.x, pos.z + z)) pos.z += z;
        didMove = pos.x !== oldX || pos.z !== oldZ;
        world.player.rotation.y = Math.atan2(x, z);
      }
      world.walk(world.player, didMove && !ui.preferences.reducedMotion, elapsed);
      navigation.update(elapsed);
      if (!ui.preferences.reducedMotion) world.updateNPCs(dt, elapsed);
      world.updateCamera(controls.view, ui.preferences.reducedMotion);
      world.setSigns(ui.visited, controls.hovered);
      world.renderer.render(world.scene, world.camera);
    }
  }
  world.renderer.render(world.scene, world.camera);
  clearTimeout(timeout); loading.hidden = true; document.getElementById('error').hidden = true;
  document.body.dataset.ready = 'true'; requestAnimationFrame(animate);
  // Opt-in browser test interface; absent from the ordinary application.
  if (new URLSearchParams(location.search).has('test')) {
    window.__explorer = { world, controls, ui, shops, navigation };
  }
} catch (error) {
  clearTimeout(timeout); graphicsAvailable = false;
  console.error('美食小鎮載入失敗', error);
  fail('無法建立 3D 街區。請確認網站檔案完整，並使用支援 WebGL 的瀏覽器；你仍可開啟美食護照查看店家資訊。');
}
