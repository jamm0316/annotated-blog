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

export default async function MuseumPage() {
  const exhibits = withStats(getExhibits(), await getPostStats());
  return (
    <main className="museum-page">
      <h1 className="sr-only">evan.log 기록관</h1>
      <Museum exhibits={exhibits} />
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
