/**
 * Sanchaara AI — Hero 3D Scene
 * Interactive Cyber-Traffic Grid of Bangalore with Volumetric Hotspot Beacons
 */

import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ─── Renderer ─────────────────────────────────────────────── */
const canvas   = document.getElementById('hero-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping        = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.35;

/* ─── Scene + Camera ───────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03060d);
scene.fog = new THREE.FogExp2(0x03060d, 0.022);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 52, 10);
camera.lookAt(0, 0, 0);

/* ─── Ground Plane ─────────────────────────────────────────── */
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x010408, roughness: 0.95, metalness: 0 })
);
groundMesh.rotation.x = -Math.PI / 2;
scene.add(groundMesh);

/* Grid helper - very subtle background reference */
const grid = new THREE.GridHelper(80, 48, 0x00152a, 0x000814);
grid.position.y = 0.002;
scene.add(grid);

/* ─── Street Coordinates ───────────────────────────────────── */
const streetXs = [-17.5, -14, -10.5, -7, -3.5, 0, 3.5, 7, 10.5, 14, 17.5];
const streetZs = [-17.5, -14, -10.5, -7, -3.5, 0, 3.5, 7, 10.5, 14, 17.5];

/* Draw glowing neon street lines */
const streetLinesGroup = new THREE.Group();
const streetLineMat = new THREE.LineBasicMaterial({
  color: 0x0088cc,
  transparent: true,
  opacity: 0.16,
});

// Vertical streets
for (const x of streetXs) {
  const points = [
    new THREE.Vector3(x, 0.005, -18.5),
    new THREE.Vector3(x, 0.005, 18.5)
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, streetLineMat);
  streetLinesGroup.add(line);
}

// Horizontal streets
for (const z of streetZs) {
  const points = [
    new THREE.Vector3(-18.5, 0.005, z),
    new THREE.Vector3(18.5, 0.005, z)
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, streetLineMat);
  streetLinesGroup.add(line);
}
scene.add(streetLinesGroup);

/* ─── City Buildings (Wireframe + Core) ─────────────────────── */
const buildingGroup = new THREE.Group();
const buildingsList = [];
const baseBoxGeo = new THREE.BoxGeometry(1, 1, 1);

for (let i = 0; i < streetXs.length - 1; i++) {
  for (let j = 0; j < streetZs.length - 1; j++) {
    // Create plazas occasionally
    if (Math.random() > 0.76) continue;

    const x0 = streetXs[i];
    const x1 = streetXs[i+1];
    const z0 = streetZs[j];
    const z1 = streetZs[j+1];

    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;

    const distToCenter = Math.sqrt(cx * cx + cz * cz);
    const scaleFactor = Math.max(0.1, 1 - distToCenter / 24.0);

    // Height tall in center, short at bounds
    const h = Math.max(0.3, scaleFactor * 9.8 * (0.35 + Math.random() * 0.75));
    const w = (x1 - x0) - 0.75;
    const d = (z1 - z0) - 0.75;

    // Core solid geometry (dark metal)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x02070f,
      roughness: 0.25,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const core = new THREE.Mesh(baseBoxGeo, coreMat);
    core.scale.set(w, h, d);
    core.position.set(cx, -h * 4.0, cz); // buried initial state

    // Outline wireframe edges
    const edges = new THREE.EdgesGeometry(baseBoxGeo);
    const wireCol = Math.random() > 0.55 ? 0x00ffd1 : 0x8b5cf6;
    const wireMat = new THREE.LineBasicMaterial({
      color: wireCol,
      transparent: true,
      opacity: 0.3,
    });
    const wire = new THREE.LineSegments(edges, wireMat);
    wire.scale.set(w, h, d);
    wire.position.copy(core.position);

    buildingGroup.add(core);
    buildingGroup.add(wire);

    buildingsList.push({
      core,
      wire,
      h,
      targetY: h / 2,
    });
  }
}
scene.add(buildingGroup);

/* ─── Moving Cyber Vehicles (Traffic flow) ─────────────────── */
const VEHICLE_COUNT = 160;
const vehicles = [];
const vehicleGeom = new THREE.BoxGeometry(0.1, 0.06, 0.32);
const vehicleGroup = new THREE.Group();

const flowColors = [0x00ffd1, 0xffb020, 0xff4757, 0x8b5cf6];

for (let i = 0; i < VEHICLE_COUNT; i++) {
  const col = flowColors[Math.floor(Math.random() * flowColors.length)];
  const mat = new THREE.MeshBasicMaterial({ color: col });
  const mesh = new THREE.Mesh(vehicleGeom, mat);

  // Pick random coordinates
  const xIdx = Math.floor(Math.random() * streetXs.length);
  const zIdx = Math.floor(Math.random() * streetZs.length);
  const startX = streetXs[xIdx];
  const startZ = streetZs[zIdx];

  mesh.position.set(startX, 0.035, startZ);

  // Set initial properties
  const axis = Math.random() > 0.5 ? 'x' : 'z';
  const dir = Math.random() > 0.5 ? 1 : -1;

  vehicles.push({
    mesh,
    xIdx,
    zIdx,
    axis,
    dir,
    speed: 0.05 + Math.random() * 0.07,
    startX,
    startZ,
    targetX: startX,
    targetZ: startZ,
    distance: 1.0,
    progress: 1.0 // Trigger next point selection immediately
  });
  vehicleGroup.add(mesh);
}
scene.add(vehicleGroup);

/* ─── Volumetric Hotspot Beacons ────────────────────────────── */
const hotspotsList = [];
const hotspotSpheres = [];

const junctionNames = [
  'M.G. Road Cross', 'Silk Board Interchange', 'Indiranagar 100ft Rd',
  'Hebbal Flyover Zone', 'KR Market Square', 'Richmond Road Cross',
  'Electronic City Gate', 'Whitefield ITPL Loop', 'Koramangala 80ft Rd',
  'Majestic Interchange', 'Hudson Circle', 'Town Hall Junction',
  'Domlur Flyover Core', 'Trinity Circle Circle', 'Nagawara Ring Rd',
  'Jayanagar 4th Block'
];

// Generate intersections for potential hotspot placement
const intersections = [];
for (let i = 2; i < streetXs.length - 2; i++) {
  for (let j = 2; j < streetZs.length - 2; j++) {
    intersections.push({ x: streetXs[i], z: streetZs[j] });
  }
}

// Pick random intersection list
intersections.sort(() => Math.random() - 0.5);
const selectedHotspots = intersections.slice(0, 32);

for (let i = 0; i < selectedHotspots.length; i++) {
  const pt = selectedHotspots[i];
  const px = pt.x;
  const pz = pt.z;

  const score = Math.random();
  let col, label;
  if (score < 0.35) {
    col = new THREE.Color(0x00FFD1);
    label = 'Low Intensity';
  } else if (score < 0.70) {
    col = new THREE.Color(0xFFB020);
    label = 'High Congestion';
  } else {
    col = new THREE.Color(0xFF4757);
    label = 'Critical Enforcement';
  }

  const radius = 0.16 + score * 0.16;
  const beamHeight = 5.0 + score * 8.0;
  const juncName = junctionNames[i % junctionNames.length] + ` (Zone #${101 + i})`;

  // 1. Core Sphere (Pulse node)
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshBasicMaterial({ color: col })
  );
  sphere.position.set(px, radius + 0.05, pz);
  scene.add(sphere);
  hotspotSpheres.push(sphere);

  // 2. Volumetric additively blended beacon cylinder
  const beamGeom = new THREE.CylinderGeometry(radius * 0.25, radius * 2.4, beamHeight, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const beam = new THREE.Mesh(beamGeom, beamMat);
  beam.position.set(px, beamHeight / 2, pz);
  scene.add(beam);

  // 3. Ground ring
  const ringGeom = new THREE.RingGeometry(radius * 1.6, radius * 2.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: col,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(px, 0.02, pz);
  scene.add(ring);

  hotspotsList.push({
    core: sphere,
    beam: beam,
    ring: ring,
    px, pz,
    baseY: radius + 0.05,
    score,
    color: col,
    junction: juncName,
    violations: Math.floor(1900 + score * 8100),
    severity: label,
    phase: Math.random() * Math.PI * 2,
    speed: 1.0 + Math.random() * 0.7
  });
}

/* ─── Particles ─────────────────────────────────────────────── */
const PCNT = 2600;
const pPos = new Float32Array(PCNT * 3);
const pCol = new Float32Array(PCNT * 3);
const pSpd = new Float32Array(PCNT);
const pDrX = new Float32Array(PCNT);
const pDrZ = new Float32Array(PCNT);

const colA = new THREE.Color(0x001530);
const colB = new THREE.Color(0x00FFD1);

for (let i = 0; i < PCNT; i++) {
  pPos[i*3]   = (Math.random() - 0.5) * 46;
  pPos[i*3+1] = Math.random() * 26 - 3;
  pPos[i*3+2] = (Math.random() - 0.5) * 46;
  pSpd[i]     = 0.005 + Math.random() * 0.012;
  pDrX[i]     = (Math.random() - 0.5) * 0.002;
  pDrZ[i]     = (Math.random() - 0.5) * 0.002;
  const t = Math.random();
  const c = new THREE.Color().lerpColors(colA, colB, t);
  pCol[i*3] = c.r; pCol[i*3+1] = c.g; pCol[i*3+2] = c.b;
}

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
const pMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.45, sizeAttenuation: true });
const particleSystem = new THREE.Points(pGeo, pMat);
scene.add(particleSystem);

/* ─── Lights ─────────────────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0x040c1a, 0.95));

const tealLight = new THREE.PointLight(0x00FFD1, 3.2, 45);
tealLight.position.set(0, 10, 0);
scene.add(tealLight);

const coralLight = new THREE.PointLight(0xFF4757, 1.8, 30);
coralLight.position.set(-10, 6, -10);
scene.add(coralLight);

const amberLight = new THREE.PointLight(0xFFB020, 1.6, 28);
amberLight.position.set(10, 6, 10);
scene.add(amberLight);

/* ─── Post-processing (Bloom) ──────────────────────────────── */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.15, // strength
  0.55, // radius
  0.06  // threshold
);
composer.addPass(bloom);

/* ─── Animation State & Events ─────────────────────────────── */
let mouseTargX = 0, mouseTargZ = 0;
let curCamX    = 0, curCamZ    = 0;
let autoAngle  = Math.PI * 0.15;
const CAM_END  = new THREE.Vector3(4, 12, 26);
const CAM_START = new THREE.Vector3(0, 50, 12);
const INTRO_DUR = 3200;
const BLDG_START = 300;
const BLDG_DUR   = 2600;
let introDone    = false;
const t0         = performance.now();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredHotspot = null;
const tooltip = document.getElementById('hero-tooltip');

document.addEventListener('mousemove', (e) => {
  mouseTargX = (e.clientX / window.innerWidth - 0.5) * 4.5;
  mouseTargZ = (e.clientY / window.innerHeight - 0.5) * -2.5;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (tooltip && hoveredHotspot) {
    tooltip.style.left = (e.clientX + 16) + 'px';
    tooltip.style.top = (e.clientY + 16) + 'px';
  }
}, { passive: true });

/* Easing */
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutExpo  = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);

/* ─── Render Loop ───────────────────────────────────────────── */
function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const ms  = now - t0;
  const sec = ms * 0.001;

  /* Camera entrance sweep & auto orbiting */
  const camP = Math.min(ms / INTRO_DUR, 1);
  const camE = easeOutCubic(camP);

  if (!introDone) {
    camera.position.lerpVectors(CAM_START, CAM_END, camE);
    camera.lookAt(0, 0, 0);
    if (camP >= 1) {
      introDone = true;
      curCamX   = camera.position.x;
      curCamZ   = camera.position.z;
    }
  } else {
    // Parallax + orbit
    autoAngle += 0.00035;
    const targX = Math.sin(autoAngle) * 26 + mouseTargX;
    const targZ = Math.cos(autoAngle) * 26 + mouseTargZ;
    curCamX += (targX - curCamX) * 0.032;
    curCamZ += (targZ - curCamZ) * 0.032;
    camera.position.set(curCamX, 12.5 - mouseTargZ * 1.1, curCamZ);
    camera.lookAt(0, 0.4, 0);
  }

  /* Rise buildings up */
  if (ms > BLDG_START) {
    const bp  = Math.min((ms - BLDG_START) / BLDG_DUR, 1);
    const bpe = easeOutExpo(bp);
    for (const b of buildingsList) {
      const y = THREE.MathUtils.lerp(-b.h * 4, b.targetY, bpe);
      b.core.position.y = y;
      b.wire.position.y = y;
    }
  }

  /* Hotspot beacon pulse */
  for (const h of hotspotsList) {
    const pulse = (Math.sin(sec * h.speed + h.phase) + 1) * 0.5;
    h.core.scale.setScalar(0.9 + pulse * 0.28);
    h.core.position.y = h.baseY + Math.sin(sec * 1.1 + h.phase) * 0.07;

    h.beam.scale.set(1 + pulse * 0.14, 1, 1 + pulse * 0.14);
    h.beam.material.opacity = 0.11 + (1 - pulse) * 0.12;

    const ringT = ((sec * 0.45 + h.phase) % Math.PI) / Math.PI;
    h.ring.scale.setScalar(1.0 + ringT * 4.2);
    h.ring.material.opacity = (1 - ringT) * 0.42;
  }

  /* Moving Vehicles Logic */
  for (const v of vehicles) {
    if (v.progress >= 1.0) {
      // Reached previous destination, choose next intersection
      v.mesh.position.set(v.targetX, 0.035, v.targetZ);

      const curAxis = v.axis;
      let nextAxis = curAxis;
      let nextDir = v.dir;

      // 40% probability of turning at intersection
      if (Math.random() < 0.4) {
        nextAxis = curAxis === 'x' ? 'z' : 'x';
        nextDir = Math.random() > 0.5 ? 1 : -1;
      }

      // Check boundary limits
      if (nextAxis === 'x') {
        if (v.xIdx === 0) nextDir = 1;
        else if (v.xIdx === streetXs.length - 1) nextDir = -1;
      } else {
        if (v.zIdx === 0) nextDir = 1;
        else if (v.zIdx === streetZs.length - 1) nextDir = -1;
      }

      v.axis = nextAxis;
      v.dir = nextDir;

      // Increment index
      if (v.axis === 'x') {
        v.xIdx += v.dir;
      } else {
        v.zIdx += v.dir;
      }

      v.startX = v.mesh.position.x;
      v.startZ = v.mesh.position.z;
      v.targetX = streetXs[v.xIdx];
      v.targetZ = streetZs[v.zIdx];
      v.progress = 0.0;

      const dx = v.targetX - v.startX;
      const dz = v.targetZ - v.startZ;
      v.distance = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));
    }

    // Move forward
    v.progress += (v.speed / v.distance);
    if (v.progress > 1.0) v.progress = 1.0;

    v.mesh.position.x = v.startX + (v.targetX - v.startX) * v.progress;
    v.mesh.position.z = v.startZ + (v.targetZ - v.startZ) * v.progress;

    // Face direction of target
    v.mesh.lookAt(v.targetX, v.mesh.position.y, v.targetZ);
  }

  /* Raycasting hotspot checks */
  if (introDone) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hotspotSpheres);

    if (intersects.length > 0) {
      const hitSphere = intersects[0].object;
      const hotspot = hotspotsList.find(h => h.core === hitSphere);

      if (hotspot && hoveredHotspot !== hotspot) {
        // Reset old hover
        if (hoveredHotspot) {
          hoveredHotspot.core.scale.setScalar(1);
          hoveredHotspot.beam.scale.set(1, 1, 1);
          hoveredHotspot.beam.material.opacity = 0.18;
        }

        hoveredHotspot = hotspot;
        hotspot.core.scale.setScalar(1.5);
        hotspot.beam.scale.set(1.3, 1.1, 1.3);
        hotspot.beam.material.opacity = 0.42;

        if (tooltip) {
          const badgeClass = hotspot.score < 0.35 ? 'badge-teal' : hotspot.score < 0.70 ? 'badge-amber' : 'badge-coral';
          const colHex = hotspot.score < 0.35 ? '#00ffd1' : hotspot.score < 0.70 ? '#ffb020' : '#ff4757';

          tooltip.innerHTML = `
            <div style="font-size: 9px; font-weight: 700; color: #505a72; letter-spacing:0.05em; text-transform: uppercase; margin-bottom: 2px;">Data Node</div>
            <div style="font-family: var(--font-display); font-size: 13px; font-weight: 700; color: #edf2ff; margin-bottom: 5px;">${hotspot.junction}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
              <span class="badge ${badgeClass}" style="padding: 1px 6px; font-size: 9px; font-weight:700;">${hotspot.severity}</span>
              <span style="font-family: var(--font-display); font-size: 12px; font-weight: 700; color: ${colHex};">Score: ${hotspot.score.toFixed(2)}</span>
            </div>
            <div style="font-size: 11px; color: #a8b4cc;">Est. Violations: <strong>${hotspot.violations.toLocaleString()}</strong></div>
          `;
          tooltip.style.display = 'block';
        }
      }
    } else {
      if (hoveredHotspot) {
        hoveredHotspot.core.scale.setScalar(1);
        hoveredHotspot.beam.scale.set(1, 1, 1);
        hoveredHotspot.beam.material.opacity = 0.18;
        hoveredHotspot = null;
        if (tooltip) tooltip.style.display = 'none';
      }
    }
  }

  /* Particles drifting */
  for (let i = 0; i < PCNT; i++) {
    pPos[i*3]   += pDrX[i];
    pPos[i*3+1] += pSpd[i];
    pPos[i*3+2] += pDrZ[i];
    if (pPos[i*3+1] > 26) {
      pPos[i*3+1] = -3;
      pPos[i*3]   = (Math.random() - 0.5) * 46;
      pPos[i*3+2] = (Math.random() - 0.5) * 46;
    }
  }
  pGeo.attributes.position.needsUpdate = true;

  /* Ambient Point Light pulse */
  tealLight.intensity = 2.8 + Math.sin(sec * 0.75) * 0.45;
  tealLight.position.x = Math.sin(sec * 0.16) * 5;
  tealLight.position.z = Math.cos(sec * 0.16) * 5;

  composer.render();
}

/* ─── Resize ─────────────────────────────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}, { passive: true });

tick();
