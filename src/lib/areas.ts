// @MX:NOTE: 기술 노트 2단계 칩(JD 역량) 이름 목록. frontmatter area 는 여기 있는 이름만 쓴다
// @MX:SPEC: .claude/docs/domains/posts.md

// 기술 노트의 2단계 칩. 채용 공고(JD)에서 자주 쓰는 역량 이름으로 묶는다.
// 순서는 글 수가 아니라 여기 적은 순서로 고정한다. 글이 보여 주는 것에만 붙이고, 해당 글이 없는 역량은 넣지 않는다.
export const AREAS = [
  '성능 최적화',
  '캐싱 전략',
  '동시성·트랜잭션',
  '객체지향 설계',
  '인증·인가·보안',
  'AI 활용 개발',
  '협업·회고',
] as const;

export type Area = (typeof AREAS)[number];
