// 교통편 계산: 도시철도 경로탐색 + 버스/택시/도보 추정 + 날씨 가중치로 최적 추천
import { LINES, LINE_STATIONS, STATIONS } from '../data/places'
import { kstParts } from './weather'

export function distKm(a, b) {
  const R = 6371, D = Math.PI / 180
  const dLat = (b.lat - a.lat) * D, dLon = (b.lon - a.lon) * D
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const ROAD = 1.35 // 직선거리 → 도로거리 보정
const WALK_KMH = 4.5
const FARE = 1500 // 교통카드 기준 (변동 가능)

// 시간대 구분
export function timeBand(date = new Date()) {
  const { h, min, dow } = kstParts(date)
  const t = h + min / 60
  const weekend = dow === 0 || dow === 6
  if (t >= 0.5 && t < 5.5) return 'closed' // 대중교통 운행 종료 시간대
  if (!weekend && ((t >= 7 && t < 9.5) || (t >= 17.5 && t < 19.5))) return 'peak'
  if (t >= 21.5 || t < 0.5) return 'late'
  return 'normal'
}

// ── 도시철도 그래프 ──
const graph = {}
const add = (a, b, w, meta) => { (graph[a] ||= []).push({ to: b, w, ...meta }) }
for (const [line, list] of Object.entries(LINE_STATIONS)) {
  for (let i = 0; i < list.length - 1; i++) {
    const [n1, la1, lo1] = list[i], [n2, la2, lo2] = list[i + 1]
    const km = distKm({ lat: la1, lon: lo1 }, { lat: la2, lon: lo2 })
    const w = Math.max(1.5, (km / 36) * 60) + 0.4 // 표정속도 + 정차시간
    add(`${n1}|${line}`, `${n2}|${line}`, w, { line: Number(line) })
    add(`${n2}|${line}`, `${n1}|${line}`, w, { line: Number(line) })
  }
}
const TRANSFER_MIN = 4
for (const s of Object.values(STATIONS)) {
  for (const a of s.lines) for (const b of s.lines) {
    if (a !== b) add(`${s.name}|${a}`, `${s.name}|${b}`, TRANSFER_MIN, { transfer: true })
  }
}

function metroPath(from, to) {
  const starts = STATIONS[from].lines.map((l) => `${from}|${l}`)
  const goals = new Set(STATIONS[to].lines.map((l) => `${to}|${l}`))
  const dist = {}, prev = {}, done = new Set()
  starts.forEach((s) => { dist[s] = 0 })
  while (true) {
    let u = null
    for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k
    if (u === null) return null
    if (goals.has(u)) {
      const steps = []
      for (let c = u; prev[c]; c = prev[c].from) steps.unshift({ ...prev[c].edge, from: prev[c].from, to: c })
      return { minutes: dist[u], steps, startKey: steps[0]?.from ?? u }
    }
    done.add(u)
    for (const e of graph[u] || []) {
      const nd = dist[u] + e.w
      if (dist[e.to] === undefined || nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = { from: u, edge: e } }
    }
  }
}

// 경로 단계 → 노선별 구간(leg)으로 묶기
function metroLegs(path, fromName) {
  const legs = []
  let cur = null
  for (const s of path.steps) {
    if (s.transfer) { cur = null; legs.push({ type: 'transfer', minutes: TRANSFER_MIN, label: `${s.from.split('|')[0]} 환승` }); continue }
    if (!cur) {
      cur = { type: 'metro', line: s.line, from: s.from.split('|')[0], to: '', stops: 0, minutes: 0 }
      legs.push(cur)
    }
    cur.to = s.to.split('|')[0]
    cur.stops += 1
    cur.minutes += s.w
  }
  if (!legs.length) legs.push({ type: 'metro', line: STATIONS[fromName].lines[0], from: fromName, to: fromName, stops: 0, minutes: 0 })
  return legs
}

function nearestStation(p) {
  let best = null
  for (const s of Object.values(STATIONS)) {
    const d = distKm(p, s)
    if (!best || d < best.d) best = { s, d }
  }
  return best
}

const headway = { peak: 5, normal: 8, late: 12, closed: Infinity }
const busSpeed = { peak: 14, normal: 19, late: 24 }
const carSpeed = { peak: 19, normal: 27, late: 34, closed: 38 }

// 날씨 가중치: 실제 시간에 "불편함"을 더해 점수를 매김
function weatherFactors(w) {
  const f = { walk: 1, wait: 1, road: 1, notes: [] }
  if (!w) return f
  if (w.condition === 'rain' || w.condition === 'storm') {
    f.walk = w.precip >= 3 || w.condition === 'storm' ? 2.2 : 1.6
    f.wait = 1.5
    f.road = 1.15
    f.notes.push('비가 와서 걷는 구간·야외 대기를 최소화했어요')
  }
  if (w.condition === 'snow') {
    f.walk = 2.0; f.wait = 1.6; f.road = 1.45
    f.notes.push('눈길 도로 정체를 고려해 도시철도 가중치를 높였어요')
  }
  if (w.feels >= 31) { f.walk *= 1.5; f.wait *= 1.4; f.notes.push('폭염으로 도보·야외 대기 부담을 반영했어요') }
  else if (w.feels <= -3) { f.walk *= 1.3; f.wait *= 1.4; f.notes.push('한파로 야외 대기 시간을 줄이는 경로를 우선했어요') }
  if (w.wind >= 9) { f.walk *= 1.2; f.notes.push('강풍으로 도보 구간에 불이익을 줬어요') }
  return f
}

const walkLeg = (km, label) => ({ type: 'walk', minutes: Math.max(1, (km * ROAD * 60) / WALK_KMH), km: km * ROAD, label })

function scoreOf(opt, f) {
  let s = 0
  for (const l of opt.legs) {
    if (l.type === 'walk') s += l.minutes * f.walk
    else if (l.type === 'wait') s += l.minutes * (l.indoor ? 1 : f.wait)
    else s += l.minutes
  }
  return s + (opt.fare / 1000) * 1.2 // 요금 1,000원 ≈ 1.2분으로 환산
}

export function planTrips(origin, dest, weather, now = new Date()) {
  const band = timeBand(now)
  const f = weatherFactors(weather)
  const straight = distKm(origin, dest)
  const options = []

  // 1) 도시철도
  const so = nearestStation(origin), sd = nearestStation(dest)
  if (band !== 'closed' && so.s.name !== sd.s.name) {
    const path = metroPath(so.s.name, sd.s.name)
    if (path) {
      const legs = []
      const access = (st, d, toStation) => {
        if (d < 0.08) return
        if (d <= 1.3) legs.push(walkLeg(d, toStation ? `${st.name}역까지 도보` : '목적지까지 도보'))
        else {
          legs.push({ type: 'wait', minutes: headway[band] === Infinity ? 10 : 7, label: '연계 버스 대기' })
          legs.push({ type: 'bus', minutes: (d * ROAD * 60 * f.road) / busSpeed[band], label: toStation ? `${st.name}역까지 버스` : '목적지까지 버스', km: d * ROAD })
        }
      }
      access(so.s, so.d, true)
      legs.push({ type: 'wait', minutes: headway[band] / 2, label: '열차 대기', indoor: true })
      legs.push(...metroLegs(path, so.s.name))
      access(sd.s, sd.d, false)
      // 버스↔도시철도 환승은 무료 환승 가정
      options.push({ id: 'metro', mode: 'metro', title: '도시철도', legs, fare: FARE })
    }
  }

  // 2) 시내버스 (환승 1회 가정은 장거리일 때)
  if (band !== 'closed') {
    const roadKm = straight * ROAD
    const legs = [
      walkLeg(0.25, '정류장까지 도보'),
      { type: 'wait', minutes: band === 'peak' ? 6 : band === 'late' ? 13 : 9, label: '버스 대기' },
      { type: 'bus', minutes: (roadKm * 60 * f.road) / busSpeed[band], km: roadKm, label: '시내버스 이동' },
    ]
    if (roadKm > 9) legs.splice(3, 0, { type: 'wait', minutes: 7, label: '버스 환승 대기' })
    legs.push(walkLeg(0.25, '목적지까지 도보'))
    options.push({ id: 'bus', mode: 'bus', title: '시내버스', legs, fare: FARE })
  }

  // 3) 택시
  {
    const roadKm = straight * ROAD
    const drive = (roadKm * 60 * f.road) / carSpeed[band]
    const { h } = kstParts(now)
    const night = h >= 22 || h < 4
    let fare = 4000
    if (roadKm > 2) fare += Math.ceil(((roadKm - 2) * 1000) / 130) * 100
    fare += Math.round((drive * 0.25 * 60) / 31) * 100 // 저속 시간요금 일부 반영
    if (night) fare = Math.round((fare * 1.2) / 100) * 100
    const callWait = (band === 'peak' || weather?.condition === 'rain' || weather?.condition === 'snow') ? 8 : 4
    options.push({
      id: 'taxi', mode: 'taxi', title: '택시', fare, night,
      legs: [
        { type: 'wait', minutes: callWait, label: '택시 호출 대기' },
        { type: 'taxi', minutes: drive, km: roadKm, label: '택시 이동' },
      ],
    })
  }

  // 4) 도보
  if (straight * ROAD <= 3) {
    options.push({ id: 'walk', mode: 'walk', title: '도보', fare: 0, legs: [walkLeg(straight, '목적지까지 도보')] })
  }

  for (const o of options) {
    o.legs.forEach((l) => { l.minutes = Math.round(l.minutes) })
    o.legs = o.legs.filter((l) => l.minutes > 0 || l.type === 'metro')
    o.minutes = o.legs.reduce((a, l) => a + l.minutes, 0)
    o.walkMin = o.legs.filter((l) => l.type === 'walk').reduce((a, l) => a + l.minutes, 0)
    o.score = scoreOf(o, f)
    o.arrive = new Date(now.getTime() + o.minutes * 60000)
  }
  options.sort((a, b) => a.score - b.score)
  const best = options[0]
  return {
    band, options, best,
    reasons: [...f.notes, reasonFor(best, options, band)].filter(Boolean),
    nearest: { origin: so, dest: sd },
  }
}

// 받침 유무에 따라 조사 선택
const josa = (w, withJong, noJong) => {
  const c = w.charCodeAt(w.length - 1)
  const jong = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0
  return w + (jong ? withJong : noJong)
}

function reasonFor(best, options, band) {
  if (!best) return ''
  const fastest = [...options].sort((a, b) => a.minutes - b.minutes)[0]
  const bandText = { peak: '출퇴근 혼잡 시간대', late: '심야 시간대(배차 간격 증가)', closed: '대중교통 운행 종료 시간대', normal: '평시' }[band]
  if (best.id === fastest.id) return `${bandText} 기준 가장 빠른 ${josa(best.title, '을', '를')} 추천해요`
  return `${josa(fastest.title, '이', '가')} ${best.minutes - fastest.minutes}분 빠르지만, 비용·날씨를 고려하면 ${josa(best.title, '이', '가')} 더 나아요 (${bandText})`
}

export const legColor = (l) => {
  if (l.type === 'metro') return LINES[l.line].color
  return { walk: '#8a94a6', wait: '#c3c9d4', transfer: '#b7a1e0', bus: '#2f6fe4', taxi: '#f2a900' }[l.type]
}

export const legLabel = (l) => {
  if (l.type === 'metro') return `${LINES[l.line].name} ${l.from} → ${l.to} (${l.stops}개 역)`
  return l.label
}

// ── 실시간 버스 도착 (TAGO, 공공데이터포털 키가 승인된 경우) ──
const TAGO = '/api/datagokr/1613000'
const items = (j) => {
  const it = j?.response?.body?.items?.item
  return it ? (Array.isArray(it) ? it : [it]) : []
}
export async function getNearbyArrivals(p) {
  const q = new URLSearchParams({ gpsLati: p.lat, gpsLong: p.lon, _type: 'json', numOfRows: '20' })
  const r = await fetch(`${TAGO}/BusSttnInfoInqireService/getCrdntPrxmtSttnList?${q}`)
  const j1 = await r.json().catch(() => null)
  if (j1?.OpenAPI_ServiceResponse) throw new Error('STOP_API')
  const all = items(j1)
  // 대구(22) 데이터 우선 (경산 등 인접 도시 중복 정류장 제외), 가까운 순
  const daegu = all.filter((s) => Number(s.citycode) === 22)
  const stops = (daegu.length ? daegu : all)
    .map((s) => ({ ...s, d: distKm(p, { lat: Number(s.gpslati), lon: Number(s.gpslong) }) }))
    .sort((a, b) => a.d - b.d)
  if (!stops.length) throw new Error('NO_STOP')
  const stop = stops[0]
  const q2 = new URLSearchParams({ cityCode: stop.citycode ?? 22, nodeId: stop.nodeid, _type: 'json', numOfRows: '30' })
  const r2 = await fetch(`${TAGO}/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList?${q2}`)
  const j2 = await r2.json().catch(() => null)
  if (j2?.OpenAPI_ServiceResponse) throw new Error('ARRIVAL_API')
  const byRoute = {}
  for (const a of items(j2)) {
    const r = (byRoute[a.routeno] ||= { route: String(a.routeno), times: [] })
    r.times.push({ min: Math.round(a.arrtime / 60), left: a.arrprevstationcnt })
  }
  const arr = Object.values(byRoute)
    .map((r) => {
      r.times.sort((a, b) => a.min - b.min)
      return { route: r.route, min: r.times[0].min, left: r.times[0].left, next: r.times[1]?.min }
    })
    .sort((a, b) => a.min - b.min)
  return { stop: stop.nodenm, dist: Math.round(stop.d * 1000), arrivals: arr.slice(0, 8) }
}
