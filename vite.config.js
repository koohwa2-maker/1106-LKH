import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// API 키는 src/.env 의 VITE_API_KEY 에서 읽어
// 개발 서버 프록시에서만 붙입니다. (브라우저 번들에 키가 노출되지 않음)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, 'src', '')
  const key = env.VITE_API_KEY || ''

  const withKey = (prefix) => (path) => {
    const rest = path.replace(prefix, '')
    const sep = rest.includes('?') ? '&' : '?'
    return `${rest}${sep}serviceKey=${key}`
  }

  return {
    plugins: [react()],
    envDir: 'src',
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
