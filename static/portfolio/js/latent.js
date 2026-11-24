/* Hero: the portfolio as a latent space.
   Each project category is a cluster of points — like an embedding space —
   labelled in the overlay. Cursor orbits the camera; scrolling disperses it. */
import * as THREE from "three";

const canvas = document.querySelector("[data-latent]");
const labelLayer = document.querySelector("[data-latent-labels]");
const dataEl = document.getElementById("latent-clusters");

if (canvas && dataEl) {
  try { init(JSON.parse(dataEl.textContent)); } catch (err) { console.warn("Latent hero disabled:", err); }
}

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2831853 * r()); }

function init(categories) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = innerWidth < 760;
  const r = rand(80);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 11);
  const group = new THREE.Group();
  scene.add(group);

  // ---- cluster centres on a loose spiral so they read as distinct groups
  const clusters = (categories.length ? categories : [["ml", "Machine learning"]]).map(([key, label], i, arr) => {
    const t = i / arr.length;
    const ang = t * Math.PI * 2 + 0.6;
    const rad = 3.3 + (i % 2) * 1.0;
    return {
      key, label,
      center: new THREE.Vector3(Math.cos(ang) * rad * 1.25, Math.sin(ang * 1.3) * 1.6, Math.sin(ang) * rad * 0.9),
      spread: 0.55 + r() * 0.35,
    };
  });
  const hot = 0; // first cluster glows in the accent colour

  // ---- points
  const perCluster = small ? 260 : 520;
  const dust = small ? 700 : 1600;
  const total = clusters.length * perCluster + dust;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const size = new Float32Array(total);
  const phase = new Float32Array(total);
  const bone = new THREE.Color("#ece8df"), signal = new THREE.Color("#ff4d1a"), dim = new THREE.Color("#6f6b62");
  let k = 0;
  clusters.forEach((c, ci) => {
    for (let i = 0; i < perCluster; i++, k++) {
      const s = c.spread;
      pos[k * 3] = c.center.x + gauss(r) * s * 1.2;
      pos[k * 3 + 1] = c.center.y + gauss(r) * s * 0.8;
      pos[k * 3 + 2] = c.center.z + gauss(r) * s;
      const isHot = ci === hot && r() > 0.35;
      const cc = isHot ? signal : r() > 0.82 ? dim : bone;
      col.set([cc.r, cc.g, cc.b], k * 3);
      size[k] = (isHot ? 1.25 : 1) * (0.6 + Math.pow(r(), 3) * 2.2);
      phase[k] = r() * 6.28;
    }
  });
  for (let i = 0; i < dust; i++, k++) {
    const u = r() * 2 - 1, th = r() * 6.28, rad = 4 + Math.pow(r(), 0.5) * 9;
    const sq = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * sq * rad * 1.5, u * rad * 0.7, Math.sin(th) * sq * rad], k * 3);
    col.set([dim.r, dim.g, dim.b], k * 3);
    size[k] = 0.35 + r() * 0.6;
    phase[k] = r() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));

  const uniforms = {
    uTime: { value: 0 },
    uSpread: { value: 0 },
    uFade: { value: 1 },
    uPixel: { value: renderer.getPixelRatio() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase;
      uniform float uTime, uSpread, uPixel;
      varying vec3 vColor; varying float vDepth;
      void main() {
        vec3 p = position;
        p += 0.06 * vec3(sin(uTime * .6 + aPhase), cos(uTime * .5 + aPhase * 1.3), sin(uTime * .4 + aPhase * .7));
        p *= 1.0 + uSpread * (0.6 + 0.4 * sin(aPhase));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixel * (34.0 / -mv.z);
        vColor = color;
        vDepth = smoothstep(22.0, 6.0, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec3 vColor; varying float vDepth;
      void main() {
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, .05, d);
        gl_FragColor = vec4(vColor, a * (.25 + .75 * vDepth) * uFade);
      }`,
  });
  group.add(new THREE.Points(geo, mat));

  // ---- faint edges: each centroid to a handful of its members (nearest-neighbour feel)
  const edgePos = [];
  clusters.forEach((c, ci) => {
    for (let i = 0; i < 14; i++) {
      const idx = (ci * perCluster + Math.floor(r() * perCluster)) * 3;
      edgePos.push(c.center.x, c.center.y, c.center.z, pos[idx], pos[idx + 1], pos[idx + 2]);
    }
    const next = clusters[(ci + 1) % clusters.length];
    if (clusters.length > 1) edgePos.push(c.center.x, c.center.y, c.center.z, next.center.x, next.center.y, next.center.z);
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xece8df, transparent: true, opacity: 0.07, depthWrite: false });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // ---- HTML labels that track the cluster centres
  const labels = small ? [] : clusters.map((c) => {
    const el = document.createElement("span");
    el.className = "latent-label";
    el.textContent = c.label;
    labelLayer.appendChild(el);
    return el;
  });

  // ---- sizing
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 760 ? 15 : 11;
    group.position.x = w < 760 ? 0 : 1.6;
    group.position.y = w < 760 ? 1.6 : 0.4;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  // ---- input
  const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  let scrollP = 0;
  const hero = canvas.closest(".hero");
  function readScroll() {
    const h = hero.offsetHeight;
    scrollP = Math.min(1, Math.max(0, scrollY / h));
  }
  addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !reduced) loop(); }).observe(hero);

  const v = new THREE.Vector3();
  const clock = new THREE.Clock();
  let running = false;

  function frame() {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    eased.x += (pointer.x - eased.x) * 0.04;
    eased.y += (pointer.y - eased.y) * 0.04;
    group.rotation.y = t * 0.045 + eased.x * 0.45 + scrollP * 1.2;
    group.rotation.x = -0.12 + eased.y * 0.18 + scrollP * 0.3;
    uniforms.uSpread.value = scrollP * 0.9;
    uniforms.uFade.value = 1 - scrollP * 0.85;
    edgeMat.opacity = 0.07 * (1 - scrollP);
    renderer.render(scene, camera);

    const w = canvas.clientWidth, h = canvas.clientHeight;
    labels.forEach((el, i) => {
      v.copy(clusters[i].center).applyMatrix4(group.matrixWorld).project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const inFront = v.z < 1 && x > 40 && x < w - 160 && y > 90 && y < h * 0.62;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = inFront ? String(Math.max(0, 0.9 - scrollP * 2.5)) : "0";
    });
  }
  function loop() {
    if (running) return;
    running = true;
    const step = () => {
      if (!visible) { running = false; return; }
      frame();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if (reduced) frame(); else loop();
  canvas.style.opacity = "0";
  canvas.style.transition = "opacity 1.6s cubic-bezier(.16,1,.3,1)";
  requestAnimationFrame(() => (canvas.style.opacity = "1"));
}
