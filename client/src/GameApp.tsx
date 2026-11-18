import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, firebaseReady, googleProvider } from './gameFirebase'
import CityScene, { type CityHud } from './CityScene'

type SaveGame = {
  credits: number
  missionsCompleted: number
  distanceKm: number
}

const SAVE_KEY = 'solara-save-v1'
const DEFAULT_SAVE: SaveGame = { credits: 1250, missionsCompleted: 0, distanceKm: 0 }
const mapPercent = (coordinate: number) => `${Math.max(4, Math.min(96, 50 + coordinate / 12))}%`
const OBJECTIVES = [
  { name: 'Marina at first light', detail: 'Find the boardwalk above the water', x: 0, z: -92 },
  { name: 'Neon district', detail: 'Walk east through the glass towers', x: 100, z: -100 },
  { name: 'Overlook rendezvous', detail: 'Meet your contact at the skyline steps', x: 0, z: -200 },
  { name: 'Old Port return', detail: 'Find the west boulevard signal', x: -100, z: -100 },
]
const MAP_LOCATIONS: { name: string; district: string; x: number; z: number; kind: string; labelSide: 'left' | 'right'; labelOffsetY?: number }[] = [
  { name: 'Bayfront Pier', district: 'BAYFRONT', x: 0, z: -92, kind: 'LANDMARK', labelSide: 'left', labelOffsetY: -10 },
  { name: 'Neon Row', district: 'NEON ROW', x: 220, z: -180, kind: 'DISTRICT', labelSide: 'right' },
  { name: 'Skyline Steps', district: 'BAYFRONT', x: 0, z: -200, kind: 'LANDMARK', labelSide: 'left' },
  { name: 'Old Port Exchange', district: 'OLD PORT', x: -220, z: -80, kind: 'DISTRICT', labelSide: 'right' },
  { name: 'Marina Promenade', district: 'MARINA DISTRICT', x: 0, z: -340, kind: 'DISTRICT', labelSide: 'right' },
  { name: 'Glass District', district: 'GLASS DISTRICT', x: 270, z: 0, kind: 'DISTRICT', labelSide: 'left' },
  { name: 'Sunset Heights', district: 'SUNSET HEIGHTS', x: 0, z: 270, kind: 'DISTRICT', labelSide: 'right' },
  { name: 'Mercado Arcade', district: 'BAYFRONT', x: -95, z: 90, kind: 'LANDMARK', labelSide: 'right' },
  { name: 'Tideline Hotel', district: 'BAYFRONT', x: 48, z: -68, kind: 'LANDMARK', labelSide: 'right', labelOffsetY: 10 },
]
const MAP_STREETS = [
  { name: 'OCEANLINE DRIVE', x: 330, z: 20, vertical: true },
  { name: 'HARBORLINE AVE', x: -130, z: 205, vertical: true },
  { name: 'PALMETTO WAY', x: 72, z: -135, vertical: true },
  { name: 'SOLARA BOULEVARD', x: -105, z: 40, vertical: false },
  { name: 'MARINA PROMENADE', x: 190, z: -265, vertical: false },
]
const MAP_DISTRICTS = [
  { name: 'MARINA DISTRICT', x: 130, z: -350 },
  { name: 'NEON ROW', x: 255, z: -145 },
  { name: 'OLD PORT', x: -300, z: -150 },
  { name: 'BAYFRONT', x: -20, z: 55 },
  { name: 'GLASS DISTRICT', x: 245, z: 130 },
  { name: 'SUNSET HEIGHTS', x: -60, z: 340 },
]

const supportsLandscapePlay = () => typeof window === 'undefined' || (window.innerWidth >= 620 && window.innerWidth > window.innerHeight)

function readLocalSave(): SaveGame {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as Partial<SaveGame> | null
    if (value && Number.isFinite(value.credits) && Number.isFinite(value.missionsCompleted)) {
      return { ...DEFAULT_SAVE, ...value }
    }
  } catch { /* Start a fresh local save if storage is unavailable. */ }
  return DEFAULT_SAVE
}

function CityPanorama() {
  const skyline = Array.from({ length: 44 }, (_, i) => {
    const x = i * 47 - 30
    const height = 70 + ((i * 41 + 83) % 180)
    const width = 28 + ((i * 17) % 22)
    return { x, y: 520 - height, height, width, tone: i % 4 }
  })
  return (
    <svg className="panorama-art" viewBox="0 0 1920 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x2="0" y2="1"><stop stopColor="#081525"/><stop offset=".46" stopColor="#163957"/><stop offset=".76" stopColor="#da6d53"/><stop offset="1" stopColor="#f5b56c"/></linearGradient>
        <linearGradient id="water" x2="0" y2="1"><stop stopColor="#267f8c"/><stop offset="1" stopColor="#102e40"/></linearGradient>
        <radialGradient id="sun"><stop stopColor="#ffd28b" stopOpacity=".9"/><stop offset="1" stopColor="#ff9b62" stopOpacity="0"/></radialGradient>
        <linearGradient id="glass" x2="0" y2="1"><stop stopColor="#254562"/><stop offset="1" stopColor="#101f30"/></linearGradient>
      </defs>
      <rect width="1920" height="760" fill="url(#sky)"/>
      <circle cx="1370" cy="332" r="190" fill="url(#sun)"/><circle cx="1370" cy="332" r="67" fill="#ffcf91" opacity=".74"/>
      <path d="M0 472 Q360 402 690 460 T1320 435 T1920 470 V760 H0Z" fill="url(#water)" opacity=".8"/>
      <path d="M0 514 Q330 474 700 510 T1400 494 T1920 518" fill="none" stroke="#f5be87" strokeOpacity=".33" strokeWidth="3"/>
      {skyline.map((b, i) => <g key={i}>
        <rect x={b.x} y={b.y} width={b.width} height={b.height} rx="2" fill={['#15283b', '#112235', '#1a3044', '#183047'][b.tone]} stroke="#9ac1d2" strokeOpacity=".12"/>
        {i % 5 === 1 && <path d={`M${b.x + 8} ${b.y} v-20 h${b.width - 16} v20`} fill="#142b40" stroke="#7cb8c4" strokeOpacity=".18"/>}
        {Array.from({ length: Math.floor(b.height / 24) }, (_, j) => <path key={j} d={`M${b.x + 7} ${b.y + 13 + j * 24} h${b.width - 14}`} stroke={j % 3 === 0 ? '#ffc47f' : '#8dd9df'} strokeOpacity={j % 3 === 0 ? '.42' : '.2'} strokeWidth="2"/>)}
      </g>)}
      <path d="M0 528 Q220 486 430 523 T840 520 T1260 525 T1680 512 T1920 528 V760 H0Z" fill="#081925" opacity=".8"/>
      <path d="M0 570 Q420 550 780 573 T1490 558 T1920 578" fill="none" stroke="#f0ad73" strokeOpacity=".2" strokeWidth="2"/>
      <path d="M0 680 Q430 625 930 665 T1920 641" fill="none" stroke="#72d4d0" strokeOpacity=".11" strokeWidth="22"/>
    </svg>
  )
}

function DrivingScene({ active, onMission, onSpeed }: { active: boolean; onMission: (distance: number) => void; onSpeed: (speed: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const missionRef = useRef(0)
  const onMissionRef = useRef(onMission)
  const onSpeedRef = useRef(onSpeed)
  onMissionRef.current = onMission
  onSpeedRef.current = onSpeed

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const ctx = context
    const keys = new Set<string>()
    const car = { x: 0, y: 0, angle: 0, speed: 0 }
    let width = 1, height = 1, dpr = 1, frame = 0, raf = 0, last = performance.now()
    let totalDistance = 0, speedTicker = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width; height = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    }
    resize()
    const onDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' '].includes(key)) event.preventDefault()
      keys.add(key)
    }
    const onUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase())
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('resize', resize)

    const draw = (time: number) => {
      const dt = Math.min((time - last) / 1000, .04); last = time; frame += dt
      const gas = keys.has('w') || keys.has('arrowup')
      const reverse = keys.has('s') || keys.has('arrowdown')
      const left = keys.has('a') || keys.has('arrowleft')
      const right = keys.has('d') || keys.has('arrowright')
      const handbrake = keys.has(' ')
      if (gas) car.speed = Math.min(car.speed + 330 * dt, 520)
      else if (reverse) car.speed = Math.max(car.speed - 230 * dt, -160)
      else car.speed *= Math.max(0, 1 - (handbrake ? 4.5 : 1.05) * dt)
      if (handbrake && (left || right)) car.speed *= Math.max(0, 1 - 1.7 * dt)
      const steer = (left ? -1 : 0) + (right ? 1 : 0)
      car.angle += steer * Math.min(Math.abs(car.speed) / 260, 1) * 2.1 * dt * (car.speed < 0 ? -1 : 1)
      const oldX = car.x, oldY = car.y
      const nextX = car.x + Math.cos(car.angle) * car.speed * dt
      const nextY = car.y + Math.sin(car.angle) * car.speed * dt
      const offStreet = Math.abs(nextX - Math.round(nextX / 620) * 620) > 68
        && Math.abs(nextY - Math.round(nextY / 620) * 620) > 68
      if (offStreet) car.speed = 0
      else { car.x = nextX; car.y = nextY }
      totalDistance += Math.hypot(car.x - oldX, car.y - oldY)
      const mission = OBJECTIVES[missionRef.current % OBJECTIVES.length]
      if (Math.hypot(car.x - mission.x, car.y - mission.z) < 78) {
        missionRef.current += 1
        onMissionRef.current(totalDistance)
        totalDistance = 0
      }
      speedTicker += dt
      if (speedTicker > .12) { onSpeedRef.current(Math.round(Math.abs(car.speed) * .28)); speedTicker = 0 }

      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const sx = width / 1460, sy = height / 900, unit = Math.min(sx, sy)
      ctx.save(); ctx.scale(unit, unit)
      const viewW = width / unit, viewH = height / unit
      const camX = car.x - viewW / 2, camY = car.y - viewH / 2
      ctx.translate(-camX, -camY)
      ctx.fillStyle = '#172523'; ctx.fillRect(camX, camY, viewW, viewH)
      const firstX = Math.floor(camX / 620) - 1, lastX = Math.ceil((camX + viewW) / 620) + 1
      const firstY = Math.floor(camY / 620) - 1, lastY = Math.ceil((camY + viewH) / 620) + 1
      for (let gx = firstX; gx <= lastX; gx++) {
        const x = gx * 620
        ctx.fillStyle = '#273237'; ctx.fillRect(x - 66, camY - 50, 132, viewH + 100)
        ctx.fillStyle = '#394449'; ctx.fillRect(x - 75, camY - 50, 9, viewH + 100); ctx.fillRect(x + 66, camY - 50, 9, viewH + 100)
        ctx.setLineDash([18, 23]); ctx.strokeStyle = '#d7bd78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, camY - 40); ctx.lineTo(x, camY + viewH + 40); ctx.stroke(); ctx.setLineDash([])
      }
      for (let gy = firstY; gy <= lastY; gy++) {
        const y = gy * 620
        ctx.fillStyle = '#273237'; ctx.fillRect(camX - 50, y - 66, viewW + 100, 132)
        ctx.fillStyle = '#394449'; ctx.fillRect(camX - 50, y - 75, viewW + 100, 9); ctx.fillRect(camX - 50, y + 66, viewW + 100, 9)
        ctx.setLineDash([18, 23]); ctx.strokeStyle = '#e5dfc7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(camX - 40, y); ctx.lineTo(camX + viewW + 40, y); ctx.stroke(); ctx.setLineDash([])
      }
      for (let gx = firstX; gx <= lastX; gx++) for (let gy = firstY; gy <= lastY; gy++) {
        const bx = gx * 620 + 110, by = gy * 620 + 110
        const seed = Math.abs((gx * 73856093) ^ (gy * 19349663))
        ctx.fillStyle = seed % 7 === 0 ? '#1c3730' : '#30393a'
        ctx.fillRect(bx, by, 400, 400)
        if (seed % 7 === 0) {
          for (let i = 0; i < 12; i++) {
            const tx = bx + 38 + ((i * 79 + seed) % 325), ty = by + 35 + ((i * 53 + seed) % 320)
            ctx.fillStyle = '#315344'; ctx.beginPath(); ctx.arc(tx, ty, 13, 0, Math.PI * 2); ctx.fill()
            ctx.fillStyle = '#456e55'; ctx.beginPath(); ctx.arc(tx - 3, ty - 4, 8, 0, Math.PI * 2); ctx.fill()
          }
        } else {
          const inset = 22 + (seed % 24), bw = 134 + ((seed >> 3) % 76), bh = 142 + ((seed >> 6) % 74)
          const bx2 = bx + inset + ((seed >> 9) % 84), by2 = by + inset + ((seed >> 14) % 80)
          ctx.fillStyle = '#121b20'; ctx.fillRect(bx2 + 14, by2 + 17, bw, bh)
          ctx.fillStyle = ['#425158', '#34454f', '#514b4a', '#38444c'][seed % 4]; ctx.fillRect(bx2, by2, bw, bh)
          ctx.fillStyle = '#637078'; ctx.fillRect(bx2 + 8, by2 + 8, bw - 16, bh - 16)
          ctx.fillStyle = '#343f47'; ctx.fillRect(bx2 + 17, by2 + 18, bw - 34, bh - 36)
          for (let wx = bx2 + 25; wx < bx2 + bw - 18; wx += 19) for (let wy = by2 + 25; wy < by2 + bh - 18; wy += 21) {
            ctx.fillStyle = (Math.floor(wx + wy + seed) % 4 === 0) ? '#f5bd77' : '#65b7ba'; ctx.globalAlpha = .66; ctx.fillRect(wx, wy, 5, 7); ctx.globalAlpha = 1
          }
          if (seed % 3 === 0) { ctx.fillStyle = '#ca6e57'; ctx.fillRect(bx2 + 21, by2 + 21, 28, 5) }
        }
      }
      const pulse = 20 + Math.sin(frame * 3) * 5
      ctx.strokeStyle = '#ffd47e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mission.x, mission.z, pulse + 17, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = '#ffd47e'; ctx.globalAlpha = .17; ctx.beginPath(); ctx.arc(mission.x, mission.z, pulse + 10, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
      ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle)
      ctx.fillStyle = '#0b1114'; ctx.fillRect(-20, -14, 12, 6); ctx.fillRect(8, -14, 12, 6); ctx.fillRect(-20, 8, 12, 6); ctx.fillRect(8, 8, 12, 6)
      ctx.fillStyle = '#e3f2ed'; ctx.beginPath(); ctx.roundRect(-23, -11, 48, 22, 8); ctx.fill()
      ctx.fillStyle = '#33c6bd'; ctx.beginPath(); ctx.roundRect(-7, -8, 20, 16, 5); ctx.fill()
      ctx.fillStyle = '#fff1c8'; ctx.fillRect(20, -7, 4, 5); ctx.fillRect(20, 3, 4, 5)
      ctx.fillStyle = '#e37463'; ctx.fillRect(-23, -7, 3, 5); ctx.fillRect(-23, 3, 3, 5)
      ctx.restore()
      ctx.restore(); ctx.restore()
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('resize', resize) }
  }, [active])

  return <canvas className="driving-canvas" ref={canvasRef} aria-label="Playable top down city driving prototype" />
}

function CityMapOverlay({ playerX, playerZ, objective, time, onClose }: { playerX: number; playerZ: number; objective: typeof OBJECTIVES[number]; time: string; onClose: () => void }) {
  const [selected, setSelected] = useState(MAP_LOCATIONS[0])
  const modalRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    modalRef.current?.focus({ preventScroll: true })
    return () => previousFocus.current?.focus({ preventScroll: true })
  }, [])
  return <div className="city-map-overlay" onClick={onClose}>
    <section ref={modalRef} className="city-map-modal" role="dialog" aria-modal="true" aria-labelledby="city-map-title" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') onClose() }} tabIndex={-1}>
      <header className="city-map-header">
        <div><span>ATLAS · SOLARA BAY</span><h2 id="city-map-title">CITY MAP</h2></div>
        <span className="map-time">{time} · LIVE POSITION</span>
        <button className="map-close" onClick={onClose} aria-label="Close city map">×</button>
      </header>
      <div className="city-map-layout">
        <div className="city-map-board" aria-label="Solara Bay street map">
          <svg className="city-map-roads" viewBox="0 0 1200 1200" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="atlas-water" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#286b78"/><stop offset="1" stopColor="#0a3645"/></linearGradient>
              <linearGradient id="atlas-ground" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#28403e"/><stop offset="1" stopColor="#172b2c"/></linearGradient>
              <pattern id="atlas-grain" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#d5d1af" strokeOpacity=".035"/></pattern>
            </defs>
            <rect width="1200" height="1200" fill="url(#atlas-ground)" />
            <path d="M936 0 C902 96 944 166 920 244 C892 335 946 413 922 502 C896 596 941 694 914 787 C895 855 927 930 890 1012 C866 1068 882 1131 850 1200 L1200 1200 L1200 0Z" fill="url(#atlas-water)" />
            <path d="M939 0 C905 96 947 166 923 244 C895 335 949 413 925 502 C899 596 944 694 917 787 C898 855 930 930 893 1012 C869 1068 885 1131 853 1200" fill="none" stroke="#91c8c0" strokeWidth="4" strokeOpacity=".65" />
            <path d="M968 90 C1040 168 1022 266 1090 340 M941 520 C1024 563 1057 661 1138 706 M923 824 C1014 869 1030 960 1111 1024" fill="none" stroke="#9ad6cd" strokeOpacity=".38" strokeWidth="2" />
            <path d="M38 1072 C182 1006 251 938 325 835 C399 731 412 637 496 562 C595 474 695 493 793 428 C855 387 884 314 932 254" fill="none" stroke="#c9c9ae" strokeWidth="42" strokeLinecap="round" />
            <path d="M38 1072 C182 1006 251 938 325 835 C399 731 412 637 496 562 C595 474 695 493 793 428 C855 387 884 314 932 254" fill="none" stroke="#26373a" strokeWidth="24" strokeLinecap="round" />
            <path d="M139 58 C205 169 195 274 266 357 C341 444 426 454 493 555 C557 653 550 768 619 844 C692 925 781 949 857 1117" fill="none" stroke="#c9c9ae" strokeWidth="33" strokeLinecap="round" />
            <path d="M139 58 C205 169 195 274 266 357 C341 444 426 454 493 555 C557 653 550 768 619 844 C692 925 781 949 857 1117" fill="none" stroke="#26373a" strokeWidth="17" strokeLinecap="round" />
            <path d="M65 382 C185 400 302 391 411 427 C507 459 568 400 661 346 C744 297 800 265 904 260 M210 820 C316 797 376 747 481 731 C601 711 722 750 892 709 M304 155 C391 206 464 211 553 194 C671 171 753 157 873 95" fill="none" stroke="#c9c9ae" strokeWidth="24" strokeLinecap="round" />
            <path d="M65 382 C185 400 302 391 411 427 C507 459 568 400 661 346 C744 297 800 265 904 260 M210 820 C316 797 376 747 481 731 C601 711 722 750 892 709 M304 155 C391 206 464 211 553 194 C671 171 753 157 873 95" fill="none" stroke="#26373a" strokeWidth="12" strokeLinecap="round" />
            <g fill="#38534d" stroke="#83a398" strokeOpacity=".28" strokeWidth="3">
              <path d="M94 458 L205 441 L259 488 L209 571 L99 555Z"/><path d="M285 467 L398 451 L458 507 L419 591 L304 605 L263 543Z"/><path d="M536 522 L670 490 L735 548 L691 641 L565 658 L512 592Z"/>
              <path d="M154 638 L281 595 L353 655 L304 750 L173 768 L118 709Z"/><path d="M360 664 L476 622 L548 683 L520 784 L393 805 L325 745Z"/><path d="M605 771 L733 755 L796 817 L751 910 L630 925 L569 855Z"/>
              <path d="M700 240 L820 174 L883 235 L851 326 L742 337 L679 291Z"/><path d="M431 259 L549 231 L611 279 L572 361 L463 371 L402 316Z"/>
            </g>
            <path d="M57 960 C160 916 232 854 305 756 M436 563 C516 529 587 492 661 444 M652 166 C738 145 798 126 868 92" fill="none" stroke="#7c9388" strokeWidth="9" strokeLinecap="round" strokeDasharray="2 16" opacity=".75" />
            <rect width="1200" height="1200" fill="url(#atlas-grain)" />
          </svg>
          <span className="map-water-label">SOLARA BAY</span>
          {MAP_DISTRICTS.map((district) => <span key={district.name} className="map-district-label" style={{ left: mapPercent(district.x), top: mapPercent(district.z) }}>{district.name}</span>)}
          {MAP_STREETS.map((street) => <span key={street.name} className={`map-street-label${street.vertical ? ' vertical' : ''}`} style={{ left: mapPercent(street.x), top: mapPercent(street.z) }}>{street.name}</span>)}
          {MAP_LOCATIONS.map((location) => <div key={location.name} className="map-location-wrap" style={{ left: mapPercent(location.x), top: mapPercent(location.z), '--label-offset-y': `${location.labelOffsetY ?? 0}px` } as CSSProperties}>
            <button className={`map-location-pin${selected.name === location.name ? ' selected' : ''}`} onClick={() => setSelected(location)} aria-label={`${location.name}, ${location.district}`}><i /></button>
            <span className={`map-location-label ${location.labelSide}`}>{location.name}</span>
          </div>)}
          <div className="map-objective-pin" style={{ left: mapPercent(objective.x), top: mapPercent(objective.z) }} title={`Current objective: ${objective.name}`}><i /><span>OBJECTIVE</span></div>
          <div className="map-player-pin" style={{ left: mapPercent(playerX), top: mapPercent(playerZ) }} title="Your position"><i /><span>YOU</span></div>
          <span className="map-compass">N <b>↑</b></span>
        </div>
        <aside className="city-map-details">
          <div className="map-detail-kicker">SELECTED LOCATION</div>
          <h3>{selected.name}</h3>
          <p>{selected.district}</p>
          <span className="map-kind">{selected.kind}</span>
          <div className="map-detail-rule" />
          <div className="map-detail-kicker">CURRENT OBJECTIVE</div>
          <b className="map-objective-name">{objective.name}</b>
          <p>{objective.detail}</p>
          <div className="map-legend"><span><i className="legend-player" /> YOU</span><span><i className="legend-objective" /> OBJECTIVE</span><span><i className="legend-location" /> LOCATION</span></div>
        </aside>
      </div>
      <footer className="city-map-footer"><span>CLICK A PIN TO INSPECT THE DISTRICT</span><span>ESC / × CLOSE MAP</span></footer>
    </section>
  </div>
}

export default function GameApp() {
  const [user, setUser] = useState<User | null>(null)
  const [save, setSave] = useState<SaveGame>(readLocalSave)
  const [playing, setPlaying] = useState(true)
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [worldReady, setWorldReady] = useState(false)
  const [desktop, setDesktop] = useState(supportsLandscapePlay)
  const [syncState, setSyncState] = useState('Local save')
  const [notice, setNotice] = useState('')
  const [missionToast, setMissionToast] = useState(false)
  const [cityHud, setCityHud] = useState<CityHud>({ district: 'BAYFRONT', x: 0, z: 4, speed: 0, mode: 'ON FOOT', action: '', time: '08:15 AM' })
  const [mapOpen, setMapOpen] = useState(false)
  const missionCountRef = useRef(0)
  const gameStartedAt = useRef(performance.now())

  useEffect(() => {
    const resize = () => setDesktop(supportsLandscapePlay())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    if (!worldReady) return
    const wait = Math.max(0, 1400 - (performance.now() - gameStartedAt.current))
    const timer = window.setTimeout(() => setLoading(false), wait)
    return () => window.clearTimeout(timer)
  }, [worldReady])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || loading || mapOpen) return
      if (document.pointerLockElement) {
        document.exitPointerLock()
        return
      }
      setPaused((value) => !value)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [loading, mapOpen])

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (!nextUser || !db) return
      setSyncState('Loading cloud save')
      try {
        const snapshot = await getDoc(doc(db, 'game_saves', nextUser.uid))
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<SaveGame>
          const remote = { ...DEFAULT_SAVE, ...data }
          setSave((local) => ({
            credits: Math.max(local.credits, remote.credits || 0),
            missionsCompleted: Math.max(local.missionsCompleted, remote.missionsCompleted || 0),
            distanceKm: Math.max(local.distanceKm, remote.distanceKm || 0),
          }))
        }
        setSyncState('Cloud save connected')
      } catch {
        setSyncState('Cloud save rules need setup')
      }
    })
  }, [])

  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) }, [save])

  const persistSave = useCallback(async (nextSave: SaveGame) => {
    setSave(nextSave)
    if (user && db) {
      setSyncState('Saving to cloud')
      try {
        await setDoc(doc(db, 'game_saves', user.uid), { ...nextSave, updatedAt: serverTimestamp(), game: 'solara' }, { merge: true })
        setSyncState('Cloud save connected')
      } catch {
        setSyncState('Cloud save failed · local save kept')
      }
    }
  }, [user])

  const completeMission = useCallback((distance: number) => {
    missionCountRef.current += 1
    setMissionToast(true)
    window.setTimeout(() => setMissionToast(false), 2800)
    void persistSave({
      credits: save.credits + 500,
      missionsCompleted: Math.max(save.missionsCompleted, missionCountRef.current),
      distanceKm: Number((save.distanceKm + distance / 1000).toFixed(1)),
    })
  }, [persistSave, save])

  const updateCityHud = useCallback((value: CityHud) => setCityHud(value), [])

  const connectAccount = async () => {
    if (!auth || !firebaseReady) { setNotice('Add the existing Firebase web config to enable account sync.'); return }
    try { await signInWithPopup(auth, googleProvider); setNotice('Account connected. Your game save will sync to the existing Firebase database.') }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not connect your account.') }
  }

  if (playing) {
    const objective = OBJECTIVES[missionCountRef.current % OBJECTIVES.length]
    const playerMapX = mapPercent(cityHud.x)
    const playerMapY = mapPercent(cityHud.z)
    const objectiveMapX = mapPercent(objective.x)
    const objectiveMapY = mapPercent(objective.z)
    return <main className="play-screen">
      <section className="game-frame">
        <CityScene active paused={paused || mapOpen || loading} objectives={OBJECTIVES} onMission={completeMission} onHud={updateCityHud} onError={(message) => { setNotice(message); setWorldReady(true) }} onReady={() => setWorldReady(true)} />
        <header className="play-topline">
          <button className="back-button" onClick={() => setPaused(true)} aria-label="Open pause menu">Ⅱ <span>PAUSE</span></button>
          <div className="play-wordmark"><i>◈</i> SOLARA <span>FIELD TEST 03</span></div>
          <div className="live-indicator"><i /> {cityHud.mode} · {cityHud.district} · {cityHud.time}</div>
        </header>
        {cityHud.action && <div className="action-prompt" role="status">{cityHud.action}</div>}
        {notice && <div className="scene-error" role="status">{notice}</div>}
        {missionToast && <div className="mission-toast"><b>OBJECTIVE COMPLETE</b><span>+$500 added to your account</span></div>}
        <div className="play-right-hud"><span className="hud-label">{cityHud.district}</span><button className="mini-map-open" onClick={() => setMapOpen(true)} aria-label="Open Solara Bay city map" title="Open city map"><div className="mini-map"><div className="map-grid"/><i className="map-dest" style={{ left: objectiveMapX, top: objectiveMapY }}/><i className="map-you" style={{ left: playerMapX, top: playerMapY }}/></div><span>OPEN MAP</span></button></div>
        <div className="drive-bottom">{cityHud.mode === 'DRIVING' && <div className="speed-readout"><b>{cityHud.speed.toString().padStart(2, '0')}</b><span>KM/H</span></div>}<div className="credits-readout"><small>AVAILABLE FUNDS</small><b>${save.credits.toLocaleString()}</b></div></div>
        {mapOpen && <CityMapOverlay playerX={cityHud.x} playerZ={cityHud.z} objective={objective} time={cityHud.time} onClose={() => setMapOpen(false)} />}
        {loading && <div className="game-loading" role="status" aria-live="polite"><div className="loading-mark">◈</div><span>SOLARA BAY · FIELD TEST 03</span><strong>BUILDING THE CITY</strong><div className="loading-track"><i /></div><small>{worldReady ? 'FINALIZING WORLD' : 'INITIALIZING WORLD SYSTEMS'}</small></div>}
        {paused && !loading && !mapOpen && <div className="pause-overlay"><section className="pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title"><span className="pause-kicker">SOLARA BAY · FIELD TEST 03</span><h2 id="pause-title">PAUSED</h2><button className="pause-primary" onClick={() => setPaused(false)}>RESUME</button><button onClick={() => { setPaused(false); setMapOpen(true) }}>CITY MAP</button><button onClick={() => user ? void signOut(auth!) : void connectAccount()}>{user ? 'DISCONNECT CLOUD SAVE' : 'CONNECT CLOUD SAVE'}</button><small>{syncState.toUpperCase()}</small></section></div>}
        {!desktop && <div className="orientation-gate"><span>SOLARA BAY</span><strong>ROTATE TO<br/>LANDSCAPE</strong><small>THE CITY OPENS ON A WIDE SCREEN</small></div>}
      </section>
    </main>
  }

  return <main className="launcher-shell">
    <div className="ambient-grid" />
    <header className="main-nav">
      <a className="brand-lockup" href="#top"><span className="brand-glyph">◈</span><span>SOLARA<small>STUDIOS</small></span></a>
      <nav aria-label="Main navigation"><a href="#world">THE WORLD</a><a href="#experience">EXPERIENCE</a><a href="#specs">PC SPECS</a></nav>
      <div className="nav-actions"><span className="platform-tag">PC EXCLUSIVE</span><button className="account-button" onClick={user ? () => void signOut(auth!) : () => void connectAccount()}>{user ? <><i className="account-dot" />{user.displayName?.split(' ')[0] || 'ACCOUNT'}</> : 'CONNECT ACCOUNT'}</button></div>
    </header>

    {notice && <div className="notice-banner" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}

    <section className="world-hero" id="top">
      <CityPanorama />
      <div className="hero-grain" />
      <div className="hero-copy">
        <div className="eyebrow-line"><span>AN ORIGINAL OPEN-WORLD CRIME SAGA</span><i /></div>
        <p className="series-kicker">SOLARA BAY · 03</p>
        <h1>THE CITY<br/><em>NEVER</em> SLEEPS.</h1>
          <p className="hero-deck">A living coastline. Distinct streets, local characters and a city that opens up when you get close. Find the story waiting before sunrise.</p>
        <div className="hero-actions"><button className="launch-button" onClick={() => { missionCountRef.current = 0; setPlaying(true) }}><span>ENTER THE CITY</span><b>↗</b></button><span className="build-note">FIELD TEST 03 <i>·</i> WINDOWS PC</span></div>
        <div className="hero-meta"><span><b>01</b><small>PLAYABLE DISTRICT</small></span><span><b>05:42</b><small>BEFORE SUNRISE</small></span><span><b>120 GB+</b><small>PLANNED FULL-GAME INSTALL</small></span></div>
      </div>
      <div className="hero-side-label">SOLARA BAY <i>—</i> ATLANTIC COAST</div>
      <div className="hero-bottom-line"><span>FIRST LIGHT IS COMING</span><div><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span>FIELD RECORDING · 05:42 AM</span></div>
      <div className="hero-vignette" />
    </section>

    <section className="experience-strip" id="world">
      <div className="section-label"><span>01 / THE CITY</span><i /></div>
      <div className="city-copy"><div><h2>EVERY STREET<br/>HAS A <em>STORY.</em></h2><p>Solara Bay is a coastal sprawl of art deco hotels, glass towers, balcony apartments, neon storefronts and old port warehouses. The expanded field test adds walking crowds, drivable cars and enterable interiors.</p></div><div className="district-list"><div><span>01</span><b>MARINA DISTRICT</b><small>Salt air · boardwalk lights · hotel lobby</small><i>↗</i></div><div><span>02</span><b>NEON ROW</b><small>Glass towers · nightlife · arcade interior</small><i>↗</i></div><div><span>03</span><b>OLD PORT</b><small>Warehouse lanes · garage · hidden routes</small><i>↗</i></div></div></div>
    </section>

    <section className="specs-strip" id="specs">
      <div className="section-label"><span>02 / THE VISION</span><i /></div>
      <div className="specs-heading"><h2>BUILT FOR THE<br/><em>HIGH END.</em></h2><div className="prototype-label"><i/> LONG-TERM PC TARGET <small>EARLY CONCEPT · NOT FINAL REQUIREMENTS</small></div></div>
      <div className="spec-cards"><article><span>GRAPHICS GOAL</span><b>RTX CLASS</b><p>High-end PC lighting, detailed architecture, lifelike characters, traffic and a fully explorable city.</p><small>PC build target · high fidelity</small></article><article><span>INSTALL SIZE GOAL</span><b>120 GB+</b><p>A full-scale world needs authored high-resolution models, audio, animation and extensive world content.</p><small>Target · full game content</small></article><article><span>FIELD TEST 03</span><b>OPEN CITY</b><p>Meet pedestrians, take a parked car, enter city interiors and explore the original Solara Bay map.</p><small>PC field test · keyboard and mouse</small></article></div>
    </section>

    <footer className="game-footer" id="experience"><span className="footer-mark">◈ SOLARA</span><span>PC GAME PROJECT · STEAM + EPIC GAMES STORE TARGET</span><div><b>{save.missionsCompleted.toString().padStart(2, '0')}</b> MISSIONS <i/> <b>${save.credits.toLocaleString()}</b> CREDITS <i/> {syncState.toUpperCase()}</div></footer>
    {!desktop && <div className="desktop-gate"><div className="gate-icon">▰</div><span>LANDSCAPE PC FIELD TEST</span><h2>THE CITY NEEDS<br/>MORE ROOM.</h2><p>Rotate to landscape and open the field test on a wider screen to walk Solara Bay.</p><small>PLANNED FULL-GAME TARGET · RTX-CLASS GPU · 120 GB+</small></div>}
  </main>
}
