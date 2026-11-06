import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  SKIN, OUTER_STYLE, TOP_LABEL, BOTTOM_LABEL, PANTS_COLOR, SHORTS_COLOR, ACCESSORY_LABEL,
} from '../lib/outfit'

// 추천 복장을 입은 3D 캐릭터 (three.js 기본 도형 조합) + 날씨 파티클

function buildCharacter(outfit) {
  const root = new THREE.Group()
  const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...opts })
  const mesh = (geo, material, [x, y, z] = [0, 0, 0], parent = root) => {
    const m = new THREE.Mesh(geo, material)
    m.position.set(x, y, z)
    m.castShadow = true
    parent.add(m)
    return m
  }
  const has = (a) => outfit.accessories.includes(a)
  const o = outfit.outer ? OUTER_STYLE[outfit.outer] : null
  const skin = mat(SKIN, { roughness: 0.6 })
  const topMat = mat(outfit.color, { roughness: outfit.top === 'knit' ? 1 : 0.8 })
  const outerMat = o && mat(o.color, { roughness: outfit.outer === 'padding' ? 0.35 : 0.8 })
  const pants = mat(outfit.bottom === 'shorts' ? SHORTS_COLOR : PANTS_COLOR, { roughness: 0.9 })

  // 다리 + 하의
  for (const x of [-0.11, 0.11]) {
    mesh(new THREE.CapsuleGeometry(0.085, 0.62, 6, 16), skin, [x, 0.47, 0])
    if (outfit.bottom === 'shorts') mesh(new THREE.CapsuleGeometry(0.102, 0.2, 6, 16), pants, [x, 0.76, 0])
    else mesh(new THREE.CapsuleGeometry(0.098, 0.64, 6, 16), pants, [x, 0.5, 0])
    // 신발 / 장화
    if (has('boots')) mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.3, 16), mat('#f2c94c', { roughness: 0.4 }), [x, 0.15, 0.01])
    mesh(new THREE.BoxGeometry(0.17, 0.09, 0.28), mat(has('boots') ? '#f2c94c' : has('sneakers') ? '#fafafa' : '#2b2b2b'), [x, 0.045, 0.04])
  }
  mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 24), pants, [0, 0.9, 0]).scale.z = 0.75

  // 몸통
  const torso = mesh(new THREE.CapsuleGeometry(0.21, 0.38, 8, 24), topMat, [0, 1.22, 0])
  torso.scale.z = 0.72

  // 아우터 (회전체로 코트 실루엣)
  if (o) {
    const bottom = { jacket: 0.84, trench: 0.5, coat: 0.53, padding: 0.42 }[outfit.outer]
    const puff = outfit.outer === 'padding' ? 0.05 : 0
    const flare = outfit.outer === 'jacket' ? 0.01 : 0.07
    const pts = [
      [0.12, 1.66], [0.24 + puff, 1.6], [0.25 + puff, 1.45], [0.245 + puff, 1.1],
      [0.255 + puff + flare / 2, 0.85], [0.26 + puff + flare, bottom + 0.02], [0.25 + puff + flare, bottom],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    const coat = mesh(new THREE.LatheGeometry(pts, 40), outerMat)
    coat.material.side = THREE.DoubleSide
    coat.scale.z = 0.78
    if (outfit.outer === 'padding') {
      for (let y = bottom + 0.1; y < 1.5; y += 0.17) {
        const ring = mesh(new THREE.TorusGeometry(0.255 + puff + flare * ((1.1 - y) / 1.1), 0.018, 8, 40), outerMat, [0, y, 0])
        ring.rotation.x = Math.PI / 2
        ring.scale.y = 0.78
      }
    }
    if (outfit.outer === 'trench') {
      const belt = mesh(new THREE.TorusGeometry(0.262, 0.025, 8, 40), mat('#a8854f'), [0, 1.0, 0])
      belt.rotation.x = Math.PI / 2
      belt.scale.y = 0.78
    }
    // 앞여밈 사이로 보이는 안쪽 상의
    mesh(new THREE.BoxGeometry(0.1, 0.22, 0.02), topMat, [0, 1.5, 0.195])
  }

  // 팔 (어깨 기준 회전)
  const longSleeve = outfit.top !== 'tshirt' || !!o
  const sleeveMat = o ? outerMat : topMat
  const sleeveR = outfit.outer === 'padding' ? 0.1 : o ? 0.085 : 0.075
  const arms = []
  for (const side of [-1, 1]) {
    const arm = new THREE.Group()
    arm.position.set(side * 0.29, 1.53, 0)
    arm.rotation.z = side * 0.14
    root.add(arm)
    mesh(new THREE.CapsuleGeometry(0.062, 0.48, 6, 16), skin, [0, -0.3, 0], arm)
    if (longSleeve) mesh(new THREE.CapsuleGeometry(sleeveR, 0.44, 6, 16), sleeveMat, [0, -0.28, 0], arm)
    else mesh(new THREE.CapsuleGeometry(0.08, 0.1, 6, 16), topMat, [0, -0.09, 0], arm)
    mesh(new THREE.SphereGeometry(0.075, 16, 16), has('gloves') ? mat('#c0392b', { roughness: 1 }) : skin, [0, -0.62, 0], arm)
    arms.push(arm)
  }

  // 목·머리
  mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), skin, [0, 1.68, 0])
  mesh(new THREE.SphereGeometry(0.22, 32, 32), skin, [0, 1.9, 0])
  const hair = mesh(new THREE.SphereGeometry(0.232, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#3a2a20'), [0, 1.9, -0.01])
  hair.rotation.x = -0.35
  mesh(new THREE.SphereGeometry(0.2, 24, 16), mat('#3a2a20'), [0, 1.86, -0.06]).scale.set(1.08, 1, 0.9)

  if (has('sunglasses')) {
    const g = mat('#151515', { roughness: 0.15, metalness: 0.5 })
    mesh(new THREE.BoxGeometry(0.1, 0.055, 0.02), g, [-0.075, 1.92, 0.205])
    mesh(new THREE.BoxGeometry(0.1, 0.055, 0.02), g, [0.075, 1.92, 0.205])
    mesh(new THREE.BoxGeometry(0.06, 0.012, 0.01), g, [0, 1.93, 0.215])
  } else {
    for (const x of [-0.075, 0.075]) mesh(new THREE.SphereGeometry(0.024, 12, 12), mat('#2a1d15'), [x, 1.92, 0.2])
  }
  for (const x of [-0.12, 0.12]) mesh(new THREE.SphereGeometry(0.035, 12, 12), mat('#f4a3a3', { transparent: true, opacity: 0.7 }), [x, 1.85, 0.18]).scale.z = 0.3
  const mouth = mesh(new THREE.TorusGeometry(0.04, 0.009, 8, 16, Math.PI), mat('#b5654d'), [0, 1.83, 0.205])
  mouth.rotation.z = Math.PI

  if (has('cap')) {
    const c = mat('#f08a24')
    mesh(new THREE.SphereGeometry(0.235, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), c, [0, 1.93, 0])
    mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.015, 24, 1, false, 0, Math.PI), c, [0, 1.96, 0.16]).rotation.y = -Math.PI / 2
  } else if (outfit.outer === 'padding') {
    mesh(new THREE.SphereGeometry(0.238, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#7a8bb5', { roughness: 1 }), [0, 1.94, 0])
  }

  if (has('scarf')) {
    const s = mat('#d64545', { roughness: 1 })
    const ring = mesh(new THREE.TorusGeometry(0.12, 0.05, 12, 32), s, [0, 1.64, 0.01])
    ring.rotation.x = Math.PI / 2
    mesh(new THREE.BoxGeometry(0.09, 0.3, 0.035), s, [0.07, 1.47, 0.2]).rotation.z = 0.08
  }

  if (has('umbrella')) {
    // 오른손으로 든 우산
    arms[1].rotation.z = 0.32
    arms[1].rotation.x = -0.25
    const u = new THREE.Group()
    u.position.set(0.47, 1.0, 0.15)
    u.rotation.z = -0.12 // 머리 쪽으로 살짝 기울임
    root.add(u)
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 8), mat('#555', { metalness: 0.6 }), [0, 0.65, 0], u)
    const canopy = mesh(new THREE.ConeGeometry(0.78, 0.32, 16, 1, true), mat('#e25563', { side: THREE.DoubleSide, roughness: 0.5 }), [0, 1.3, 0], u)
    canopy.castShadow = true
    mesh(new THREE.SphereGeometry(0.025, 8, 8), mat('#555'), [0, 1.47, 0], u)
  }

  return root
}

const SKY = { clear: 0xbfe3ff, cloudy: 0xcfdbe6, overcast: 0xb9c2cc, rain: 0x8796a8, snow: 0xe6edf4, storm: 0x5d6676 }

function buildParticles(cond) {
  if (cond === 'rain' || cond === 'storm') {
    const n = 500, pos = new Float32Array(n * 6)
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 6, y = Math.random() * 4, z = (Math.random() - 0.5) * 6
      pos.set([x, y, z, x - 0.02, y - 0.18, z], i * 6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const obj = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: 0.6 }))
    obj.userData = { speed: 6, size: 6, stride: 6 }
    return obj
  }
  if (cond === 'snow') {
    const n = 400, pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const obj = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 }))
    obj.userData = { speed: 0.6, size: 6, stride: 3 }
    return obj
  }
  return null
}

function Scene3D({ outfit, weather }) {
  const box = useRef(null)

  useEffect(() => {
    const el = box.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const cond = weather?.condition ?? 'clear'
    const night = weather && !weather.isDay
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(SKY[cond]).multiplyScalar(night ? 0.35 : 1)
    scene.fog = new THREE.Fog(scene.background, 6, 12)

    const umbrella = outfit.accessories.includes('umbrella')
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50)
    camera.position.set(1.7, umbrella ? 2.0 : 1.7, umbrella ? 4.8 : 4.1)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, night ? 0.8 : 1.2))
    const sun = new THREE.DirectionalLight(0xffffff, night ? 0.9 : 2)
    sun.position.set(2.5, 5, 3)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 })
    scene.add(sun)

    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48),
      new THREE.MeshStandardMaterial({ color: cond === 'snow' ? 0xffffff : 0xdfe6ee, roughness: 1 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    scene.add(buildCharacter(outfit))
    const particles = buildParticles(cond)
    if (particles) scene.add(particles)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, umbrella ? 1.3 : 1.05, 0)
    controls.enablePan = false
    controls.enableDamping = true
    controls.minDistance = 2
    controls.maxDistance = 6.5
    controls.maxPolarAngle = Math.PI * 0.55
    controls.autoRotate = !reduce
    controls.autoRotateSpeed = 2.2
    const stopAuto = () => { controls.autoRotate = false }
    controls.addEventListener('start', stopAuto)

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const clock = new THREE.Clock()
    let raf
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05)
      if (particles && !reduce) {
        const a = particles.geometry.attributes.position
        const { speed, stride } = particles.userData
        for (let i = 0; i < a.array.length; i += stride) {
          for (let j = 1; j < stride; j += 3) a.array[i + j] -= speed * dt
          if (a.array[i + 1] < 0) for (let j = 1; j < stride; j += 3) a.array[i + j] += 4
        }
        a.needsUpdate = true
      }
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.removeEventListener('start', stopAuto)
      controls.dispose()
      scene.traverse((obj) => {
        obj.geometry?.dispose()
        if (obj.material) [].concat(obj.material).forEach((m) => m.dispose())
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [outfit, weather])

  return <div ref={box} className="o3d-canvas" />
}

export default function Outfit3DViewer({ outfit, weather, onClose }) {
  const closeBtn = useRef(null)

  useEffect(() => {
    closeBtn.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const items = [
    outfit.outer && { label: OUTER_STYLE[outfit.outer].label, color: OUTER_STYLE[outfit.outer].color },
    { label: TOP_LABEL[outfit.top], color: outfit.color },
    { label: BOTTOM_LABEL[outfit.bottom], color: outfit.bottom === 'shorts' ? SHORTS_COLOR : PANTS_COLOR },
  ].filter(Boolean)

  return (
    <div className="o3d-overlay" onClick={onClose}>
      <div className="o3d-modal" role="dialog" aria-modal="true" aria-label="3D 복장 미리보기" onClick={(e) => e.stopPropagation()}>
        <div className="o3d-head">
          <h2>3D 복장 미리보기</h2>
          <button ref={closeBtn} className="o3d-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="o3d-body">
          <Scene3D outfit={outfit} weather={weather} />
          <aside className="o3d-side">
            <p className="o3d-summary">{outfit.summary}</p>
            <ul className="o3d-items">
              {items.map((it) => <li key={it.label}><span style={{ background: it.color }} />{it.label}</li>)}
              {outfit.accessories.map((a) => <li key={a}>{ACCESSORY_LABEL[a]}</li>)}
            </ul>
            <p className="o3d-hint">🖱 드래그로 회전 · 휠/핀치로 확대</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
