// @MX:NOTE: /museum/read/<slug> 를 주소로 바로 열었을 때 children 자리에 그릴 박물관 장면(안전망)
// @MX:SPEC: .claude/docs/domains/museum.md
// 박물관 안에서 소프트 이동할 때는 이미 떠 있는 장면이 그대로 남고 이 파일은 쓰이지 않는다.
// 새로고침·공유한 주소는 next.config.ts 의 redirects 가 글 페이지로 보내므로 평소에는 여기까지 오지 않는다.
// 그 규칙이 빠져도 404 대신 박물관 장면 위에 두루마리가 뜨게 같은 페이지를 그린다.
export { default } from './page';
