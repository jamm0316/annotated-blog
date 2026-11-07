// @MX:NOTE: 박물관 실시간 관람객. Supabase Realtime 의 Presence(누가 있나)와 Broadcast(걷는 위치)로 다른 관람객을 주고받는다
// @MX:SPEC: .claude/docs/domains/museum.md
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Social, SocialPose } from './engine';

// 보내는 것은 탭마다 새로 뽑는 임의 번호와 자리(x, z, 바라보는 방향)뿐이다. 이름·IP·관람 수첩은 보내지 않는다.
// 관람 수첩(passport)은 계속 이 브라우저에만 남는다(AGENTS.md).
// @MX:WARN: 이 채널로 passport 나 다른 개인 정보를 보내지 않는다
// @MX:REASON: 공개 키로 누구나 같은 채널을 들을 수 있다. 수첩은 서버로 보내지 않는다는 약속이 있다
const CHANNEL = 'museum-lobby';
/** 걷는 동안 위치를 보내는 최소 간격. 1초에 2~3번이면 받는 쪽이 사이를 이어 그린다(무료 한도 초당 100건을 아낀다) */
const SEND_MS = 400;
/** 멈춘 자리를 Presence 에 남기는 최소 간격. 새로 들어온 사람이 이 자리를 보고 그린다 */
const TRACK_MS = 1500;

type Meta = { x: number; z: number; ry: number };
const round = (v: number) => Math.round(v * 100) / 100;

export function createSocial({ url, key }: { url: string; key: string }): Social {
  const me = crypto.randomUUID().slice(0, 12);
  let channel: RealtimeChannel | null = null;
  let client: SupabaseClient | null = null;
  let ready = false;
  let pose: SocialPose = { x: 0, z: 0, ry: 0, moving: false };
  let lastSend = 0;
  let lastTrack = 0;
  let trackTimer = 0;
  let wasMoving = false;

  const meta = (): Meta => ({ x: round(pose.x), z: round(pose.z), ry: round(pose.ry) });
  const track = () => {
    window.clearTimeout(trackTimer);
    const wait = TRACK_MS - (performance.now() - lastTrack);
    if (wait > 0) {
      trackTimer = window.setTimeout(track, wait);
      return;
    }
    lastTrack = performance.now();
    void channel?.track(meta());
  };

  return {
    start(api) {
      let stopped = false;
      import('@supabase/supabase-js').then(({ createClient }) => {
        if (stopped) return;
        client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const ch = client.channel(CHANNEL, { config: { presence: { key: me }, broadcast: { self: false } } });
        channel = ch;
        const sync = () => {
          const state = ch.presenceState<Meta>();
          const ids = Object.keys(state);
          api.setCount(ids.length);
          for (const id of ids) {
            if (id === me) continue;
            const m = state[id]?.[state[id].length - 1];
            if (m) api.upsert(id, { x: m.x, z: m.z, ry: m.ry, moving: false }, true);
          }
          api.prune(new Set(ids.filter((id) => id !== me)));
        };
        ch.on('presence', { event: 'sync' }, sync)
          .on('broadcast', { event: 'pos' }, ({ payload }) => {
            const p = payload as { id?: string } & Partial<Meta> & { m?: boolean };
            if (!p.id || p.id === me || typeof p.x !== 'number' || typeof p.z !== 'number') return;
            api.upsert(p.id, { x: p.x, z: p.z, ry: p.ry ?? 0, moving: !!p.m }, false);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              ready = true;
              lastTrack = 0;
              track();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              ready = false;
              api.setCount(0);
            }
          });
      });
      return () => {
        stopped = true;
        ready = false;
        window.clearTimeout(trackTimer);
        if (channel) void channel.unsubscribe();
        if (client) void client.removeAllChannels();
        channel = null;
        client = null;
      };
    },
    move(next) {
      pose = next;
      if (!ready || !channel) return;
      const now = performance.now();
      if (next.moving && now - lastSend >= SEND_MS) {
        lastSend = now;
        void channel.send({ type: 'broadcast', event: 'pos', payload: { id: me, ...meta(), m: true } });
      } else if (!next.moving && wasMoving) {
        // 멈춘 순간: 마지막 자리를 한 번 보내고, 새로 올 사람을 위해 Presence 에도 남긴다
        lastSend = now;
        void channel.send({ type: 'broadcast', event: 'pos', payload: { id: me, ...meta(), m: false } });
        track();
      }
      wasMoving = next.moving;
    },
  };
}
