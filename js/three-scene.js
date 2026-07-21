/* ============================================================
   Payne Detailing Group — three-scene.js
   Stylized rotating 3D "foam cannon" hero element.

   NOTE FOR JAYDEN: this is a procedurally-built placeholder model
   (primitives assembled in code) so the hero has a real 3D moment
   without needing a modeled asset yet. Swap this out for an actual
   scanned/modeled foam-cannon .glb file later (via GLTFLoader) for
   a fully photoreal version — the rotation/scroll behavior below
   will work the same way with a real model dropped in.
   ============================================================ */

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08080a, 0.045);

  const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0.4, 7.5);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  /* ---- lighting: gold rim + cool fill, dark premium studio feel ---- */
  const ambient = new THREE.AmbientLight(0x2a2a30, 1.1);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0xc9a86a, 38, 30);
  keyLight.position.set(4, 4, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x88a0ff, 14, 30);
  rimLight.position.set(-5, -2, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xf4f0e8, 0.5);
  fillLight.position.set(-3, 5, 2);
  scene.add(fillLight);

  /* ---- group: the "foam cannon" assembled from primitives ----
     Modeled after MTM Hydro-style foam cannons specifically (confirmed
     via product research — "MTM Hydro" is the closest real brand match
     for what was asked for). Verified real-world reference details used
     here: a chemical-injection metering knob on TOP of the body (not a
     ring around the barrel), a wide-mouth bottle that threads directly
     onto the underside of the body (short, direct connection — not a
     long hanging neck), a pistol-grip trigger handle at the rear/underside
     with the pressure-washer inlet at the bottom of the grip, and an
     adjustable fan nozzle at the front. No brand decals/text/logos are
     applied anywhere on the model — geometry only. ---- */
  const rig = new THREE.Group();
  scene.add(rig);

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a, metalness: 0.85, roughness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, metalness: 0.6, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.5 });

  // local axes: +X = forward (toward the nozzle), +Y = up, the bottle and grip hang on -Y

  // main body block (chemical metering housing) — sits between the grip and the barrel
  const bodyBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.32, 0.75, 28), darkMat);
  bodyBlock.rotation.z = Math.PI / 2;
  bodyBlock.position.x = -0.05;
  rig.add(bodyBlock);

  // chemical injection metering knob, on TOP of the body block
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.28, 20), goldMat);
  knob.position.set(-0.05, 0.46, 0);
  rig.add(knob);
  const knobCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 20), darkMat);
  knobCap.position.set(-0.05, 0.61, 0);
  rig.add(knobCap);

  // front barrel / wand, leading to the nozzle
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.19, 1.55, 32), darkMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 0.95;
  rig.add(barrel);

  // fan-adjustment collar at the nozzle base (twist to widen/narrow spray)
  const collar2 = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.05, 14, 36), goldMat);
  collar2.rotation.y = Math.PI / 2;
  collar2.position.x = 1.62;
  rig.add(collar2);

  // nozzle cone, apex pointing forward (+X)
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 32), goldMat);
  nozzle.rotation.z = -Math.PI / 2;
  nozzle.position.x = 1.92;
  rig.add(nozzle);

  // pistol grip, hanging below/behind the body block — this is what you hold
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.17, 0.85, 24), darkMat);
  grip.rotation.z = Math.PI * 0.92; // tilted back slightly, like a real pistol grip
  grip.position.set(-0.62, -0.45, 0);
  rig.add(grip);

  // trigger, in front of the grip
  const trigger = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 24, Math.PI * 1.3), darkMat);
  trigger.rotation.z = Math.PI * 0.15;
  trigger.position.set(-0.32, -0.28, 0);
  rig.add(trigger);

  // inlet quick-connect fitting at the bottom of the grip
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 18), goldMat);
  inlet.position.set(-0.78, -0.92, 0);
  rig.add(inlet);

  // wide-mouth bottle, threaded directly onto the underside of the body block
  const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 0.18, 32), darkMat);
  bottleNeck.position.set(0.05, 0.02, 0);
  rig.add(bottleNeck);

  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 1.55, 40), glassMat);
  bottle.position.set(0.05, -0.88, 0);
  rig.add(bottle);

  // decorative gold accent rings around the bottle
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.60, 0.02, 12, 48), goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.05, -0.45 - i * 0.42, 0);
    rig.add(ring);
  }

  // floating foam particles (small emissive spheres) for atmosphere
  const particles = new THREE.Group();
  const particleMat = new THREE.MeshStandardMaterial({ color: 0xf0d9a3, emissive: 0xc9a86a, emissiveIntensity: 0.4, roughness: 0.4 });
  for (let i = 0; i < 22; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.045 + Math.random() * 0.05, 10, 10), particleMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.6 + Math.random() * 1.6;
    s.position.set(
      Math.cos(angle) * radius,
      -1.2 + Math.random() * 3.2,
      Math.sin(angle) * radius * 0.6
    );
    s.userData.speed = 0.2 + Math.random() * 0.4;
    s.userData.offset = Math.random() * Math.PI * 2;
    particles.add(s);
  }
  scene.add(particles);

  rig.rotation.y = 0.55;
  rig.position.set(0.4, 0.15, 0);
  rig.scale.setScalar(1.35);

  /* ---- scroll-linked rotation ---- */
  let scrollRotation = 0;
  function updateScrollRotation() {
    const scrollY = window.scrollY || window.pageYOffset;
    const heroHeight = window.innerHeight;
    const progress = Math.min(scrollY / heroHeight, 1.4);
    scrollRotation = progress * Math.PI * 1.4;
  }
  window.addEventListener('scroll', updateScrollRotation, { passive: true });
  updateScrollRotation();

  /* ---- resize handling ---- */
  function onResize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', onResize);

  /* ---- render loop ---- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    rig.rotation.y = 0.55 + t * 0.18 + scrollRotation;
    rig.rotation.x = Math.sin(t * 0.35) * 0.05;
    rig.position.y = 0.15 + Math.sin(t * 0.6) * 0.12;

    particles.children.forEach((p) => {
      p.position.y += Math.sin(t * p.userData.speed + p.userData.offset) * 0.0015;
      p.rotation.y = t * p.userData.speed;
    });
    particles.rotation.y = t * 0.05;

    renderer.render(scene, camera);
  }
  animate();
})();
