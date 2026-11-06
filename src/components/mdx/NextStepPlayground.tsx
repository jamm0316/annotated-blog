'use client';

import { useState } from 'react';

// 2단계 인증 판정 서비스가 1차 인증 뒤 돌려줄 다음 단계를 독자가 값을 바꿔 가며 따라가 보는 그림 (two-factor-auth-design).
// 분기는 본문 흐름도(08-next-step.png)와 한 칸도 다르지 않게 옮겼다. 흐름도를 바꾸면 여기도 같이 바꾼다.

type Values = {
  policy: 'ON' | 'OFF';
  mode: '선택 적용' | '강제 적용';
  personal: '사용' | '사용 안 함' | '미선택';
  appAllowed: '예' | '아니오';
  personalApp: '인증 앱' | '이메일' | '미선택';
  registered: '예' | '아니오';
};
type Key = keyof Values;

const FIELDS: { key: Key; label: string; options: string[] }[] = [
  { key: 'policy', label: '전역 정책 사용', options: ['ON', 'OFF'] },
  { key: 'mode', label: '적용 방식', options: ['선택 적용', '강제 적용'] },
  { key: 'personal', label: '개인 2FA 사용', options: ['사용', '사용 안 함', '미선택'] },
  { key: 'appAllowed', label: '정책이 인증 앱 허용', options: ['예', '아니오'] },
  { key: 'personalApp', label: '개인 인증 앱 선택', options: ['인증 앱', '이메일', '미선택'] },
  { key: 'registered', label: '인증 앱 등록 완료', options: ['예', '아니오'] },
];

const START: Values = {
  policy: 'ON',
  mode: '강제 적용',
  personal: '미선택',
  appAllowed: '예',
  personalApp: '인증 앱',
  registered: '예',
};

// 흐름도를 위에서부터 따라 내려가며 거친 질문과 도착한 단계를 돌려준다
function resolve(v: Values): { asked: Key[]; step: string } {
  const asked: Key[] = ['policy'];
  if (v.policy === 'OFF') return { asked, step: '정식 토큰 발급' };
  asked.push('mode');
  if (v.mode === '선택 적용') {
    asked.push('personal');
    if (v.personal === '사용 안 함') return { asked, step: '정식 토큰 발급' };
    if (v.personal === '미선택') return { asked, step: '2FA 사용 여부 묻기' };
  }
  asked.push('appAllowed');
  if (v.appAllowed === '아니오') return { asked, step: '이메일 코드 입력' };
  asked.push('personalApp');
  if (v.personalApp === '이메일') return { asked, step: '이메일 코드 입력' };
  if (v.personalApp === '미선택') return { asked, step: '인증 앱 등록 권유' };
  asked.push('registered');
  return { asked, step: v.registered === '예' ? '인증 앱 코드 입력' : '인증 앱 등록' };
}

export function NextStepPlayground({ caption }: { caption?: string }) {
  const [v, setV] = useState<Values>(START);
  const { asked, step } = resolve(v);
  const token = step === '정식 토큰 발급' ? '정식 토큰' : 'pre-auth 토큰';
  const changed = FIELDS.some((f) => v[f.key] !== START[f.key]);

  return (
    <figure className="figure card playground stepper">
      <div className="stepper__fields">
        {FIELDS.map((f) => {
          const used = asked.includes(f.key);
          return (
            <fieldset key={f.key} className={`stepper__field${used ? '' : ' is-unused'}`}>
              <legend className="mono">{f.label}</legend>
              <div className="stepper__options">
                {f.options.map((o) => (
                  <label key={o} className="mono">
                    <input
                      type="radio"
                      name={`next-step-${f.key}`}
                      value={o}
                      checked={v[f.key] === o}
                      onChange={() => setV((prev) => ({ ...prev, [f.key]: o }))}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      <ol className="stepper__log mono" aria-label="판정 경로">
        <li>1차 인증 성공</li>
        {asked.map((k) => (
          <li key={k}>
            {FIELDS.find((f) => f.key === k)!.label} ? <strong>{v[k]}</strong>
          </li>
        ))}
      </ol>
      <p className="playground__result mono" aria-live="polite">
        → 다음 단계 <strong>{step}</strong>
        <span className="stepper__token">{token}</span>
      </p>

      <p className="playground__legend mono">
        <span>흐린 값은 이번 판정에 쓰이지 않는다</span>
        <button type="button" onClick={() => setV(START)} disabled={!changed}>
          처음 값으로
        </button>
      </p>

      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
