'use client';

import { useRef, useState, type ComponentProps } from 'react';

const LABELS: Record<string, string> = {
  bash: 'Shell',
  dockerfile: 'Dockerfile',
  html: 'HTML',
  http: 'HTTP',
  java: 'Java',
  json: 'JSON',
  jsonc: 'JSON',
  text: 'Text',
  xml: 'XML',
};

// 코드 블록 위에 언어 이름과 복사 버튼을 단다. rehype-pretty-code 가 만든 pre 를 받는다.
export function CodeBlock(props: ComponentProps<'pre'> & { 'data-language'?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const lang = props['data-language'] ?? 'text';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="code">
      <div className="code__bar mono">
        <span>{LABELS[lang] ?? lang}</span>
        <button type="button" onClick={copy} aria-live="polite">
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre ref={ref} {...props} />
    </div>
  );
}
