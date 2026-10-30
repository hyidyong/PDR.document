import { Component, type ErrorInfo, type ReactNode } from 'react'

type State = { failed: boolean }

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }
  static getDerivedStateFromError(): State { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('MODIT 화면 렌더링 오류', error, info) }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="fatal-error" role="alert"><h1>화면을 불러오지 못했어요</h1><p>입력한 내용은 브라우저에 저장되어 있습니다. 페이지를 새로고침해 다시 시도해 주세요.</p><button onClick={() => window.location.reload()} type="button">새로고침</button></main>
  }
}
