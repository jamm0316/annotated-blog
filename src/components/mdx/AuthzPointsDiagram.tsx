// @MX:NOTE: 인가 구성 요소 PEP·PDP·PIP·PAP 구조도(원문 그림 모양 그대로) (channeltalk-meetup-authorization)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { BoxDiagram, type BoxEdge, type BoxNode } from './BoxDiagram';

// 상자·화살표·라벨은 원문 Medium 의 구조도와 같다. 본문 폭에 맞춰 PIP·PEP 를 둘째 줄로 내렸다. 본문을 바꾸면 여기도 같이 바꾼다.
const NODES: BoxNode[] = [
  { id: 'PAP', x: 10, y: 20, w: 200, h: 112, lines: ['PAP · 정책 관리 지점', '관리자가 정책을', '만들고 고친다', '(요청 흐름 밖)'] },
  { id: 'store', x: 290, y: 42, w: 120, h: 68, shape: 'db', lines: ['정책 저장소'] },
  {
    id: 'PDP',
    x: 500,
    y: 20,
    w: 250,
    h: 112,
    em: [1],
    lines: ['PDP · 정책 결정 지점', 'Service 자리', '정책에 비춰', '허용·거부를 결정한다'],
  },
  {
    id: 'PIP',
    x: 500,
    y: 240,
    w: 280,
    h: 112,
    em: [1],
    lines: ['PIP · 정책 정보 지점', 'Repository 자리', '역할, 담당자, 소속 팀 같은', '결정에 필요한 정보를 가져온다'],
  },
  { id: 'req', x: 10, y: 276, w: 80, h: 40, shape: 'pill', lines: ['요청'] },
  {
    id: 'PEP',
    x: 140,
    y: 240,
    w: 280,
    h: 112,
    em: [1],
    lines: ['PEP · 정책 집행 지점', 'Controller 자리', '요청을 가로채 결정을 묻고', '결과대로 통과시키거나 막는다'],
  },
  { id: 'res', x: 230, y: 420, w: 100, h: 40, shape: 'pill', lines: ['리소스'] },
];

const EDGES: BoxEdge[] = [
  { from: 'PAP', to: 'store', d: 'M210 76 L290 76', label: '정책 저장', lx: 250, ly: 66 },
  { from: 'store', to: 'PDP', d: 'M410 76 L500 76', label: '정책 조회', lx: 455, ly: 66 },
  { from: 'PDP', to: 'PIP', d: 'M640 132 L640 240', label: '필요한 정보 조회', lx: 640, ly: 192 },
  { from: 'req', to: 'PEP', d: 'M90 296 L140 296' },
  { from: 'PEP', to: 'PDP', d: 'M380 240 C400 190 490 170 550 132', label: '허용할까?', lx: 420, ly: 192 },
  { from: 'PEP', to: 'res', d: 'M280 352 L280 420' },
];

export function AuthzPointsDiagram({ caption }: { caption?: string }) {
  return (
    <BoxDiagram
      label="인가 구성 요소 PEP, PDP, PIP, PAP 구조도"
      width={780}
      height={470}
      nodes={NODES}
      edges={EDGES}
      caption={caption}
    />
  );
}
