// @MX:NOTE: 링크 미리보기 카드(OG 이미지, 1200×630)를 그린다. 첫 화면과 글마다 쓴다. 빌드 때 한 번 만든다
// @MX:SPEC: .claude/docs/domains/shell.md

import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

// ImageResponse 는 CSS 변수를 못 읽는다. globals.css 다크 토큰(--black·--white·--ink-70·--orange·--line)과 같은 값을 둔다
const C = {
  bg: '#0b0b0b',
  ink: '#ececec',
  ink70: 'rgba(236,236,236,0.7)',
  accent: '#ff7a1a',
  line: 'rgba(236,236,236,0.12)',
};

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700; style: 'normal' };

// @MX:WARN: 한글 글꼴은 빌드 때 Google Fonts 에서 카드에 쓰는 글자만 받아 온다(text= 부분 집합)
// @MX:REASON: ImageResponse 기본 글꼴에는 한글이 없어 네모로 나온다. 받지 못하면 글꼴 없이 'evan.log' 만 그린 카드로 물러나 빌드는 멈추지 않는다
async function loadFont(family: string, weight: Font['weight'], text: string): Promise<Font> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(text)}`,
  ).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error(`[og] ${family} 글꼴 주소를 못 찾았다`);
  const data = await fetch(url).then((r) => r.arrayBuffer());
  return { name: family, data, weight, style: 'normal' };
}

export type OgCard = {
  /** 왼쪽 위 [주제] 자리. 비우면 안 그린다 */
  kicker?: string;
  title: string;
  /** 아래쪽 줄: 날짜·분류 따위 */
  meta?: string;
  /** 오른쪽 아래 핵심 수치 배지 */
  badge?: string;
};

export async function renderOg({ kicker = '', title, meta = '', badge = '' }: OgCard): Promise<ImageResponse> {
  const label = `evan.log ${kicker} ${meta} ${badge}`;
  let fonts: Font[];
  try {
    fonts = await Promise.all([
      loadFont('Noto Serif KR', 700, title),
      loadFont('IBM Plex Mono', 500, label),
      loadFont('IBM Plex Sans KR', 500, label),
    ]);
  } catch (error) {
    console.error('[og] 글꼴을 받지 못해 이름만 그린다', error);
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.ink, fontSize: 96 }}>
          evan<span style={{ color: C.accent }}>.log</span>
        </div>
      ),
      OG_SIZE,
    );
  }

  const mono = '"IBM Plex Mono", "IBM Plex Sans KR"';
  const titleSize = title.length > 40 ? 52 : title.length > 24 ? 62 : 72;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: C.bg,
          color: C.ink,
          fontFamily: mono,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 30 }}>
          <span style={{ display: 'flex' }}>
            evan<span style={{ color: C.accent }}>.log</span>
          </span>
          {kicker && <span style={{ color: C.accent }}>[{kicker}]</span>}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: '"Noto Serif KR"',
            fontSize: titleSize,
            lineHeight: 1.3,
            letterSpacing: -1,
            wordBreak: 'keep-all',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `2px solid ${C.line}`,
            paddingTop: 28,
            fontSize: 28,
            color: C.ink70,
          }}
        >
          <span>{meta}</span>
          {badge && (
            <span style={{ color: C.bg, background: C.accent, padding: '6px 16px', fontWeight: 500 }}>{badge}</span>
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
