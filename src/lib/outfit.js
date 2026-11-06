// 체감온도·강수·바람·이동수단을 고려한 복장 추천

const BANDS = [
  { min: 28, top: 'tshirt', bottom: 'shorts', outer: null, color: '#ffb84d', text: '민소매·반팔, 반바지, 린넨 소재' },
  { min: 23, top: 'tshirt', bottom: 'pants', outer: null, color: '#7cc6ff', text: '반팔, 얇은 셔츠, 면바지' },
  { min: 20, top: 'long', bottom: 'pants', outer: null, color: '#9bd17a', text: '긴팔 티셔츠, 블라우스, 면바지' },
  { min: 17, top: 'knit', bottom: 'pants', outer: null, color: '#e8a0bf', text: '얇은 니트, 맨투맨, 가디건' },
  { min: 12, top: 'long', bottom: 'pants', outer: 'jacket', color: '#6c8ebf', text: '자켓, 가디건, 청바지' },
  { min: 9, top: 'knit', bottom: 'pants', outer: 'trench', color: '#f1e6d0', text: '트렌치코트, 야상, 니트' },
  { min: 5, top: 'knit', bottom: 'pants', outer: 'coat', color: '#5b5f7a', text: '울 코트, 히트텍, 니트' },
  { min: -99, top: 'knit', bottom: 'pants', outer: 'padding', color: '#2d3a5a', text: '롱패딩, 두꺼운 코트, 기모 하의' },
]

export function recommendOutfit(w, trip) {
  if (!w) return null
  const band = BANDS.find((b) => w.feels >= b.min)
  const acc = new Set()
  const tips = []
  const wet = w.condition === 'rain' || w.condition === 'storm'
  const walkMin = trip?.walkMin ?? 0

  if (wet || w.condition === 'snow') {
    acc.add('umbrella')
    tips.push(w.condition === 'snow' ? '눈이 와요. 우산과 미끄럼 방지 신발을 챙기세요.' : '비가 와요. 우산을 꼭 챙기세요.')
  }
  if ((wet && w.precip >= 3) || w.condition === 'snow') { acc.add('boots'); tips.push('발이 젖지 않게 방수 신발·장화를 추천해요.') }
  if (w.feels <= 4) { acc.add('scarf'); acc.add('gloves'); tips.push('목도리와 장갑으로 체온을 지키세요.') }
  else if (w.feels <= 8) { acc.add('scarf') }
  if (w.condition === 'clear' && w.isDay && w.temp >= 24) {
    acc.add('sunglasses'); acc.add('cap')
    tips.push('햇볕이 강해요. 모자·선글라스·자외선 차단제를 챙기세요.')
  }
  if (w.wind >= 7 && !band.outer) tips.push('바람이 강해요. 얇은 바람막이를 하나 챙기세요.')
  if (w.temp >= 30 && w.humidity >= 60) tips.push('대프리카 무더위! 통풍 잘 되는 옷과 물을 준비하세요.')

  if (trip) {
    if (trip.mode === 'metro' || trip.mode === 'bus') {
      if (band.outer === 'padding' || band.outer === 'coat') tips.push('실내(열차·버스)는 따뜻하니 벗기 쉬운 아우터가 좋아요.')
      if (w.temp >= 26) tips.push('냉방이 강할 수 있어 얇은 겉옷을 챙기면 좋아요.')
    }
    if (walkMin >= 12) { acc.add('sneakers'); tips.push(`도보 ${walkMin}분 구간이 있어요. 편한 운동화를 추천해요.`) }
    if (trip.mode === 'taxi' && wet) tips.push('택시 승하차 시 우산을 바로 펼 수 있게 준비하세요.')
  }

  return {
    ...band,
    accessories: [...acc],
    tips,
    summary: band.text,
  }
}

// 2D·3D 캐릭터 공통 스타일
export const SKIN = '#f4cba8'
export const OUTER_STYLE = {
  jacket: { color: '#4a6fa5', len: 200, label: '자켓' },
  trench: { color: '#c9a675', len: 262, label: '트렌치코트' },
  coat: { color: '#3f3f55', len: 255, label: '울 코트' },
  padding: { color: '#24304d', len: 268, label: '롱패딩' },
}
export const TOP_LABEL = { tshirt: '반팔 티셔츠', long: '긴팔 티셔츠', knit: '니트' }
export const BOTTOM_LABEL = { shorts: '반바지', pants: '긴 바지' }
export const PANTS_COLOR = '#3d4a6b'
export const SHORTS_COLOR = '#5a7bb5'

export const ACCESSORY_LABEL = {
  umbrella: '☂ 우산', boots: '🥾 방수 신발', scarf: '🧣 목도리', gloves: '🧤 장갑',
  sunglasses: '🕶 선글라스', cap: '🧢 모자', sneakers: '👟 운동화',
}
