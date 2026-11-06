import type { ReactNode } from 'react';
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
    <figure className="figure card">
      <ZoomImage src={src} alt={alt} width={width} height={height} />
      {children && <figcaption className="mono">{children}</figcaption>}
    </figure>
  );
}
