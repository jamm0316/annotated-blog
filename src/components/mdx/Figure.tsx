// @MX:NOTE: 글 안 그림과 캡션. ZoomImage 로 그린다
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import type { CSSProperties, ReactNode } from 'react';
import { ZoomImage } from './ZoomImage';

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  children?: ReactNode;
};

// 원본은 public/posts 에 두고, 화면에는 next/image 가 폭에 맞춰 줄인 WebP 를 내보낸다. 누르면 크게 본다.
export function Figure({ src, alt, width, height, children }: Props) {
  return (
    // --ar 는 FigureRow 안에서 폭을 나누는 비율이다. 혼자 쓰일 때는 쓰이지 않는다
    <figure className="figure card" style={{ '--ar': width / height } as CSSProperties}>
      <ZoomImage src={src} alt={alt} width={width} height={height} />
      {children && <figcaption className="mono">{children}</figcaption>}
    </figure>
  );
}
