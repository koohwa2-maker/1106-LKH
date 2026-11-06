import { Component } from 'react'

// 하위 컴포넌트(3D 뷰어 등) 오류가 앱 전체를 멈추지 않도록 막아 줌
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) return this.props.fallback?.(this.state.error) ?? null
    return this.props.children
  }
}
