// @MX:NOTE: 박물관 장면(children) 위에 @reader 슬롯(두루마리)을 겹치는 레이아웃
// @MX:SPEC: .claude/docs/domains/museum.md
// 박물관 위에 글 읽기 창(@reader)을 띄운다. 기록관 장면은 그대로 두고 그 위에서 글을 읽으므로,
// 뒤로 가기나 닫기를 누르면 읽기 창만 닫히고 서 있던 자리로 돌아온다.
export default function MuseumLayout({ children, reader }: LayoutProps<'/museum'>) {
  return (
    <>
      {children}
      {reader}
    </>
  );
}
