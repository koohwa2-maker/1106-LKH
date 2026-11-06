import { useMemo } from 'react'

// 오늘 날씨에 맞춰 바뀌는 배경 일러스트 (하늘·해/달·구름·비·눈·번개 + 대구 스카이라인)

const rand = (seed) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function Cloud({ x, y, s, dur, delay, dark }) {
  return (
    <svg className="cloud" viewBox="0 0 200 90" style={{ top: `${y}%`, left: `${x}%`, width: `${s}px`, animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}>
      <path d="M40 80 Q10 80 12 58 Q14 38 38 40 Q44 14 74 16 Q98 0 122 18 Q150 10 160 38 Q190 40 188 62 Q186 80 160 80 Z"
        fill={dark ? 'var(--cloud-dark)' : 'var(--cloud)'} />
    </svg>
  )
}

export default function WeatherScene({ weather }) {
  const cond = weather?.condition ?? 'clear'
  const day = weather?.isDay ?? true
  const heavy = (weather?.precip ?? 0) >= 3

  const parts = useMemo(() => {
    const r = rand(7)
    return {
      drops: Array.from({ length: 110 }, () => ({ x: r() * 100, d: 0.45 + r() * 0.4, delay: r() * 2, o: 0.35 + r() * 0.5 })),
      flakes: Array.from({ length: 80 }, () => ({ x: r() * 100, s: 3 + r() * 6, d: 6 + r() * 8, delay: r() * 10, sway: 10 + r() * 30 })),
      stars: Array.from({ length: 70 }, () => ({ x: r() * 100, y: r() * 55, s: 1 + r() * 2, delay: r() * 4 })),
      clouds: Array.from({ length: 7 }, (_, i) => ({ x: -20 + i * 18 + r() * 10, y: 4 + r() * 26, s: 160 + r() * 200, dur: 70 + r() * 80, delay: r() * 80 })),
    }
  }, [])

  const cloudCount = { clear: 2, cloudy: 5, overcast: 7, rain: 7, snow: 6, storm: 7 }[cond]
  const darkClouds = ['overcast', 'rain', 'storm'].includes(cond)

  return (
    <div className={`scene scene-${cond} ${day ? 'is-day' : 'is-night'}`} aria-hidden="true">
      {!day && cond !== 'storm' && parts.stars.map((s, i) => (
        <span key={i} className="star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.delay}s`, opacity: cond === 'clear' ? 1 : 0.35 }} />
      ))}

      {cond === 'clear' || cond === 'cloudy' ? (
        day ? <div className="sun"><div className="sun-rays" /></div> : <div className="moon" />
      ) : null}

      {parts.clouds.slice(0, cloudCount).map((c, i) => <Cloud key={i} {...c} dark={darkClouds} />)}

      {(cond === 'rain' || cond === 'storm') && (
        <div className="rain">
          {parts.drops.slice(0, heavy || cond === 'storm' ? 110 : 60).map((d, i) => (
            <i key={i} style={{ left: `${d.x}%`, animationDuration: `${d.d}s`, animationDelay: `-${d.delay}s`, opacity: d.o }} />
          ))}
        </div>
      )}

      {(cond === 'snow' || weather?.sleet) && (
        <div className="snow">
          {parts.flakes.map((f, i) => (
            <i key={i} style={{ left: `${f.x}%`, width: f.s, height: f.s, animationDuration: `${f.d}s`, animationDelay: `-${f.delay}s`, '--sway': `${f.sway}px` }} />
          ))}
        </div>
      )}

      {cond === 'storm' && <div className="lightning" />}

      <svg className="skyline" viewBox="0 0 1440 260" preserveAspectRatio="none">
        <path className="ridge" d="M0 150 Q160 70 320 120 T620 90 Q760 50 900 110 T1200 80 Q1330 60 1440 110 V260 H0 Z" />
        <path className="city" d="M0 200 H60 V160 H110 V185 H150 V140 H200 V175 H240 V120 H290 V170 H330 V150 H370 V190 H420
          V130 H460 V100 H500 V160 H540 V180 H590 V145 H640 V175 H690 V125 H735 V170 H780 V150 H820 V60 L826 40 L832 60 V150
          H870 V175 H910 V135 H960 V165 H1000 V115 H1050 V170 H1090 V150 H1140 V185 H1190 V140 H1240 V170 H1290 V130 H1340
          V180 H1390 V160 H1440 V260 H0 Z" />
        <rect className="ground" x="0" y="230" width="1440" height="30" />
      </svg>
      {cond === 'snow' && <div className="snow-ground" />}
    </div>
  )
}
