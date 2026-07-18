import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { MODELS, ANNOTATIONS, EXTRAS, type CellType, type Annotation } from "./data";

/** Normalized radius every model is scaled to fit, so camera math is model-independent. */
const NORM_RADIUS = 10;

export interface SceneCallbacks {
  onSelect: (a: Annotation, index: number) => void;
  onLoaded: (type: CellType) => void;
  onError: (type: CellType, message: string) => void;
  onPick: (point: [number, number, number]) => void;
}

/**
 * Loads the downloaded Sketchfab .glb models and layers our own numbered
 * annotation pins + extra organelles on top, with a gentle click-to-focus
 * camera (no aggressive zoom). Also offers a "place pin" authoring mode.
 */
export class CellScene {
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private loader: GLTFLoader;
  private root = new THREE.Group();          // holds the loaded model + our additions
  private pins: CSS2DObject[] = [];
  private pickTargets: THREE.Object3D[] = []; // meshes for the place-pin raycaster
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private clock = new THREE.Clock();
  private raf = 0;
  private pickMode = false;
  private type: CellType = "animal";

  // camera focus tween
  private tweening = false;
  private tweenT = 0;
  private fromTarget = new THREE.Vector3();
  private toTarget = new THREE.Vector3();
  private fromPos = new THREE.Vector3();
  private toPos = new THREE.Vector3();

  constructor(private container: HTMLElement, private cb: SceneCallbacks) {
    const w = container.clientWidth, h = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    this.camera.position.set(0, NORM_RADIUS * 2.4, NORM_RADIUS * 0.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    const le = this.labelRenderer.domElement;
    le.style.position = "absolute";
    le.style.inset = "0";
    le.style.pointerEvents = "none";
    le.style.zIndex = "6";
    container.appendChild(le);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = NORM_RADIUS * 0.6;
    this.controls.maxDistance = NORM_RADIUS * 5;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.7;

    // lighting — neutral studio so model textures read correctly
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(6, 12, 8); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7); fill.position.set(-8, -2, -6); this.scene.add(fill);

    this.scene.add(this.root);

    // GLTF loader with Draco + Meshopt (Sketchfab auto-converts often use these)
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(draco);
    this.loader.setMeshoptDecoder(MeshoptDecoder);

    this.renderer.domElement.addEventListener("click", this.handleClick);
    this.renderer.domElement.addEventListener("pointermove", this.handleMove);
    window.addEventListener("resize", this.handleResize);

    this.animate();
  }

  /* ---------------- public API ---------------- */
  load(type: CellType) {
    this.type = type;
    this.clearRoot();
    const info = MODELS[type];
    this.loader.load(
      info.url,
      (gltf) => {
        const model = gltf.scene;
        this.normalize(model);
        this.root.add(model);
        this.collectPickTargets(model);
        this.addExtras(type);
        this.addPins(type);
        this.frameAll();
        this.cb.onLoaded(type);
      },
      undefined,
      (err) => {
        const msg = (err as any)?.message || String(err);
        this.cb.onError(type, msg);
      }
    );
  }

  /** Unfocus any organelle: clear active pin and ease the camera back to the framed view. */
  resetView() {
    this.setActivePin(-1);
    this.frameAll();
  }

  setAutoRotate(on: boolean) { this.controls.autoRotate = on; }
  setPickMode(on: boolean) { this.pickMode = on; this.controls.autoRotate = on ? false : this.controls.autoRotate; }

  focusIndex(index: number) {
    const a = ANNOTATIONS[this.type][index];
    if (a) this.focusPoint(new THREE.Vector3(...a.pos));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.clearRoot();
    this.renderer.domElement.removeEventListener("click", this.handleClick);
    this.renderer.domElement.removeEventListener("pointermove", this.handleMove);
    window.removeEventListener("resize", this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    this.container.removeChild(this.labelRenderer.domElement);
  }

  /* ---------------- model prep ---------------- */
  /** Center the model at the origin and scale it so its radius ≈ NORM_RADIUS. */
  private normalize(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const s = NORM_RADIUS / (sphere.radius || 1);
    model.scale.setScalar(s);
    model.position.sub(sphere.center.clone().multiplyScalar(s));
  }

  private collectPickTargets(model: THREE.Object3D) {
    model.traverse((o) => { if ((o as THREE.Mesh).isMesh) this.pickTargets.push(o); });
  }

  private clearRoot() {
    this.clearPins();
    while (this.root.children.length) {
      const c = this.root.children[0];
      this.root.remove(c);
      (c as any).traverse?.((o: any) => {
        o.geometry?.dispose?.();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose?.()); else m?.dispose?.();
      });
    }
    this.pickTargets.length = 0;
  }

  private addExtras(type: CellType) {
    // snapshot the model meshes before we start adding extras, so pore raycasts
    // hit the wall and not a pore we already placed
    const wallMeshes = this.pickTargets.slice();
    this.root.updateMatrixWorld(true);

    EXTRAS[type].forEach((ex) => {
      const geo = ex.shape === "capsule"
        ? new THREE.CapsuleGeometry(ex.size * 0.5, ex.size, 8, 16)
        : ex.shape === "disc"
        ? new THREE.CircleGeometry(ex.size, 24)
        : new THREE.SphereGeometry(ex.size, 24, 18);
      // discs read as holes, so keep them flat-dark instead of lit
      const mat = ex.shape === "disc"
        ? new THREE.MeshBasicMaterial({ color: ex.color, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: ex.color, roughness: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...ex.pos);
      if (ex.shape === "disc") {
        // Seat the disc flush on the wall. The wall's true normal is up to ~29° off
        // the radial direction, so orienting radially tilts the disc and one edge
        // sinks into the wall while the other lifts off it — align to the hit face
        // normal instead. Falls back to radial if the ray misses.
        const radial = mesh.position.clone().setY(0).normalize();
        this.raycaster.set(mesh.position.clone().addScaledVector(radial, 5), radial.clone().negate());
        const hit = this.raycaster.intersectObjects(wallMeshes, false)[0];
        const normal = hit
          ? hit.face!.normal.clone().transformDirection(hit.object.matrixWorld)
          : radial;
        if (normal.dot(radial) < 0) normal.negate(); // keep it pointing out of the cell
        if (hit) mesh.position.copy(hit.point);
        mesh.position.addScaledVector(normal, 0.02); // just enough to clear z-fighting
        mesh.lookAt(mesh.position.clone().add(normal));
      }
      this.root.add(mesh);
      this.pickTargets.push(mesh);
    });
  }

  /* ---------------- annotation pins ---------------- */
  private clearPins() {
    this.pins.forEach((p) => { p.parent?.remove(p); (p.element as HTMLElement).remove(); });
    this.pins.length = 0;
  }

  private addPins(type: CellType) {
    ANNOTATIONS[type].forEach((a, i) => {
      const el = document.createElement("div");
      el.className = "pin";
      el.textContent = String(i + 1);
      el.title = a.title;
      el.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.cb.onSelect(a, i);
        this.focusPoint(new THREE.Vector3(...a.pos));
      });
      const obj = new CSS2DObject(el);
      obj.position.set(...a.pos);
      obj.userData.index = i;
      this.root.add(obj);
      this.pins.push(obj);
    });
  }

  setActivePin(index: number) {
    this.pins.forEach((p) => (p.element as HTMLElement).classList.toggle("active", p.userData.index === index));
  }

  /* ---------------- gentle camera focus ---------------- */
  private focusPoint(target: THREE.Vector3) {
    // keep the current viewing direction, settle at a comfortable distance
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dist = NORM_RADIUS * 1.15; // comfortable — NOT slammed into the organelle
    this.fromTarget.copy(this.controls.target);
    this.toTarget.copy(target);
    this.fromPos.copy(this.camera.position);
    this.toPos.copy(target).add(dir.multiplyScalar(dist));
    this.tweenT = 0;
    this.tweening = true;
    this.controls.autoRotate = false;
  }

  private frameAll() {
    this.fromTarget.copy(this.controls.target);
    this.toTarget.set(0, 0, 0);
    this.fromPos.copy(this.camera.position);
    // top-down view, slightly tilted so it doesn't gimbal-flip
    this.toPos.set(0, NORM_RADIUS * 2.4, NORM_RADIUS * 0.8);
    this.tweenT = 0;
    this.tweening = true;
  }

  /* ---------------- interaction ---------------- */
  private raycast(clientX: number, clientY: number): THREE.Intersection | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickTargets, false);
    return hits.length ? hits[0] : null;
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.pickMode) return;
    const hit = this.raycast(e.clientX, e.clientY);
    if (hit) {
      const p = hit.point;
      this.cb.onPick([+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
    }
  };

  private handleMove = (e: PointerEvent) => {
    if (!this.pickMode) { this.renderer.domElement.style.cursor = "grab"; return; }
    this.renderer.domElement.style.cursor = this.raycast(e.clientX, e.clientY) ? "crosshair" : "grab";
  };

  private handleResize = () => {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  };

  /* ---------------- loop ---------------- */
  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    if (this.tweening) {
      this.tweenT = Math.min(1, this.tweenT + dt / 0.7);
      const e = this.tweenT < 0.5 ? 2 * this.tweenT * this.tweenT : 1 - Math.pow(-2 * this.tweenT + 2, 2) / 2; // easeInOut
      this.controls.target.lerpVectors(this.fromTarget, this.toTarget, e);
      this.camera.position.lerpVectors(this.fromPos, this.toPos, e);
      if (this.tweenT >= 1) this.tweening = false;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };
}
