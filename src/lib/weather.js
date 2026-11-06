// 날씨 조회: 기상청 초단기실황/예보(공공데이터포털, .env 키 사용) → 실패 시 Open-Meteo(키 불필요)

// 위경도 → 기상청 격자(nx, ny) 변환 (LCC)
export function toGrid(lat, lon) {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0
  const XO = 43, YO = 136, D = Math.PI / 180
  const re = RE / GRID, slat1 = SLAT1 * D, slat2 = SLAT2 * D, olon = OLON * D, olat = OLAT * D
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)
  let ra = Math.tan(Math.PI * 0.25 + lat * D * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)
  let theta = lon * D - olon
  if (theta > Math.PI) theta -= 2 * Math.PI
  if (theta < -Math.PI) theta += 2 * Math.PI
  theta *= sn
  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  }
}

// 한국 시간 기준 Date 구성요소
export function kstParts(date = new Date()) {
  const k = new Date(date.getTime() + 9 * 3600 * 1000)
  return {
    y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate(),
    h: k.getUTCHours(), min: k.getUTCMinutes(), dow: k.getUTCDay(),
  }
}
const pad = (n) => String(n).padStart(2, '0')
const ymd = (p) => `${p.y}${pad(p.m)}${pad(p.d)}`

// 일출/일몰 근사 (대구)
export function isDaytime(date = new Date()) {
  const p = kstParts(date)
  const start = Date.UTC(p.y, 0, 0)
  const doy = Math.floor((Date.UTC(p.y, p.m - 1, p.d) - start) / 86400000)
  const dayLen = 12 + 2.3 * Math.sin((2 * Math.PI * (doy - 80)) / 365)
  const noon = 12.45
  const hour = p.h + p.min / 60
  return hour > noon - dayLen / 2 && hour < noon + dayLen / 2
}

// 체감온도
export function feelsLike(t, rh, ws) {
  const v = ws * 3.6
  if (t <= 10 && v >= 4.8) {
    return 13.12 + 0.6215 * t - 11.37 * v ** 0.16 + 0.3965 * t * v ** 0.16
  }
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t))
  return t + 0.33 * e - 0.7 * ws - 4
}

const KMA_BASE = '/api/datagokr/1360000/VilageFcstInfoService_2.0'

async function kmaFetch(op, params) {
  const qs = new URLSearchParams({ numOfRows: '100', pageNo: '1', dataType: 'JSON', ...params })
  const res = await fetch(`${KMA_BASE}/${op}?${qs}`)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { throw new Error('기상청 응답 형식 오류') }
  const code = json?.response?.header?.resultCode
  if (code !== '00') {
    const msg = json?.response?.header?.resultMsg
      || json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg || '기상청 API 오류'
    throw new Error(msg)
  }
  return json.response.body.items.item
}

async function fromKMA(lat, lon) {
  const { nx, ny } = toGrid(lat, lon)
  // 초단기실황: 매시 정각 발표, 약 40분 이후 제공
  const n = kstParts(new Date(Date.now() - 45 * 60 * 1000))
  const ncst = await kmaFetch('getUltraSrtNcst', { base_date: ymd(n), base_time: `${pad(n.h)}00`, nx, ny })
  const v = Object.fromEntries(ncst.map((i) => [i.category, Number(i.obsrValue)]))

  // 초단기예보: 매시 30분 발표, 약 45분 이후 제공 → 하늘상태(SKY), 낙뢰(LGT)
  let sky = 1, lgt = 0
  try {
    const f = kstParts(new Date(Date.now() - 75 * 60 * 1000))
    const fc = await kmaFetch('getUltraSrtFcst', { base_date: ymd(f), base_time: `${pad(f.h)}30`, nx, ny })
    const first = (cat) => fc.filter((i) => i.category === cat)
      .sort((a, b) => (a.fcstDate + a.fcstTime).localeCompare(b.fcstDate + b.fcstTime))[0]
    sky = Number(first('SKY')?.fcstValue ?? 1)
    lgt = Number(first('LGT')?.fcstValue ?? 0)
  } catch { /* 하늘상태 없으면 맑음 가정 */ }

  const pty = v.PTY ?? 0 // 0없음 1비 2비/눈 3눈 5빗방울 6빗방울눈날림 7눈날림
  let condition = sky >= 4 ? 'overcast' : sky >= 3 ? 'cloudy' : 'clear'
  if ([1, 2, 5, 6].includes(pty)) condition = 'rain'
  if ([3, 7].includes(pty)) condition = 'snow'
  if (lgt > 0 && condition === 'rain') condition = 'storm'

  const temp = v.T1H, humidity = v.REH ?? 50, wind = v.WSD ?? 0
  return {
    source: '기상청 초단기실황',
    temp, humidity, wind,
    precip: v.RN1 ?? 0,
    feels: feelsLike(temp, humidity, wind),
    condition,
    sleet: pty === 2 || pty === 6,
    isDay: isDaytime(),
  }
}

function wmoToCondition(code) {
  if ([95, 96, 99].includes(code)) return 'storm'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ([45, 48, 3].includes(code)) return 'overcast'
  if (code === 2) return 'cloudy'
  return 'clear'
}

async function fromOpenMeteo(lat, lon) {
  const qs = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: 'Asia/Seoul', wind_speed_unit: 'ms',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`)
  if (!res.ok) throw new Error('Open-Meteo 오류')
  const c = (await res.json()).current
  return {
    source: 'Open-Meteo',
    temp: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    wind: c.wind_speed_10m,
    precip: c.precipitation,
    feels: c.apparent_temperature,
    condition: wmoToCondition(c.weather_code),
    sleet: [66, 67].includes(c.weather_code),
    isDay: c.is_day === 1,
  }
}

export async function getWeather(lat = 35.8714, lon = 128.6014) {
  try {
    return await fromKMA(lat, lon)
  } catch (e) {
    const w = await fromOpenMeteo(lat, lon)
    return { ...w, fallbackReason: e.message }
  }
}

export const CONDITION_LABEL = {
  clear: '맑음', cloudy: '구름 많음', overcast: '흐림', rain: '비', snow: '눈', storm: '뇌우',
}
