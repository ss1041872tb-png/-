import * as THREE from '../vendor/three.module.js';

export function createWorld(container, shops) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d7e3cf');
  scene.fog = new THREE.Fog('#d7e3cf', 110, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '3D 美食街區；使用 WASD 或方向鍵移動，拖曳旋轉視角，也可使用美食護照選取店家。');
  container.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, .1, 240);
  scene.add(new THREE.HemisphereLight('#fff6df', '#8aab93', 1.9));
  const sun = new THREE.DirectionalLight('#fff0d6', 2.5);
  sun.position.set(-30, 55, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, far: 140 });
  sun.shadow.bias = -.001;
  sun.shadow.normalBias = .05;
  scene.add(sun);
  const materials = new Map();
  function mat(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .9 }));
    return materials.get(color);
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeo = new THREE.IcosahedronGeometry(1, 1);
  function box(w, h, d, color, x, y, z, parent = scene) {
    const mesh = new THREE.Mesh(boxGeo, typeof color === 'string' ? mat(color) : color);
    mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function ball(r, color, x, y, z, parent = scene) {
    const mesh = new THREE.Mesh(sphereGeo, mat(color));
    mesh.scale.setScalar(r); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  const obstacles = [];
  function obstacle(x, z, w, d) { obstacles.push({ x, z, w: w / 2, d: d / 2 }); }
  box(87, 2, 53, '#adbc9a', 0, -1.6, 0);
  box(85, .55, 51, '#b9cd9b', 0, -.35, 0);
  box(81, .1, 11, '#7c8d87', 0, .01, 0);
  for (const z of [-7.4, 7.4]) {
    box(81, .3, 3.5, '#e4d7b6', 0, .12, z);
    box(81, .12, .22, '#f6efd7', 0, .25, Math.sign(z) * 5.7);
    for (let x = -39; x < 40; x += 2.7) box(.035, .015, 3.3, '#cfc6a6', x, .278, z);
  }
  for (let x = -38; x < 40; x += 4.4) box(2.1, .025, .12, '#f4d775', x, .08, 0);
  for (const x of [-20.8, 20.8]) for (let z = -4.3; z < 5; z += 1.25) box(3, .025, .65, '#f6efdb', x, .09, z);
  // Painted curb edges and road islands evoke a small Taiwanese neighborhood.
  for (const z of [-5.55, 5.55]) for (let x = -39; x < 40; x += 3) box(1.5, .13, .16, '#c7765e', x, .16, z);
  const palette = ['#e8b791', '#9bbbaa', '#e3ce9b', '#c3b2cb', '#99bfc0', '#d59a83', '#b5c18e', '#bca4a1', '#dfc29e', '#a4b8a4'];
  const signMeshes = [], buildings = [];
  function label(text, number) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#24493f'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#e8d7a7'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, 996, 228);
    ctx.fillStyle = '#f6e9bd'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let size = 84; do { ctx.font = `800 ${size--}px "Noto Sans TC", sans-serif`; } while (ctx.measureText(text).width > 918);
    ctx.fillText(text, 512, 107);
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#b7ceb0'; ctx.fillText(`中 和 食 光    /    ${String(number).padStart(2, '0')}`, 512, 202);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return t;
  }
  shops.forEach((shop, i) => {
    const x = (i % 5 - 2) * 14, side = i < 5 ? -1 : 1, z = side * 15, front = -side;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const h = 5.7 + (i % 3) * .7;
    box(11.3, h, 7.2, palette[i], 0, h / 2 + .3, 0, g);
    obstacle(x, z, 11.5, 7.4);
    box(11.8, .35, 7.7, '#f4e7c9', 0, h + .45, 0, g);
    box(10.7, .18, 6.7, '#80938b', 0, h + .7, 0, g);
    // Water tank, tiled parapet, AC units, shop windows and continuous arcade.
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(.65, .65, 1.2, 12), mat('#c8d0bf'));
    tank.position.set(-3.6, h + 1.3, side * 1.3); tank.castShadow = true; g.add(tank);
    box(11.8, .23, 3.2, '#f4e4be', 0, 3.4, front * 4.65, g);
    for (const cx of [-5.1, 5.1]) {
      box(.32, 3.1, .32, '#f6e9cb', cx, 1.8, front * 5.7, g);
      obstacle(x + cx, z + front * 5.7, .4, .4);
    }
    for (let j = 0; j < 9; j++) box(1.25, .18, 1.6, j % 2 ? '#f6dfaa' : '#ba715b', -5 + j * 1.25, 3.6, front * 4.8, g);
    for (const cx of [-3.6, 0, 3.6]) {
      box(2.5, 2.5, .12, '#547c73', cx, 1.7, front * 3.66, g);
      box(.07, 2.6, .15, '#f3e2bd', cx, 1.7, front * 3.76, g);
      if (cx !== 0) box(2.5, .08, .15, '#f3e2bd', cx, 1.6, front * 3.78, g);
      box(1.8, .95, .13, '#5e8079', cx, h - .7, -front * 3.68, g);
      box(2, .14, .35, '#f4e4c2', cx, h - 1.3, -front * 3.7, g);
    }
    box(1.5, .65, .45, '#dedccb', 4, h - .6, front * 3.85, g);
    for (let j = 0; j < 5; j++) box(1.15, .025, .05, '#a6ada1', 4, h - .83 + j * .1, front * 4.09, g);
    for (const cx of [-4.5, 4.5]) {
      ball(.33, '#d78458', cx, 2.85, front * 5.3, g);
      box(.05, .35, .05, '#75583d', cx, 3.15, front * 5.3, g);
    }
    box(2.6, .85, 1.2, '#b48a63', -2.5, .65, front * 4.5, g);
    obstacle(x - 2.5, z + front * 4.5, 2.7, 1.3);
    for (let j = 0; j < 3; j++) ball(.25, '#cba65d', -3.2 + j * .65, 1.2, front * 4.5, g);
    // Each roof sign is readable from either side of the street, never mirrored.
    box(.15, 1.7, .15, '#65746a', -3.6, h + 1.2, 0, g);
    box(.15, 1.7, .15, '#65746a', 3.6, h + 1.2, 0, g);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#eedab0', emissive: '#eab965', emissiveIntensity: .1 });
    const frame = box(11, 2.8, .36, frameMat, 0, h + 2.45, 0, g);
    const texture = label(shop.name, shop.id);
    const signMaterial = new THREE.MeshBasicMaterial({ map: texture, color: '#ffffff' });
    const faces = [];
    for (const facing of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 2.45), signMaterial);
      plane.position.set(0, h + 2.45, facing * .2); plane.rotation.y = facing === 1 ? 0 : Math.PI;
      plane.userData.shop = shop; g.add(plane); signMeshes.push(plane); faces.push(plane);
    }
    frame.userData.shop = shop; signMeshes.push(frame);
    buildings.push({ g, x, z, h, shop, frame, frameMat, signMaterial, faces });
  });
  // Low-poly foliage, planters, lamps and parked scooters stay clear of NPC lanes.
  for (const z of [-8.4, 8.4]) for (const x of [-35, -21, -7, 7, 21, 35]) {
    box(1.3, .5, 1.3, '#a99877', x, .4, z); box(.25, 2, .25, '#957456', x, 1.6, z);
    ball(1.15, '#7ba477', x, 3.1, z); ball(.85, '#91b886', x + .5, 3.6, z);
    obstacle(x, z, 1.3, 1.3);
  }
  for (const x of [-32, -17.5, 3.5, 17.5, 32]) for (const z of [-8.8, 8.8]) {
    box(.13, 4.6, .13, '#54746a', x, 2.5, z);
    box(1, .12, .12, '#54746a', x + .4, 4.75, z);
    box(.75, .17, .45, '#fff3c8', x + .8, 4.65, z);
    obstacle(x, z, .3, .3);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(); scene.add(g); const x = -30 + i * 28, z = side * 10;
    g.position.set(x, .1, z); g.rotation.y = -.4 * side;
    for (const offset of [-.65, .65]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .18, 10), mat('#4f5f59')); wheel.rotation.z = Math.PI / 2; wheel.position.set(0, .35, offset); g.add(wheel); }
    box(.6, .65, 1.2, palette[i + 2], 0, .8, 0, g); box(.55, .18, .8, '#455e56', 0, 1.2, -.2, g);
    box(.6, .9, .22, palette[i + 2], 0, 1, .65, g); box(.9, .08, .08, '#53635a', 0, 1.65, .6, g);
    obstacle(x, z, 1.3, 2.2);
  }
  // Background homes provide a city silhouette without additional textures or lights.
  for (let i = 0; i < 12; i++) {
    const x = -38 + i * 7, h = 5 + i % 4 * 1.2;
    for (const side of [-1, 1]) {
      box(5.7, h, 4, ['#b9c7ae', '#cad0b3', '#b3c5b5'][i % 3], x, h / 2, side * 23);
      box(6, .25, 4.3, '#e3dfc5', x, h + .1, side * 23);
      for (let y = 2; y < h; y += 2) for (const dx of [-1.4, 1.4]) box(1, .9, .07, '#8ca9a0', x + dx, y, side * 20.96);
      obstacle(x, side * 23, 5.8, 4.2);
    }
  }
  // Batch static scenery by shared geometry/material; characters and signs stay interactive.
  scene.updateMatrixWorld(true);
  const batches = new Map();
  scene.traverse(object => {
    if (!object.isMesh || object.userData.shop || ![boxGeo, sphereGeo].includes(object.geometry)) return;
    const key = `${object.geometry.uuid}/${object.material.uuid}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  for (const meshes of batches.values()) {
    const batch = new THREE.InstancedMesh(meshes[0].geometry, meshes[0].material, meshes.length);
    meshes.forEach((mesh, i) => { batch.setMatrixAt(i, mesh.matrixWorld); mesh.removeFromParent(); });
    batch.castShadow = true; batch.receiveShadow = true; scene.add(batch);
  }
  function person(type, color) {
    const g = new THREE.Group(); scene.add(g);
    const torso = box(.65, .85, .42, color, 0, 1.37, 0, g);
    ball(.36, '#e9ba91', 0, 2.02, 0, g); ball(.36, '#4f5143', 0, 2.18, -.055, g);
    const limbs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * .18, .98, 0); g.add(leg);
      box(.23, .72, .24, '#48615e', 0, -.38, 0, leg); box(.26, .17, .4, '#f1e7cc', 0, -.79, .07, leg);
      const arm = new THREE.Group(); arm.position.set(side * .43, 1.7, 0); g.add(arm);
      box(.2, .63, .22, color, 0, -.3, 0, arm); ball(.12, '#e9ba91', 0, -.65, 0, arm);
      limbs.push({ leg, arm, side });
    }
    if (type === '學生') box(.48, .65, .23, '#b39163', 0, 1.4, -.34, g);
    if (type === '上班族') { box(.12, .46, .04, '#c48365', 0, 1.48, .24, g); box(.35, .42, .17, '#715e4b', .7, .8, 0, g); }
    if (type === '遊客') { box(.9, .1, .75, '#e6ce93', 0, 2.35, 0, g); box(.55, .25, .48, '#e6ce93', 0, 2.5, 0, g); box(.3, .25, .14, '#4b655f', 0, 1.4, .3, g); }
    if (type === '店員') { box(.48, .7, .04, '#f3e6c4', 0, 1.15, .24, g); box(.6, .25, .5, '#fff3d3', 0, 2.4, 0, g); }
    g.userData = { limbs, torso, type }; return g;
  }
  const player = person('旅人', '#dc9b4b');
  const halo = new THREE.Mesh(new THREE.RingGeometry(.62, .76, 32), new THREE.MeshBasicMaterial({ color: '#fff0aa', side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = .12; player.add(halo);
  const npcs = [];
  const routeLength = 140 + 26;
  function route(t) {
    t = ((t % routeLength) + routeLength) % routeLength;
    if (t < 70) return { x: -35 + t, z: -6.5, yaw: Math.PI / 2 };
    if (t < 83) return { x: 35, z: -6.5 + t - 70, yaw: 0 };
    if (t < 153) return { x: 35 - (t - 83), z: 6.5, yaw: -Math.PI / 2 };
    return { x: -35, z: 6.5 - (t - 153), yaw: Math.PI };
  }
  for (let i = 0; i < 14; i++) {
    const type = ['學生', '上班族', '遊客'][i % 3];
    const g = person(type, ['#779aa7', '#eee4c9', '#c48c73'][i % 3]); g.scale.setScalar(.85);
    const t = i * routeLength / 14; const p = route(t); g.position.set(p.x, .15, p.z); g.rotation.y = p.yaw;
    npcs.push({ g, t, speed: 1.5, phase: i, moving: true });
  }
  for (const i of [0, 3, 6, 9]) {
    const b = buildings[i], g = person('店員', '#88a68b'); g.scale.setScalar(.85);
    g.position.set(b.x + 2.5, .2, b.z - Math.sign(b.z) * 5); g.rotation.y = b.z < 0 ? 0 : Math.PI;
    npcs.push({ g, stationary: true, phase: i });
  }
  function canStand(x, z, radius = .43) {
    return Math.abs(x) <= 39 && Math.abs(z) <= 20 && !obstacles.some(o => Math.abs(x - o.x) < o.w + radius && Math.abs(z - o.z) < o.d + radius);
  }
  const destinationMarker = new THREE.Group();
  destinationMarker.visible = false; scene.add(destinationMarker);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#efb44f', side: THREE.DoubleSide });
  const markerRing = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 32), markerMaterial);
  markerRing.rotation.x = -Math.PI / 2; markerRing.position.y = .32;
  const markerArrow = new THREE.Mesh(new THREE.ConeGeometry(.34, .6, 4), markerMaterial);
  markerArrow.rotation.z = Math.PI; markerArrow.position.y = 2.8;
  // Guidance graphics never obstruct the raycast to a real shop sign.
  markerRing.raycast = markerArrow.raycast = () => {};
  destinationMarker.add(markerRing, markerArrow);
  function setDestination(shopId) {
    const building = buildings.find(b => b.shop.id === shopId);
    destinationMarker.visible = !!building;
    if (building) destinationMarker.position.set(building.x, 0, Math.sign(building.z) * 8);
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect(); pointer.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Test only visible nearest geometry so a building cannot be clicked through.
    const hit = raycaster.intersectObjects(scene.children, true).find(h => h.object.visible && h.object.isMesh);
    return hit?.object.userData.shop || null;
  }
  const look = new THREE.Vector3(), desired = new THREE.Vector3();
  function updateCamera(view, snap = false) {
    const distance = view.distance * (innerWidth < 700 ? 1.42 : 1);
    // Shift the town toward the right on desktop, leaving breathing room for the introduction.
    look.set(player.position.x - (innerWidth > 1000 ? 4 : 0), 0, player.position.z);
    desired.set(look.x + Math.sin(view.angle) * Math.cos(view.pitch) * distance, Math.sin(view.pitch) * distance, look.z + Math.cos(view.angle) * Math.cos(view.pitch) * distance);
    if (snap) camera.position.copy(desired); else camera.position.lerp(desired, .12);
    camera.lookAt(look); camera.updateMatrixWorld();
  }
  function walk(g, moving, t, phase = 0) {
    const swing = moving ? Math.sin(t * 9 + phase) * .5 : 0;
    for (const limb of g.userData.limbs) { limb.leg.rotation.x = swing * limb.side; limb.arm.rotation.x = -swing * limb.side * .75; }
    g.userData.torso.position.y = 1.37 + (moving ? Math.abs(Math.sin(t * 9 + phase)) * .035 : 0);
  }
  function updateNPCs(dt, t) {
    for (const npc of npcs) {
      if (npc.stationary) { npc.g.userData.limbs[0].arm.rotation.z = Math.sin(t * 1.6 + npc.phase) * .12; continue; }
      const next = route(npc.t + dt * npc.speed);
      const blocked = Math.hypot(next.x - player.position.x, next.z - player.position.z) < 1.3 || npcs.some(other => other !== npc && Math.hypot(next.x - other.g.position.x, next.z - other.g.position.z) < 1.05);
      if (!blocked) { npc.t += dt * npc.speed; npc.g.position.set(next.x, .15, next.z); }
      let delta = Math.atan2(Math.sin(next.yaw - npc.g.rotation.y), Math.cos(next.yaw - npc.g.rotation.y));
      npc.g.rotation.y += delta * Math.min(1, dt * 8);
      walk(npc.g, !blocked, t, npc.phase);
    }
  }
  function setSigns(visited, hovered) {
    for (const b of buildings) {
      const active = hovered?.id === b.shop.id;
      b.frameMat.emissiveIntensity = active ? 1.5 : visited.has(b.shop.id) ? .45 : .1;
      b.signMaterial.color.set(active ? '#fff2b4' : visited.has(b.shop.id) ? '#d7f6be' : '#ffffff');
    }
  }
  let powerSaving = false;
  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setPixelRatio(powerSaving ? 1 : Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75));
    renderer.setSize(innerWidth, innerHeight);
  }
  function setPreferences(preferences) {
    powerSaving = preferences.powerSaving;
    renderer.shadowMap.enabled = !powerSaving;
    renderer.shadowMap.needsUpdate = true;
    resize();
  }
  return { scene, renderer, camera, player, npcs, buildings, signMeshes, canStand, pick, updateCamera, updateNPCs, walk, setSigns, resize, setDestination, destinationMarker, setPreferences };
}
