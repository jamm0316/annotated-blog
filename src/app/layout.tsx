import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Noto_Serif_KR } from 'next/font/google';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { Droplets } from '@/components/Droplets';
import { SearchPalette } from '@/components/SearchPalette';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getPosts } from '@/lib/posts';
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
const themeScript = `try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  // 검색에 필요한 글자만 넘긴다. 본문은 넣지 않는다.
  const searchPosts = getPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    topic: p.topic,
    date: p.date,
    lang: p.lang,
    text: [p.topic, ...p.areas, ...p.tags, p.series, p.description, p.summary].join(' '),
  }));

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
              <Link href="/#note" className="mono">
                기술 노트
              </Link>
              <Link href="/#book" className="mono">
                독후감
              </Link>
              <Link href="/#lab" className="mono">
                연구실
              </Link>
              <SearchPalette posts={searchPosts} />
              <ThemeToggle />
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer__inner mono">
            <span>
              evan<span className="accent">.log</span> · Evan, 백엔드 개발자
            </span>
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
