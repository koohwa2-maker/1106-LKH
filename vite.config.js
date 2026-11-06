import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// API 키는 src/.env 의 VITE_API_KEY 에서 읽어
// 개발 서버 프록시에서만 붙입니다. (브라우저 번들에 키가 노출되지 않음)
export default defineConfig(({ mode }) => {
  // .env 는 프로젝트 루트 또는 src/ 어느 쪽에 두어도 읽음
  const env = { ...loadEnv(mode, 'src', ''), ...loadEnv(mode, process.cwd(), '') }
  const key = env.DATA_GO_KR_KEY || env.VITE_API_KEY || ''
  if (!key) console.warn('[vite] 공공데이터포털 키(VITE_API_KEY)를 .env 에서 찾지 못했습니다.')

  const withKey = (prefix) => (path) => {
    const rest = path.replace(prefix, '')
    const sep = rest.includes('?') ? '&' : '?'
    return `${rest}${sep}serviceKey=${key}`
  }

  return {
    plugins: [react()],
    // three.js 3D 뷰어 청크(약 510KB)는 클릭 시에만 로드되므로 경고 기준 상향
    build: { chunkSizeWarningLimit: 600 },
    // 개발 서버 시작 시 three.js를 미리 번들링 → 지연 로딩 때 의존성 재최적화로
    // React가 두 벌 로드되어 "Invalid hook call"이 나는 문제 방지
    optimizeDeps: { include: ['react', 'react-dom', 'three', 'three/examples/jsm/controls/OrbitControls.js'] },
    server: {
      proxy: {
        // 공공데이터포털 (기상청 단기예보, 국토부 TAGO 버스정보 등)
        '/api/datagokr': {
          target: 'https://apis.data.go.kr',
          changeOrigin: true,
          rewrite: withKey('/api/datagokr'),
        },
      },
    },
  }
})
