import { legColor, legLabel } from '../lib/transit'
import { fmtTime } from '../lib/format'

const ICON = { walk: '🚶', wait: '⏱', transfer: '🔁', metro: '🚇', bus: '🚌', taxi: '🚕' }
const MODE_ICON = { metro: '🚇', bus: '🚌', taxi: '🚕', walk: '🚶' }

// 출발 → 도착까지 구간을 색 막대 + 타임라인 이미지로 표현
export default function RouteVisual({ trip, origin, dest, now }) {
  if (!trip) return null
  const total = Math.max(1, trip.minutes)
  const starts = trip.legs.reduce(
    (acc, l) => [...acc, acc[acc.length - 1] + l.minutes * 60000], [now.getTime()],
  )

  return (
    <div className="route-visual">
      <div className="route-ends">
        <div><small>출발 {fmtTime(now)}</small><strong>{origin.name}</strong></div>
        <div className="route-mode">{MODE_ICON[trip.mode]}<span>{trip.minutes}분</span></div>
        <div className="right"><small>도착 {fmtTime(trip.arrive)}</small><strong>{dest.name}</strong></div>
      </div>

      <div className="route-bar" role="img" aria-label={`총 ${trip.minutes}분 경로`}>
        {trip.legs.map((l, i) => (
          <div key={i} className={`seg seg-${l.type}`} title={`${legLabel(l)} · ${l.minutes}분`}
            style={{ flexGrow: Math.max(l.minutes, 1) / total, background: legColor(l) }}>
            {l.minutes / total > 0.09 && <span>{ICON[l.type]} {l.minutes}′</span>}
          </div>
        ))}
      </div>

      <ol className="timeline">
        {trip.legs.map((l, i) => {
          const start = new Date(starts[i])
          return (
            <li key={i}>
              <span className="tl-dot" style={{ background: legColor(l) }}>{ICON[l.type]}</span>
              <span className="tl-time">{fmtTime(start)}</span>
              <span className="tl-text">{legLabel(l)}</span>
              <span className="tl-min">{l.minutes}분{l.km ? ` · ${l.km.toFixed(1)}km` : ''}</span>
            </li>
          )
        })}
        <li className="tl-end">
          <span className="tl-dot" style={{ background: '#222' }}>🏁</span>
          <span className="tl-time">{fmtTime(trip.arrive)}</span>
          <span className="tl-text">{dest.name} 도착</span>
          <span className="tl-min">{trip.fare ? `${trip.fare.toLocaleString()}원` : '무료'}</span>
        </li>
      </ol>
    </div>
  )
}
