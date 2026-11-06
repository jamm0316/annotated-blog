import * as THREE from 'three';
import type { Exhibit, PropKind } from '@/lib/museum';

// 박물관 모드의 3D 장면과 조작. React 밖에서 three.js 로 그리고, 말풍선 같은 겹친 UI 도 여기서 DOM 으로 만든다.
// 이 모드만 사이트의 세 가지 색 규칙에서 빠진다(나무·풀·크림 같은 색이 있어야 장난감처럼 보인다).

export type AskPick = { id: string; reason: string };
export type MuseumOptions = {
  exhibits: Exhibit[];
  /** 부엉이에게 물은 질문을 /api/ask 로 넘긴다. 실패하면 문구가 담긴 Error 를 던진다 */
  ask: (question: string) => Promise<AskPick[]>;
  /** 글은 사이트 안에서, 연구실은 새 탭에서 연다 */
  open: (exhibit: Exhibit) => void;
};

const C = {
  floorA: 0xe6cfae,
  floorB: 0xd6b88f,
  grout: 0xc9a982,
  carpet: 0xe0662e,
  carpetEdge: 0xf0a24a,
  wall: 0xd99a62,
  wallTop: 0x8a5a3b,
  cream: 0xf6ead6,
  wood: 0xa86a3e,
  woodDark: 0x7a4a2c,
  orange: 0xff7a1a,
  navy: 0x2b3a67,
  ink: 0x2b221c,
  white: 0xffffff,
  leaf: 0x6fae5a,
  leafDark: 0x4e8a45,
  pot: 0xc4673a,
  skin: 0xf7d3b2,
  hair: 0x4a3426,
  blush: 0xf2a49a,
  owl: 0x7d8a99,
  owlLight: 0xa9b4c0,
  belly: 0xf3e6cf,
  beak: 0xffa23c,
  bell: 0xf2c14e,
  sky: 0xf7e7cf,
};

type Cell = '#' | '.' | 'P' | 'D' | 'B' | 'O' | 'T' | 'C';
type Spot = { exhibit: Exhibit; tile: [number, number]; focus: THREE.Vector3; ring: THREE.Object3D; group: THREE.Object3D };

// ── 배치 ────────────────────────────────────────────────────────────
// 위쪽 왼편 기술 노트관, 오른편 연구실 별관, 아래 로비(리셉션·책장). 글 수에 따라 전시실이 길어진다.
const W = 21;
const MID = 10;
const COLS_NOTE = [2, 5, 8];
const COLS_LAB = [12, 15, 18];

function layout(exhibits: Exhibit[]) {
  // 같은 주제끼리 붙여 놓는다. 주제 순서는 그 주제의 최신 글 순
  const notes = exhibits.filter((e) => e.hall === 'note');
  const latest = new Map<string, string>();
  notes.forEach((n) => {
    if ((latest.get(n.topic) ?? '') < n.date) latest.set(n.topic, n.date);
  });
  notes.sort(
    (a, b) =>
      (latest.get(b.topic) ?? '').localeCompare(latest.get(a.topic) ?? '') ||
      a.topic.localeCompare(b.topic) ||
      b.date.localeCompare(a.date),
  );
  const labs = exhibits.filter((e) => e.hall === 'lab').sort((a, b) => b.date.localeCompare(a.date));
  const books = exhibits.filter((e) => e.hall === 'book').sort((a, b) => b.date.localeCompare(a.date));

  const rows = Math.max(1, Math.ceil(notes.length / 3), Math.ceil(labs.length / 3));
  const zw = 3 * rows + 2; // 전시실과 로비 사이 벽
  const perSide = Math.ceil(books.length / 2);
  const lobby = Math.max(6, 3 * perSide + 1);
  const H = zw + lobby + 2;

  const grid: Cell[][] = Array.from({ length: H }, (_, z) =>
    Array.from({ length: W }, (_, x) => (x === 0 || x === W - 1 || z === 0 || z === H - 1 ? '#' : '.') as Cell),
  );
  for (let z = 1; z < zw; z++) grid[z][MID] = '#';
  for (let x = 0; x < W; x++) grid[zw][x] = '#';
  // 전시실 문은 세 칸 너비. 양옆에 기둥
  [4, 5, 6, 14, 15, 16].forEach((x) => (grid[zw][x] = '.'));
  [3, 7, 13, 17].forEach((x) => (grid[zw][x] = 'C'));
  grid[H - 1][MID] = '.';

  const spots: { exhibit: Exhibit; x: number; z: number }[] = [];
  notes.forEach((e, i) => spots.push({ exhibit: e, x: COLS_NOTE[i % 3], z: 2 + 3 * Math.floor(i / 3) }));
  labs.forEach((e, i) => spots.push({ exhibit: e, x: COLS_LAB[i % 3], z: 2 + 3 * Math.floor(i / 3) }));
  spots.forEach(({ x, z }) => (grid[z][x] = 'P'));

  grid[zw + 2][MID] = 'O';
  [MID - 1, MID, MID + 1].forEach((x) => (grid[zw + 3][x] = 'D'));

  const shelves = books.map((exhibit, j) => {
    const left = j % 2 === 0;
    const x = left ? 1 : W - 2;
    const z = zw + 2 + 3 * Math.floor(j / 2);
    grid[z][x] = 'B';
    grid[z + 1][x] = 'B';
    return { exhibit, x, z, left };
  });
  const plants: [number, number][] = [
    [4, H - 3],
    [W - 5, H - 3],
  ];
  plants.forEach(([x, z]) => (grid[z][x] = 'T'));

  return { grid, H, zw, spots, shelves, plants, rows };
}

// ── 재질과 도형 ────────────────────────────────────────────────────
function makeKit() {
  const grad = new THREE.DataTexture(new Uint8Array([120, 185, 235]), 3, 1, THREE.RedFormat);
  grad.minFilter = THREE.NearestFilter;
  grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  const mats = new Map<number, THREE.MeshToonMaterial>();
  const disposables: { dispose: () => void }[] = [grad];
  const mat = (c: number) => {
    let m = mats.get(c);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
      mats.set(c, m);
      disposables.push(m);
    }
    return m;
  };
  const mesh = (geo: THREE.BufferGeometry, color: number, cast = true) => {
    disposables.push(geo);
    const o = new THREE.Mesh(geo, mat(color));
    o.castShadow = cast;
    o.receiveShadow = true;
    return o;
  };
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
    o.position.set(x, y, z);
    return o;
  };
  const ball = (r: number, color: number, seg = 24) => mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), color);
  const box = (w: number, h: number, d: number, color: number) => mesh(new THREE.BoxGeometry(w, h, d), color);
  const cyl = (rt: number, rb: number, h: number, color: number, seg = 24) =>
    mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color);
  const cone = (r: number, h: number, color: number, seg = 12) => mesh(new THREE.ConeGeometry(r, h, seg), color);
  const torus = (r: number, t: number, color: number) => mesh(new THREE.TorusGeometry(r, t, 12, 32), color);
  return { grad, mat, mesh, at, ball, box, cyl, cone, torus, disposables };
}
type Kit = ReturnType<typeof makeKit>;

function prop(k: Kit, kind: PropKind): THREE.Group {
  const { at, ball, box, cyl, cone, torus } = k;
  const g = new THREE.Group();
  switch (kind) {
    case 'db':
      [0, 0.11, 0.22].forEach((y, i) => g.add(at(cyl(0.15, 0.15, 0.085, i % 2 ? C.cream : C.orange), 0, y + 0.04, 0)));
      break;
    case 'down': {
      g.add(at(box(0.1, 0.18, 0.1, C.navy), 0, 0.22, 0));
      const head = at(cone(0.17, 0.18, C.navy, 4), 0, 0.06, 0);
      head.rotation.set(Math.PI, Math.PI / 4, 0);
      g.add(head);
      break;
    }
    case 'phone': {
      const p = at(box(0.2, 0.32, 0.05, C.navy), 0, 0.17, 0);
      const s = at(box(0.15, 0.22, 0.02, C.orange), 0, 0.18, 0.03);
      p.rotation.x = s.rotation.x = -0.2;
      g.add(p, s);
      break;
    }
    case 'shield': {
      const s = at(cyl(0.17, 0.17, 0.05, C.orange), 0, 0.18, 0);
      const i = at(cyl(0.1, 0.1, 0.06, C.cream), 0, 0.18, 0);
      s.rotation.x = i.rotation.x = Math.PI / 2;
      g.add(s, i);
      break;
    }
    case 'scroll': {
      const r = at(cyl(0.06, 0.06, 0.34, C.cream), 0, 0.08, 0);
      r.rotation.z = Math.PI / 2;
      g.add(r, at(ball(0.045, C.woodDark), -0.19, 0.08, 0), at(ball(0.045, C.woodDark), 0.19, 0.08, 0));
      g.add(at(box(0.24, 0.01, 0.18, C.cream), 0, 0.025, 0.1));
      break;
    }
    case 'key':
      g.add(at(torus(0.08, 0.03, C.orange), -0.12, 0.14, 0), at(box(0.22, 0.045, 0.045, C.orange), 0.05, 0.14, 0));
      g.add(at(box(0.03, 0.07, 0.045, C.orange), 0.1, 0.1, 0), at(box(0.03, 0.07, 0.045, C.orange), 0.15, 0.1, 0));
      g.rotation.y = 0.5;
      break;
    case 'bot':
      g.add(at(box(0.26, 0.2, 0.2, C.navy), 0, 0.12, 0));
      g.add(at(ball(0.035, C.orange, 12), -0.06, 0.14, 0.1), at(ball(0.035, C.orange, 12), 0.06, 0.14, 0.1));
      g.add(at(cyl(0.012, 0.012, 0.1, C.ink, 8), 0, 0.27, 0), at(ball(0.035, C.orange, 12), 0, 0.33, 0));
      break;
    case 'branch': {
      const pts: [number, number][] = [
        [-0.1, 0.06],
        [-0.1, 0.3],
        [0.1, 0.22],
      ];
      pts.forEach(([x, y]) => g.add(at(ball(0.05, C.orange, 16), x, y, 0)));
      g.add(at(cyl(0.018, 0.018, 0.24, C.navy, 8), -0.1, 0.18, 0));
      const arm = at(cyl(0.018, 0.018, 0.2, C.navy, 8), 0, 0.15, 0);
      arm.rotation.z = -Math.PI / 4;
      g.add(arm);
      break;
    }
    case 'leaf': {
      const l = at(ball(0.13, C.leaf), 0, 0.17, 0);
      l.scale.set(0.6, 1.4, 0.35);
      g.add(l, at(cyl(0.012, 0.012, 0.1, C.woodDark, 8), 0, 0.03, 0));
      break;
    }
    case 'calendar':
      g.add(at(box(0.26, 0.24, 0.05, C.cream), 0, 0.14, 0), at(box(0.26, 0.07, 0.06, C.orange), 0, 0.25, 0));
      g.add(at(box(0.05, 0.05, 0.065, C.navy), 0.04, 0.1, 0));
      break;
    case 'monitor':
      g.add(at(box(0.32, 0.22, 0.04, C.navy), 0, 0.2, 0), at(box(0.27, 0.17, 0.02, C.orange), 0, 0.2, 0.025));
      g.add(at(box(0.04, 0.08, 0.04, C.navy), 0, 0.06, 0), at(box(0.16, 0.02, 0.1, C.navy), 0, 0.02, 0));
      break;
    default: {
      const a = at(box(0.16, 0.02, 0.22, C.cream), -0.075, 0.05, 0);
      const b = at(box(0.16, 0.02, 0.22, C.cream), 0.075, 0.05, 0);
      a.rotation.z = 0.2;
      b.rotation.z = -0.2;
      g.add(a, b, at(box(0.34, 0.015, 0.24, C.orange), 0, 0.02, 0));
    }
  }
  return g;
}

function makeOwl(k: Kit) {
  const { at, ball, box, cone, torus } = k;
  const owl = new THREE.Group();
  const body = at(ball(0.46, C.owl), 0, 1.1, 0);
  body.scale.set(1, 1.08, 0.95);
  const belly = at(ball(0.34, C.belly), 0, 1.0, 0.26);
  belly.scale.set(1, 1.05, 0.6);
  owl.add(body, belly);
  for (let r = 0; r < 3; r++)
    for (let c = -1; c <= 1; c++) {
      if (r === 2 && c !== 0) continue;
      const v = at(cone(0.04, 0.05, C.owlLight, 3), c * 0.11 + (r % 2) * 0.05, 1.12 - r * 0.1, 0.46);
      v.rotation.x = Math.PI;
      v.castShadow = false;
      owl.add(v);
    }
  [-1, 1].forEach((s) => {
    const wing = at(ball(0.22, C.owlLight), s * 0.45, 1.05, 0);
    wing.scale.set(0.45, 1, 0.9);
    wing.rotation.z = s * 0.2;
    owl.add(wing);
  });
  const head = at(new THREE.Group(), 0, 1.62, 0);
  const skull = ball(0.42, C.owl);
  skull.scale.set(1.1, 0.92, 1);
  head.add(skull);
  [-1, 1].forEach((s) => {
    const tuft = at(cone(0.1, 0.24, C.owl), s * 0.3, 0.38, 0);
    tuft.rotation.z = -s * 0.45;
    const disc = at(ball(0.19, C.belly), s * 0.17, 0.02, 0.33);
    disc.scale.set(1, 1, 0.45);
    const cheek = at(ball(0.06, C.blush, 12), s * 0.29, -0.15, 0.33);
    cheek.scale.set(1, 0.6, 0.4);
    head.add(
      tuft,
      disc,
      at(ball(0.11, C.ink, 16), s * 0.17, 0.03, 0.4),
      at(ball(0.035, C.white, 10), s * 0.17 + 0.04, 0.08, 0.49),
      at(torus(0.17, 0.018, C.ink), s * 0.17, 0.02, 0.43),
      cheek,
    );
  });
  head.add(at(box(0.06, 0.02, 0.02, C.ink), 0, 0.05, 0.45));
  const beak = at(cone(0.06, 0.15, C.beak), 0, -0.1, 0.45);
  beak.rotation.x = Math.PI * 0.55;
  head.add(beak);
  const scarf = at(torus(0.33, 0.07, C.orange), 0, 1.4, 0);
  scarf.rotation.x = Math.PI / 2;
  owl.add(head, scarf);
  return { owl, head };
}

function makePlayer(k: Kit) {
  const { at, ball, cyl, mesh } = k;
  const player = new THREE.Group();
  const body = new THREE.Group();
  player.add(body);
  const hood = at(ball(0.2, C.orange), 0, 0.6, 0);
  hood.scale.set(1.15, 0.5, 1.1);
  body.add(at(cyl(0.2, 0.24, 0.36, C.orange), 0, 0.42, 0), hood);
  const legs = [-1, 1].map((s) => {
    const pivot = at(new THREE.Group(), s * 0.09, 0.26, 0);
    const shoe = at(ball(0.08, C.woodDark, 12), 0, -0.2, 0.03);
    shoe.scale.set(1, 0.6, 1.3);
    pivot.add(at(cyl(0.07, 0.07, 0.2, C.navy, 12), 0, -0.1, 0), shoe);
    player.add(pivot);
    return pivot;
  });
  const arms = [-1, 1].map((s) => {
    const pivot = at(new THREE.Group(), s * 0.25, 0.55, 0);
    pivot.add(at(cyl(0.055, 0.055, 0.22, C.orange, 12), 0, -0.1, 0), at(ball(0.06, C.skin, 12), 0, -0.22, 0));
    pivot.rotation.z = s * 0.15;
    body.add(pivot);
    return pivot;
  });
  const head = at(new THREE.Group(), 0, 0.98, 0);
  head.add(ball(0.33, C.skin));
  const hair = mesh(new THREE.SphereGeometry(0.35, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), C.hair);
  hair.rotation.x = -0.35;
  head.add(at(hair, 0, 0.02, -0.03));
  const bangs = at(ball(0.16, C.hair, 16), 0.05, 0.2, 0.22);
  bangs.scale.set(1.6, 0.5, 0.8);
  head.add(bangs);
  [-1, 1].forEach((s) => {
    const eye = at(ball(0.05, C.ink, 12), s * 0.12, 0, 0.3);
    eye.scale.set(0.8, 1.2, 0.6);
    const cheek = at(ball(0.05, C.blush, 12), s * 0.2, -0.09, 0.26);
    cheek.scale.set(1, 0.6, 0.4);
    head.add(eye, at(ball(0.017, C.white, 8), s * 0.12 + 0.015, 0.025, 0.335), cheek);
  });
  body.add(head);
  return { player, body, legs, arms };
}

// ── 장면 ────────────────────────────────────────────────────────────
export function mountMuseum(root: HTMLElement, options: MuseumOptions): () => void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { grid, H, zw, spots: spotDefs, shelves, plants, rows } = layout(options.exhibits);
  const cell = (x: number, z: number): Cell => (x < 0 || z < 0 || x >= W || z >= H ? '#' : grid[z][x]);
  const solid = (x: number, z: number) => cell(x, z) !== '.';

  const k = makeKit();
  const { at, box, cyl, ball, mat } = k;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'museum__canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '박물관. 방향키나 WASD 로 걷고 Enter 로 말을 건다. / 를 누르면 부엉이를 부른다');
  root.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff6e6, 0xb08a64, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 3;
  const half = Math.max(W, H) / 2 + 2;
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 80 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.position.set(W / 2 - 6, 18, H / 2 + 10);
  sun.target.position.set(W / 2, 0, H / 2);
  scene.add(sun, sun.target);

  // 바닥: 체크 타일과 카펫을 한 장의 텍스처로
  const floorTex = (() => {
    const P = 32;
    const cv = document.createElement('canvas');
    cv.width = W * P;
    cv.height = H * P;
    const g = cv.getContext('2d')!;
    const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
    for (let z = 0; z < H; z++)
      for (let x = 0; x < W; x++) {
        g.fillStyle = hex((x + z) % 2 ? C.floorA : C.floorB);
        g.fillRect(x * P, z * P, P, P);
        g.fillStyle = hex(C.grout);
        g.fillRect(x * P, z * P, P, 1);
        g.fillRect(x * P, z * P, 1, P);
      }
    const rug = (x: number, z: number, w: number, h: number) => {
      g.fillStyle = hex(C.carpetEdge);
      g.fillRect(x * P, z * P, w * P, h * P);
      g.fillStyle = hex(C.carpet);
      g.fillRect(x * P + 5, z * P + 5, w * P - 10, h * P - 10);
    };
    rug(MID, zw + 4, 1, H - zw - 4);
    rug(3.5, zw + 1, W - 7, 1);
    rug(4, zw - 1, 3, 2);
    rug(14, zw - 1, 3, 2);
    for (let r = 0; r < rows; r++) {
      rug(1.5, 3 + 3 * r + 0.15, 8, 0.7);
      rug(11.5, 3 + 3 * r + 0.15, 8, 0.7);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  k.disposables.push(floorTex);
  const floorGeo = new THREE.PlaneGeometry(W, H);
  const floorMat = new THREE.MeshToonMaterial({ map: floorTex, gradientMap: k.grad });
  k.disposables.push(floorGeo, floorMat);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, H / 2);
  floor.receiveShadow = true;
  floor.userData.floor = true;
  scene.add(floor);

  // 벽: 카메라 쪽 벽과 칸막이는 낮게 해서 안이 보이게 한다
  const wallGeos = new Map<number, THREE.BoxGeometry>();
  const capGeo = new THREE.BoxGeometry(1.04, 0.1, 1.04);
  k.disposables.push(capGeo);
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const c = cell(x, z);
      if (c === 'C') {
        const col = at(new THREE.Group(), x + 0.5, 0, z + 0.5);
        col.add(at(cyl(0.34, 0.38, 0.16, C.cream), 0, 0.08, 0), at(cyl(0.26, 0.26, 1.5, C.cream), 0, 0.9, 0));
        col.add(at(cyl(0.36, 0.3, 0.18, C.cream), 0, 1.72, 0));
        scene.add(col);
        continue;
      }
      if (c !== '#') continue;
      const h = z === 0 ? 2.4 : z === H - 1 ? 0.45 : z === zw ? 0.9 : x === MID ? 1.3 : 1.5;
      let geo = wallGeos.get(h);
      if (!geo) {
        geo = new THREE.BoxGeometry(1, h, 1);
        wallGeos.set(h, geo);
        k.disposables.push(geo);
      }
      const wall = new THREE.Mesh(geo, mat(C.wall));
      wall.castShadow = wall.receiveShadow = true;
      scene.add(at(wall, x + 0.5, h / 2, z + 0.5));
      const cap = new THREE.Mesh(capGeo, mat(C.wallTop));
      cap.castShadow = true;
      scene.add(at(cap, x + 0.5, h + 0.05, z + 0.5));
    }
  // 뒷벽 액자
  [5, 15.5].forEach((x) => {
    scene.add(at(box(2.2, 0.9, 0.08, C.woodDark), x, 1.6, 1.04), at(box(1.96, 0.66, 0.1, C.cream), x, 1.6, 1.05));
    const sunArt = at(ball(0.2, C.orange), x - 0.5, 1.62, 1.12);
    sunArt.scale.z = 0.3;
    const hill = at(ball(0.42, C.leaf), x + 0.3, 1.35, 1.12);
    hill.scale.set(1.6, 0.5, 0.2);
    scene.add(sunArt, hill);
  });

  // 진열대
  const glass = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, shininess: 120, depthWrite: false });
  const domeGeo = new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const ringGeo = new THREE.RingGeometry(0.42, 0.52, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: C.orange });
  k.disposables.push(glass, domeGeo, ringGeo, ringMat);
  const spots: Spot[] = [];
  const pickables: THREE.Object3D[] = [floor];
  spotDefs.forEach(({ exhibit, x, z }) => {
    const g = at(new THREE.Group(), x + 0.5, 0, z + 0.5);
    g.add(at(cyl(0.34, 0.38, 0.12, C.woodDark), 0, 0.06, 0), at(cyl(0.27, 0.3, 0.6, C.cream), 0, 0.42, 0));
    g.add(at(cyl(0.34, 0.34, 0.07, C.woodDark), 0, 0.75, 0));
    g.add(at(prop(k, exhibit.prop), 0, 0.8, 0), at(new THREE.Mesh(domeGeo, glass), 0, 0.78, 0));
    const ring = at(new THREE.Mesh(ringGeo, ringMat), 0, 0.012, 0);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    g.add(ring);
    g.userData.exhibit = exhibit;
    scene.add(g);
    pickables.push(g);
    spots.push({ exhibit, tile: [x, z], focus: new THREE.Vector3(x + 0.5, 1.35, z + 0.5), ring, group: g });
  });

  // 책장 (독후감)
  const bookColors = [C.orange, C.navy, C.cream, C.leaf, C.pot, C.navy, C.orange];
  shelves.forEach(({ exhibit, x, z, left }) => {
    const side = left ? 1 : -1;
    const g = at(new THREE.Group(), x + 0.5, 0, z + 1);
    g.add(at(box(0.5, 1.8, 2, C.woodDark), -side * 0.2, 0.9, 0));
    [0.35, 0.95, 1.55].forEach((sy, row) => {
      g.add(at(box(0.7, 0.06, 2, C.wood), 0, sy - 0.2, 0));
      let bz = -0.85;
      for (let i = 0; bz < 0.8; i++) {
        const t = 0.1 + ((i * 7 + row * 3) % 4) * 0.03;
        const h = 0.36 + ((i * 5 + row) % 3) * 0.06;
        const b = at(box(0.4, h, t, bookColors[(i + row * 2) % bookColors.length]), side * 0.05, sy - 0.17 + h / 2, bz + t / 2);
        if (i % 5 === 3) b.rotation.x = 0.12;
        g.add(b);
        bz += t + 0.02;
      }
    });
    g.add(at(box(0.75, 0.08, 2.08, C.wood), 0, 1.84, 0));
    g.userData.exhibit = exhibit;
    scene.add(g);
    pickables.push(g);
    const ring = at(new THREE.Mesh(ringGeo, ringMat), x + 0.5 + side * 0.9, 0.012, z + 1);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.set(1.6, 2.6, 1);
    ring.visible = false;
    scene.add(ring);
    spots.push({ exhibit, tile: [x, z], focus: new THREE.Vector3(x + 0.5, 2.1, z + 1), ring, group: g });
  });

  plants.forEach(([x, z]) => {
    const g = at(new THREE.Group(), x + 0.5, 0, z + 0.5);
    g.add(at(cyl(0.26, 0.2, 0.36, C.pot), 0, 0.18, 0));
    (
      [
        [0, 0.62, 0, 0.32],
        [-0.17, 0.5, 0.08, 0.22],
        [0.17, 0.52, -0.06, 0.24],
        [0.04, 0.85, 0.02, 0.2],
      ] as const
    ).forEach(([bx, by, bz, r], i) => g.add(at(ball(r, i % 2 ? C.leafDark : C.leaf, 16), bx, by, bz)));
    scene.add(g);
  });

  // 리셉션
  const owlTile = { x: MID, z: zw + 2 };
  const desk = at(new THREE.Group(), MID + 0.5, 0, zw + 3.55);
  desk.add(at(box(3, 0.78, 0.8, C.wood), 0, 0.39, 0), at(box(3.12, 0.08, 0.92, C.cream), 0, 0.82, 0));
  desk.add(at(box(2.6, 0.1, 0.02, C.orange), 0, 0.55, 0.41));
  const bell = at(new THREE.Group(), 0.9, 0.86, 0.1);
  bell.add(at(cyl(0.1, 0.1, 0.02, C.woodDark), 0, 0.01, 0));
  bell.add(k.mesh(new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), C.bell));
  desk.add(bell);
  desk.userData.owl = true;
  scene.add(desk);
  const { owl, head: owlHead } = makeOwl(k);
  at(owl, owlTile.x + 0.5, 0, owlTile.z + 0.55);
  owl.userData.owl = true;
  scene.add(owl);
  pickables.push(desk, owl);
  const owlFocus = new THREE.Vector3(owlTile.x + 0.5, 2.5, owlTile.z + 0.55);
  const owlStand = { x: owlTile.x + 0.5, z: owlTile.z + 2.6 };

  const { player, body, legs, arms } = makePlayer(k);
  at(player, MID + 0.5, 0, H - 2.4);
  player.rotation.y = Math.PI;
  scene.add(player);

  // ── 겹친 UI ──────────────────────────────────────────────────────
  const el = (tag: string, cls: string, parent: HTMLElement = root) => {
    const e = document.createElement(tag);
    e.className = cls;
    parent.appendChild(e);
    return e;
  };
  const tags = [
    { text: '기술 노트관', pos: new THREE.Vector3(5, 2.75, 0.8) },
    { text: '연구실 별관', pos: new THREE.Vector3(15.5, 2.75, 0.8) },
    { text: '리셉션', pos: new THREE.Vector3(MID + 0.5, 2.7, owlTile.z + 0.5) },
  ].map((t) => {
    const e = el('div', 'museum__tag');
    e.textContent = t.text;
    return { ...t, e };
  });
  const near = el('div', 'museum__near');
  near.hidden = true;
  const talk = el('div', 'museum__talk');
  talk.hidden = true;
  talk.setAttribute('role', 'dialog');
  talk.setAttribute('aria-live', 'polite');
  const talkName = el('span', 'museum__name', talk);
  const talkText = el('div', 'museum__text', talk);
  const choices = el('div', 'museum__choices', talk);
  const more = el('span', 'museum__more', talk);
  more.textContent = '▼';

  // ── 상태 ────────────────────────────────────────────────────────
  const keys = new Set<string>();
  let talking = false;
  let path: { x: number; z: number }[] = [];
  let arrive: (() => void) | null = null;
  let dir = Math.PI;
  let walk = 0;
  let typing: number | null = null;
  let queue: string[] = [];
  let full = '';
  let after: (() => void) | null = null;
  let greeted = false;
  let disposed = false;

  const tileOf = (x: number, z: number) => ({ x: Math.floor(x), z: Math.floor(z) });

  // 칸 단위 너비 우선 탐색으로 길을 찾는다
  function route(tx: number, tz: number): { x: number; z: number }[] | null {
    const s = tileOf(player.position.x, player.position.z);
    const goal = tileOf(tx, tz);
    if (solid(goal.x, goal.z)) return null;
    const prev = new Map<number, number>();
    const key = (x: number, z: number) => z * W + x;
    const q = [key(s.x, s.z)];
    prev.set(q[0], -1);
    while (q.length) {
      const cur = q.shift()!;
      const cx = cur % W;
      const cz = Math.floor(cur / W);
      if (cx === goal.x && cz === goal.z) break;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = cx + dx;
        const nz = cz + dz;
        const nk = key(nx, nz);
        if (solid(nx, nz) || prev.has(nk)) continue;
        prev.set(nk, cur);
        q.push(nk);
      }
    }
    const gk = key(goal.x, goal.z);
    if (!prev.has(gk)) return null;
    const out: { x: number; z: number }[] = [];
    for (let c = gk; c !== -1 && c !== key(s.x, s.z); c = prev.get(c)!) out.unshift({ x: (c % W) + 0.5, z: Math.floor(c / W) + 0.5 });
    if (out.length) out[out.length - 1] = { x: tx, z: tz };
    else out.push({ x: tx, z: tz });
    return out;
  }
  function goTo(tx: number, tz: number, then?: () => void) {
    const r = route(tx, tz);
    if (!r) return;
    path = r;
    arrive = then ?? null;
  }
  function standBy(spot: Spot): { x: number; z: number; face: number } {
    const [x, z] = spot.tile;
    if (spot.exhibit.hall === 'book') {
      const left = x < MID;
      return { x: x + (left ? 1.6 : -0.6), z: z + 1, face: left ? -Math.PI / 2 : Math.PI / 2 };
    }
    const sides: [number, number][] = [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ];
    const [ox, oz] = sides.find(([dx, dz]) => !solid(x + dx, z + dz)) ?? [0, 1];
    return { x: x + ox + 0.5, z: z + oz + 0.5, face: Math.atan2(-ox, -oz) };
  }

  function free(x: number, z: number) {
    const r = 0.27;
    return [
      [-r, -r],
      [r, -r],
      [-r, r],
      [r, r],
    ].every(([dx, dz]) => !solid(Math.floor(x + dx), Math.floor(z + dz)));
  }
  function step(dx: number, dz: number) {
    // 문이나 진열대 사이로 들어갈 때 칸 가운데로 살짝 당겨서 모서리에 걸리지 않게 한다
    const cx = Math.floor(player.position.x) + 0.5;
    const cz = Math.floor(player.position.z) + 0.5;
    if (dz && !dx && !free(player.position.x, player.position.z + dz) && free(cx, player.position.z + Math.sign(dz) * 0.6)) {
      dx = THREE.MathUtils.clamp(cx - player.position.x, -Math.abs(dz), Math.abs(dz));
    } else if (dx && !dz && !free(player.position.x + dx, player.position.z) && free(player.position.x + Math.sign(dx) * 0.6, cz)) {
      dz = THREE.MathUtils.clamp(cz - player.position.z, -Math.abs(dx), Math.abs(dx));
    }
    let moved = false;
    if (dx && free(player.position.x + dx, player.position.z)) {
      player.position.x += dx;
      moved = true;
    }
    if (dz && free(player.position.x, player.position.z + dz)) {
      player.position.z += dz;
      moved = true;
    }
    return moved;
  }

  type Near = { owl: true; focus: THREE.Vector3 } | { owl: false; spot: Spot; focus: THREE.Vector3 };
  function nearby(): Near | null {
    const p = player.position;
    let best: Near | null = null;
    let bd = Infinity;
    const dOwl = Math.hypot(owlTile.x + 0.5 - p.x, owlTile.z + 0.5 - p.z);
    if (dOwl < 2.4) {
      best = { owl: true, focus: owlFocus };
      bd = dOwl;
    }
    spots.forEach((spot) => {
      const [x, z] = spot.tile;
      const d =
        spot.exhibit.hall === 'book'
          ? Math.abs(x + 0.5 - p.x) - 0.3 + Math.max(0, Math.abs(z + 1 - p.z) - 1)
          : Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
      if (d < 1.45 && d < bd) {
        bd = d;
        best = { owl: false, spot, focus: spot.focus };
      }
    });
    return best;
  }

  // ── 말풍선 ──────────────────────────────────────────────────────
  function stopTyping() {
    if (typing !== null) window.clearInterval(typing);
    typing = null;
  }
  // 한 줄을 다 찍었을 때. 마지막 줄 뒤에 고를 것이 있으면 바로 보여 준다
  function finished() {
    more.hidden = false;
    if (!queue.length && after) {
      more.hidden = true;
      const then = after;
      after = null;
      then();
    }
  }
  function say(name: string, lines: string[], then?: () => void) {
    talking = true;
    keys.clear();
    path = [];
    talk.hidden = false;
    near.hidden = true;
    talkName.textContent = name;
    queue = [...lines];
    after = then ?? null;
    next();
  }
  function next() {
    choices.replaceChildren();
    stopTyping();
    const line = queue.shift();
    if (line === undefined) {
      const then = after;
      after = null;
      if (then) then();
      else close();
      return;
    }
    full = line;
    if (reduce) {
      talkText.textContent = line;
      finished();
      return;
    }
    let i = 0;
    talkText.textContent = '';
    more.hidden = true;
    const chars = [...line];
    typing = window.setInterval(() => {
      talkText.textContent = chars.slice(0, ++i).join('');
      if (i >= chars.length) {
        stopTyping();
        finished();
      }
    }, 32);
  }
  function advance() {
    if (choices.childElementCount) return;
    if (typing !== null) {
      stopTyping();
      talkText.textContent = full;
      finished();
      return;
    }
    next();
  }
  function close() {
    stopTyping();
    queue = [];
    after = null;
    choices.replaceChildren();
    talk.hidden = true;
    talking = false;
    keys.clear();
    renderer.domElement.focus({ preventScroll: true });
  }
  type Choice = { label: string; sub?: string; run: () => void };
  function ask(list: Choice[]) {
    more.hidden = true;
    list.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'museum__choice';
      b.textContent = c.label;
      if (c.sub) {
        const s = document.createElement('small');
        s.textContent = c.sub;
        b.appendChild(s);
      }
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        c.run();
      });
      choices.appendChild(b);
    });
    (choices.firstElementChild as HTMLElement | null)?.focus({ preventScroll: true });
  }

  function glow(test: (s: Spot) => boolean) {
    spots.forEach((s) => (s.ring.visible = test(s)));
  }

  function owlMenu() {
    ask([
      { label: '기술 노트', run: () => guide('note', '위쪽 왼편 기술 노트관이에요. 진열대 아래에 주황 동그라미를 그려 둘게요.') },
      { label: '연구실', run: () => guide('lab', '위쪽 오른편 연구실 별관이에요. 직접 만들어 올린 작은 앱과 도구가 있어요.') },
      { label: '책 이야기', run: () => guide('book', '로비 양옆 책장이에요. 읽고 쓴 독후감이 꽂혀 있어요.') },
      { label: '직접 물어볼게요', run: question },
      { label: '그만 볼게요', run: close },
    ]);
  }
  function talkOwl() {
    const lines = greeted
      ? ['또 오셨네요! 무엇을 찾으세요?']
      : [
          '어서 오세요! 여기는 evan.log 기록관이에요. 글 한 편이 진열대 하나예요.',
          '위쪽 왼편은 기술 노트관, 오른편은 연구실 별관이에요. 책 이야기는 로비 양옆 책장에 있고요.',
          '어디서든 / 를 누르면 제가 날아올게요. 무엇을 찾으세요?',
        ];
    greeted = true;
    say('부엉이', lines, owlMenu);
  }
  function guide(hall: Exhibit['hall'], line: string) {
    glow((s) => s.exhibit.hall === hall);
    say('부엉이', [line]);
  }

  function question() {
    choices.replaceChildren();
    stopTyping();
    talkText.textContent = '궁금한 걸 적어 주세요. 맞는 진열대를 찾아 드릴게요.';
    more.hidden = true;
    const form = document.createElement('form');
    form.className = 'museum__ask';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 200;
    input.placeholder = '예: 캐시를 더 자세히 다룬 글이 있어?';
    input.setAttribute('aria-label', '부엉이에게 물을 질문');
    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'museum__choice';
    send.textContent = '묻기';
    form.append(input, send);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) answer(q);
    });
    choices.appendChild(form);
    input.focus({ preventScroll: true });
  }
  async function answer(q: string) {
    choices.replaceChildren();
    talkText.textContent = '음… 진열대를 둘러보는 중이에요.';
    let picks: AskPick[];
    try {
      picks = await options.ask(q);
    } catch (error) {
      if (disposed) return;
      say('부엉이', [error instanceof Error ? error.message : '지금은 답할 수 없어요.'], owlMenu);
      return;
    }
    if (disposed) return;
    const found = picks
      .map((p) => ({ pick: p, spot: spots.find((s) => s.exhibit.id === p.id) }))
      .filter((f): f is { pick: AskPick; spot: Spot } => !!f.spot);
    if (!found.length) {
      glow(() => false);
      say('부엉이', ['맞는 진열대를 못 찾았어요. 다르게 물어봐 주실래요?'], owlMenu);
      return;
    }
    const ids = new Set(found.map((f) => f.spot.exhibit.id));
    glow((s) => ids.has(s.exhibit.id));
    say('부엉이', [`${found.length}개를 찾았어요. 바닥에 주황 동그라미를 그려 뒀어요. 어디로 안내할까요?`], () =>
      ask([
        ...found.map(({ pick, spot }) => ({
          label: spot.exhibit.short,
          sub: pick.reason,
          run: () => {
            close();
            const s = standBy(spot);
            goTo(s.x, s.z, () => {
              dir = s.face;
              placard(spot, pick.reason);
            });
          },
        })),
        { label: '괜찮아요', run: close },
      ]),
    );
  }

  function placard(spot: Spot, reason?: string) {
    const ex = spot.exhibit;
    say('설명판', [`[${ex.topic}] ${ex.title}${reason ? `\n${reason}` : ''}`], () =>
      ask([
        { label: ex.external ? '새 탭에서 보기' : '글 읽기', run: () => (close(), options.open(ex)) },
        { label: '닫기', run: close },
      ]),
    );
  }

  function interact() {
    const n = nearby();
    if (!n) return;
    if (n.owl) talkOwl();
    else placard(n.spot);
  }

  // ── 입력 ────────────────────────────────────────────────────────
  const KEYMAP: Record<string, string> = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
  };
  const typingInto = (t: EventTarget | null) =>
    t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  function onKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    if (document.querySelector('dialog[open]')) return;
    const inField = typingInto(e.target);
    if (e.key === 'Escape' && talking) {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === '/' && !inField) {
      e.preventDefault();
      talkOwl();
      return;
    }
    if (talking) {
      if (inField) return;
      const buttons = [...choices.querySelectorAll<HTMLElement>('button')];
      if (buttons.length && /^Arrow/.test(e.key)) {
        e.preventDefault();
        const idx = buttons.indexOf(document.activeElement as HTMLElement);
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        buttons[(idx + d + buttons.length) % buttons.length].focus({ preventScroll: true });
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && !buttons.includes(document.activeElement as HTMLElement)) {
        e.preventDefault();
        if (buttons.length) buttons[0].click();
        else advance();
      }
      return;
    }
    if (inField) return;
    const k = KEYMAP[e.code];
    if (k) {
      keys.add(k);
      path = [];
      arrive = null;
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (nearby()) {
        e.preventDefault();
        interact();
      }
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    const k = KEYMAP[e.code];
    if (k) keys.delete(k);
  }
  const onBlur = () => keys.clear();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  talk.addEventListener('click', advance);

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function onClick(e: MouseEvent) {
    if (talking) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    if (!hit) return;
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.exhibit && !o.userData.owl && !o.userData.floor) o = o.parent;
    if (!o) return;
    if (o.userData.owl) {
      goTo(owlStand.x, owlStand.z, () => {
        dir = Math.PI;
        talkOwl();
      });
      return;
    }
    if (o.userData.exhibit) {
      const spot = spots.find((s) => s.group === o);
      if (!spot) return;
      const s = standBy(spot);
      goTo(s.x, s.z, () => {
        dir = s.face;
        placard(spot);
      });
      return;
    }
    goTo(hit.point.x, hit.point.z);
  }
  renderer.domElement.addEventListener('click', onClick);

  // ── 화면 크기·카메라 ────────────────────────────────────────────
  function resize() {
    const w = root.clientWidth;
    const h = root.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w < 640 ? 52 : 40;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const want = new THREE.Vector3();
  const look = new THREE.Vector3();
  function placeCamera(snap: boolean) {
    const p = player.position;
    const fx = THREE.MathUtils.clamp(p.x, 5, W - 5);
    const fz = THREE.MathUtils.clamp(p.z, 4, H - 5);
    want.set(fx, 12, fz + 9.5);
    look.set(fx, 0.4, fz - 0.6);
    if (snap || reduce) {
      camPos.copy(want);
      camLook.copy(look);
    } else {
      camPos.lerp(want, 0.08);
      camLook.lerp(look, 0.08);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }
  placeCamera(true);

  const v = new THREE.Vector3();
  function project(pos: THREE.Vector3, e: HTMLElement) {
    v.copy(pos).project(camera);
    const outside = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1;
    e.style.transform = `translate(${(v.x * 0.5 + 0.5) * root.clientWidth}px, ${(-v.y * 0.5 + 0.5) * root.clientHeight}px)`;
    return !outside;
  }

  // ── 매 프레임 ───────────────────────────────────────────────────
  let raf = 0;
  let last = performance.now();
  let nearKey = '';
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let dx = 0;
    let dz = 0;
    if (!talking) {
      if (keys.has('left')) dx -= 1;
      if (keys.has('right')) dx += 1;
      if (keys.has('up')) dz -= 1;
      if (keys.has('down')) dz += 1;
      if (!dx && !dz && path.length) {
        const t = path[0];
        const vx = t.x - player.position.x;
        const vz = t.z - player.position.z;
        const d = Math.hypot(vx, vz);
        if (d < 0.08) {
          path.shift();
          if (!path.length) {
            const done = arrive;
            arrive = null;
            done?.();
          }
        } else {
          dx = vx / d;
          dz = vz / d;
        }
      }
    }
    let moved = false;
    if (dx || dz) {
      const n = Math.hypot(dx, dz);
      const sp = 3.6 * dt;
      dir = Math.atan2(dx, dz);
      moved = step((dx / n) * sp, (dz / n) * sp);
      if (!moved && path.length) {
        path = [];
        arrive = null;
      }
    }
    let diff = dir - player.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.rotation.y += reduce ? diff : diff * Math.min(1, dt * 14);
    // 걸을 때만 팔다리가 흔들린다
    if (moved) walk += dt * 11;
    const swing = moved ? Math.sin(walk) : 0;
    legs[0].rotation.x = swing * 0.7;
    legs[1].rotation.x = -swing * 0.7;
    arms[0].rotation.x = -swing * 0.6;
    arms[1].rotation.x = swing * 0.6;
    const bob = moved && !reduce ? Math.abs(Math.sin(walk)) * 0.06 : 0;
    body.position.y += (bob - body.position.y) * 0.4;
    // 부엉이는 가까이 온 사람 쪽으로 고개를 돌린다
    const toP = Math.atan2(player.position.x - owl.position.x, player.position.z - owl.position.z);
    const lookAt = player.position.distanceTo(owl.position) < 6 ? THREE.MathUtils.clamp(toP, -0.9, 0.9) : 0;
    owlHead.rotation.y += reduce ? lookAt - owlHead.rotation.y : (lookAt - owlHead.rotation.y) * Math.min(1, dt * 5);

    placeCamera(false);
    renderer.render(scene, camera);

    tags.forEach((t) => (t.e.hidden = !project(t.pos, t.e)));
    const n = talking ? null : nearby();
    if (n) {
      const key = n.owl ? 'owl' : n.spot.exhibit.id;
      if (key !== nearKey) {
        nearKey = key;
        near.replaceChildren();
        const label = document.createElement('strong');
        label.textContent = n.owl ? '부엉이' : n.spot.exhibit.short;
        const hint = document.createElement('span');
        hint.textContent = n.owl ? 'Enter 말 걸기' : 'Enter 설명 보기';
        near.append(label, hint);
      }
      near.hidden = !project(n.focus, near);
    } else {
      nearKey = '';
      near.hidden = true;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  const hello = window.setTimeout(talkOwl, 600);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(hello);
    stopTyping();
    ro.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    renderer.domElement.removeEventListener('click', onClick);
    k.disposables.forEach((d) => d.dispose());
    renderer.dispose();
    root.replaceChildren();
  };
}
