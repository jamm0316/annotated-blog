// @MX:NOTE: 유저챗 목록 요청이 게이트웨이와 애플리케이션의 인가를 거치는 흐름도(원문 그림 모양 그대로) (channeltalk-meetup-authorization)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { BoxDiagram, type BoxEdge, type BoxGroup, type BoxNode } from './BoxDiagram';

// 단계·분기·라벨과 배치는 원문 Medium 의 흐름도와 같다. 본문을 바꾸면 여기도 같이 바꾼다.
const NODES: BoxNode[] = [
  { id: 'start', x: 130, y: 10, w: 200, h: 44, shape: 'pill', lines: ['유저챗 목록 요청'] },
  { id: 'authn', x: 60, y: 130, w: 340, h: 56, lines: ['인증: 토큰 서명·만료가 유효한가?'] },
  { id: 'tenant', x: 60, y: 234, w: 340, h: 64, wrap: true, lines: ['coarse-grained: 요청한 채널', '(테넌트)에 속한 사용자인가?'] },
  { id: 'role', x: 60, y: 418, w: 340, h: 64, wrap: true, lines: ["역할에 '유저챗 조회'", 'action이 있는가?'] },
  { id: 'fine', x: 60, y: 526, w: 340, h: 64, wrap: true, lines: ['fine-grained: 유저챗마다', '이 사용자가 볼 수 있는가?'] },
  { id: '401', x: 540, y: 135, w: 120, h: 46, lines: ['401'] },
  { id: 'deny-tenant', x: 500, y: 243, w: 200, h: 46, lines: ['다른 채널의 요청 차단'] },
  { id: 'deny-role', x: 540, y: 427, w: 120, h: 46, lines: ['차단'] },
  { id: 'page', x: 40, y: 690, w: 180, h: 44, shape: 'pill', lines: ['목록 한 페이지'] },
  { id: 'hide', x: 330, y: 680, w: 330, h: 64, wrap: true, lines: ['목록에서 뺀다', '(한 건을 직접 조회하면 404)'] },
];

const GROUPS: BoxGroup[] = [
  { label: '게이트웨이', x: 20, y: 84, w: 420, h: 240 },
  { label: '애플리케이션', x: 20, y: 372, w: 420, h: 244 },
];

const EDGES: BoxEdge[] = [
  { from: 'start', to: 'authn', d: 'M230 54 L230 130' },
  { from: 'authn', to: 'tenant', d: 'M230 186 L230 234' },
  { from: 'tenant', to: 'role', d: 'M230 298 L230 418' },
  { from: 'role', to: 'fine', d: 'M230 482 L230 526' },
  { from: 'fine', to: 'page', d: 'M170 590 C150 630 130 650 130 690' },
  { from: 'authn', to: '401', d: 'M400 158 L540 158', label: '아니오', lx: 470, ly: 150, dashed: true },
  { from: 'tenant', to: 'deny-tenant', d: 'M400 266 L500 266', label: '아니오', lx: 452, ly: 258, dashed: true },
  { from: 'role', to: 'deny-role', d: 'M400 450 L540 450', label: '아니오', lx: 470, ly: 442, dashed: true },
  { from: 'fine', to: 'hide', d: 'M320 590 C380 620 450 650 480 680', label: '아니오', lx: 430, ly: 626, dashed: true },
];

export function AuthzFlowDiagram({ caption }: { caption?: string }) {
  return (
    <BoxDiagram
      label="유저챗 목록 요청의 인가 흐름도"
      width={720}
      height={760}
      maxWidth={560}
      nodes={NODES}
      edges={EDGES}
      groups={GROUPS}
      caption={caption}
    />
  );
}
