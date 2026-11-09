// @MX:NOTE: 첫 화면(과 글 카드가 없는 화면) 링크 미리보기 카드
// @MX:SPEC: .claude/docs/domains/shell.md

import { OG_SIZE, renderOg } from '@/lib/og';
import { getPosts } from '@/lib/posts';
import { SITE_DESCRIPTION } from '@/lib/site';

export const alt = 'evan.log — 백엔드 개발자 Evan 의 기술 노트와 독후감';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  const n = getPosts().length;
  return renderOg({ title: SITE_DESCRIPTION, meta: `$ ls posts | wc -l  →  ${n}` });
}
