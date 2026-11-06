// 박물관 관람 수첩. 도장(1 = 읽음, 2 = 퀴즈까지 맞힘)과 잡은 버그를 이 브라우저에만 남긴다.
// 서버로 보내지 않는다. 저장소를 못 쓰는 창(사생활 보호 모드 등)에서는 이번 방문 동안만 기억한다.

const KEY = 'evan-log:museum-passport';

export type Passport = {
  stamps: Record<string, 1 | 2>;
  bugs: string[];
  /** 부엉이가 이미 축하한 관(같은 축하를 두 번 하지 않는다) */
  cheered: string[];
};

/** 두루마리에서 글 끝까지 읽어 도장이 찍혔을 때 window 로 보내는 이벤트. detail = 글 id */
export const STAMP_EVENT = 'museum:stamp';
/** 두루마리를 닫을 때 보내는 이벤트. detail = { id, ms } 펼쳐 둔 시간 */
export const READ_EVENT = 'museum:read';

let memory: Passport = { stamps: {}, bugs: [], cheered: [] };

export function loadPassport(): Passport {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Passport>;
      memory = {
        stamps: p.stamps && typeof p.stamps === 'object' ? p.stamps : {},
        bugs: Array.isArray(p.bugs) ? p.bugs : [],
        cheered: Array.isArray(p.cheered) ? p.cheered : [],
      };
    }
  } catch {
    // 저장소를 못 읽으면 메모리에 둔 것을 쓴다
  }
  return memory;
}

export function savePassport(p: Passport) {
  memory = p;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // 저장하지 못해도 이번 방문 동안은 memory 로 이어진다
  }
}

/** 글 끝까지 읽으면 도장을 찍는다. 처음 찍었으면 true */
export function stamp(id: string): boolean {
  const p = loadPassport();
  if (p.stamps[id]) return false;
  savePassport({ ...p, stamps: { ...p.stamps, [id]: 1 } });
  window.dispatchEvent(new CustomEvent(STAMP_EVENT, { detail: id }));
  return true;
}
