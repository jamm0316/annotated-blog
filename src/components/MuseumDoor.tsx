// @MX:NOTE: 첫 화면 히어로 오른쪽의 박물관 입구. 머리말 모드 메뉴 안에 숨은 박물관 모드를 첫 화면에서 바로 보이게 한다
// @MX:SPEC: .claude/docs/domains/browse.md

import Link from 'next/link';

// 박공지붕 건물 아이콘은 머리말 모드 버튼(좁은 폰)과 같은 모양이다. 같은 그림이 같은 곳(박물관)으로 간다고 익히게 한다.
// count 는 실제 진열대 수(getExhibits().length)만 받는다
export function MuseumDoor({ count }: { count: number }) {
  return (
    <Link href="/museum" className="museum-door" aria-label={`박물관 모드로 들어가기. 진열대 ${count}개가 있는 3D 기록관`}>
      <svg className="museum-door__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18" />
      </svg>
      <span className="museum-door__text">
        <span className="museum-door__label mono">박물관 모드</span>
        <span className="museum-door__title">걸어서 둘러보기</span>
        <span className="museum-door__note mono">진열대 {count}개 · 3D 기록관</span>
      </span>
      <span className="museum-door__arrow mono" aria-hidden>
        →
      </span>
    </Link>
  );
}
