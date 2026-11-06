import type { Metadata } from 'next';
import { Museum } from '@/components/museum/Museum';
import { getExhibits } from '@/lib/museum';

export const metadata: Metadata = {
  title: '박물관',
  description: '글 한 편이 진열대 하나인 3D 기록관. 걸어 다니며 보고, 부엉이에게 물어 찾는다.',
};

export default function MuseumPage() {
  return (
    <main className="museum-page">
      <h1 className="sr-only">evan.log 기록관</h1>
      <Museum exhibits={getExhibits()} />
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
          <kbd className="key">Esc</kbd> 말풍선 닫기
        </span>
        <span>바닥이나 진열대를 누르면 걸어간다</span>
      </p>
    </main>
  );
}
