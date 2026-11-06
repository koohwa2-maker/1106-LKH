import { kstParts } from '../lib/weather'

// 7세그먼트 디지털 시계 (SVG). 꺼진 획은 흐리게 보여 실제 LCD 느낌을 냅니다.

const H = (y) => `5,${y} 7.5,${y - 2.5} 22.5,${y - 2.5} 25,${y} 22.5,${y + 2.5} 7.5,${y + 2.5}`
const V = (x, y1, y2) => `${x},${y1} ${x + 2.5},${y1 + 2.5} ${x + 2.5},${y2 - 2.5} ${x},${y2} ${x - 2.5},${y2 - 2.5} ${x - 2.5},${y1 + 2.5}`
const SEG = {
  a: H(3), g: H(26), d: H(49),
  f: V(3, 4, 25), b: V(27, 4, 25), e: V(3, 27, 48), c: V(27, 27, 48),
}
const DIGITS = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
  5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g',
}

function Digit({ ch, h }) {
  const on = DIGITS[ch] ?? ''
  return (
    <svg viewBox="0 0 30 52" height={h} width={(h * 30) / 52} className="seg-digit">
      <g transform="skewX(-6) translate(3 0)">
        {Object.entries(SEG).map(([k, pts]) => (
          <polygon key={k} points={pts} className={on.includes(k) ? 'on' : 'off'} />
        ))}
      </g>
    </svg>
  )
}

function Colon({ h, blink }) {
  return (
    <svg viewBox="0 0 10 52" height={h} width={(h * 10) / 52} className={`seg-colon ${blink ? 'blink' : ''}`}>
      <circle cx="5" cy="17" r="3" className="on" />
      <circle cx="4" cy="37" r="3" className="on" />
    </svg>
  )
}

function Dot({ h }) {
  return (
    <svg viewBox="0 0 8 52" height={h} width={(h * 8) / 52}>
      <circle cx="3" cy="48" r="3" className="on" />
    </svg>
  )
}

function SegText({ text, h, blink }) {
  return (
    <span className="seg-text" role="presentation">
      {[...text].map((c, i) =>
        c === ':' ? <Colon key={i} h={h} blink={blink} />
          : c === '.' ? <Dot key={i} h={h} />
            : <Digit key={i} ch={c} h={h} />)}
    </span>
  )
}

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']
const p2 = (n) => String(n).padStart(2, '0')

export default function DigitalClock({ now }) {
  const k = kstParts(now)
  const sec = new Date(now.getTime() + 9 * 3600 * 1000).getUTCSeconds()
  const label = `${k.y}년 ${k.m}월 ${k.d}일 ${DOW_KO[k.dow]}요일 ${k.h}시 ${k.min}분`

  return (
    <div className="digital-clock" aria-label={label} role="timer">
      <div className="dc-date">
        <SegText text={`${k.y}.${p2(k.m)}.${p2(k.d)}`} h={16} />
        <span className={`dc-dow ${k.dow === 0 ? 'sun' : k.dow === 6 ? 'sat' : ''}`}>
          {DOW[k.dow]} <small>{DOW_KO[k.dow]}</small>
        </span>
      </div>
      <div className="dc-time">
        <span className="dc-ampm">{k.h < 12 ? 'AM' : 'PM'}</span>
        <SegText text={`${p2(k.h)}:${p2(k.min)}`} h={40} blink />
        <SegText text={p2(sec)} h={20} />
      </div>
    </div>
  )
}
