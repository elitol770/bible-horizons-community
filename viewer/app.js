import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inspectGlb, MAX_PACKAGE_BYTES } from "/scripts/glb.mjs";
const $ = (id) => document.getElementById(id);
let renderer,
  scene,
  camera,
  controls,
  model,
  mixer,
  clips = [],
  running = false,
  raf = 0,
  metadata,
  looseFile,
  loadRevision = 0,
  markerGroup;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let lastTime = 0,
  resizeObserver;
const say = (text) => {
  $("status").textContent = text;
};
const element = (tag, text) => {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
};
function safeLink(url, text) {
  const a = element("a", text);
  if (/^https:\/\//.test(url)) {
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}
function showMetadata(data) {
  $("title").textContent = data.title;
  $("scope").textContent = `${data.status} · ${data.scope} study`.toUpperCase();
  $("summary").textContent = data.summary;
  $("limitations").textContent = data.limitations;
  const p = data.passage;
  $("passage").textContent = p
    ? `${p.book} ${p.chapter}:${p.verseStart}${p.verseEnd !== p.verseStart ? "–" + p.verseEnd : ""} · ${p.edition}`
    : "No passage metadata supplied";
  if (p?.sourceUrl?.startsWith("https://")) $("passage").href = p.sourceUrl;
  else $("passage").removeAttribute("href");
  $("hotspots").replaceChildren();
  $("detail").replaceChildren();
  for (const hotspot of data.hotspots || []) {
    const button = element("button", hotspot.label);
    button.dataset.hotspot = hotspot.id;
    button.addEventListener("click", () => selectHotspot(hotspot));
    $("hotspots").append(button);
  }
  if (!data.hotspots?.length)
    $("hotspots").append(
      element(
        "p",
        "This loose model has no passage-linked object list. Package it before submitting.",
      ),
    );
  $("credits").replaceChildren();
  for (const file of data.files || []) {
    const p = element("p", `${file.path} — ${file.creator}. `);
    p.append(
      safeLink(
        file.license === "CC0-1.0"
          ? "https://creativecommons.org/publicdomain/zero/1.0/"
          : "https://creativecommons.org/licenses/by/4.0/",
        file.license,
      ),
    );
    p.append(element("span", ` Changes: ${file.changes}`));
    $("credits").append(p);
  }
  if (!data.files?.length)
    $("credits").append(
      element(
        "p",
        "No rights record supplied. Local inspection does not grant permission to reuse or publish.",
      ),
    );
  $("views").replaceChildren();
  for (const view of data.views || []) {
    const b = element("button", view.label);
    b.disabled = !renderer || !model;
    b.addEventListener("click", () => setView(view));
    $("views").append(b);
  }
}
function selectHotspot(h) {
  $("detail").replaceChildren(
    element("p", h.evidenceKind.replaceAll("_", " ")),
    element("p", h.description),
    safeLink(h.sourceUrl, `Source · verses ${h.verseStart}–${h.verseEnd}`),
  );
  for (const b of $("hotspots").children)
    b.setAttribute("aria-pressed", String(b.dataset.hotspot === h.id));
}
function disposeObject(object) {
  if (!object) return;
  const textures = new Set(),
    materials = new Set(),
    geometries = new Set();
  object.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material)
      ? o.material
      : o.material
        ? [o.material]
        : []) {
      materials.add(m);
      for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
    }
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) m.dispose();
  for (const t of textures) {
    t.image?.close?.();
    t.dispose();
  }
  object.removeFromParent();
}
function clearModel() {
  running = false;
  cancelAnimationFrame(raf);
  raf = 0;
  if (mixer) {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
  }
  mixer = null;
  disposeObject(model);
  disposeObject(markerGroup);
  model = null;
  markerGroup = null;
  clips = [];
  updateControls();
}
function updateControls() {
  for (const id of ["reset", "left", "right", "closer", "farther"])
    $(id).disabled = !model;
  for (const b of $("views").children) b.disabled = !model;
  $("motion").disabled = !clips.length;
  $("motion").textContent = running
    ? "Pause animation"
    : clips.length
      ? "Play animation"
      : "No animation";
}
function draw() {
  if (!renderer || !model || document.hidden) return;
  renderer.render(scene, camera);
}
function animate(time) {
  raf = 0;
  if (!running || document.hidden || !model) return;
  mixer?.update(Math.min((time - lastTime) / 1000, 0.05));
  lastTime = time;
  draw();
  raf = requestAnimationFrame(animate);
}
function pause() {
  running = false;
  cancelAnimationFrame(raf);
  raf = 0;
  updateControls();
}
function init() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0xe4e8df);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute(
    "aria-label",
    "3D model; equivalent object descriptions and view buttons are adjacent",
  );
  $("surface").append(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x69705c, 2.3));
  const sun = new THREE.DirectionalLight(0xfff3dc, 3);
  sun.position.set(4, 7, 5);
  scene.add(sun);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.addEventListener("change", draw);
  resizeObserver = new ResizeObserver(() => {
    const r = $("surface").getBoundingClientRect();
    renderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    draw();
  });
  resizeObserver.observe($("surface"));
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    ++loadRevision;
    $("start").disabled = false;
    pause();
    $("cover").hidden = false;
    $("cover-title").textContent = "3D context lost";
    $("start").textContent = "Retry preview";
    say(
      "The model descriptions remain available. Retry to recreate the viewer.",
    );
    clearModel();
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    renderer = null;
  });
  renderer.domElement.addEventListener("click", (event) => {
    if (!markerGroup) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray.intersectObjects(markerGroup.children)[0];
    if (hit) selectHotspot(metadata.hotspots[hit.object.userData.hotspot]);
  });
}
function setView(view) {
  if (!model) return;
  camera.position.fromArray(view.position);
  controls.target.fromArray(view.target);
  controls.update();
  draw();
}
function reset() {
  if (!model) return;
  if (metadata.views?.length) {
    setView(metadata.views[0]);
    return;
  }
  const b = new THREE.Box3().setFromObject(model),
    s = b.getSize(new THREE.Vector3()),
    c = b.getCenter(new THREE.Vector3()),
    r = Math.max(s.x, s.y, s.z, 0.1);
  camera.position.copy(c).add(new THREE.Vector3(r * 1.5, r, r * 1.8));
  controls.target.copy(c);
  controls.update();
  draw();
}
function moveCamera(angle, factor = 1) {
  if (!model) return;
  const offset = camera.position
    .clone()
    .sub(controls.target)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
    .multiplyScalar(factor);
  const length = THREE.MathUtils.clamp(
    offset.length(),
    controls.minDistance,
    controls.maxDistance,
  );
  offset.setLength(length);
  camera.position.copy(controls.target).add(offset);
  controls.update();
  draw();
}
async function start() {
  const revision = ++loadRevision;
  $("start").disabled = true;
  say("Loading local model…");
  try {
    init();
    clearModel();
    const buffer = looseFile
      ? await looseFile.arrayBuffer()
      : await fetch(`/packages/${metadata.id}/${metadata.model}`).then((r) => {
          if (!r.ok) throw new Error("Model request failed");
          return r.arrayBuffer();
        });
    if (revision !== loadRevision) return;
    const info = inspectGlb(buffer);
    const manager = new THREE.LoadingManager();
    let resourceFailed = false;
    manager.onError = () => {
      resourceFailed = true;
    };
    manager.setURLModifier((url) => {
      if (!url.startsWith("blob:"))
        throw new Error("External model resource denied");
      return url;
    });
    const gltf = await new GLTFLoader(manager).parseAsync(buffer, "");
    if (revision !== loadRevision) {
      disposeObject(gltf.scene);
      return;
    }
    if (resourceFailed) {
      disposeObject(gltf.scene);
      throw new Error("Embedded texture failed to load");
    }
    model = gltf.scene;
    scene.add(model);
    clips = gltf.animations;
    mixer = new THREE.AnimationMixer(model);
    for (const clip of clips.slice(0, 1)) mixer.clipAction(clip).play();
    const size = new THREE.Box3()
      .setFromObject(model)
      .getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.1);
    controls.minDistance = radius * 0.2;
    controls.maxDistance = radius * 15;
    markerGroup = new THREE.Group();
    for (const [hIndex, h] of (metadata.hotspots || []).entries()) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.018, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xd6b56b }),
      );
      marker.position.fromArray(h.position);
      marker.userData.hotspot = hIndex;
      markerGroup.add(marker);
    }
    scene.add(markerGroup);
    $("cover").hidden = true;
    updateControls();
    reset();
    const decodedTextures = new Set();
    model.traverse((o) => {
      for (const m of Array.isArray(o.material)
        ? o.material
        : o.material
          ? [o.material]
          : [])
        for (const value of Object.values(m))
          if (value?.isTexture && value.image?.width)
            decodedTextures.add(value);
    });
    $("metrics").textContent =
      `${info.triangles.toLocaleString()} model triangles · ${(buffer.byteLength / 1024).toFixed(1)} KiB file · ${decodedTextures.size} decoded textures · no historical or rights approval implied`;
    say(
      reduced.matches
        ? "Model ready. Reduced motion respected; animation is paused."
        : "Model ready. Select an object or a named view.",
    );
  } catch (error) {
    if (revision !== loadRevision) return;
    clearModel();
    $("cover").hidden = false;
    $("cover-title").textContent = "Preview unavailable";
    $("start").textContent = "Retry preview";
    say(
      `${error.message}. The passage and object descriptions remain available.`,
    );
  } finally {
    if (revision === loadRevision) $("start").disabled = false;
  }
}
async function selectPackage(id) {
  const revision = ++loadRevision;
  $("start").disabled = true;
  clearModel();
  looseFile = null;
  $("model-file").value = "";
  try {
    const response = await fetch(
      `/packages/${encodeURIComponent(id)}/scene.json`,
    );
    if (!response.ok) throw new Error("Package request failed");
    const next = await response.json();
    if (revision !== loadRevision) return;
    metadata = next;
    showMetadata(metadata);
    $("start").disabled = false;
    $("cover").hidden = false;
    $("cover-title").textContent = "Ready when you are";
    $("start").textContent = "Start 3D preview";
    $("metrics").textContent = "";
    say("Package details ready. Start 3D when you choose.");
  } catch (error) {
    if (revision === loadRevision) say(error.message);
  }
}
$("start").addEventListener("click", start);
$("reset").addEventListener("click", reset);
$("left").addEventListener("click", () => moveCamera(-0.2));
$("right").addEventListener("click", () => moveCamera(0.2));
$("closer").addEventListener("click", () => moveCamera(0, 0.85));
$("farther").addEventListener("click", () => moveCamera(0, 1.15));
$("motion").addEventListener("click", () => {
  if (running) {
    pause();
    return;
  }
  if (!clips.length) return;
  running = true;
  lastTime = performance.now();
  updateControls();
  raf = requestAnimationFrame(animate);
});
$("packages").addEventListener("change", () =>
  selectPackage($("packages").value),
);
$("model-file").addEventListener("change", () => {
  const file = $("model-file").files[0];
  if (!file) return;
  if (file.size > MAX_PACKAGE_BYTES) {
    say(
      "This model exceeds the 6 MiB intake limit. Export a low variant first.",
    );
    return;
  }
  ++loadRevision;
  clearModel();
  looseFile = file;
  $("start").disabled = false;
  metadata = {
    title: file.name,
    status: "Unreviewed local model",
    scope: "asset",
    summary:
      "Inspect this local model before packaging it. It has no verified chapter connection or rights record.",
    limitations:
      "This loose file has not passed the package validator, Bible, visual or rights review.",
    files: [],
    views: [],
    hotspots: [],
  };
  showMetadata(metadata);
  $("cover").hidden = false;
  $("cover-title").textContent = "Local model selected";
  $("start").textContent = "Start 3D preview";
  $("metrics").textContent = "";
  say("Local model selected. Nothing has been uploaded.");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
  else draw();
});
reduced.addEventListener("change", () => {
  if (reduced.matches) pause();
});
try {
  const ids = await fetch("/api/packages").then((r) => r.json());
  $("packages").replaceChildren(
    ...ids.map((id) => {
      const o = element("option", id);
      o.value = id;
      return o;
    }),
  );
  if (ids.length) await selectPackage(ids[0]);
  else say("No packages found.");
} catch (e) {
  say(`Package list unavailable: ${e.message}`);
}
