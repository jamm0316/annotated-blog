// @MX:NOTE: 연구실 썸네일 카드 그리드(서버 컴포넌트). 카드 전체가 배포 주소(없으면 저장소)로 가는 링크
// @MX:SPEC: .claude/docs/domains/lab.md

import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { LabItem } from '@/lib/lab';

const formatMonth = (date: string) => date.slice(0, 7).replace('-', '.');

// 연구실 카드. 썸네일 위로 손을 올리면 화면이 살짝 떠오르고, 바탕은 손이 들어온 자리에서 차오른다(Droplets).
// 카드 전체가 배포 주소로 가는 링크이고, 저장소 링크만 따로 그 위에 얹는다(링크 안에 링크를 넣지 않기 위해).
// 배포 주소가 없는(로컬 전용) 것은 카드 전체가 저장소로 간다.
export function LabGrid({ items }: { items: LabItem[] }) {
  return (
    <ul className="lab">
      {items.map((item, i) => {
        const repo = `https://github.com/jamm0316/${item.repo}`;
        return (
          <li key={item.repo} className="lab__item" style={{ '--i': i } as CSSProperties}>
            <article className="lab-card">
              <div className="lab-card__shot">
                <Image
                  src={`/lab/${item.repo}.png`}
                  alt={`${item.title} 첫 화면`}
                  width={1200}
                  height={750}
                  sizes="(max-width: 720px) 100vw, 360px"
                />
              </div>
              <div className="lab-card__body">
                <p className="mono lab-card__meta">
                  <span className="accent">[{item.kind}]</span> {formatMonth(item.date)}
                </p>
                <h3 className="lab-card__title">
                  {/* @MX:WARN: .lab-card__link 는 PostBrowser 의 j/k 선택자(#posts .lab-card__link)가 찾는다 */}
                  {/* @MX:REASON: 클래스 이름을 바꾸면 연구실 탭에서 키보드 이동이 조용히 끊긴다 */}
                  <a href={item.url ?? repo} target="_blank" rel="noopener noreferrer" className="lab-card__link">
                    {item.title}
                  </a>
                </h3>
                <p className="lab-card__pitch">{item.pitch}</p>
                <p className="lab-card__desc">{item.description}</p>
                <ul className="mono lab-card__stack" aria-label="사용한 기술">
                  {item.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className="mono lab-card__foot">
                  <span className="lab-card__open">{item.url ? '열어 보기 ↗' : '저장소에서 보기 ↗ · 로컬 실행'}</span>
                  {item.url && (
                    <a href={repo} target="_blank" rel="noopener noreferrer" className="lab-card__repo">
                      저장소
                    </a>
                  )}
                </p>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
