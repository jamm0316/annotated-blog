// @MX:NOTE: 박물관 3D 장면·배치·대화·입력·수첩·영수증·프레임 루프(mountMuseum). React 밖에서 three.js 와 DOM 으로 그린다
// @MX:SPEC: .claude/docs/domains/museum.md
import * as THREE from 'three';
import type { Exhibit, PropKind } from '@/lib/museum';
import { loadPassport, READ_EVENT, savePassport, stamp, STAMP_EVENT } from './passport';

// 박물관 모드의 3D 장면과 조작. React 밖에서 three.js 로 그리고, 말풍선 같은 겹친 UI 도 여기서 DOM 으로 만든다.
// 이 모드만 사이트의 세 가지 색 규칙에서 빠진다(나무·풀·크림 같은 색이 있어야 장난감처럼 보인다).

export type AskPick = { id: string; reason: string };
/** 부엉이의 답(answer)과 함께 고른 진열대. answer 가 비면 진열대 안내만 한다 */
export type AskReply = { answer: string; picks: AskPick[] };
// @MX:ANCHOR: mountMuseum 의 옵션 계약(exhibits, ask, open)
// @MX:REASON: Museum.tsx 가 /api/ask 응답과 라우터 이동을 이 모양에 맞춰 넘긴다. ask 는 실패 시 문구 담은 Error 를 던져야 부엉이가 그대로 말한다
export type MuseumOptions = {
  exhibits: Exhibit[];
  /** 부엉이에게 물은 질문을 /api/ask 로 넘긴다. 실패하면 문구가 담긴 Error 를 던진다 */
  ask: (question: string) => Promise<AskReply>;
  /** 글은 사이트 안에서, 연구실은 새 탭에서 연다 */
  open: (exhibit: Exhibit) => void;
};

// @MX:NOTE: 관 이름. 수첩 제목·축하·명예의 전당·관 이름 표시(announce)가 함께 쓴다
const HALL_NAME = { note: '기술 노트관', lab: '연구실 별관', book: '로비 책장' } as const;
type TrophyKind = keyof typeof HALL_NAME | 'bug';

/** 설명판에 조회수를 보이기 시작하는 사람 수. 초반의 아주 작은 숫자는 보이지 않는다 */
const VIEWS_SHOW = 10;

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
  // 주황(색상 25°)의 보색(205°). 주황·나무색 바닥 위에서 고른 진열대를 가리키는 고리
  mark: 0x1aa3ff,
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
  gold: 0xf2b632,
  // 조회수 표식. HOT 은 뚜껑 둘레 따뜻한 빛 테, BEST 는 몸통 금 메달의 리본 꼬리
  hot: 0xff4d2e,
  ribbon: 0xd2443a,
  cloth: 0xefe2cc,
  sky: 0xf7e7cf,
};

type Cell = '#' | '.' | 'P' | 'D' | 'B' | 'O' | 'T' | 'C' | 'R';
type Spot = {
  exhibit: Exhibit;
  tile: [number, number];
  focus: THREE.Vector3;
  ring: THREE.Object3D;
  group: THREE.Object3D;
  /** 유리 돔 진열대만. 책장은 null */
  prop: THREE.Object3D | null;
  dome: THREE.Object3D | null;
};

// ── 배치 ────────────────────────────────────────────────────────────
// 위쪽 왼편 기술 노트관, 오른편 연구실 별관, 아래 로비(리셉션·책장). 글 수에 따라 전시실이 길어진다.
const W = 21;
const MID = 10;
const COLS_NOTE = [2, 5, 8];
const COLS_LAB = [12, 15, 18];

// @MX:NOTE: 격자 배치. 관·열·줄(한 줄 3개, 줄 간격 3), 문턱 벽 zw, 로비·책장·명예의 전당 위치를 정한다. '.' 칸만 걸을 수 있다
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
  // 명예의 전당: 출구 통로 양옆 받침대 넷. 한 관의 도장을 다 모으거나 버그를 다 잡으면 가림천을 벗는다
  const trophies = (['note', 'lab', 'book', 'bug'] as const).map((kind, i) => ({
    kind: kind as TrophyKind,
    x: [MID - 4, MID - 2, MID + 2, MID + 4][i],
    z: H - 3,
  }));
  trophies.forEach(({ x, z }) => (grid[z][x] = 'R'));

  return { grid, H, zw, spots, shelves, plants, rows, trophies };
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

// 숨은 버그. 등에 주황 줄무늬가 있는 작은 딱정벌레. 금색으로 만들면 명예의 전당 트로피가 된다
function makeBug(k: Kit, color: number = C.ink) {
  const { at, ball, box } = k;
  const g = new THREE.Group();
  const shell = at(ball(0.11, color, 16), 0, 0.08, 0);
  shell.scale.set(1, 0.65, 1.3);
  g.add(shell, at(box(0.03, 0.02, 0.26, color === C.ink ? C.orange : color), 0, 0.15, 0), at(ball(0.06, color, 12), 0, 0.07, 0.15));
  [-1, 1].forEach((s) => {
    [-0.07, 0, 0.07].forEach((z) => {
      const leg = at(box(0.1, 0.014, 0.014, color), s * 0.11, 0.03, z);
      leg.rotation.z = s * -0.4;
      g.add(leg);
    });
    const ant = at(box(0.012, 0.012, 0.09, color), s * 0.03, 0.11, 0.22);
    ant.rotation.set(-0.6, s * 0.4, 0);
    g.add(ant);
  });
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
// @MX:ANCHOR: 박물관 장면을 root 에 붙이고 정리 함수를 돌려준다
// @MX:REASON: Museum.tsx 가 동적 import 로 부르고 언마운트 때 반환 함수를 부른다. 새 리스너·타이머·three 자원은 반환 함수에서 꼭 정리할 것
export function mountMuseum(root: HTMLElement, options: MuseumOptions): () => void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { grid, H, zw, spots: spotDefs, shelves, plants, rows, trophies: trophyDefs } = layout(options.exhibits);
  const cell = (x: number, z: number): Cell => (x < 0 || z < 0 || x >= W || z >= H ? '#' : grid[z][x]);
  const solid = (x: number, z: number) => cell(x, z) !== '.';

  const k = makeKit();
  const { at, box, cyl, ball, cone, torus, mat } = k;

  // 들어온 시각(방문자 기기 시계)에 맞춰 빛을 정한다. 아침(6~9시)은 동쪽에서 낮게 드는 맑은 햇살, 낮은 햇빛,
  // 저녁(17~19시)은 서쪽에서 낮게 비치는 노을빛, 밤은 진열대 불빛만. 들어올 때 한 번만 정한다
  const hour = new Date().getHours();
  const tod: 'dawn' | 'day' | 'dusk' | 'night' =
    hour >= 19 || hour < 6 ? 'night' : hour < 9 ? 'dawn' : hour >= 17 ? 'dusk' : 'day';
  const LIGHT = {
    day: { sky: C.sky, hemi: [0xfff6e6, 0xb08a64, 1.6], sun: [0xfff1dc, 2], from: [-6, 18, 10] },
    dawn: { sky: 0xf4ead6, hemi: [0xfff8ea, 0xa89070, 1.5], sun: [0xffe6b8, 1.9], from: [15, 9, 6] },
    dusk: { sky: 0xf2c49a, hemi: [0xffe0c0, 0x9a6a4a, 1.3], sun: [0xffa860, 2.1], from: [-15, 9, 6] },
    night: { sky: 0x1f2540, hemi: [0x8f9fd6, 0x3a2e40, 0.8], sun: [0xa9b8ff, 0.6], from: [8, 18, 6] },
  }[tod];

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LIGHT.sky);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'museum__canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '박물관. 방향키나 WASD 로 걷고 Enter 로 말을 건다. / 를 누르면 부엉이를 부른다');
  root.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(LIGHT.hemi[0], LIGHT.hemi[1], LIGHT.hemi[2]));
  const sun = new THREE.DirectionalLight(LIGHT.sun[0], LIGHT.sun[1]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 3;
  const half = Math.max(W, H) / 2 + 2;
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 80 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.position.set(W / 2 + LIGHT.from[0], LIGHT.from[1], H / 2 + LIGHT.from[2]);
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

  // 조회수 표식(stats 도메인). 멀리서 모양으로 알아보게 하고 숫자는 새기지 않는다. 깜빡이지 않는다(반복 애니메이션 금지)
  const hotMat = new THREE.MeshBasicMaterial({ color: C.hot });
  k.disposables.push(hotMat);
  function decorate(g: THREE.Object3D, exhibit: Exhibit) {
    if (exhibit.rank === 'hot') {
      // 뚜껑 둘레에 스스로 빛나는 테
      const band = at(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 10, 40), hotMat), 0, 0.75, 0);
      band.rotation.x = Math.PI / 2;
      k.disposables.push(band.geometry);
      g.add(band);
    } else if (exhibit.rank === 'best') {
      // 카메라 쪽 몸통에 금 메달과 리본 꼬리 두 갈래
      const medal = at(new THREE.Group(), 0, 0.48, 0.31);
      const disc = cyl(0.14, 0.14, 0.04, C.gold);
      disc.rotation.x = Math.PI / 2;
      medal.add(disc, at(ball(0.06, C.cream, 12), 0, 0, 0.025));
      [-1, 1].forEach((s) => {
        const tail = at(box(0.07, 0.2, 0.02, C.ribbon), s * 0.055, -0.16, -0.005);
        tail.rotation.z = s * 0.25;
        medal.add(tail);
      });
      g.add(medal);
    }
  }

  // 진열대
  const glass = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, shininess: 120, depthWrite: false });
  const domeGeo = new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const ringGeo = new THREE.RingGeometry(0.42, 0.52, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: C.mark });
  k.disposables.push(glass, domeGeo, ringGeo, ringMat);
  // 밤에는 유리 돔이 안에서 은은하게 빛나고 받침 아래 불빛이 고인다
  const pool = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolGeo = new THREE.CircleGeometry(0.75, 32);
  k.disposables.push(pool, poolGeo);
  if (tod === 'night') {
    glass.emissive.setHex(0x6a4a20);
    const lamp = new THREE.PointLight(0xffd28a, 9, 9);
    lamp.position.set(MID + 0.5, 2.6, zw + 3.2);
    scene.add(lamp);
  }
  const lightPool = (x: number, z: number) => {
    if (tod !== 'night') return;
    const m = at(new THREE.Mesh(poolGeo, pool), x, 0.011, z);
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
  };
  // 가장 최근 글: 위에서 내려오는 빛기둥. 다 읽으면 끈다
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beamGeo = new THREE.CylinderGeometry(0.18, 0.7, 3.4, 24, 1, true);
  k.disposables.push(beamMat, beamGeo);
  // forEach 안에서 채우므로 null 로 좁혀지지 않게 적는다
  let beam = null as THREE.Object3D | null;
  let newPos = null as THREE.Vector3 | null;
  const spots: Spot[] = [];
  const pickables: THREE.Object3D[] = [floor];
  spotDefs.forEach(({ exhibit, x, z }) => {
    const g = at(new THREE.Group(), x + 0.5, 0, z + 0.5);
    g.add(at(cyl(0.34, 0.38, 0.12, C.woodDark), 0, 0.06, 0), at(cyl(0.27, 0.3, 0.6, C.cream), 0, 0.42, 0));
    g.add(at(cyl(0.34, 0.34, 0.07, C.woodDark), 0, 0.75, 0));
    const pr = at(prop(k, exhibit.prop), 0, 0.8, 0);
    const dome = at(new THREE.Mesh(domeGeo, glass), 0, 0.78, 0);
    g.add(pr, dome);
    lightPool(x + 0.5, z + 0.5);
    decorate(g, exhibit);
    if (exhibit.isNew) {
      beam = at(new THREE.Mesh(beamGeo, beamMat), x + 0.5, 1.7, z + 0.5);
      newPos = new THREE.Vector3(x + 0.5, 2.75, z + 0.5);
    }
    const ring = at(new THREE.Mesh(ringGeo, ringMat), 0, 0.012, 0);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    g.add(ring);
    g.userData.exhibit = exhibit;
    scene.add(g);
    pickables.push(g);
    spots.push({ exhibit, tile: [x, z], focus: new THREE.Vector3(x + 0.5, 1.35, z + 0.5), ring, group: g, prop: pr, dome });
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
    // 책장은 몸통이 없어 메달·빛 테 대신 꼭대기 앞쪽에 메달 하나를 세운다(HOT 은 빨강, BEST 는 금)
    if (exhibit.rank) {
      const medal = at(new THREE.Group(), 0, 2.05, 0.8);
      medal.add(at(cyl(0.17, 0.17, 0.05, exhibit.rank === 'hot' ? C.hot : C.gold), 0, 0, 0));
      medal.children[0].rotation.x = Math.PI / 2;
      medal.add(at(ball(0.07, C.cream, 12), 0, 0, 0.03));
      g.add(medal);
    }
    g.userData.exhibit = exhibit;
    scene.add(g);
    pickables.push(g);
    const ring = at(new THREE.Mesh(ringGeo, ringMat), x + 0.5 + side * 0.9, 0.012, z + 1);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.set(1.6, 2.6, 1);
    ring.visible = false;
    scene.add(ring);
    spots.push({ exhibit, tile: [x, z], focus: new THREE.Vector3(x + 0.5, 2.1, z + 1), ring, group: g, prop: null, dome: null });
    lightPool(x + 0.5 + side * 0.9, z + 1);
    if (exhibit.isNew) {
      beam = at(new THREE.Mesh(beamGeo, beamMat), x + 0.5 + side * 0.4, 1.7, z + 1);
      newPos = new THREE.Vector3(x + 0.5, 3.1, z + 1);
    }
  });
  if (beam) scene.add(beam);

  // 연재 길. 평소에는 꺼져 있다가 연재 진열대에 다가가면 그 자리에서부터 점선이 한 칸씩 켜지며 다른 편 쪽으로 뻗고,
  // 길에서 멀어지면 꺼진다. 켜지는 움직임은 한 번만 일어나고 멈춘다(반복 애니메이션 금지)
  const dashGeo = new THREE.BoxGeometry(0.2, 0.02, 0.08);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffc94a });
  const haloGeo = new THREE.PlaneGeometry(0.3, 0.2);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
  const badgeGeo = new THREE.CircleGeometry(0.2, 24);
  k.disposables.push(dashGeo, dashMat, haloGeo, haloMat, badgeGeo);
  const badgeMat = (no: number) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#ffc94a';
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2b221c';
    g.font = 'bold 34px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(no), 32, 35);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    k.disposables.push(tex, m);
    return m;
  };
  type Lamp = { o: THREE.Object3D; along: number };
  type Trail = { name: string; stops: { x: number; z: number; along: number }[]; lamps: Lamp[]; on: boolean; t0: number; from: number };
  // @MX:NOTE: 연재 길. 같은 series.name 진열대(책장 제외)를 no 순으로 잇고, 다가가면 한 번만 켜진다(updateTrails)
  const trails: Trail[] = [];
  {
    const groups = new Map<string, { no: number; x: number; z: number }[]>();
    spotDefs.forEach(({ exhibit, x, z }) => {
      if (!exhibit.series) return;
      const list = groups.get(exhibit.series.name) ?? [];
      list.push({ no: exhibit.series.no, x: x + 0.5, z: z + 0.5 });
      groups.set(exhibit.series.name, list);
    });
    groups.forEach((list, name) => {
      if (list.length < 2) return;
      list.sort((a, b) => a.no - b.no);
      const lamps: Lamp[] = [];
      const stops: Trail['stops'] = [];
      let along = 0;
      list.forEach((p, i) => {
        stops.push({ x: p.x, z: p.z, along });
        const badge = at(new THREE.Mesh(badgeGeo, badgeMat(p.no)), p.x, 0.014, p.z + 0.62);
        badge.rotation.x = -Math.PI / 2;
        lamps.push({ o: badge, along });
        const q = list[i + 1];
        if (!q) return;
        const len = Math.hypot(q.x - p.x, q.z - p.z);
        const ang = Math.atan2(q.z - p.z, q.x - p.x);
        // 받침대 둘레는 비우고 그 사이에 0.44 간격으로 점선을 놓는다
        for (let d = 0.5; d <= len - 0.5; d += 0.44) {
          const o = at(new THREE.Group(), p.x + ((q.x - p.x) * d) / len, 0.012, p.z + ((q.z - p.z) * d) / len);
          o.rotation.y = -ang;
          const halo = new THREE.Mesh(haloGeo, haloMat);
          halo.rotation.x = -Math.PI / 2;
          o.add(new THREE.Mesh(dashGeo, dashMat), halo);
          lamps.push({ o, along: along + d });
        }
        along += len;
      });
      lamps.forEach(({ o }) => {
        o.visible = false;
        scene.add(o);
      });
      trails.push({ name, stops, lamps, on: false, t0: 0, from: 0 });
    });
  }
  /** 한 칸이 켜지는 간격(초당 몇 칸 길이만큼 퍼지는지)과 한 칸이 커지는 시간 */
  const TRAIL_SPEED = 7;
  const LAMP_POP = 140;
  function updateTrails(now: number) {
    const p = player.position;
    trails.forEach((tr) => {
      // 그 연재 진열대 가까이 오면 켜고, 길(점선)에서 2칸 넘게 벗어나면 끈다
      const nearStop = tr.stops.find((s) => Math.hypot(s.x - p.x, s.z - p.z) < 1.5);
      if (!tr.on && nearStop) {
        tr.on = true;
        tr.t0 = now;
        tr.from = nearStop.along;
      } else if (tr.on && !nearStop && !tr.lamps.some(({ o }) => Math.hypot(o.position.x - p.x, o.position.z - p.z) < 2)) {
        tr.on = false;
        tr.t0 = now;
      }
      tr.lamps.forEach(({ o, along }) => {
        // 켤 때는 다가간 진열대에서 먼 쪽으로 한 칸씩, 끌 때는 한꺼번에 줄어든다
        const delay = tr.on ? (Math.abs(along - tr.from) / TRAIL_SPEED) * 1000 : 0;
        const k = reduce ? (tr.on ? 1 : 0) : Math.min(1, Math.max(0, (now - tr.t0 - delay) / LAMP_POP));
        const s = tr.on ? k : 1 - k;
        o.visible = s > 0.01;
        if (o.visible) o.scale.setScalar(tr.on ? 0.4 + 0.6 * s + Math.sin(s * Math.PI) * 0.25 : s);
      });
    });
  }

  // 명예의 전당. 잠긴 받침대는 가림천을 덮고, 열리면 금 트로피(버그는 금 딱정벌레)가 보인다
  const trophies = trophyDefs.map(({ kind, x, z }) => {
    const g = at(new THREE.Group(), x + 0.5, 0, z + 0.5);
    g.add(at(cyl(0.3, 0.34, 0.5, C.woodDark), 0, 0.25, 0), at(cyl(0.34, 0.34, 0.06, C.cream), 0, 0.53, 0));
    const cup = at(new THREE.Group(), 0, 0.56, 0);
    if (kind === 'bug') {
      const b = makeBug(k, C.gold);
      b.scale.setScalar(2.2);
      cup.add(at(cyl(0.14, 0.16, 0.08, C.woodDark), 0, 0.04, 0), at(b, 0, 0.08, 0));
    } else {
      cup.add(at(cyl(0.14, 0.16, 0.05, C.woodDark), 0, 0.025, 0), at(cyl(0.035, 0.035, 0.14, C.gold, 10), 0, 0.12, 0));
      cup.add(at(cyl(0.17, 0.07, 0.24, C.gold), 0, 0.31, 0));
      [-1, 1].forEach((s) => {
        const h = at(torus(0.06, 0.018, C.gold), s * 0.17, 0.33, 0);
        h.rotation.y = Math.PI / 2;
        cup.add(h);
      });
    }
    const cloth = at(new THREE.Group(), 0, 0.56, 0);
    cloth.add(at(cone(0.36, 0.62, C.cloth, 18), 0, 0.31, 0), at(ball(0.06, C.cloth, 12), 0, 0.63, 0));
    g.add(cup, cloth);
    g.userData.trophy = kind;
    scene.add(g);
    lightPool(x + 0.5, z + 0.5);
    return { kind, x, z, g, cup, cloth, focus: new THREE.Vector3(x + 0.5, 1.6, z + 0.5) };
  });
  type Trophy = (typeof trophies)[number];

  // 숨은 버그. 구석·문 옆·리셉션 책상 뒤에 숨겨 두고, 가까이 가면 잡힌다. 잡은 것은 이 브라우저에 남는다
  // @MX:WARN: 버그 id 는 passport.bugs 에 저장된다. 이름을 바꾸면 이미 잡은 방문자 기록과 어긋난다
  // @MX:REASON: 잡은 버그를 id 로만 기억하고, 다 잡았는지는 이 목록 기준으로 판단한다
  const bugs = [
    { id: 'note-corner', x: 1.35, z: 1.3, r: 0.6 },
    { id: 'note-door', x: MID - 0.45, z: zw - 0.4, r: -2.2 },
    { id: 'lab-corner', x: W - 1.4, z: zw - 0.45, r: 2.6 },
    { id: 'desk', x: MID + 1.9, z: zw + 2.3, r: -0.9 },
    { id: 'lobby-corner', x: W - 1.45, z: H - 1.45, r: 1.8 },
  ]
    .filter((b) => !solid(Math.floor(b.x), Math.floor(b.z)))
    .map((b) => {
      const g = at(makeBug(k), b.x, 0, b.z);
      g.rotation.y = b.r;
      g.userData.bug = b.id;
      scene.add(g);
      pickables.push(g);
      return { ...b, g, caught: false };
    });
  trophies.forEach((t) => pickables.push(t.g));

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
  // 대사를 끝까지 넘기지 않아도 오른쪽 위 닫기로 대화창을 바로 닫는다(Esc 와 같다)
  const skip = el('button', 'museum__skip', talk) as HTMLButtonElement;
  skip.type = 'button';
  skip.textContent = '닫기 ✕';
  skip.setAttribute('aria-label', '대화창 닫기 (Esc)');
  skip.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  // 관에 들어서면 그 관 이름이 화면 가운데 잠깐 떴다 사라진다(게임에서 방에 들어설 때처럼). 한 번만 움직이고 멈춘다
  const room = el('div', 'museum__room');
  room.hidden = true;
  room.setAttribute('aria-live', 'polite');
  if (newPos) tags.push({ text: 'NEW', pos: newPos, e: Object.assign(el('div', 'museum__tag museum__tag--new'), { textContent: 'NEW' }) });

  // 관람 수첩 버튼, 수첩, 알림 한 줄, 퇴장 영수증
  const hud = el('button', 'museum__hud mono') as HTMLButtonElement;
  hud.type = 'button';
  const book = el('div', 'museum__passport');
  book.hidden = true;
  book.setAttribute('role', 'dialog');
  book.setAttribute('aria-label', '관람 수첩');
  const toast = el('p', 'museum__toast mono');
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  const receipt = el('div', 'museum__receipt');
  receipt.hidden = true;
  receipt.setAttribute('role', 'dialog');
  receipt.setAttribute('aria-label', '관람 영수증');

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
  let panel = false;
  let leaving = false;
  /** 입장 중(문에서 리셉션까지 걸어 들어오는 동안). 걷기 키를 누르면 끝난다 */
  let intro = !reduce;
  /** 두루마리에서 도장을 새로 찍은 글. 두루마리를 닫으면 부엉이가 퀴즈를 낸다 */
  let fresh: string | null = null;
  let readerOpen = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  const busy = new Set<Spot>();
  const visit = { start: new Date(), seen: new Set<string>(), read: new Map<string, number>(), bugs: 0 };
  let passport = loadPassport();
  bugs.forEach((b) => {
    b.caught = passport.bugs.includes(b.id);
    b.g.visible = !b.caught;
  });
  const paused = () => talking || panel || leaving;

  // 한 번만 움직이고 멈추는 짧은 움직임. 움직임을 줄인 환경에서는 바로 끝 상태로 간다
  const tweens: { t0: number; dur: number; fn: (t: number) => void; done?: () => void }[] = [];
  function tween(dur: number, fn: (t: number) => void, done?: () => void) {
    if (reduce) {
      fn(1);
      done?.();
      return;
    }
    tweens.push({ t0: performance.now(), dur, fn, done });
  }

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

  type Near =
    | { kind: 'owl'; focus: THREE.Vector3 }
    | { kind: 'spot'; spot: Spot; focus: THREE.Vector3 }
    | { kind: 'trophy'; trophy: Trophy; focus: THREE.Vector3 };
  function nearby(): Near | null {
    const p = player.position;
    let best: Near | null = null;
    let bd = Infinity;
    const dOwl = Math.hypot(owlTile.x + 0.5 - p.x, owlTile.z + 0.5 - p.z);
    if (dOwl < 2.4) {
      best = { kind: 'owl', focus: owlFocus };
      bd = dOwl;
    }
    trophies.forEach((trophy) => {
      const d = Math.hypot(trophy.x + 0.5 - p.x, trophy.z + 0.5 - p.z);
      if (d < 1.2 && d < bd) {
        bd = d;
        best = { kind: 'trophy', trophy, focus: trophy.focus };
      }
    });
    spots.forEach((spot) => {
      const [x, z] = spot.tile;
      const d =
        spot.exhibit.hall === 'book'
          ? Math.abs(x + 0.5 - p.x) - 0.3 + Math.max(0, Math.abs(z + 1 - p.z) - 1)
          : Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
      if (d < 1.45 && d < bd) {
        bd = d;
        best = { kind: 'spot', spot, focus: spot.focus };
      }
    });
    return best;
  }

  // ── 말풍선 ──────────────────────────────────────────────────────
  // @MX:NOTE: 대화 구역. say(타이핑) → finished/next → after 로 선택지(ask). close 는 닫기 ✕·Esc·그만 대화하기가 함께 쓴다
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
      { label: '질문하기', run: question },
      { label: '그만 대화하기', run: close },
    ]);
  }
  function talkOwl() {
    if (panel) closePanel();
    const stamped = Object.keys(passport.stamps).length;
    const newest = spots.find((s) => s.exhibit.isNew && !passport.stamps[s.exhibit.id]);
    const hello = tod === 'night' ? '늦은 시간에도 오셨네요!' : tod === 'dawn' ? '좋은 아침이에요!' : tod === 'dusk' ? '노을이 예쁜 시간에 오셨네요!' : '어서 오세요!';
    // 처음 인사는 세 줄 안에서 끝내고 바로 질문하기로 넘어간다
    const tips = [
      newest ? `빛기둥이 비추는 [${newest.exhibit.short}] 진열대는 새로 들어온 글이에요.` : '',
      stamped ? '' : '글을 끝까지 읽으면 수첩(P)에 도장이 찍히고, 관 어딘가에 버그도 숨어 있어요.',
    ]
      .filter(Boolean)
      .join(' ');
    const lines = greeted
      ? ['또 오셨네요! 무엇을 찾으세요?']
      : [
          stamped
            ? `${hello} 다시 오셨네요. 수첩에 도장이 ${stamped}개 모였어요.`
            : `${hello} evan.log 기록관이에요. 위쪽 왼편은 기술 노트관, 오른편은 연구실 별관, 책 이야기는 로비 양옆 책장에 있어요.`,
          ...(tips ? [tips] : []),
          '궁금한 걸 물어보세요. 어디서든 / 를 누르면 제가 날아올게요.',
        ];
    greeted = true;
    say('부엉이', lines, owlMenu);
  }
  function question() {
    choices.replaceChildren();
    stopTyping();
    talkText.textContent = '글 찾기든 Evan 이야기든 물어보세요. 맞는 진열대도 찾아 드릴게요.';
    more.hidden = true;
    const form = document.createElement('form');
    form.className = 'museum__ask';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 200;
    input.placeholder = '예: 이 사람은 어떤 개발자야?';
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
    let reply: AskReply;
    try {
      reply = await options.ask(q);
    } catch (error) {
      if (disposed) return;
      say('부엉이', [error instanceof Error ? error.message : '지금은 답할 수 없어요.'], owlMenu);
      return;
    }
    if (disposed) return;
    const found = reply.picks
      .map((p) => ({ pick: p, spot: spots.find((s) => s.exhibit.id === p.id) }))
      .filter((f): f is { pick: AskPick; spot: Spot } => !!f.spot);
    const said = bubbles(reply.answer);
    if (!found.length) {
      glow(() => false);
      say('부엉이', said.length ? said : ['맞는 진열대를 못 찾았어요. 다르게 물어봐 주실래요?'], owlMenu);
      return;
    }
    const ids = new Set(found.map((f) => f.spot.exhibit.id));
    glow((s) => ids.has(s.exhibit.id));
    say('부엉이', [...said, `바닥에 파란 동그라미로 ${found.length}곳을 그려 뒀어요. 어디로 안내할까요?`], () =>
      ask([
        ...found.map(({ pick, spot }) => ({
          label: spot.exhibit.short,
          sub: pick.reason,
          run: () => {
            close();
            approach(spot, pick.reason);
          },
        })),
        { label: '괜찮아요', run: close },
      ]),
    );
  }
  // 긴 답을 말풍선 한 칸에 맞게 문장 단위로 나눈다. 한 칸은 BUBBLE 자 안팎
  function bubbles(text: string): string[] {
    const BUBBLE = 90;
    const sentences = text.trim().match(/[^.!?。]+[.!?。]*\s*/g) ?? [];
    const lines: string[] = [];
    for (const sentence of sentences.map((t) => t.trim()).filter(Boolean)) {
      const last = lines.length - 1;
      if (last >= 0 && lines[last].length + sentence.length + 1 <= BUBBLE) lines[last] += ` ${sentence}`;
      else lines.push(sentence);
    }
    return lines;
  }

  function approach(spot: Spot, reason?: string) {
    const s = standBy(spot);
    goTo(s.x, s.z, () => {
      dir = s.face;
      placard(spot, reason);
    });
  }

  function nextInSeries(spot: Spot) {
    const sr = spot.exhibit.series;
    if (!sr) return null;
    return spots.find((s) => s.exhibit.series?.name === sr.name && s.exhibit.series.no === sr.no + 1) ?? null;
  }

  function placard(spot: Spot, reason?: string) {
    const ex = spot.exhibit;
    const sr = ex.series;
    const mark = passport.stamps[ex.id] === 2 ? '금도장' : passport.stamps[ex.id] ? '도장 찍음' : '';
    const lines = [`[${ex.topic}] ${ex.title}${reason ? `\n${reason}` : ''}`];
    const extra = [
      sr ? `${sr.name} 연재 ${sr.no}/${sr.of}편` : '',
      ex.rank === 'hot' ? '요즘 많이 읽는 글' : ex.rank === 'best' ? '가장 많이 읽은 글' : '',
      // 숫자는 실제로 잰 값만, 너무 작을 때는 보이지 않는다(stats 도메인의 VIEWS_SHOW)
      ex.views >= VIEWS_SHOW ? `지금까지 ${ex.views.toLocaleString('ko-KR')}명이 읽었어요` : '',
      mark ? `수첩: ${mark}` : '',
    ].filter(Boolean);
    if (extra.length) lines[0] += `\n${extra.join(' · ')}`;
    const next = nextInSeries(spot);
    const list: Choice[] = [
      {
        label: ex.external ? '새 탭에서 보기' : '글 읽기',
        run: () => {
          close();
          options.open(ex);
          // 연구실은 사이트 밖이라 끝까지 봤는지 알 수 없어 열어 보면 도장을 찍는다
          if (ex.external) stamp(ex.id);
        },
      },
    ];
    if (spot.dome) list.push({ label: '돔 열어 보기', sub: 'E', run: () => (close(), openDome(spot)) });
    if (next) list.push({ label: `다음 편 ${sr!.no + 1}/${sr!.of}`, sub: '불 켜진 길을 따라가요', run: () => (close(), approach(next)) });
    if (ex.quiz && passport.stamps[ex.id] === 1) list.push({ label: '퀴즈 풀기', run: () => quiz(spot) });
    list.push({ label: '닫기', run: close });
    say('설명판', lines, () => ask(list));
  }

  // ── 진열품이 한 번 움직인다 ─────────────────────────────────────
  function openDome(spot: Spot) {
    const { prop: pr, dome } = spot;
    if (!pr || !dome || busy.has(spot)) return;
    busy.add(spot);
    const kind = spot.exhibit.prop;
    const rotY = pr.rotation.y;
    const kids = pr.children.map((c) => c.position.y);
    const ease = (u: number) => Math.sin(Math.min(1, Math.max(0, u)) * Math.PI);
    tween(
      1900,
      (t) => {
        // 돔이 올라가고(0~0.2) 소품이 움직인 뒤(0.2~0.8) 돔이 내려온다(0.8~1)
        const lift = t < 0.2 ? Math.sin((t / 0.2) * (Math.PI / 2)) : t > 0.8 ? Math.cos(((t - 0.8) / 0.2) * (Math.PI / 2)) : 1;
        dome.position.y = 0.78 + lift * 0.6;
        const u = (t - 0.2) / 0.6;
        if (kind === 'db') {
          pr.children.forEach((c, i) => (c.position.y = kids[i] + ease(u * 1.6 - i * 0.3) * 0.14));
        } else if (kind === 'key') {
          pr.rotation.x = ease(u) * (Math.PI / 2);
        } else {
          pr.position.y = 0.8 + ease(u) * 0.22;
          pr.rotation.y = rotY + Math.min(1, Math.max(0, u)) * Math.PI * 2;
        }
      },
      () => {
        dome.position.y = 0.78;
        pr.position.y = 0.8;
        pr.rotation.set(0, rotY, 0);
        pr.children.forEach((c, i) => (c.position.y = kids[i]));
        busy.delete(spot);
      },
    );
  }

  // ── 수첩·도장·퀴즈 ──────────────────────────────────────────────
  // @MX:NOTE: 도장 1 = 끝까지 읽음, 2 = 퀴즈 정답(금도장). 한 관을 다 모으면 명예의 전당이 열리고 부엉이는 관마다 한 번만 축하(cheered)
  const hallOf = (h: Exhibit['hall']) => spots.filter((s) => s.exhibit.hall === h);

  // 서 있는 칸이 어느 관인지. 벽·문턱 줄(zw)과 가운데 벽은 어느 관도 아니어서 이전 관을 그대로 둔다
  let zone: Exhibit['hall'] | null = null;
  let roomTimer = 0;
  function zoneAt(x: number, z: number): Exhibit['hall'] | null {
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    if (tz > zw) return 'book';
    if (tz === zw || tx === MID) return null;
    return tx < MID ? 'note' : 'lab';
  }
  const ROOM_COUNT = { note: (n: number) => `기술 노트 ${n}편`, lab: (n: number) => `실험 ${n}개`, book: (n: number) => `독후감 ${n}편` };
  function announce(hall: Exhibit['hall']) {
    room.replaceChildren();
    el('span', 'museum__room-count mono', room).textContent = ROOM_COUNT[hall](hallOf(hall).length);
    el('strong', 'museum__room-name', room).textContent = HALL_NAME[hall];
    room.hidden = false;
    // 같은 요소에 애니메이션을 처음부터 다시 걸려고 한 번 뗐다 붙인다
    room.classList.remove('is-on');
    void room.offsetWidth;
    room.classList.add('is-on');
    window.clearTimeout(roomTimer);
    roomTimer = window.setTimeout(() => (room.hidden = true), 2600);
  }
  function unlocked(kind: TrophyKind) {
    if (kind === 'bug') return bugs.length > 0 && bugs.every((b) => b.caught);
    const list = hallOf(kind);
    return list.length > 0 && list.every((s) => passport.stamps[s.exhibit.id]);
  }
  // 새로 다 모은 관(또는 버그)마다 부엉이가 한 번 축하한다
  function cheers(): string[] {
    const lines: string[] = [];
    trophies.forEach(({ kind }) => {
      if (!unlocked(kind) || passport.cheered.includes(kind)) return;
      passport = { ...passport, cheered: [...passport.cheered, kind] };
      lines.push(
        kind === 'bug'
          ? '버그 0건. deploy ok! 출구 옆 명예의 전당에 금 딱정벌레를 올려 뒀어요.'
          : `${HALL_NAME[kind]} 도장을 다 모았어요! 출구 옆 명예의 전당 가림천을 벗겨 뒀어요.`,
      );
    });
    if (lines.length) savePassport(passport);
    return lines;
  }

  function refresh() {
    passport = loadPassport();
    const n = Object.keys(passport.stamps).filter((id) => spots.some((s) => s.exhibit.id === id)).length;
    const left = bugs.filter((b) => !b.caught).length;
    hud.textContent = `수첩 ${n}/${spots.length}${bugs.length ? ` · 버그 ${left}` : ''}`;
    hud.setAttribute('aria-label', `관람 수첩 열기. 도장 ${n}개, 남은 버그 ${left}마리. 단축키 P`);
    trophies.forEach((t) => {
      const open = unlocked(t.kind);
      t.cup.visible = open;
      t.cloth.visible = !open;
    });
    const newSpot = spots.find((s) => s.exhibit.isNew);
    const read = !!(newSpot && passport.stamps[newSpot.exhibit.id]);
    if (beam) beam.visible = !read;
    const nt = tags.find((t) => t.text === 'NEW');
    if (nt) nt.e.dataset.off = read ? '1' : '';
    if (panel) drawPanel();
  }

  function quiz(spot: Spot, lead: string[] = []) {
    const q = spot.exhibit.quiz;
    if (!q) return lead.length ? say('부엉이', lead) : close();
    say('부엉이', [...lead, '하나만 물어볼게요. 맞히면 금도장으로 바꿔 드려요.', q.q], () =>
      ask([
        ...q.choices.map((c, i) => ({
          label: c,
          run: () => {
            if (i !== q.answer) {
              say('부엉이', ['아쉬워요! 글을 다시 훑어보고 설명판에서 또 도전해 보세요.']);
              return;
            }
            passport = { ...passport, stamps: { ...passport.stamps, [spot.exhibit.id]: 2 } };
            savePassport(passport);
            refresh();
            say('부엉이', ['정답이에요! 금도장으로 바꿔 드렸어요.']);
          },
        })),
        { label: '다음에 풀게요', run: close },
      ]),
    );
  }

  // 두루마리를 말아 닫고 돌아왔을 때. 새 도장이 있으면 알려 주고 퀴즈를 낸다
  function afterReader() {
    const id = fresh;
    fresh = null;
    refresh();
    const lines = cheers();
    const spot = id ? spots.find((s) => s.exhibit.id === id) : null;
    if (spot) quiz(spot, [`도장 쾅! [${spot.exhibit.short}] 을(를) 수첩에 찍었어요.`, ...lines]);
    else if (lines.length) say('부엉이', lines);
  }

  function drawPanel() {
    book.replaceChildren();
    const head = el('div', 'museum__book-head', book);
    const title = el('strong', '', head);
    title.textContent = '관람 수첩';
    const x = el('button', 'museum__x mono', head) as HTMLButtonElement;
    x.type = 'button';
    x.textContent = '닫기 Esc';
    x.addEventListener('click', closePanel);
    (['note', 'lab', 'book'] as const).forEach((h) => {
      const list = hallOf(h);
      if (!list.length) return;
      const got = list.filter((s) => passport.stamps[s.exhibit.id]).length;
      const sec = el('section', 'museum__hall', book);
      const h3 = el('h3', 'mono', sec);
      h3.textContent = `${HALL_NAME[h]} ${got}/${list.length}`;
      const grid = el('div', 'museum__stamps', sec);
      list.forEach((spot) => {
        const st = passport.stamps[spot.exhibit.id];
        const b = el('button', 'museum__stamp', grid) as HTMLButtonElement;
        b.type = 'button';
        b.dataset.state = st === 2 ? 'gold' : st ? 'on' : '';
        b.title = spot.exhibit.title;
        const seal = el('span', 'museum__seal mono', b);
        seal.textContent = st === 2 ? '金' : st ? '印' : '';
        seal.setAttribute('aria-hidden', 'true');
        const name = el('span', '', b);
        name.textContent = spot.exhibit.short;
        b.setAttribute('aria-label', `${spot.exhibit.short}: ${st === 2 ? '금도장' : st ? '도장' : '아직'}. 누르면 진열대로 걸어간다`);
        b.addEventListener('click', () => {
          closePanel();
          glow((s) => s === spot);
          approach(spot);
        });
      });
    });
    const foot = el('p', 'museum__book-foot mono', book);
    foot.textContent = '끝까지 읽은 글은 印, 부엉이 퀴즈까지 맞히면 金. 연구실은 열어 보면 찍혀요.';
  }
  function openPanel() {
    if (talking) close();
    panel = true;
    keys.clear();
    path = [];
    drawPanel();
    book.hidden = false;
    (book.querySelector('.museum__stamp') as HTMLElement | null)?.focus({ preventScroll: true });
  }
  function closePanel() {
    panel = false;
    book.hidden = true;
    renderer.domElement.focus({ preventScroll: true });
  }
  hud.addEventListener('click', () => (panel ? closePanel() : openPanel()));

  function catchBug(b: (typeof bugs)[number]) {
    if (b.caught) return;
    b.caught = true;
    visit.bugs++;
    const before = bugs.filter((x) => !x.caught).length + 1;
    passport = loadPassport();
    savePassport({ ...passport, bugs: [...new Set([...passport.bugs, b.id])] });
    const y0 = b.g.position.y;
    tween(
      420,
      (t) => {
        b.g.position.y = y0 + Math.sin(t * Math.PI) * 0.35;
        b.g.scale.setScalar(1 - t);
      },
      () => (b.g.visible = false),
    );
    showToast(`bug: ${before} → ${before - 1}${before - 1 === 0 ? '  ·  0 bugs. deploy ok' : ''}`);
    refresh();
    const lines = cheers();
    if (lines.length) later(() => say('부엉이', lines), 500);
  }
  let toastTimer = 0;
  function showToast(text: string) {
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast.hidden = true), 2600);
  }

  // ── 퇴장 영수증 ─────────────────────────────────────────────────
  // @MX:NOTE: 영수증 수치는 모두 이번 관람(visit)과 수첩에서 실제로 잰 값이다. 지어낸 값을 넣지 않는다
  function receiptLines() {
    const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const mins = Math.max(1, Math.round((Date.now() - visit.start.getTime()) / 60000));
    const n = Object.keys(passport.stamps).filter((id) => spots.some((s) => s.exhibit.id === id)).length;
    const gold = Object.values(passport.stamps).filter((v) => v === 2).length;
    let top = '';
    let topMs = 0;
    visit.read.forEach((ms, id) => {
      if (ms > topMs) {
        topMs = ms;
        top = spots.find((s) => s.exhibit.id === id)?.exhibit.title ?? '';
      }
    });
    const row = (k: string, v: string) => `${k.padEnd(9, '　')}${v}`;
    return [
      'evan.log 기록관 · 관람 영수증',
      '--------------------------------',
      row('입장', hm(visit.start)),
      row('머문 시간', `${mins}분`),
      row('둘러본 진열대', `${visit.seen.size}곳`),
      row('읽은 글', `${visit.read.size}편`),
      row('잡은 버그', `${visit.bugs}마리`),
      row('수첩 도장', `${n} / ${spots.length}${gold ? ` (금 ${gold})` : ''}`),
      ...(top ? ['가장 오래 본 글', `  ${top}`] : []),
      '--------------------------------',
      'EOF',
    ];
  }
  function showReceipt() {
    leaving = true;
    keys.clear();
    path = [];
    near.hidden = true;
    receipt.replaceChildren();
    const paper = el('pre', 'museum__slip mono', receipt);
    paper.textContent = receiptLines().join('\n');
    const row = el('div', 'museum__choices', receipt);
    const btn = (label: string, run: () => void) => {
      const b = el('button', 'museum__choice', row) as HTMLButtonElement;
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', run);
      return b;
    };
    btn('계속 둘러보기', stay).focus({ preventScroll: true });
    btn('이미지로 저장', () => saveReceipt(paper));
    const out = el('a', 'museum__choice', row) as HTMLAnchorElement;
    out.href = '/';
    out.textContent = '블로그로 나가기';
    receipt.hidden = false;
  }
  function stay() {
    receipt.hidden = true;
    leaving = false;
    player.position.z = H - 1.9;
    dir = Math.PI;
    renderer.domElement.focus({ preventScroll: true });
  }
  function saveReceipt(src: HTMLElement) {
    const lines = receiptLines();
    const cs = getComputedStyle(src);
    const cv = document.createElement('canvas');
    const scale = 2;
    const w = 420;
    const lh = 26;
    const h = 48 + lines.length * lh;
    cv.width = w * scale;
    cv.height = h * scale;
    const g = cv.getContext('2d');
    if (!g) return;
    g.scale(scale, scale);
    g.fillStyle = '#fff8ec';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a2a20';
    g.font = `15px ${cs.fontFamily}`;
    g.textBaseline = 'top';
    lines.forEach((line, i) => g.fillText(line, 24, 24 + i * lh));
    cv.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'evan-log-museum-receipt.png';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }

  function interact() {
    const n = nearby();
    if (!n) return;
    if (n.kind === 'owl') talkOwl();
    else if (n.kind === 'spot') placard(n.spot);
    else trophyTalk(n.trophy);
  }
  function trophyTalk(t: Trophy) {
    const name = t.kind === 'bug' ? '숨은 버그' : HALL_NAME[t.kind];
    if (unlocked(t.kind)) {
      say('명예의 전당', [t.kind === 'bug' ? '숨은 버그를 모두 잡은 분께 드리는 금 딱정벌레예요.' : `${name}의 글을 모두 읽은 분께 드리는 트로피예요. 고마워요!`]);
      return;
    }
    if (t.kind === 'bug') {
      const got = bugs.filter((b) => b.caught).length;
      say('명예의 전당', [`가림천이 덮여 있어요. 숨은 버그 ${bugs.length}마리 중 ${got}마리를 잡았어요.`]);
      return;
    }
    const list = hallOf(t.kind);
    const got = list.filter((s) => passport.stamps[s.exhibit.id]).length;
    say('명예의 전당', [`가림천이 덮여 있어요. ${name} 도장 ${got}/${list.length}개. 다 모으면 열려요.`]);
  }

  // ── 입력 ────────────────────────────────────────────────────────
  // @MX:NOTE: 키 우선순위: dialog 열림 → 영수증 → 수첩 → P → 대화 중 Esc → / → 대화 선택지 → 걷기·E·Enter
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
    // 글 읽기 창·그림 확대 창이 떠 있으면 걷지 않는다
    if (document.querySelector('dialog[open]')) return keys.clear();
    const inField = typingInto(e.target);
    if (leaving) {
      if (e.key === 'Escape') stay();
      return;
    }
    if (panel) {
      if (e.key === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        closePanel();
      }
      return;
    }
    if (e.code === 'KeyP' && !inField && !talking) {
      e.preventDefault();
      openPanel();
      return;
    }
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
      intro = false;
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyE') {
      const n = nearby();
      if (n?.kind === 'spot') openDome(n.spot);
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
    if (paused()) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    if (!hit) return;
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.exhibit && !o.userData.owl && !o.userData.floor && !o.userData.trophy && !o.userData.bug) o = o.parent;
    if (!o) return;
    intro = false;
    if (o.userData.bug) {
      const b = bugs.find((x) => x.g === o);
      if (b) goTo(b.x, b.z);
      return;
    }
    if (o.userData.trophy) {
      const t = trophies.find((x) => x.g === o);
      if (t)
        goTo(t.x + 0.5, t.z - 0.5, () => {
          dir = Math.PI;
          trophyTalk(t);
        });
      return;
    }
    if (o.userData.owl) {
      goTo(owlStand.x, owlStand.z, () => {
        dir = Math.PI;
        talkOwl();
      });
      return;
    }
    if (o.userData.exhibit) {
      const spot = spots.find((s) => s.group === o);
      if (spot) approach(spot);
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
  // @MX:NOTE: 프레임 루프. tween → 이동 → 버그·영수증·관 이름 → 카메라·렌더 → 태그·연재 길·이름표 순
  let raf = 0;
  let last = performance.now();
  let nearKey = '';
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // @MX:WARN: 두루마리가 닫혔는지는 이 dialog[open] 확인으로만 안다. afterReader(새 도장 알림·퀴즈)가 여기에 기댄다
    // @MX:REASON: Reader 는 STAMP_EVENT 를 즉시 보내지만 engine 은 fresh 에 두었다가 dialog 가 사라진 첫 프레임에 알린다. 다른 dialog(그림 확대)도 같은 경로를 탄다
    // 글 읽기 창이 장면을 덮고 있는 동안은 그리지 않는다. 닫히면 새 도장을 알려 준다
    if (document.querySelector('dialog[open]')) {
      readerOpen = true;
      raf = requestAnimationFrame(frame);
      return;
    }
    if (readerOpen) {
      readerOpen = false;
      afterReader();
    }
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const t = Math.min(1, (now - tw.t0) / tw.dur);
      tw.fn(t);
      if (t >= 1) {
        tweens.splice(i, 1);
        tw.done?.();
      }
    }
    let dx = 0;
    let dz = 0;
    if (!paused()) {
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
    const southward = dz > 0;
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

    // 버그는 가까이 가면 잡힌다. 출구 문턱을 넘어가면 영수증을 뽑는다
    if (moved) {
      bugs.forEach((b) => {
        if (!b.caught && Math.hypot(b.x - player.position.x, b.z - player.position.z) < 0.6) catchBug(b);
      });
      if (!intro && southward && player.position.z > H - 0.75) showReceipt();
      const zn = zoneAt(player.position.x, player.position.z);
      if (zn && zn !== zone) {
        zone = zn;
        announce(zn);
      }
    }

    placeCamera(false);
    renderer.render(scene, camera);

    tags.forEach((t) => (t.e.hidden = t.e.dataset.off === '1' || !project(t.pos, t.e)));
    updateTrails(now);
    const n = paused() || intro ? null : nearby();
    if (n) {
      const key = n.kind === 'owl' ? 'owl' : n.kind === 'spot' ? n.spot.exhibit.id : `trophy:${n.trophy.kind}`;
      if (key !== nearKey) {
        nearKey = key;
        if (n.kind === 'spot') visit.seen.add(n.spot.exhibit.id);
        near.replaceChildren();
        const label = document.createElement('strong');
        label.textContent = n.kind === 'owl' ? '부엉이' : n.kind === 'spot' ? n.spot.exhibit.short : '명예의 전당';
        const hint = document.createElement('span');
        hint.textContent = n.kind === 'owl' ? 'Enter 말 걸기' : n.kind === 'trophy' ? 'Enter 보기' : n.spot.dome ? 'Enter 설명 · E 돔 열기' : 'Enter 설명 보기';
        near.append(label, hint);
      }
      near.hidden = !project(n.focus, near);
    } else {
      nearKey = '';
      near.hidden = true;
    }
    raf = requestAnimationFrame(frame);
  }
  // 두루마리에서 도장이 찍히면 기억해 뒀다가 닫을 때 알리고, 펼쳐 둔 시간은 영수증에 쓴다
  const onStamp = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    const spot = spots.find((s) => s.exhibit.id === id);
    if (!spot) return;
    if (spot.exhibit.external) {
      refresh();
      const lines = cheers();
      if (lines.length) later(() => say('부엉이', lines), 400);
    } else fresh = id;
  };
  const onRead = (e: Event) => {
    const { id, ms } = (e as CustomEvent<{ id: string; ms: number }>).detail;
    visit.read.set(id, (visit.read.get(id) ?? 0) + ms);
  };
  window.addEventListener(STAMP_EVENT, onStamp);
  window.addEventListener(READ_EVENT, onRead);
  refresh();

  // 입장: 문턱에서 리셉션까지 걸어 들어온 뒤 부엉이가 말을 건다(두루마리가 다 펼쳐질 즈음 출발).
  // 움직임을 줄인 환경에서는 바로 부엉이 앞에 선다
  if (reduce) player.position.set(owlStand.x, 0, owlStand.z);
  else player.position.set(MID + 0.5, 0, H - 0.45);
  placeCamera(true);
  later(
    () => {
      if (reduce) return talkOwl();
      if (!intro) return;
      goTo(owlStand.x, owlStand.z, () => {
        intro = false;
        dir = Math.PI;
        later(talkOwl, 250);
      });
    },
    reduce ? 400 : 1000,
  );
  raf = requestAnimationFrame(frame);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    timers.forEach((t) => window.clearTimeout(t));
    window.clearTimeout(toastTimer);
    window.clearTimeout(roomTimer);
    window.removeEventListener(STAMP_EVENT, onStamp);
    window.removeEventListener(READ_EVENT, onRead);
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
