'use client';

// @MX:NOTE: 물방울 탭(LiquidTabs, 하나만 고름)과 칩(LiquidChips, 여러 개 고름)
// @MX:SPEC: .claude/docs/domains/browse.md

import { useLayoutEffect, useRef, type CSSProperties } from 'react';

export type TabItem = { value: string; label: string; count?: number };

type Props = {
  items: TabItem[];
  /** 고른 값. null 이면 아무것도 고르지 않은 상태라 물방울이 사라진다. */
  value: string | null;
  onChange: (value: string) => void;
  label: string;
  size?: 'lg' | 'sm';
  /** 고를 때마다 물방울이 아래로 한 방울 떨어진다 (2단계 칩이 펼쳐지는 쪽으로) */
  drip?: boolean;
};

// 고른 탭 뒤에 주황 물방울이 깔린다. 다른 탭을 누르면 가는 쪽 끝이 먼저 늘어나고 뒤쪽이 따라붙어,
// 물방울이 늘어났다 다시 뭉치는 것처럼 움직인다. 물방울 층에는 goo 필터(#goo)를 걸어 가장자리가 엉겨 붙는다.
export function LiquidTabs({ items, value, onChange, label, size = 'lg', drip = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLSpanElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const prevLeft = useRef<number | null>(null);
  const prevValue = useRef<string | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const blob = blobRef.current;
    if (!root || !blob) return;

    const place = (animate: boolean) => {
      const active = root.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!active) {
        blob.dataset.hidden = '';
        prevLeft.current = null;
        return;
      }
      const left = active.offsetLeft;
      const right = root.clientWidth - (left + active.offsetWidth);
      const top = active.offsetTop;
      const height = active.offsetHeight;
      const wasHidden = blob.hasAttribute('data-hidden');

      // 숨어 있다가 처음 나타날 때는 그 자리에서 맺히고, 옮겨 갈 때는 가는 방향에 따라 앞뒤 끝의 지연이 달라진다
      const from = prevLeft.current;
      blob.dataset.dir = from === null || !animate || left === from ? 'none' : left > from ? 'right' : 'left';
      blob.style.left = `${left}px`;
      blob.style.right = `${right}px`;
      blob.style.top = `${top}px`;
      blob.style.height = `${height}px`;
      if (wasHidden) delete blob.dataset.hidden;
      prevLeft.current = left;

      if (animate && blob.dataset.dir !== 'none') {
        blob.classList.remove('is-squish');
        void blob.offsetWidth; // 애니메이션을 처음부터 다시 돌린다
        blob.classList.add('is-squish');
      }

      const drop = dropRef.current;
      if (drip && drop && animate && changed) {
        drop.style.left = `${left + active.offsetWidth / 2}px`;
        drop.style.top = `${top + height - 10}px`;
        drop.classList.remove('is-falling');
        void drop.offsetWidth;
        drop.classList.add('is-falling');
      }
    };

    // @MX:WARN: place 가 이 changed 를 클로저로 읽는다. place(true) 보다 먼저 계산해야 한다
    // @MX:REASON: place(true) 뒤로 옮기면 drip 탭에서 TDZ ReferenceError 가 난다
    const changed = prevValue.current !== value;
    prevValue.current = value;
    place(true);
    const ro = new ResizeObserver(() => place(false));
    ro.observe(root);
    return () => ro.disconnect();
  }, [value, items, drip]);

  return (
    <div ref={rootRef} className={`liquid liquid--${size}`} role="group" aria-label={label}>
      <span className="liquid__goo" aria-hidden>
        <span ref={blobRef} className="liquid__blob" data-hidden="" />
        {drip && <span ref={dropRef} className="liquid__drop" />}
      </span>
      {items.map((item, i) => (
        <button
          key={item.value}
          type="button"
          className="liquid__tab mono"
          aria-pressed={item.value === value}
          style={{ '--i': i } as CSSProperties}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span className="liquid__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

type ChipsProps = {
  items: TabItem[];
  /** 고른 값들. 비어 있으면 '전체'(value '')가 눌린 상태다. */
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
};

// 여러 개를 함께 고르는 칩. 누를 때마다 그 칩 뒤에 물방울이 맺히고(살짝 지나쳤다 돌아옴), 다시 누르면 꺼진다.
// 나란히 고른 칩의 물방울은 goo 필터 때문에 서로 엉겨 붙는다. '전체'를 누르면 고른 것을 모두 비운다.
export function LiquidChips({ items, values, onChange, label }: ChipsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const blobs = useRef(new Map<string, HTMLSpanElement>());

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const place = () => {
      root.querySelectorAll<HTMLButtonElement>('.liquid__tab').forEach((tab) => {
        const blob = blobs.current.get(tab.dataset.value ?? '');
        if (!blob) return;
        blob.style.left = `${tab.offsetLeft}px`;
        blob.style.top = `${tab.offsetTop}px`;
        blob.style.width = `${tab.offsetWidth}px`;
        blob.style.height = `${tab.offsetHeight}px`;
        if (tab.getAttribute('aria-pressed') === 'true') delete blob.dataset.hidden;
        else blob.dataset.hidden = '';
      });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(root);
    return () => ro.disconnect();
  }, [items, values]);

  const pressed = (v: string) => (v === '' ? values.length === 0 : values.includes(v));
  const toggle = (v: string) => {
    if (v === '') return onChange([]);
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };

  return (
    <div ref={rootRef} className="liquid liquid--sm" role="group" aria-label={label}>
      <span className="liquid__goo" aria-hidden>
        {items.map((item) => (
          <span
            key={item.value}
            ref={(el) => {
              if (el) blobs.current.set(item.value, el);
              else blobs.current.delete(item.value);
            }}
            className="liquid__blob liquid__blob--chip"
            data-hidden=""
          />
        ))}
      </span>
      {items.map((item, i) => (
        <button
          key={item.value}
          type="button"
          className="liquid__tab mono"
          data-value={item.value}
          aria-pressed={pressed(item.value)}
          style={{ '--i': i } as CSSProperties}
          onClick={() => toggle(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span className="liquid__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
