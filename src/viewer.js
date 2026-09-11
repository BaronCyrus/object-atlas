import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const offsets = {
  upper: [0, 0.75, 0],
  frame: [0, 0, 0],
  grip: [0.25, -0.3, 0.5],
  guard: [-0.45, -0.4, 0],
};
const anchors = {
  upper: [-0.56, 0.8, 0.28],
  frame: [-1, 0.33, 0.29],
  grip: [0.99, -0.64, 0.33],
  guard: [-0.33, -0.22, 0.2],
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export class ExhibitViewer {
  constructor(canvas, onSelect, onState) {
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.onState = onState;
    this.dirty = true;
    this.visible = true;
    this.frames = 0;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.scene = new THREE.Scene();
    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(env, 0.04);
    this.scene.environment = this.envTarget.texture;
    env.dispose();
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x728462, 2));
    const light = new THREE.DirectionalLight(0xfff8eb, 3);
    light.position.set(-3, 5, 5);
    this.scene.add(light);
    const rim = new THREE.DirectionalLight(0xecf4ff, 3);
    rim.position.set(3, 2, -4);
    this.scene.add(rim);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.addEventListener("change", () => {
      this.dirty = true;
    });
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.7;
    this.controls.maxDistance = 13;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.target.set(-0.12, -0.12, 0);
    this.controls.maxPolarAngle = Math.PI * 0.88;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.reset();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.token = 0;
    this.groups = {};
    this.exploded = false;
    this.active = null;
    this.ready = false;
    // Soft contact shadow, drawn locally. No external texture dependency.
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(48,66,34,.24)");
    gradient.addColorStop(0.45, "rgba(48,66,34,.10)");
    gradient.addColorStop(1, "rgba(48,66,34,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 2),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.52, 0);
    this.scene.add(shadow);
    this.hotspots = [...document.querySelectorAll(".hotspot")];
    canvas.addEventListener("pointerdown", (e) => {
      this.down = [e.clientX, e.clientY];
    });
    canvas.addEventListener("pointerup", (e) => {
      if (
        !this.down ||
        Math.hypot(e.clientX - this.down[0], e.clientY - this.down[1]) > 6
      )
        return;
      const rect = canvas.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit =
        this.model && this.raycaster.intersectObject(this.model, true)[0];
      if (hit) {
        let o = hit.object;
        while (o && !o.userData.region) o = o.parent;
        if (o) this.onSelect(o.userData.region);
      }
    });
    canvas.addEventListener("keydown", (e) => {
      const steps = {
        ArrowLeft: [0.12, 0],
        ArrowRight: [-0.12, 0],
        ArrowUp: [0, 0.12],
        ArrowDown: [0, -0.12],
      };
      if (steps[e.key]) {
        e.preventDefault();
        this.controls.rotateLeft(steps[e.key][0]);
        this.controls.rotateUp(steps[e.key][1]);
        this.controls.update();
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        document.querySelector("#reset").click();
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        this.zoom(0.9);
      }
      if (e.key === "-") {
        e.preventDefault();
        this.zoom(1.1);
      }
    });
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.ready = false;
      this.onState(
        "error",
        "三维显示暂时中断，请刷新页面。文字与语音仍可使用。",
      );
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.dirty = true;
    });
    this.visibilityObserver.observe(canvas);
    this.previous = performance.now();
    this.renderer.setAnimationLoop((time) => this.animate(time));
  }
  resize() {
    this.dirty = true;
    const { width, height } = this.canvas.parentElement.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  zoom(factor) {
    const delta = this.camera.position.clone().sub(this.controls.target);
    delta
      .multiplyScalar(factor)
      .clampLength(this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(delta);
    this.controls.update();
  }
  reset() {
    this.controls.autoRotate = false;
    this.camera.position
      .set(-3.3, 1.6, 6.1)
      .multiplyScalar(
        Math.max(
          1,
          1.05 /
            (this.canvas.parentElement.clientWidth /
              this.canvas.parentElement.clientHeight),
        ),
      );
    this.controls.target.set(-0.12, -0.12, 0);
    this.controls.update();
    this.exploded = false;
    this.select(null);
  }
  view(name) {
    const points = {
      perspective: [-3.3, 1.6, 6.1],
      side: [-0.12, -0.12, 7.2],
      front: [-7.2, 0.0, 0.01],
    };
    this.camera.position
      .set(...points[name])
      .multiplyScalar(Math.max(1, 1.05 / this.camera.aspect));
    this.controls.update();
  }
  async load(id) {
    const token = ++this.token;
    this.ready = false;
    this.onState("loading", "正在布置展品…");
    if (this.model) this.scene.remove(this.model);
    this.model = null;
    this.groups = {};
    this.select(null);
    this.reset();
    try {
      if (!this.cache.has(id))
        this.cache.set(
          id,
          this.loader
            .loadAsync(`${import.meta.env.BASE_URL}models/${id}.glb`)
            .catch((e) => {
              this.cache.delete(id);
              throw e;
            }),
        );
      const gltf = await this.cache.get(id);
      if (token !== this.token) return;
      this.model = gltf.scene;
      this.optimizeModel(this.model);
      this.model.traverse((o) => {
        if (o.isMesh && !o.userData.cloned) {
          o.material = o.material.clone();
          o.userData.cloned = true;
        }
        if (o.userData.region && o.parent === this.model) {
          this.groups[o.userData.region] = o;
          if (!o.userData.base) o.userData.base = o.position.clone();
          o.position.copy(o.userData.base);
        }
      });
      this.scene.add(this.model);
      this.modelId = id;
      this.ready = true;
      this.select(null);
      this.onState("ready");
    } catch (e) {
      if (token !== this.token) return;
      this.onState(
        "error",
        "展品暂时未能加载，请点击重试。文字与语音仍可使用。",
      );
      console.error("Model loading failed:", e);
    }
  }
  select(region) {
    this.dirty = true;
    this.active = region;
    this.model?.traverse((o) => {
      if (o.isMesh) {
        o.material.emissive?.set(
          o.userData.region === region ? 0x536e2e : 0x000000,
        );
        o.material.emissiveIntensity = o.userData.region === region ? 0.42 : 0;
      }
    });
  }
  optimizeModel(model) {
    if (model.userData.optimized) return;
    model.updateMatrixWorld(true);
    let sourceMeshes = 0;
    for (const group of model.children.filter((o) => o.userData.region)) {
      const inverse = group.matrixWorld.clone().invert();
      const batches = new Map();
      const originals = [];
      group.traverse((mesh) => {
        if (!mesh.isMesh) return;
        sourceMeshes++;
        originals.push(mesh);
        const key =
          mesh.material.uuid +
          Object.keys(mesh.geometry.attributes).sort().join(",");
        if (!batches.has(key))
          batches.set(key, { material: mesh.material, geometries: [] });
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
        batches.get(key).geometries.push(geometry);
      });
      const combined = [];
      for (const { material, geometries } of batches.values()) {
        const geometry = mergeGeometries(geometries);
        if (!geometry) throw new Error("Incompatible exhibition geometry");
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = group.userData.region + "_surface";
        mesh.userData.region = group.userData.region;
        combined.push(mesh);
        geometries.forEach((g) => g.dispose());
      }
      group.clear();
      group.add(...combined);
      originals.forEach((mesh) => mesh.geometry.dispose());
    }
    model.userData.sourceMeshes = sourceMeshes;
    model.userData.optimized = true;
  }
  animate(time) {
    const dt = Math.min((time - this.previous) / 1000, 0.1);
    this.previous = time;
    if (document.hidden || !this.visible) return;
    this.controls.update(dt);
    for (const [region, obj] of Object.entries(this.groups)) {
      const dest = obj.userData.base
        .clone()
        .add(
          new THREE.Vector3(...offsets[region]).multiplyScalar(
            this.exploded ? 1 : 0,
          ),
        );
      if (obj.position.distanceToSquared(dest) > 0.000001) {
        obj.position.lerp(dest, reduced ? 1 : 1 - Math.exp(-dt * 9));
        this.dirty = true;
      }
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.scene.updateMatrixWorld();
    for (const el of this.hotspots) {
      const region = el.dataset.region,
        group = this.groups[region];
      if (!this.ready || !group) {
        el.hidden = true;
        continue;
      }
      const pos = new THREE.Vector3(...anchors[region])
        .add(group.position)
        .project(this.camera);
      const width = this.canvas.clientWidth,
        height = this.canvas.clientHeight;
      const x = (pos.x * 0.5 + 0.5) * width,
        y = (-pos.y * 0.5 + 0.5) * height;
      el.hidden =
        pos.z > 1 || x < 30 || x > width - 30 || y < 55 || y > height - 105;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
    this.renderer.render(this.scene, this.camera);
    this.frames++;
  }
}
