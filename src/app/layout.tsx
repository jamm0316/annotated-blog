// @MX:NOTE: 루트 레이아웃. 글꼴 세 벌, 테마 깜빡임 막는 스크립트, 머리말·바닥글, 전역 Droplets·Analytics
// @MX:SPEC: .claude/docs/domains/shell.md

import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Noto_Serif_KR } from 'next/font/google';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { Droplets } from '@/components/Droplets';
import { HashLink } from '@/components/HashLink';
import { ModeMenu } from '@/components/ModeMenu';
import { SearchPalette } from '@/components/SearchPalette';
import { VisitCounter } from '@/components/VisitCounter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getSearchItems } from '@/lib/search';
import './globals.css';

// 본문·제목은 읽기 편한 명조(Noto Serif KR), 날짜·라벨·수치·코드는 고정폭(IBM Plex Mono).
// IBM Plex Mono 에는 한글이 없어 고정폭 라벨 속 한글은 고딕(IBM Plex Sans KR)으로 채운다.
const serif = Noto_Serif_KR({
  variable: '--font-serif',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const sans = IBM_Plex_Sans_KR({
  variable: '--font-sans',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'evan.log', template: '%s · evan.log' },
  description: '백엔드 개발자 Evan 의 기술 노트와 독후감',
};

// 첫 화면이 그려지기 전에 저장된 테마를 적용해 깜빡임을 막는다. 기본은 다크(검정).
// @MX:WARN: localStorage 키 'theme' 과 값 'light' 는 ThemeToggle.toggleTheme 이 쓰는 것과 같아야 한다
// @MX:REASON: 한쪽만 바꾸면 새로고침 때 고른 테마가 풀리고, 이 스크립트가 data-theme 를 바꾸므로 <html> 의 suppressHydrationWarning 도 빼면 안 된다
const themeScript = `try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  // 검색에 필요한 글자만 넘긴다. 본문은 넣지 않는다.
  const searchItems = getSearchItems();

  return (
    <html lang="ko" data-scroll-behavior="smooth" className={`${serif.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="wordmark mono" aria-label="evan.log 처음으로">
              evan<span className="accent">.log</span>
            </Link>
            <nav aria-label="주 메뉴" className="site-nav">
              <HashLink href="/#note" className="mono">
                기술 노트
              </HashLink>
              <HashLink href="/#book" className="mono">
                독후감
              </HashLink>
              <HashLink href="/#lab" className="mono">
                연구실
              </HashLink>
              <SearchPalette posts={searchItems} />
              <ThemeToggle />
              <ModeMenu />
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer__inner mono">
            <span>
              evan<span className="accent">.log</span> · Evan, 백엔드 개발자
            </span>
            <VisitCounter />
            <span className="site-footer__links">
              <a href="https://github.com/jamm0316">GitHub</a>
              <a href="https://medium.com/@evanbackeng">Medium</a>
            </span>
          </div>
        </footer>
        <Droplets />
        <Analytics />
      </body>
    </html>
  );
}
