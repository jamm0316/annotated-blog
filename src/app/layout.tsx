import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { IBM_Plex_Mono, Noto_Serif_KR } from 'next/font/google';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const sans = localFont({
  src: '../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  variable: '--font-sans',
  weight: '45 920',
  display: 'swap',
});

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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="wordmark">
              Annotated
            </Link>
          </div>
        </header>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
