// Vercel 서버리스 프록시: /api/datagokr/<경로>?<쿼리>  →  https://apis.data.go.kr/<경로>?<쿼리>&serviceKey=<키>
// 로컬의 vite.config.js 프록시와 같은 역할입니다. 키는 Vercel 환경변수에서만 읽어 브라우저에 노출되지 않습니다.

// 이 앱이 쓰는 서비스만 허용 (아무 API나 대신 호출해 주는 공개 프록시가 되지 않도록)
const ALLOWED = [
  '1360000/VilageFcstInfoService_2.0/', // 기상청 단기예보
  '1613000/BusSttnInfoInqireService/', // TAGO 버스정류소정보
  '1613000/ArvlInfoInqireService/', // TAGO 버스도착정보
]

export default async function handler(req, res) {
  const key = process.env.DATA_GO_KR_KEY || process.env.VITE_API_KEY
  if (!key) {
    res.status(500).json({ error: 'Vercel 환경변수 DATA_GO_KR_KEY 가 설정되지 않았습니다.' })
    return
  }

  const { path, ...rest } = req.query
  const target = (Array.isArray(path) ? path.join('/') : path || '').replace(/^\/+/, '')
  if (!ALLOWED.some((p) => target.startsWith(p)) || target.includes('..')) {
    res.status(403).json({ error: '허용되지 않은 경로입니다.' })
    return
  }

  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(rest)) {
    if (k.toLowerCase() === 'servicekey') continue
    qs.append(k, Array.isArray(v) ? v[0] : v)
  }

  try {
    const upstream = await fetch(`https://apis.data.go.kr/${target}?${qs}&serviceKey=${key}`)
    const body = await upstream.text()
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8')
    // 실시간 버스는 짧게, 날씨는 조금 길게 캐시
    res.setHeader('Cache-Control', target.startsWith('1360000') ? 's-maxage=300' : 's-maxage=15')
    res.status(upstream.status).send(body)
  } catch {
    res.status(502).json({ error: '공공데이터포털 연결 실패' })
  }
}
