export function createControls(world, callbacks) {
  const canvas = world.renderer.domElement, keys = new Set();
  const view = { angle: .35, pitch: .82, distance: 88 };
  let pointer = null, hovered = null, paused = false;
  const pointers = new Map();
  let gesture = false, lastPinch = 0;
  const clampZoom = value => Math.max(32, Math.min(110, value));
  function pinchDistance() {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  const hoverLabel = document.getElementById('hover-label');
  function clear() {
    keys.clear(); pointer = null;
    for (const id of pointers.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    pointers.clear(); gesture = false; lastPinch = 0;
    document.querySelectorAll('#mobile .held').forEach(b => b.classList.remove('held'));
    hovered = null; hoverLabel.hidden = true; canvas.style.cursor = 'grab';
  }
  const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
  window.addEventListener('keydown', e => {
    if (!movementKeys.has(e.key.toLowerCase()) || paused || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    document.body.classList.add('exploring');
    e.preventDefault(); keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  canvas.addEventListener('pointerdown', e => {
    if (paused || e.button !== 0) return;
    e.preventDefault();
    document.body.classList.add('exploring');
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size > 1 || gesture) {
      gesture = true; pointer = null; lastPinch = pinchDistance();
      hovered = null; hoverLabel.hidden = true; return;
    }
    pointer = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false };
    canvas.focus({ preventScroll: true }); canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (paused) return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const distance = pinchDistance();
      if (lastPinch > 0 && distance > 0) view.distance = clampZoom(view.distance * lastPinch / distance);
      lastPinch = distance; return;
    }
    if (gesture) return;
    if (pointer?.id === e.pointerId) {
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) > 6) pointer.moved = true;
      if (pointer.moved) {
        view.angle -= dx * .005; view.pitch = Math.max(.48, Math.min(1.2, view.pitch + dy * .004));
        hovered = null; hoverLabel.hidden = true;
      }
      pointer.x = e.clientX; pointer.y = e.clientY;
    } else if (e.pointerType !== 'touch') {
      hovered = world.pick(e.clientX, e.clientY);
      canvas.style.cursor = hovered ? 'pointer' : 'grab'; hoverLabel.hidden = !hovered;
      if (hovered) {
        hoverLabel.textContent = `${hovered.name} ↗`;
        hoverLabel.style.left = `${Math.max(8, Math.min(innerWidth - 245, e.clientX + 15))}px`;
        hoverLabel.style.top = `${Math.min(innerHeight - 55, e.clientY + 18)}px`;
      }
    }
  });
  function releasePointer(e) {
    pointers.delete(e.pointerId);
    if (pointer?.id === e.pointerId) pointer = null;
    if (pointers.size < 2) lastPinch = 0;
    if (!pointers.size) gesture = false;
  }
  canvas.addEventListener('pointerup', e => {
    const clicked = pointer?.id === e.pointerId && !pointer.moved && !gesture;
    releasePointer(e);
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = pointers.size ? 'grabbing' : 'grab';
    if (clicked && !paused) { const shop = world.pick(e.clientX, e.clientY); if (shop) callbacks.select(shop); }
  });
  canvas.addEventListener('pointercancel', clear);
  canvas.addEventListener('lostpointercapture', releasePointer);
  canvas.addEventListener('pointerleave', () => { hovered = null; hoverLabel.hidden = true; });
  canvas.addEventListener('wheel', e => {
    if (paused) return; document.body.classList.add('exploring'); e.preventDefault(); view.distance = clampZoom(view.distance + e.deltaY * .035);
  }, { passive: false });
  document.querySelectorAll('#mobile button').forEach(button => {
    const release = () => { keys.delete(button.dataset.key); button.classList.remove('held'); };
    button.addEventListener('pointerdown', e => {
      if (paused) return; document.body.classList.add('exploring'); e.preventDefault(); button.setPointerCapture(e.pointerId);
      keys.add(button.dataset.key); button.classList.add('held');
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
  });
  document.getElementById('reset-view').addEventListener('click', () => {
    clear(); document.body.classList.remove('exploring'); Object.assign(view, { angle: .35, pitch: .82, distance: 88 });
    world.player.position.set(0, 0, 0); world.updateCamera(view, true);
  });
  return { keys, view, clear, get hovered() { return hovered; }, setPaused(value) { paused = value; clear(); } };
}
