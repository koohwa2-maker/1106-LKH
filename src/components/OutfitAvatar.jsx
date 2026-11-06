// 추천 복장을 입은 캐릭터 일러스트 (SVG 레이어 조합)

const SKIN = '#f4cba8'
const OUTER = {
  jacket: { color: '#4a6fa5', len: 200 },
  trench: { color: '#c9a675', len: 262 },
  coat: { color: '#3f3f55', len: 255 },
  padding: { color: '#24304d', len: 268 },
}

export default function OutfitAvatar({ outfit, size = 260 }) {
  if (!outfit) return null
  const { top, bottom, outer, color, accessories = [] } = outfit
  const has = (a) => accessories.includes(a)
  const o = outer ? OUTER[outer] : null
  const longSleeve = top !== 'tshirt' || !!o
  const sleeveColor = o ? o.color : color
  const armW = outer === 'padding' ? 22 : 17

  return (
    <svg viewBox="-30 -50 260 400" width={size} height={size * (400 / 260)} className="avatar" role="img"
      aria-label={`추천 복장: ${outfit.summary}`}>
      <ellipse cx="100" cy="335" rx="62" ry="9" fill="rgba(0,0,0,.18)" />

      {/* 우산 (뒤쪽 레이어) */}
      {has('umbrella') && (
        <g>
          <line x1="150" y1="186" x2="150" y2="-8" stroke="#555" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 -6 Q150 -90 240 -6 Q225 -18 210 -6 Q195 -18 180 -6 Q165 -18 150 -6 Q135 -18 120 -6 Q105 -18 90 -6 Q75 -18 60 -6 Z"
            fill="#e25563" stroke="#b83a48" strokeWidth="2" />
          <path d="M150 -48 Q130 -30 120 -6 M150 -48 Q170 -30 180 -6" stroke="#b83a48" strokeWidth="2" fill="none" />
        </g>
      )}

      {/* 다리 / 하의 */}
      {bottom === 'shorts' ? (
        <g>
          <rect x="74" y="215" width="20" height="90" rx="9" fill={SKIN} />
          <rect x="106" y="215" width="20" height="90" rx="9" fill={SKIN} />
          <path d="M68 180 H132 L136 232 H104 L100 205 L96 232 H64 Z" fill="#5a7bb5" />
        </g>
      ) : (
        <path d="M68 180 H132 L130 306 H106 L100 214 L94 306 H70 Z" fill="#3d4a6b" />
      )}

      {/* 신발 */}
      {has('boots') ? (
        <g fill="#f2c94c" stroke="#c9a12c" strokeWidth="2">
          <path d="M68 282 H95 V318 H58 Q58 306 68 304 Z" />
          <path d="M105 282 H132 V304 Q142 306 142 318 H105 Z" />
        </g>
      ) : (
        <g fill={has('sneakers') ? '#fafafa' : '#2b2b2b'} stroke="#555" strokeWidth={has('sneakers') ? 2 : 0}>
          <path d="M66 302 H96 V318 H56 Q56 306 66 302 Z" />
          <path d="M104 302 H134 Q144 306 144 318 H104 Z" />
        </g>
      )}

      {/* 상의 몸통 */}
      <path d="M66 92 Q100 82 134 92 L136 192 H64 Z" fill={color} />
      {top === 'knit' && !o && (
        <g stroke="rgba(0,0,0,.15)" strokeWidth="2">
          {[72, 82, 92, 102, 112, 122].map((x) => <line key={x} x1={x + 2} y1="182" x2={x + 2} y2="192" />)}
        </g>
      )}

      {/* 아우터 몸통 */}
      {o && (
        <g>
          <path d={outer === 'padding'
            ? `M58 92 Q100 78 142 92 L148 ${o.len} H52 Z`
            : `M62 92 Q100 82 138 92 L${outer === 'jacket' ? 140 : 146} ${o.len} H${outer === 'jacket' ? 60 : 54} Z`}
            fill={o.color} />
          {outer === 'padding' && [118, 146, 174, 202, 230].map((y) => (
            <path key={y} d={`M55 ${y} Q100 ${y + 8} 145 ${y}`} stroke="rgba(255,255,255,.18)" strokeWidth="3" fill="none" />
          ))}
          {outer === 'trench' && <rect x="56" y="186" width="88" height="9" fill="#a8854f" />}
          <line x1="100" y1="96" x2="100" y2={o.len} stroke="rgba(0,0,0,.25)" strokeWidth="2" />
          {/* 안쪽 상의가 보이는 V넥 */}
          <path d="M88 90 L100 120 L112 90 Z" fill={color} />
        </g>
      )}

      {/* 팔 */}
      <g strokeLinecap="round">
        <line x1="66" y1="100" x2="50" y2="180" stroke={longSleeve ? sleeveColor : SKIN} strokeWidth={armW} />
        <line x1="134" y1="100" x2="150" y2="180" stroke={longSleeve ? sleeveColor : SKIN} strokeWidth={armW} />
        {!longSleeve && (
          <g stroke={color} strokeWidth={armW + 2}>
            <line x1="66" y1="98" x2="61" y2="122" />
            <line x1="134" y1="98" x2="139" y2="122" />
          </g>
        )}
      </g>
      {/* 손 / 장갑 */}
      <circle cx="49" cy="186" r="9" fill={has('gloves') ? '#c0392b' : SKIN} />
      <circle cx="151" cy="186" r="9" fill={has('gloves') ? '#c0392b' : SKIN} />

      {/* 목 / 머리 */}
      <rect x="92" y="72" width="16" height="16" fill={SKIN} />
      {has('scarf') && (
        <g fill="#d64545">
          <rect x="80" y="80" width="40" height="15" rx="7" />
          <rect x="104" y="88" width="13" height="42" rx="5" />
          <g stroke="#a83232" strokeWidth="2"><line x1="106" y1="126" x2="106" y2="134" /><line x1="111" y1="126" x2="111" y2="134" /><line x1="115" y1="126" x2="115" y2="134" /></g>
        </g>
      )}
      <circle cx="100" cy="48" r="28" fill={SKIN} />
      <path d="M72 46 Q70 16 100 16 Q130 16 128 46 Q120 30 100 30 Q82 30 72 46 Z" fill="#3a2a20" />
      {/* 얼굴 */}
      {has('sunglasses') ? (
        <g fill="#1b1b1b"><rect x="80" y="42" width="17" height="10" rx="4" /><rect x="103" y="42" width="17" height="10" rx="4" /><rect x="96" y="45" width="8" height="2" /></g>
      ) : (
        <g fill="#3a2a20"><circle cx="89" cy="48" r="3" /><circle cx="111" cy="48" r="3" /></g>
      )}
      <path d="M90 60 Q100 68 110 60" stroke="#b5654d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="83" cy="58" r="4" fill="#f4a3a3" opacity=".6" /><circle cx="117" cy="58" r="4" fill="#f4a3a3" opacity=".6" />
      {has('cap') && (
        <g fill="#f08a24"><path d="M72 36 Q72 12 100 12 Q128 12 128 36 Z" /><path d="M118 34 H146 Q146 40 128 40 H118 Z" /></g>
      )}
      {outer === 'padding' && !has('cap') && (
        <path d="M72 34 Q72 8 100 8 Q128 8 128 34 Z" fill="#7a8bb5" />
      )}
    </svg>
  )
}
