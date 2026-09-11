import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { assetVersion } from "./data.js";
const offsets = {
  slide: [0, 0.68, 0],
  barrel: [-0.4, 0.28, 0],
  frame: [0, 0, 0],
  grip: [0.68, -0.2, 0.3],
  guard: [-0.45, -0.62, 0.04],
  trigger: [0.08, -0.64, 0.62],
  front_sight: [-0.06, 1.0, 0],
  rear_sight: [0.1, 1.06, 0],
  magazine: [0.23, -0.92, -0.22],
  controls: [0, 0.1, 0.8],
  rear: [0.55, 0.52, -0.2],
};
const essential = new Set(["slide", "barrel", "grip", "guard", "magazine"]);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export class ExhibitViewer {
  constructor(canvas, onSelect, onState, onAnimation) {
    Object.assign(this, {
      canvas,
      onSelect,
      onState,
      onAnimation,
      dirty: true,
      visible: true,
      frames: 0,
      ready: false,
      token: 0,
      groups: {},
      cache: new Map(),
      viewMode: "perspective",
      exploded: false,
      active: null,
      showLabels: true,
      animation: null,
    });
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    const env = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(env, 0.04);
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = 0.8;
    env.dispose();
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xf6f7ff, 0x506347, 0.85));
    for (const [pos, color, intensity] of [
      [[-3, 5, 4], 0xfff3df, 2],
      [[3, 2, -4], 0xe4edff, 1.8],
    ]) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...pos);
      this.scene.add(light);
    }
    this.perspective = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
    this.orthographic = new THREE.OrthographicCamera(-3, 3, 2, -2, 0.05, 100);
    this.camera = this.perspective;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.4;
    this.controls.maxDistance = 20;
    this.controls.minZoom = 0.6;
    this.controls.maxZoom = 2.8;
    this.controls.autoRotateSpeed = 0.65;
    this.controls.minPolarAngle = 0.03;
    this.controls.maxPolarAngle = Math.PI - 0.03;
    this.controls.addEventListener("change", () => {
      this.dirty = true;
    });
    this.controls.addEventListener("start", () => {
      if (this.animation) this.pauseAnimation(true);
    });
    this.target = new THREE.Vector3(0, -0.14, 0);
    this.modelSize = new THREE.Vector3(4.2, 2.7, 0.65);
    this.controls.target.copy(this.target);
    this.applyView("perspective");
    this.loader = new GLTFLoader();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hotspots = [...document.querySelectorAll(".hotspot")];
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(36,52,28,.26)");
    grad.addColorStop(1, "rgba(36,52,28,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 1.8),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -1.68;
    this.scene.add(this.shadow);
    this.projectile = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 12),
      new THREE.MeshStandardMaterial({
        color: 0xc18a40,
        metalness: 0.7,
        roughness: 0.32,
      }),
    );
    this.projectile.scale.set(0.14, 0.052, 0.052);
    this.projectile.visible = false;
    this.scene.add(this.projectile);
    this.trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      new THREE.LineBasicMaterial({
        color: 0xbe985b,
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.trail.visible = false;
    this.scene.add(this.trail);
    this.flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 8),
      new THREE.MeshBasicMaterial({
        color: 0xfbd78c,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    this.flash.visible = false;
    this.scene.add(this.flash);
    canvas.addEventListener("pointerdown", (e) => {
      this.down = [e.clientX, e.clientY];
    });
    canvas.addEventListener("pointerup", (e) => {
      if (
        !this.down ||
        Math.hypot(e.clientX - this.down[0], e.clientY - this.down[1]) > 6 ||
        this.animation
      )
        return;
      const r = canvas.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      this.camera.updateMatrixWorld();
      this.scene.updateMatrixWorld(true);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit =
        this.model && this.raycaster.intersectObject(this.model, true)[0];
      if (hit) {
        let obj = hit.object;
        while (obj && !obj.userData.region) obj = obj.parent;
        if (obj) this.onSelect(obj.userData.region);
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
      if (e.key.toLowerCase() === "r") document.querySelector("#reset").click();
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        this.zoom(0.88);
      }
      if (e.key === "-") {
        e.preventDefault();
        this.zoom(1.12);
      }
    });
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.ready = false;
      this.onState("error", "三维显示中断，请刷新页面。仍可听讲解。");
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.dirty = true;
    });
    this.visibilityObserver.observe(canvas);
    this.previous = performance.now();
    this.renderer.setAnimationLoop((t) => this.animate(t));
  }
  resize() {
    const { width, height } = this.canvas.parentElement.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.perspective.aspect = width / height;
    this.perspective.updateProjectionMatrix();
    this.fitCamera();
    this.dirty = true;
  }
  fitCamera() {
    const aspect =
      this.canvas.parentElement.clientWidth /
        this.canvas.parentElement.clientHeight || 1;
    const spread = this.exploded ? 1.5 : this.animation ? 1.3 : 1;
    const vertical =
      Math.max(this.modelSize.y * 1.38, (this.modelSize.x / aspect) * 1.3) *
      spread;
    const distance = vertical / (2 * Math.tan(THREE.MathUtils.degToRad(17)));
    if (this.camera.isPerspectiveCamera) {
      const dir = this.camera.position.clone().sub(this.target).normalize();
      if (dir.length() < 0.1) dir.set(-0.32, 0.17, 1).normalize();
      this.camera.position.copy(this.target).addScaledVector(dir, distance);
    }
    this.orthographic.left = (-vertical * aspect) / 2;
    this.orthographic.right = (vertical * aspect) / 2;
    this.orthographic.top = vertical / 2;
    this.orthographic.bottom = -vertical / 2;
    this.orthographic.zoom = 1;
    this.orthographic.updateProjectionMatrix();
    this.controls.update();
    this.dirty = true;
  }
  applyView(name) {
    this.viewMode = name;
    this.camera = name === "perspective" ? this.perspective : this.orthographic;
    this.controls.object = this.camera;
    this.controls.target.copy(this.target);
    const positions = {
      perspective: [-3.2, 1.7, 7.4],
      side: [0, 0, 10],
      right: [0, 0, -10],
      top: [0, 10, 0.001],
      front: [-10, 0, 0.001],
    };
    this.camera.position
      .copy(this.target)
      .add(new THREE.Vector3(...positions[name]));
    this.camera.up.set(0, 1, 0);
    this.fitCamera();
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
    this.controls.update();
    this.dirty = true;
  }
  view(name) {
    this.stopAnimation();
    this.controls.autoRotate = false;
    this.applyView(name);
    this.animate(performance.now());
  }
  zoom(factor) {
    if (this.camera.isOrthographicCamera) {
      this.camera.zoom = THREE.MathUtils.clamp(
        this.camera.zoom / factor,
        0.6,
        2.8,
      );
      this.camera.updateProjectionMatrix();
      this.dirty = true;
    } else {
      const delta = this.camera.position
        .clone()
        .sub(this.target)
        .multiplyScalar(factor)
        .clampLength(3.4, 20);
      this.camera.position.copy(this.target).add(delta);
      this.controls.update();
    }
  }
  reset() {
    this.stopAnimation();
    this.controls.autoRotate = false;
    this.exploded = false;
    this.select(null);
    this.applyView("perspective");
  }
  setExploded(value) {
    this.stopAnimation();
    this.exploded = value;
    this.controls.autoRotate = false;
    this.fitCamera();
    this.dirty = true;
  }
  setLabels(value) {
    this.showLabels = value;
    this.dirty = true;
  }
  async load(exhibit) {
    const token = ++this.token;
    this.stopAnimation();
    this.ready = false;
    this.onState("loading", "正在准备模型…");
    if (this.model) this.scene.remove(this.model);
    this.model = null;
    this.groups = {};
    this.selected = null;
    this.exhibit = exhibit;
    this.reset();
    try {
      if (!this.cache.has(exhibit.id))
        this.cache.set(
          exhibit.id,
          this.loader
            .loadAsync(
              `${import.meta.env.BASE_URL}models/${exhibit.id}.glb?v=${assetVersion}`,
            )
            .catch((e) => {
              this.cache.delete(exhibit.id);
              throw e;
            }),
        );
      const gltf = await this.cache.get(exhibit.id);
      if (token !== this.token) return;
      this.model = gltf.scene;
      this.optimizeModel(this.model);
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
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
      this.model.updateMatrixWorld(true);
      this.anchors = {};
      for (const [id, group] of Object.entries(this.groups)) {
        const b = new THREE.Box3().setFromObject(group),
          point = b.getCenter(new THREE.Vector3());
        point.z = b.max.z + 0.045;
        if (id === "magazine") point.y = b.min.y + 0.06;
        if (id === "barrel") point.x = b.min.x;
        if (id === "frame") {
          point.x = b.min.x + (b.max.x - b.min.x) * 0.3;
        }
        this.anchors[id] = point;
      }
      const bounds = new THREE.Box3().setFromObject(this.model);
      bounds.getSize(this.modelSize);
      bounds.getCenter(this.target);
      this.shadow.position.y = bounds.min.y - 0.13;
      this.scene.add(this.model);
      this.modelId = exhibit.id;
      this.ready = true;
      this.select(null);
      this.applyView("perspective");
      this.onState("ready");
    } catch (e) {
      if (token !== this.token) return;
      this.onState(
        "error",
        "模型暂时没有加载成功，点这里重试。仍可听部件讲解。",
      );
      console.error("Model loading failed", e);
    }
  }
  optimizeModel(model) {
    if (model.userData.optimized) return;
    model.updateMatrixWorld(true);
    let sourceMeshes = 0;
    for (const group of model.children.filter((o) => o.userData.region)) {
      const inverse = group.matrixWorld.clone().invert(),
        batches = new Map(),
        originals = [];
      group.traverse((mesh) => {
        if (!mesh.isMesh) return;
        sourceMeshes++;
        originals.push(mesh);
        const key =
          mesh.material.uuid +
          Object.keys(mesh.geometry.attributes).sort().join(",");
        if (!batches.has(key))
          batches.set(key, { material: mesh.material, geometries: [] });
        batches
          .get(key)
          .geometries.push(
            mesh.geometry
              .clone()
              .applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)),
          );
      });
      const combined = [];
      for (const { material, geometries } of batches.values()) {
        const geometry = mergeGeometries(geometries);
        if (!geometry) throw new Error("Incompatible exhibit surface geometry");
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = group.userData.region + "_surface";
        mesh.userData.region = group.userData.region;
        combined.push(mesh);
        geometries.forEach((g) => g.dispose());
      }
      group.clear();
      group.add(...combined);
      originals.forEach((o) => o.geometry.dispose());
    }
    model.userData.sourceMeshes = sourceMeshes;
    model.userData.optimized = true;
  }
  select(region) {
    this.active = region;
    this.dirty = true;
    this.model?.traverse((o) => {
      if (o.isMesh) {
        o.material.emissive?.set(o.userData.region === region ? 0x658742 : 0);
        o.material.emissiveIntensity = o.userData.region === region ? 0.22 : 0;
      }
    });
  }
  playAnimation(speed = 1) {
    if (!this.ready) return;
    this.stopAnimation();
    this.exploded = false;
    this.select(null);
    this.controls.autoRotate = false;
    for (const group of Object.values(this.groups))
      group.position.copy(group.userData.base);
    this.animation = { elapsed: 0, duration: 9 / Number(speed), paused: false };
    this.applyView("side");
    this.camera.position.x -= 0.55;
    this.controls.target.x -= 0.55;
    this.controls.update();
    this.onAnimation({
      state: "playing",
      progress: 0,
      caption: "看弹头向前移动",
    });
    this.dirty = true;
  }
  pauseAnimation(value) {
    if (!this.animation) return;
    this.animation.paused = value ?? !this.animation.paused;
    this.onAnimation({
      state: this.animation.paused ? "paused" : "playing",
      progress: this.animation.elapsed / this.animation.duration,
    });
    this.dirty = true;
  }
  stopAnimation() {
    const wasPlaying = !!this.animation;
    if (this.model) {
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
      if (this.groups.slide)
        this.groups.slide.position.copy(this.groups.slide.userData.base);
    }
    this.animation = null;
    if (wasPlaying) this.applyView(this.viewMode);
    if (this.projectile) this.projectile.visible = false;
    if (this.trail) this.trail.visible = false;
    if (this.flash) this.flash.visible = false;
    this.onAnimation?.({ state: "idle", progress: 0 });
    this.dirty = true;
  }
  animate(time) {
    const dt = Math.min((time - this.previous) / 1000, 0.1) || 0;
    this.previous = time;
    if (document.hidden || !this.visible) return;
    this.controls.update(dt);
    if (this.animation) {
      const a = this.animation;
      if (a.paused && !this.dirty) return;
      if (!a.paused) a.elapsed += dt;
      const t = Math.min(a.elapsed / a.duration, 1);
      const recoil = Math.sin(Math.min(t / 0.7, 1) * Math.PI);
      this.model.position.x = 0.14 * recoil;
      this.model.rotation.z = -0.038 * recoil;
      this.groups.slide.position
        .copy(this.groups.slide.userData.base)
        .add(new THREE.Vector3(0.17 * recoil, 0, 0));
      const muzzle = new THREE.Vector3(...this.exhibit.muzzle);
      this.projectile.position
        .copy(muzzle)
        .add(new THREE.Vector3(-t * 2.7, 0, 0));
      this.projectile.visible = t > 0.03 && t < 0.72;
      this.flash.position.copy(muzzle);
      this.flash.visible = t < 0.055;
      this.trail.visible = this.projectile.visible;
      this.trail.geometry.setFromPoints([muzzle, this.projectile.position]);
      this.onAnimation({
        state: a.paused ? "paused" : "playing",
        progress: t,
        caption:
          t < 0.28
            ? "弹头向前移动"
            : t < 0.68
              ? "枪身短暂后移，这叫后坐"
              : "枪身回到静止位置",
      });
      this.dirty = true;
      if (t >= 1) {
        this.stopAnimation();
        this.onAnimation({
          state: "ended",
          progress: 1,
          caption: "看完啦，可以再看一遍",
        });
      }
    } else {
      for (const [id, obj] of Object.entries(this.groups)) {
        const dest = obj.userData.base
          .clone()
          .add(
            new THREE.Vector3(...offsets[id]).multiplyScalar(
              this.exploded ? 1 : 0,
            ),
          );
        if (obj.position.distanceToSquared(dest) > 1e-6) {
          obj.position.lerp(dest, reduced ? 1 : 1 - Math.exp(-dt * 9));
          this.dirty = true;
        }
      }
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();
    for (const el of this.hotspots) {
      const id = el.dataset.region,
        group = this.groups[id];
      if (
        !this.ready ||
        !group ||
        !this.showLabels ||
        this.animation ||
        (!this.exploded && !essential.has(id) && id !== this.active)
      ) {
        el.hidden = true;
        continue;
      }
      const point = this.anchors[id]
        .clone()
        .add(group.position.clone().sub(group.userData.base))
        .project(this.camera);
      const w = this.canvas.clientWidth,
        h = this.canvas.clientHeight,
        x = (point.x * 0.5 + 0.5) * w,
        y = (-point.y * 0.5 + 0.5) * h;
      el.hidden = point.z > 1 || x < 24 || x > w - 24 || y < 62 || y > h - 105;
      el.style.left = x + "px";
      el.style.top = y + "px";
    }
    this.renderer.render(this.scene, this.camera);
    this.frames++;
  }
}
