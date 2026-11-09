// @MX:NOTE: 사이트 절대 주소와 이름. sitemap·robots·RSS·OG 이미지·metadataBase 가 함께 쓴다
// @MX:SPEC: .claude/docs/domains/shell.md

// Vercel 이 빌드 때 넣어 주는 운영 도메인을 쓴다. 미리보기 배포에서도 운영 주소를 가리킨다(검색엔진·RSS 는 운영 주소만 알아야 한다)
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || 'evan-log.vercel.app';

export const SITE_URL = `https://${host}`;
export const SITE_NAME = 'evan.log';
export const SITE_DESCRIPTION = '백엔드 개발자 Evan 의 기술 노트와 독후감';

/** /posts/<slug> 의 절대 주소 */
export function postUrl(slug: string): string {
  return `${SITE_URL}/posts/${slug}`;
}
