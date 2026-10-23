import type { Metadata } from 'next';
import { IBM_Plex_Mono, Noto_Serif_KR } from 'next/font/google';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { ThemeToggle } from '@/components/ThemeToggle';
// 글자 범위별로 쪼갠 파일이라 페이지에 나온 글자 묶음만 받는다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

const serif = Noto_Serif_KR({
  variable: '--font-serif',
  weight: ['600', '900'],
  subsets: ['latin'],
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Annotated', template: '%s · Annotated' },
  description: '구조를 재고, 읽는 사람의 언어로 설명합니다',
};

// 첫 화면이 그려지기 전에 저장된 테마를 적용해 깜빡임을 막는다. 기본은 라이트.
const themeScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="wordmark">
              Annotated
            </Link>
            <nav aria-label="주 메뉴" className="site-nav">
              <Link href="/#notes" className="mono">
                기술 노트
              </Link>
              <Link href="/#books" className="mono">
                독후감
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="titleblock mono">
            <div>
              <span>도면명</span>Annotated
            </div>
            <div>
              <span>작성</span>Evan · 백엔드 개발자
            </div>
            <div>
              <span>링크</span>
              <span className="titleblock__links">
                <a href="https://github.com/jamm0316">GitHub</a>
                <a href="https://medium.com/@evanbackeng">Medium</a>
              </span>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
