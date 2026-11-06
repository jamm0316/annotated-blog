// @MX:NOTE: <a> 안의 마크다운 링크를 글자로 풀어 중첩 <a> 를 막는 remark 플러그인
// @MX:SPEC: .claude/docs/domains/posts.md

// 글 안에 직접 쓴 <a> 의 글자가 URL 이면 remark-gfm 이 그 글자를 다시 링크로 만들어 <a> 안에 <a> 가 생긴다.
// 브라우저는 중첩된 <a> 를 쪼개서 읽으므로 하이드레이션이 깨지고, React 가 문서 전체를 다시 그리며 <html> 의
// data-theme 까지 지운다(다크 테마가 풀린다). <a> 안쪽의 마크다운 링크는 글자만 남긴다.
function unwrapLinks(node) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    unwrapLinks(child);
    return child.type === 'link' ? child.children : [child];
  });
}

function walk(node) {
  if (!node.children) return;
  for (const child of node.children) {
    const isAnchor =
      (child.type === 'mdxJsxTextElement' || child.type === 'mdxJsxFlowElement') && child.name === 'a';
    if (isAnchor) unwrapLinks(child);
    else walk(child);
  }
}

// @MX:WARN: next.config.ts 가 이 파일을 process.cwd() 기준 절대 경로 문자열로 넘긴다
// @MX:REASON: 파일을 옮기거나 이름을 바꾸면 MDX 빌드가 플러그인을 못 찾는다. Turbopack 이 옵션을 직렬화해서 import 로 바꿀 수도 없다
export default function remarkUnnestLinks() {
  return walk;
}
