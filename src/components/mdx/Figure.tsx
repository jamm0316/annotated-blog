import Image from 'next/image';
import type { ReactNode } from 'react';

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  children?: ReactNode;
};

// 원본은 public/posts 에 두고, 화면에는 next/image 가 폭에 맞춰 줄인 WebP 를 내보낸다.
export function Figure({ src, alt, width, height, children }: Props) {
  return (
    <figure className="figure">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 760px) 100vw, 680px"
        style={{ width: '100%', height: 'auto' }}
      />
      {children && <figcaption className="mono">{children}</figcaption>}
    </figure>
  );
}
