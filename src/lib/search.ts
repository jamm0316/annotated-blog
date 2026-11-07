// @MX:NOTE: 검색 대상(공개 글 + 연구실) 목록과 자연어 검색에 넘길 카탈로그 문자열을 만든다
// @MX:SPEC: .claude/docs/domains/search.md
import { LAB } from '@/lib/lab';
import { getPosts } from '@/lib/posts';

// 검색(키워드·자연어)이 찾는 대상: 공개 글과 연구실 항목을 한 목록으로 묶는다.
// @MX:ANCHOR: id 형식(글은 slug, 연구실은 'lab:<repo>')과 필드가 /api/ask 응답 모양이다
// @MX:REASON: layout.tsx·SearchPalette·api/ask 가 이 타입에 기대고, 박물관 엔진은 /api/ask 의 id 를 Exhibit.id(같은 형식)와 맞춰 찾는다
export type SearchItem = {
  /** 글은 slug, 연구실은 'lab:<repo>' */
  id: string;
  title: string;
  /** 목록의 [라벨]. 글은 주제, 연구실은 '연구실' */
  topic: string;
  date: string;
  lang: string;
  href: string;
  /** 연구실 항목은 새 탭에서 연다 */
  external: boolean;
  /** 제목 말고 함께 찾을 글자들 */
  text: string;
};

export function getSearchItems(): SearchItem[] {
  const posts: SearchItem[] = getPosts().map((p) => ({
    id: p.slug,
    title: p.title,
    topic: p.topic,
    date: p.date,
    lang: p.lang,
    href: `/posts/${p.slug}`,
    external: false,
    text: [p.topic, ...p.areas, ...p.tags, p.series, p.description, p.summary].join(' '),
  }));
  const lab: SearchItem[] = LAB.map((item) => ({
    id: `lab:${item.repo}`,
    title: item.title,
    topic: '연구실',
    date: item.date,
    lang: 'ko',
    href: item.url ?? `https://github.com/jamm0316/${item.repo}`,
    external: true,
    text: ['연구실', item.kind, item.pitch, item.description, ...item.stack].join(' '),
  }));
  return [...posts, ...lab].sort((a, b) => b.date.localeCompare(a.date));
}

// 자연어 질문에서 모델에 넘기는 목록. 화면에 쓰지 않는 칸(분류·역량·태그·요약·발췌)까지 적는다.
// 발췌(본문 앞부분)는 '이 사람은 어떤 사람 같아?' 같은 물음에 요약보다 조금 더 근거를 주려고 넣는다
export function getSearchCatalog(): string {
  const posts = getPosts().map((p) =>
    [
      `id: ${p.slug}`,
      `제목: ${p.title}`,
      `분류: ${p.category === 'book' ? '독후감' : '기술 노트'}`,
      p.topic && `주제: ${p.topic}`,
      p.areas.length > 0 && `역량: ${p.areas.join(', ')}`,
      p.tags.length > 0 && `태그: ${p.tags.join(', ')}`,
      `요약: ${p.summary || p.description || p.excerpt}`,
      (p.summary || p.description) && p.excerpt && `발췌: ${p.excerpt}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );
  const lab = LAB.map((item) =>
    [
      `id: lab:${item.repo}`,
      `제목: ${item.title}`,
      `분류: 연구실(직접 만들어 올린 작은 앱·도구)`,
      `종류: ${item.kind}`,
      `기술: ${item.stack.join(', ')}`,
      `요약: ${item.pitch} ${item.description}`,
    ].join('\n'),
  );
  return [...posts, ...lab].join('\n\n');
}
