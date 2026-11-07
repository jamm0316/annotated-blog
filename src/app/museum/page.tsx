// @MX:NOTE: /museum 페이지. 진열품을 서버에서 만들고 조회수 표식을 얹어 Museum 에 넘기고 키 안내 줄을 둔다. 한 시간마다 다시 그린다
// @MX:SPEC: .claude/docs/domains/museum.md
import type { Metadata } from 'next';
import { Museum } from '@/components/museum/Museum';
import { getExhibits, withStats } from '@/lib/museum';
import { getPostStats } from '@/lib/stats';

// 진열대의 HOT·BEST 표식과 설명판 조회수는 한 시간마다 다시 만든다(첫 화면과 같은 주기)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: '박물관',
  description: '글 한 편이 진열대 하나인 3D 기록관. 걸어 다니며 보고, 부엉이에게 물어 찾는다.',
};

// 실시간 관람객(Supabase Realtime). Vercel 의 Supabase 연동이 넣는 값 중 브라우저에 보여도 되는 둘만 넘긴다.
// 이름이 연동마다 조금 달라 대체 이름도 본다. 없으면 null 이라 혼자 관람한다
// @MX:WARN: 여기서 넘기는 값은 HTML 에 그대로 실린다. 서버 전용 키(service role·secret·POSTGRES_URL)를 넣지 않는다
// @MX:REASON: 서버 키가 실리면 누구나 DB 를 마음대로 읽고 쓸 수 있다
function realtimeConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export default async function MuseumPage() {
  const exhibits = withStats(getExhibits(), await getPostStats());
  return (
    <main className="museum-page">
      <h1 className="sr-only">evan.log 기록관</h1>
      <Museum exhibits={exhibits} realtime={realtimeConfig()} />
      <p className="museum-page__keys mono">
        <span>
          <kbd className="key">←↑↓→</kbd> <kbd className="key">WASD</kbd> 걷기
        </span>
        <span>
          <kbd className="key">Enter</kbd> 말 걸기·설명 보기
        </span>
        <span>
          <kbd className="key">/</kbd> 부엉이 부르기
        </span>
        <span>
          <kbd className="key">E</kbd> 유리 돔 열기
        </span>
        <span>
          <kbd className="key">P</kbd> 관람 수첩
        </span>
        <span>
          <kbd className="key">Esc</kbd> 말풍선 닫기
        </span>
        <span>바닥이나 진열대를 누르면 걸어간다 · 출구로 나가면 영수증</span>
      </p>
    </main>
  );
}
