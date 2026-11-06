import { useEffect, useMemo, useState } from 'react'
import './App.css'
import WeatherScene from './components/WeatherScene'
import OutfitAvatar from './components/OutfitAvatar'
import RouteVisual from './components/RouteVisual'
import { fmtTime } from './lib/format'
import { PLACE_GROUPS, findPlace, ALL_PLACES } from './data/places'
import { getWeather, CONDITION_LABEL } from './lib/weather'
import { planTrips, getNearbyArrivals, distKm } from './lib/transit'
import { recommendOutfit, ACCESSORY_LABEL } from './lib/outfit'

const MODE_ICON = { metro: '🚇', bus: '🚌', taxi: '🚕', walk: '🚶' }
const COND_ICON = { clear: '☀️', cloudy: '⛅', overcast: '☁️', rain: '🌧️', snow: '❄️', storm: '⛈️' }

function PlaceSelect({ label, value, onChange, extra }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">장소를 선택하세요</option>
        {extra && <option value={extra.id}>📍 {extra.name}</option>}
        {PLACE_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [weather, setWeather] = useState(null)
  const [weatherErr, setWeatherErr] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [here, setHere] = useState(null)
  const [plan, setPlan] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [bus, setBus] = useState({ state: 'idle' })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const load = () => getWeather()
      .then((w) => { setWeather(w); setWeatherErr('') })
      .catch(() => setWeatherErr('날씨 정보를 불러오지 못했어요'))
    load()
    const t = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const getPlace = (id) => (here && id === here.id ? here : findPlace(id))
  const origin = getPlace(fromId)
  const dest = getPlace(toId)

  const search = () => {
    if (!origin || !dest) return
    const t = new Date()
    setNow(t)
    const p = planTrips(origin, dest, weather, t)
    setPlan({ ...p, origin, dest, at: t })
    setSelectedId(p.best?.id)
    setBus({ state: 'loading' })
    getNearbyArrivals(origin)
      .then((r) => setBus({ state: 'ok', ...r }))
      .catch((e) => setBus({ state: 'fail', reason: e.message }))
  }

  const locate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { id: 'HERE', name: '현재 위치', lat: pos.coords.latitude, lon: pos.coords.longitude }
      const nearest = [...ALL_PLACES].sort((a, b) => distKm(p, a) - distKm(p, b))[0]
      setHere({ ...p, name: `현재 위치 (${nearest.name} 부근)` })
      setFromId('HERE')
    })
  }

  const trip = plan?.options.find((o) => o.id === selectedId) ?? plan?.best
  const outfit = useMemo(() => recommendOutfit(weather, trip), [weather, trip])

  return (
    <>
      <WeatherScene weather={weather} />
      <div className="app">
        <header className="top">
          <div>
            <h1>달구벌 길잡이</h1>
            <p>대구 날씨와 교통을 함께 보고, 지금 떠나기 좋은 방법을 알려드려요</p>
          </div>
          <div className="weather-pill glass">
            {weather ? (
              <>
                <span className="w-icon">{COND_ICON[weather.condition]}</span>
                <div>
                  <strong>{weather.temp.toFixed(1)}°</strong> {CONDITION_LABEL[weather.condition]}
                  <small>체감 {weather.feels.toFixed(0)}° · 습도 {weather.humidity}% · 바람 {weather.wind.toFixed(1)}m/s</small>
                  <small className="src" title={weather.fallbackReason ? `기상청 API 실패: ${weather.fallbackReason}` : ''}>
                    {weather.source}{weather.fallbackReason ? ' (기상청 API 대체)' : ''} · {fmtTime(now)}
                  </small>
                </div>
              </>
            ) : <span>{weatherErr || '날씨 불러오는 중…'}</span>}
          </div>
        </header>

        <section className="search glass">
          <PlaceSelect label="출발" value={fromId} onChange={setFromId} extra={here} />
          <button className="swap" onClick={() => { setFromId(toId); setToId(fromId) }} aria-label="출발/도착 바꾸기">⇄</button>
          <PlaceSelect label="도착" value={toId} onChange={setToId} extra={here} />
          <div className="search-actions">
            <button className="ghost" onClick={locate}>📍 내 위치</button>
            <button className="primary" disabled={!origin || !dest || fromId === toId} onClick={search}>지금 출발 경로 찾기</button>
          </div>
        </section>

        {/* 메인: 출발 복장 + 교통 이미지 */}
        <section className="hero glass">
          <div className="hero-outfit">
            <OutfitAvatar outfit={outfit} size={210} />
            {outfit && (
              <div className="outfit-text">
                <h2>{trip ? '출발 복장 추천' : '오늘의 복장'}</h2>
                <p className="outfit-main">{outfit.summary}</p>
                <div className="chips">
                  {outfit.accessories.map((a) => <span key={a} className="chip">{ACCESSORY_LABEL[a]}</span>)}
                </div>
                <ul className="tips">{outfit.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="hero-route">
            {trip ? (
              <>
                <div className="best-head">
                  <span className="badge">{trip.id === plan.best.id ? '최적 추천' : '선택한 경로'}</span>
                  <h2>{MODE_ICON[trip.mode]} {trip.title} · {trip.minutes}분</h2>
                  <p>{fmtTime(plan.at)} 출발 → {fmtTime(trip.arrive)} 도착 · {trip.fare ? `약 ${trip.fare.toLocaleString()}원` : '무료'}
                    {trip.night ? ' (심야할증)' : ''}</p>
                </div>
                <RouteVisual trip={trip} origin={plan.origin} dest={plan.dest} now={plan.at} />
                <ul className="reasons">{plan.reasons.map((r) => <li key={r}>💡 {r}</li>)}</ul>
              </>
            ) : (
              <div className="empty">
                <div className="empty-art">🚇 🚌 🚕 🚶</div>
                <h2>어디로 가시나요?</h2>
                <p>출발지와 도착지를 고르면 지금 시각의 배차·혼잡도와 날씨를 반영해 최적의 교통편과 복장을 그림으로 보여드려요.</p>
              </div>
            )}
          </div>
        </section>

        {plan && (
          <section className="compare">
            <h3>다른 이동 방법</h3>
            <div className="options">
              {plan.options.map((o) => (
                <button key={o.id} className={`option glass ${o.id === trip.id ? 'active' : ''}`} onClick={() => setSelectedId(o.id)}>
                  <span className="o-icon">{MODE_ICON[o.mode]}</span>
                  <strong>{o.title}{o.id === plan.best.id && <em>추천</em>}</strong>
                  <span className="o-min">{o.minutes}분</span>
                  <small>{fmtTime(o.arrive)} 도착 · {o.fare ? `${o.fare.toLocaleString()}원` : '무료'} · 도보 {o.walkMin}분</small>
                </button>
              ))}
              {plan.band === 'closed' && <p className="note">⚠ 지금은 도시철도·시내버스 운행 시간이 아니에요 (약 05:30~24:00 운행).</p>}
            </div>

            <div className="bus glass">
              <h3>🚏 출발지 주변 실시간 버스</h3>
              {bus.state === 'loading' && <p>불러오는 중…</p>}
              {bus.state === 'fail' && (
                <p className="muted">{{
                  STOP_API: '주변 정류장 검색 API가 승인되지 않았어요. 공공데이터포털에서 ‘국토교통부_(TAGO)_버스정류소정보’를 활용신청해 주세요.',
                  ARRIVAL_API: '버스도착정보 API가 승인되지 않았어요. ‘국토교통부_(TAGO)_버스도착정보’ 활용신청을 확인해 주세요.',
                  NO_STOP: '출발지 근처에서 버스 정류장을 찾지 못했어요.',
                }[bus.reason] ?? '실시간 버스 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.'}</p>
              )}
              {bus.state === 'ok' && (
                <>
                  <p className="muted">{bus.stop} 정류장 · 출발지에서 약 {bus.dist}m</p>
                  <div className="arrivals">
                    {bus.arrivals.length ? bus.arrivals.map((a) => (
                      <span key={a.route} className="arr">
                        <b>{a.route}</b> {a.min <= 1 ? '곧 도착' : `${a.min}분 후`} · {a.left}정거장 전
                        {a.next != null && <small> (다음 {a.next}분)</small>}
                      </span>
                    )) : <span className="muted">도착 예정 버스가 없어요</span>}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <footer>
          소요시간·요금은 거리와 시간대 기반 추정치입니다. 날씨: 기상청(공공데이터포털) / Open-Meteo
        </footer>
      </div>
    </>
  )
}
