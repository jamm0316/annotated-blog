// 연구실: GitHub Pages 에 올려 둔 작은 실험들과, 로컬에서만 도는 도구. 새로 올리면 여기에 한 줄 더하고 썸네일을 public/lab/<repo>.png 로 둔다.
// 썸네일은 1200×750 화면을 그대로 찍은 것. 설명의 사실은 저장소 README 와 페이지에 적힌 것만 쓴다.

export type LabItem = {
  repo: string;
  title: string;
  /** 박물관 진열대 이름표. 10자 이내 */
  short: string;
  /** 2단계 칩으로 묶는 종류 */
  kind: string;
  /** 한 줄 미끼. 카드 제목 아래에 크게 */
  pitch: string;
  /** 무엇을 하는지 1~2문장 */
  description: string;
  stack: string[];
  /** 저장소를 만든 날 YYYY-MM-DD */
  date: string;
  /** 배포 주소. 로컬에서만 도는 것은 비워 두고, 카드가 저장소로 간다 */
  url?: string;
};

const pages = (repo: string, path = '') => `https://jamm0316.github.io/${repo}/${path}`;

export const LAB: LabItem[] = [
  {
    repo: 'travel_plan_gapyeong',
    short: '환갑 여행 앱',
    title: '춘천 환갑여행',
    kind: '기록',
    pitch: '예순 번의 여름을 지나온 두 분께.',
    description:
      '노션 여행 계획을 옮긴 하루짜리 여행 앱. 지난 일정은 흐리게, 지금 일정에는 NOW 배지를 붙이고, 실시간 날씨·카카오맵 주소 복사·준비물 체크를 폰 하나로 본다. 다녀온 뒤에는 추억 모드로 넘어간다.',
    stack: ['Vanilla JS', 'PWA', 'Open-Meteo'],
    date: '2026-08-21',
    url: pages('travel_plan_gapyeong'),
  },
  {
    repo: 'EIPSC',
    short: '정처기 카드',
    title: '정처기 실기 카드',
    kind: '도구',
    pitch: '틀린 문제만 다섯 번씩, 폰에서.',
    description:
      '정보처리기사 실기 약점 카드·단원 지도·오답노트를 한 앱으로 묶은 PWA. 카드마다 5회까지 회독을 체크하고, 한 번 열면 오프라인에서도 돈다.',
    stack: ['Vanilla JS', 'PWA', 'Service Worker'],
    date: '2026-10-12',
    url: pages('EIPSC'),
  },
  {
    repo: 'teammate-world',
    short: '팀메이트 월드',
    title: '팀메이트 월드',
    kind: '팀메이트',
    pitch: '1~4기가 한 화면에서 줄다리기를 한다.',
    description:
      '캐릭터를 뽑아 입장하는 모바일 3D 라이브 월드. 기수 대항 줄다리기 토너먼트, 팀 계주, 사물함 쪽지, 사주·타로 NPC 까지 링크 하나로 연다.',
    stack: ['three.js', 'PWA', 'Vanilla JS'],
    date: '2026-06-09',
    url: pages('teammate-world'),
  },
  {
    repo: 'poketmon-face',
    short: '닮은 포켓몬',
    title: '닮은 포켓몬 찾기',
    kind: '놀이',
    pitch: '내 얼굴은 어떤 포켓몬일까?',
    description:
      '사진을 올리면 Claude 비전 모델이 닮은 포켓몬과 이유를 골라 주고, PokeAPI 에서 그 포켓몬 그림을 가져온다. Pages 에는 화면만 올라가 있어 분석은 로컬 서버가 필요하다.',
    stack: ['Express', 'Claude API', 'PokeAPI'],
    date: '2026-06-20',
    url: pages('poketmon-face'),
  },
  {
    repo: 'teammate-team-building-intro',
    short: '팀빌딩 소개',
    title: '팀메이트 팀빌딩 소개',
    kind: '팀메이트',
    pitch: '이론을 읽고, 실무에 적용한다.',
    description:
      '주니어 백엔드 개발자가 함께 성장하는 5개월 팀빌딩·스터디 프로그램의 소개 페이지. 커리큘럼, 이력서 리뷰, 함께 읽는 책, 팀 프로젝트를 한 흐름으로 보여 준다.',
    stack: ['HTML', 'CSS', 'JavaScript'],
    date: '2026-06-19',
    url: pages('teammate-team-building-intro'),
  },
  {
    repo: 'pixel-agents',
    short: '도트 오피스',
    title: 'Pixel Agents',
    kind: '도구',
    pitch: '내 Claude Code 에이전트들이 도트 오피스에서 일한다.',
    description:
      'Claude Code 메인 세션과 서브에이전트의 활동을 PixiJS 픽셀 캐릭터로 띄우고, PreToolUse 훅으로 도구 실행을 브라우저에서 승인·거부한다. 세션 기록을 직접 읽어 로컬에서만 돈다.',
    stack: ['TypeScript', 'React', 'PixiJS', 'Hono'],
    date: '2026-04-15',
  },
  {
    repo: 'Breathe',
    short: '숨 고르기',
    title: '숨 고르기',
    kind: '도구',
    pitch: '원이 커지면 들이쉬고, 작아지면 내쉰다.',
    description:
      '과호흡이 왔을 때 원을 따라 숨을 고르게 돕는 호흡 가이드. 4-6 진정, 4-2-6, 박스 4-4-4-4, 4-7-8 네 가지 리듬을 고를 수 있다.',
    stack: ['HTML', 'CSS', 'JavaScript'],
    date: '2026-06-12',
    url: pages('Breathe'),
  },
];
