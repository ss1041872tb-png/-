export function createControls(world, callbacks) {
  const canvas = world.renderer.domElement, keys = new Set();
  const view = { angle: .48, pitch: .95, distance: 136, follow: false, firstPerson:false, panMode:false,panX:0,panY:0,zoom:1 };
  let pointer = null, hovered = null, paused = false;
  const pointers = new Map();
  let gesture = false, lastPinch = 0;
  const clampZoom = value => Math.max(32, Math.min(150, value));
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
  function focusPlayer(){if(!view.follow){view.follow=true;view.distance=48;world.updateCamera(view,true);}document.body.classList.add('exploring');}
  const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
  window.addEventListener('keydown', e => {
    if (!movementKeys.has(e.key.toLowerCase()) || paused || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    focusPlayer();
    e.preventDefault(); keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  canvas.addEventListener('pointerdown', e => {
    if (paused || ![0,1].includes(e.button)) return;
    e.preventDefault();
    document.body.classList.add('exploring');
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size > 1 || gesture) {
      gesture = true; pointer = null; lastPinch = pinchDistance();
      hovered = null; hoverLabel.hidden = true; return;
    }
    pointer = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false, rotate:e.pointerType==='touch'?false:e.button===0, touch:e.pointerType==='touch',path:0,turn:0,heading:null,curve:false,lastSample:{x:e.clientX,y:e.clientY},initial:{angle:view.angle,panX:view.panX||0,panY:view.panY||0}, button:e.button };
    canvas.focus({ preventScroll: true }); canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (paused) return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const distance = pinchDistance();
      if (lastPinch > 0 && distance > 0) view.zoom = Math.max(.55,Math.min(3,(view.zoom||1)*distance/lastPinch));
      lastPinch = distance; return;
    }
    if (gesture) return;
    if (pointer?.id === e.pointerId) {
      const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      if (Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) > 6) pointer.moved = true;
      if(pointer.touch){const sx=e.clientX-pointer.lastSample.x,sy=e.clientY-pointer.lastSample.y,length=Math.hypot(sx,sy);if(length>4){const heading=Math.atan2(sy,sx);if(pointer.heading!==null)pointer.turn+=Math.atan2(Math.sin(heading-pointer.heading),Math.cos(heading-pointer.heading));pointer.heading=heading;pointer.path+=length;pointer.lastSample={x:e.clientX,y:e.clientY};if(!pointer.curve&&pointer.path>55&&Math.abs(pointer.turn)>2.7&&Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)/pointer.path<.9){pointer.curve=true;pointer.rotationBase=pointer.turn;}}}
      if (pointer.moved) {
        if(pointer.touch&&pointer.curve){view.panX+=(pointer.initial.panX-view.panX)*.35;view.panY+=(pointer.initial.panY-view.panY)*.35;view.angle=pointer.initial.angle-(pointer.turn-pointer.rotationBase);}
        else {
        if(!pointer.rotate){view.panX=Math.max(-innerWidth*.6,Math.min(innerWidth*.6,(view.panX||0)+dx));view.panY=Math.max(-innerHeight*.6,Math.min(innerHeight*.6,(view.panY||0)+dy));}else{view.angle -= dx * .005; view.pitch = Math.max(.48, Math.min(1.2, view.pitch + dy * .004));}
        }
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
    if(pointer?.id===e.pointerId&&pointer.curve){view.panX=pointer.initial.panX;view.panY=pointer.initial.panY;}
    pointers.delete(e.pointerId);
    if (pointer?.id === e.pointerId) pointer = null;
    if (pointers.size < 2) lastPinch = 0;
    if (!pointers.size) gesture = false;
  }
  canvas.addEventListener('pointerup', e => {
    const clicked = pointer?.id === e.pointerId && pointer.button===0 && !pointer.moved && !gesture;
    releasePointer(e);
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = pointers.size ? 'grabbing' : 'grab';
    if (clicked && !paused) { const shop = world.pick(e.clientX, e.clientY); if (shop) callbacks.select(shop); }
  });
  canvas.addEventListener('auxclick',e=>e.preventDefault());
  canvas.addEventListener('pointercancel', clear);
  canvas.addEventListener('lostpointercapture', releasePointer);
  canvas.addEventListener('pointerleave', () => { hovered = null; hoverLabel.hidden = true; });
  canvas.addEventListener('wheel', e => {
    if (paused) return; document.body.classList.add('exploring'); e.preventDefault(); view.zoom = Math.max(.55,Math.min(3,(view.zoom||1)*Math.exp(-e.deltaY*.0015)));
  }, { passive: false });
  document.querySelectorAll('#mobile button').forEach(button => {
    const release = () => { keys.delete(button.dataset.key); button.classList.remove('held'); };
    button.addEventListener('pointerdown', e => {
      if (paused) return; focusPlayer(); e.preventDefault(); button.setPointerCapture(e.pointerId);
      keys.add(button.dataset.key); button.classList.add('held');
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
  });
  document.getElementById('reset-view').addEventListener('click', () => {
    clear(); document.body.classList.remove('exploring'); Object.assign(view, { angle: .48, pitch: .95, distance: 136, follow: false,panX:0,panY:0,firstPerson:false,zoom:1 });
    document.getElementById('camera-mode').textContent='第一人稱';document.getElementById('camera-mode').setAttribute('aria-pressed','false');
    world.player.position.set(world.spawn.x, 0, world.spawn.z); world.updateCamera(view, true);
  });
  document.getElementById('start-adventure').addEventListener('click',focusPlayer);
  document.getElementById('camera-mode').addEventListener('click',e=>{view.firstPerson=!view.firstPerson;view.follow=true;clear();e.currentTarget.textContent=view.firstPerson?'切回俯視':'第一人稱';e.currentTarget.setAttribute('aria-pressed',String(view.firstPerson));});
  document.getElementById('center-camera').addEventListener('click',()=>{view.panX=0;view.panY=0;});
  return { keys, view, clear, focusPlayer, get hovered() { return hovered; }, setPaused(value) { paused = value; clear(); } };
}
