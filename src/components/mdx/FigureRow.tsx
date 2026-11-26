// @MX:NOTE: 그림 여러 장을 가로 한 줄에 나란히 놓는다(Medium 의 이미지 그리드처럼)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import type { ReactNode } from 'react';

// 안에 Figure 를 2~3장 넣는다. 각 Figure 가 단 --ar(가로/세로 비율)만큼 폭을 나눠 가져 그림 높이가 같아진다.
export function FigureRow({ children }: { children: ReactNode }) {
  return <div className="figure-row">{children}</div>;
}
