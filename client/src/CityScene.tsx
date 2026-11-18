import { useEffect, useRef } from 'react'
import { applyJapanIntegration } from "./japanIntegration";
import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

export type CityObjective = { name: string; detail: string; x: number; z: number }
export type CityHud = { district: string; x: number; z: number; speed: number; mode: 'ON FOOT' | 'DRIVING' | 'INSIDE'; action: string; time: string }

type CitySceneProps = {
  active: boolean
  objectives: CityObjective[]
  paused: boolean
  onMission: (distance: number) => void
  onHud: (value: CityHud) => void
  onError: (message: string) => void
  onReady: () => void
}

type BuildingBlocker = { minX: number; maxX: number; minZ: number; maxZ: number }
type EntryDoorPose = { x: number; z: number; normalX: number; normalZ: number; rotationY: number }
type Traffic = { object: any; axis: 'x' | 'z'; fixed: number; progress: number; speed: number; limit: number }
type BuildingPortal = { name: string; x: number; z: number; interior: number }
type Pedestrian = { object: any; limbs: any[]; axis: 'x' | 'z'; fixed: number; start: number; end: number; progress: number; speed: number; direction: 1 | -1; phase: number }
type DriveableCar = { object: any; x: number; z: number; yaw: number; speed: number; occupied: boolean }
type InteriorCell = { x: number; y: number; z: number; label: string; person: any; limbs: any[]; light: any }
type StreetLamp = { x: number; z: number; light: any; bulbMaterial: any }
type InteractionTarget = { kind: 'vehicle' | 'building' | 'person'; distance: number; value: any }
type BuildingSurfaceMaps = { brickMap?: any; brickNormal?: any; brickRoughness?: any }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
function rayBoxDistance(originX: number, originZ: number, directionX: number, directionZ: number, box: BuildingBlocker, maxDistance: number, inset = 0) {
  let near = 0
  let far = maxDistance
  for (const [origin, direction, min, max] of [
    [originX, directionX, box.minX + inset, box.maxX - inset],
    [originZ, directionZ, box.minZ + inset, box.maxZ - inset],
  ]) {
    if (Math.abs(direction) < 1e-6) {
      if (origin < min || origin > max) return null
      continue
    }
    let entry = (min - origin) / direction
    let exit = (max - origin) / direction
    if (entry > exit) [entry, exit] = [exit, entry]
    near = Math.max(near, entry)
    far = Math.min(far, exit)
    if (near > far) return null
  }
  return near <= maxDistance ? near : null
}
const seeded = (x: number, z: number, n = 0) => {
  const value = Math.sin(x * 127.1 + z * 311.7 + n * 74.7) * 43758.5453
  return value - Math.floor(value)
}

// Reuse procedural source textures instead of uploading a new canvas for every
// building/sign. This removes hundreds of redundant texture allocations at load.
const facadeTextureCache = new Map<string, any>()
const signTextureCache = new Map<string, any>()

function facadeTexture(seed: number, tint: string, lit: string) {
  const key = `${seed}|${tint}|${lit}`
  const cached = facadeTextureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const colors = ['#182a38', '#172d38', '#26333b', '#242c38', '#1b3440']
  const glass = ['#74aeb5', '#8cb9bd', '#b0c8c3', '#476b79', '#a7a095']
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, 512, 512)
  const wallGradient = ctx.createLinearGradient(0, 0, 512, 512)
  wallGradient.addColorStop(0, '#ffffff13')
  wallGradient.addColorStop(.48, '#00000006')
  wallGradient.addColorStop(1, '#00000038')
  ctx.fillStyle = wallGradient
  ctx.fillRect(0, 0, 512, 512)
  if (seed % 5 === 1) {
    // Tall punched windows, stone pilasters and bronze floor bands for Deco hotels.
    for (let x = 0; x < 512; x += 86) {
      ctx.fillStyle = '#e2bd8158'; ctx.fillRect(x, 0, 7, 512)
      ctx.fillStyle = '#fff0c222'; ctx.fillRect(x + 8, 0, 2, 512)
    }
    for (let y = 18; y < 500; y += 94) {
      ctx.fillStyle = '#2d2521'; ctx.fillRect(0, y, 512, 3)
      for (let x = 24; x < 500; x += 86) {
        const chance = seeded(x, y, seed)
        ctx.fillStyle = '#211d1b'; ctx.fillRect(x - 2, y + 7, 46, 78)
        ctx.fillStyle = chance > .48 ? (chance > .8 ? lit : '#557b7b') : '#1b2931'
        ctx.fillRect(x + 3, y + 12, 36, 68)
        ctx.fillStyle = '#f2d5a84a'; ctx.fillRect(x + 6, y + 12, 3, 66)
        ctx.fillStyle = '#c1985e'; ctx.fillRect(x - 3, y + 83, 48, 4)
      }
    }
  } else if (seed % 5 === 3) {
    // Dark brick courses, clerestory glazing and tall loading-bay windows.
    for (let row = 0; row < 24; row++) {
      const y = row * 22
      ctx.strokeStyle = '#241e1d66'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
      for (let x = row % 2 ? -24 : 0; x < 512; x += 56) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 22); ctx.stroke()
      }
    }
    for (let y = 20; y < 490; y += 126) for (let x = 26; x < 500; x += 118) {
      const chance = seeded(x, y, seed)
      ctx.fillStyle = '#221a18'; ctx.fillRect(x, y, 67, 96)
      ctx.fillStyle = chance > .48 ? '#9ab4b2' : '#1b282e'; ctx.fillRect(x + 6, y + 7, 55, 82)
      ctx.fillStyle = '#c1a17f'; ctx.fillRect(x - 4, y - 4, 75, 7); ctx.fillRect(x - 3, y + 91, 73, 8)
    }
  } else if (seed % 5 === 4) {
    // Wider display panes and colored canvas awnings for a walkable arcade strip.
    for (let y = 15; y < 500; y += 88) for (let x = 12; x < 500; x += 102) {
      const chance = seeded(x, y, seed)
      ctx.fillStyle = '#101820'; ctx.fillRect(x, y, 78, 58)
      ctx.fillStyle = chance > .42 ? (chance > .8 ? lit : '#72aeb3') : '#1a2933'
      ctx.fillRect(x + 5, y + 5, 68, 48)
      ctx.fillStyle = '#ffffff36'; ctx.fillRect(x + 9, y + 8, 4, 41)
      ctx.fillStyle = '#d5a26c'; ctx.fillRect(x - 5, y + 61, 88, 11)
      for (let stripe = 0; stripe < 8; stripe++) {
        ctx.fillStyle = stripe % 2 ? '#f0d1a6' : '#bd6252'
        ctx.fillRect(x - 5 + stripe * 11, y + 72, 11, 16)
      }
    }
    ctx.fillStyle = '#e9d2a642'
    for (let x = 0; x < 512; x += 102) ctx.fillRect(x, 0, 3, 512)
  } else {
    for (let y = 14; y < 508; y += 62) {
      ctx.fillStyle = '#dbe0d520'
      ctx.fillRect(0, y, 512, 3)
      ctx.fillStyle = '#101c27'
      ctx.fillRect(8, y + 8, 496, 46)
      for (let x = 15; x < 500; x += 54) {
        const chance = seeded(x, y, seed)
        const isLit = chance > .46
        ctx.fillStyle = '#090f16'
        ctx.fillRect(x - 2, y + 5, 39, 50)
        ctx.fillStyle = isLit ? (chance > .77 ? lit : glass[Math.floor(chance * 4) % glass.length]) : colors[Math.floor(chance * 5) % colors.length]
        ctx.fillRect(x, y + 8, 35, 43)
        ctx.fillStyle = '#ffffff25'
        ctx.fillRect(x + 3, y + 10, 3, 38)
        ctx.fillStyle = '#d9e5dd32'
        ctx.fillRect(x, y + 48, 35, 3)
        ctx.fillStyle = '#0b1118'
        ctx.fillRect(x + 16, y + 8, 2, 43)
      }
    }
  }
  ctx.fillStyle = '#263742b0'
  for (let x = 0; x < 512; x += 108) ctx.fillRect(x, 0, 5, 512)
  ctx.fillStyle = '#f5ddab24'
  for (let y = 20; y < 500; y += 124) ctx.fillRect(0, y, 512, 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 8)
  texture.anisotropy = 8
  facadeTextureCache.set(key, texture)
  return texture
}

function signTexture(label: string, color: string) {
  const key = `${label}|${color}`
  const cached = signTextureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#07121bd9'
  ctx.fillRect(4, 4, 504, 120)
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.strokeRect(5, 5, 502, 118)
  ctx.font = '900 54px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.fillStyle = color
  ctx.fillText(label, 256, 65, 475)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  signTextureCache.set(key, texture)
  return texture
}

function addTree(scene: any, x: number, z: number, scale: number) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22 * scale, .34 * scale, 3.1 * scale, 8), new THREE.MeshStandardMaterial({ color: '#77563e', roughness: .9 }))
  trunk.position.set(x, 1.55 * scale, z)
  trunk.castShadow = true
  scene.add(trunk)
  const greens = ['#28675f', '#347466', '#5a876f']
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry((1.55 - i * .18) * scale, 1), new THREE.MeshStandardMaterial({ color: greens[i], roughness: .88 }))
    crown.position.set(x + (i - 1) * .65 * scale, (3.4 + i * .5) * scale, z + (i % 2 ? .4 : -.25) * scale)
    crown.castShadow = true
    crown.receiveShadow = true
    scene.add(crown)
  }
}

function addStreetLamp(scene: any, x: number, z: number, warm = false): StreetLamp {
  const steel = new THREE.MeshStandardMaterial({ color: '#46535b', metalness: .72, roughness: .3 })
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .2, 8, 10), steel)
  pole.position.set(x, 4, z)
  pole.castShadow = true
  scene.add(pole)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.9, .16, .16), steel)
  arm.position.set(x + 1, 7.7, z)
  scene.add(arm)
  const glowColor = warm ? '#ffc785' : '#92e5d8'
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: '#4b5353', emissive: glowColor, emissiveIntensity: 0, roughness: .38, metalness: .28 })
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 8), bulbMaterial)
  bulb.position.set(x + 1.84, 7.55, z)
  scene.add(bulb)
  const light = new THREE.PointLight(glowColor, 12, 27, 2)
  light.position.copy(bulb.position)
  light.visible = false
  scene.add(light)
  return { x, z, light, bulbMaterial }
}

function addBox(scene: any, width: number, height: number, depth: number, material: any, x: number, y: number, z: number, castShadow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = castShadow
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

function addBuilding(scene: any, blockers: BuildingBlocker[], sideDoorPoses: EntryDoorPose[], x: number, z: number, width: number, depth: number, floors: number, palette: number, label: string, surfaceMaps: BuildingSurfaceMaps = {}): BuildingPortal[] {
  const height = floors * 3.4
  const archetypes = [
    { name: 'TIDELINE GLASS TOWER', wall: '#304956', lit: '#ffd8a0', roof: '#1a2d3c', trim: '#89cbd0' },
    { name: 'PALMETTO ART DECO', wall: '#b38e67', lit: '#ffe0ae', roof: '#4c3d35', trim: '#e7bd78' },
    { name: 'VELA RESIDENCES', wall: '#6c7774', lit: '#c4e0dd', roof: '#384648', trim: '#d4c9ac' },
    { name: 'OLD PORT WORKS', wall: '#765545', lit: '#ffc581', roof: '#382d2b', trim: '#bd8c68' },
    { name: 'MERCADO ARCADE', wall: '#8b755c', lit: '#ffc1a0', roof: '#433b34', trim: '#62d6c4' },
  ]
  const style = archetypes[palette % archetypes.length]
  const facade = facadeTexture(palette, style.wall, style.lit)
  const usesBrickMasonry = palette % 5 === 3 && surfaceMaps.brickMap
  const side = new THREE.MeshStandardMaterial({
    map: usesBrickMasonry ? surfaceMaps.brickMap : facade,
    emissiveMap: usesBrickMasonry ? undefined : facade,
    emissive: usesBrickMasonry ? '#17100d' : '#413323',
    emissiveIntensity: usesBrickMasonry ? .018 : .08,
    normalMap: usesBrickMasonry ? surfaceMaps.brickNormal : undefined,
    normalScale: usesBrickMasonry ? new THREE.Vector2(.42, .42) : undefined,
    roughnessMap: usesBrickMasonry ? surfaceMaps.brickRoughness : undefined,
    roughness: usesBrickMasonry ? .9 : .68,
    metalness: palette % 5 === 0 ? .16 : .035,
    envMapIntensity: .18,
  })
  const roof = new THREE.MeshStandardMaterial({ color: style.roof, roughness: .83, metalness: .1 })
  const trim = new THREE.MeshStandardMaterial({ color: style.trim, roughness: .56, metalness: .24 })
  const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [side, side, roof, roof, side, side])
  building.position.set(x, height / 2, z)
  building.name = `${label} · ${style.name}`
  building.castShadow = true
  building.receiveShadow = true
  scene.add(building)
  blockers.push({ minX: x - width / 2 - 1.4, maxX: x + width / 2 + 1.4, minZ: z - depth / 2 - 1.4, maxZ: z + depth / 2 + 1.4 })

  const roofBase = new THREE.Mesh(new THREE.BoxGeometry(width + 1.2, .8, depth + 1.2), new THREE.MeshStandardMaterial({ color: '#202a30', roughness: .72, metalness: .22 }))
  roofBase.position.set(x, height + .25, z)
  roofBase.castShadow = true
  scene.add(roofBase)
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(width + 1.7, .24, depth + 1.7), trim)
  ledge.position.set(x, Math.min(height - 1.2, 4.2), z)
  scene.add(ledge)

  const glass = new THREE.MeshPhysicalMaterial({ color: style.trim, metalness: .12, roughness: .34, clearcoat: .22, clearcoatRoughness: .24, transparent: true, opacity: .72, envMapIntensity: .24 })
  const concrete = new THREE.MeshStandardMaterial({ color: style.wall, roughness: .82 })
  if (palette % 5 === 0) {
    // Curtain wall tower with a stepped crown and bright metal mullions.
    for (const edgeX of [-1, 1]) for (const edgeZ of [-1, 1]) {
      addBox(scene, .46, height + 1.6, .46, trim, x + edgeX * (width / 2 - .7), height / 2, z + edgeZ * (depth / 2 - .7))
    }
    const crown = addBox(scene, width * .58, 5.5, depth * .58, glass, x, height + 3.15, z)
    crown.name = `${label} crown`
    addBox(scene, width * .7, .42, depth * .7, trim, x, height + 5.9, z)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 9, 8), trim)
    mast.position.set(x, height + 10.3, z)
    mast.castShadow = true
    scene.add(mast)
  } else if (palette % 5 === 1) {
    // Art Deco setbacks give the hotel its stepped skyline silhouette.
    addBox(scene, width * .78, height * .2, depth * .78, concrete, x, height - height * .1, z)
    addBox(scene, width * .52, height * .13, depth * .52, trim, x, height + height * .055, z)
    addBox(scene, width * .26, height * .1, depth * .26, concrete, x, height + height * .17, z)
    for (let floor = 1; floor < floors; floor += 3) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(width + .55, .32, depth + .55), trim)
      band.position.set(x, floor * 3.4, z)
      band.castShadow = true
      scene.add(band)
    }
  } else if (palette % 5 === 2) {
    // Deep balconies and planter ledges make the apartment block read as occupied.
    for (let floor = 1; floor < Math.min(floors, 8); floor++) {
      const y = floor * 3.4 + .4
      for (let sideIndex = 0; sideIndex < 3; sideIndex++) {
        const bx = x - width * .32 + sideIndex * width * .32
        addBox(scene, width * .25, .22, 1.45, concrete, bx, y, z - depth / 2 - .55)
        addBox(scene, width * .25, .12, .1, trim, bx, y + .58, z - depth / 2 - 1.2)
        for (const railX of [-.42, 0, .42]) addBox(scene, .06, .55, .07, trim, bx + railX * width * .25, y + .32, z - depth / 2 - 1.2)
      }
    }
  } else if (palette % 5 === 3) {
    // Warehouse roof monitors, loading bays and service piping.
    const monitorCount = Math.max(2, Math.floor(width / 15))
    for (let i = 0; i < monitorCount; i++) {
      const mx = x - width * .38 + i * (width * .76 / (monitorCount - 1))
      addBox(scene, 2.8, 2.2, depth * .72, concrete, mx, height + 1.35, z)
      const skylight = addBox(scene, 2.25, .18, depth * .66, glass, mx, height + 2.5, z, false)
      skylight.rotation.z = i % 2 ? -.18 : .18
    }
    for (let bay = 0; bay < 3; bay++) {
      const bx = x - width * .3 + bay * width * .3
      addBox(scene, width * .19, 2.7, .18, glass, bx, 1.8, z - depth / 2 - .12, false)
      addBox(scene, width * .2, .2, .28, trim, bx, 3.25, z - depth / 2 - .18)
    }
  } else {
    // Market arcade with deep striped awnings and a bright sign band.
    const awning = new THREE.MeshStandardMaterial({ color: palette % 2 ? '#e58e68' : '#e9cf9c', roughness: .72 })
    for (let shop = 0; shop < 4; shop++) {
      const sx = x - width * .38 + shop * width * .25
      addBox(scene, width * .22, 2.6, .18, glass, sx, 2.1, z - depth / 2 - .14, false)
      const canopy = addBox(scene, width * .24, .2, 2.15, awning, sx, 3.65, z - depth / 2 - 1, false)
      canopy.rotation.x = -.06
      addBox(scene, .16, 2.8, .28, trim, sx - width * .12, 2.1, z - depth / 2 - .08)
    }
    const signMap = signTexture(label, '#ffce90')
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * .84, 30), 4.2), new THREE.MeshBasicMaterial({ map: signMap, transparent: true, side: THREE.FrontSide, toneMapped: false }))
    sign.position.set(x, Math.min(height - 2, 5.6), z - depth / 2 - 1.23)
    sign.rotation.y = Math.PI
    scene.add(sign)
  }

  // Roof machinery, water tanks and service ladders break up the flat roofline.
  const unitMaterial = new THREE.MeshStandardMaterial({ color: '#77827c', metalness: .46, roughness: .48 })
  const acCount = Math.max(1, Math.floor(width / 18))
  for (let i = 0; i < acCount; i++) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 3), unitMaterial)
    ac.position.set(x - width * .3 + i * 7.5, height + 1.25, z + depth * .22)
    ac.castShadow = true
    scene.add(ac)
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 3.2, 14), new THREE.MeshStandardMaterial({ color: '#9aa49e', metalness: .56, roughness: .3 }))
  tank.position.set(x + width * .28, height + 2, z - depth * .2)
  tank.castShadow = true
  scene.add(tank)

  // Every frontage has a modeled glass door and a lit canopy to mark its entrance.
  const doorFrame = new THREE.MeshStandardMaterial({ color: '#18242b', metalness: .18, roughness: .58 })
  const frameMetal = new THREE.MeshStandardMaterial({ color: '#263238', metalness: .36, roughness: .46 })
  const storefrontGlass = new THREE.MeshPhysicalMaterial({ color: '#acd1d0', metalness: .08, roughness: .32, clearcoat: .16, clearcoatRoughness: .22, envMapIntensity: .2 })
  const marketAwning = new THREE.MeshStandardMaterial({ color: palette % 2 ? '#dc8060' : '#e7cf9c', roughness: .68 })
  const addStreetFrontage = (axis: 'x' | 'z', direction: -1 | 1) => {
    const span = axis === 'z' ? width : depth
    const surface = axis === 'z' ? z + direction * depth / 2 : x + direction * width / 2
    const bays = Math.max(2, Math.floor(span / 13))
    const bayWidth = span * .76 / bays
    const placeBox = (along: number, w: number, h: number, d: number, material: any, y: number, offset: number, castShadow = false) => {
      if (axis === 'z') return addBox(scene, w, h, d, material, x + along, y, surface + direction * offset, castShadow)
      return addBox(scene, d, h, w, material, surface + direction * offset, y, z + along, castShadow)
    }

    // Human scale glazing, stone piers, tenant signs and awnings on every
    // street-facing side make the blocks read as businesses, not solid props.
    for (let bay = 0; bay < bays; bay++) {
      const along = -span * .38 + bayWidth * (bay + .5)
      if (axis === 'z' && direction < 0 && Math.abs(along) < bayWidth * .68) continue
      const paneWidth = bayWidth - .55
      placeBox(along, paneWidth, 2.5, .12, frameMetal, 1.78, .1)
      placeBox(along, paneWidth - .28, 2.22, .06, storefrontGlass, 1.78, .19)
      placeBox(along, .09, 2.24, .1, trim, 1.78, .26)
      placeBox(along, paneWidth, .12, .12, trim, .48, .26)
      placeBox(along, paneWidth, .12, .12, trim, 3.05, .26)
      const marketFrontAlreadyHasAwnings = palette % 5 === 4 && axis === 'z' && direction < 0
      if (bay % 2 === 0 && palette % 5 !== 3 && !marketFrontAlreadyHasAwnings) {
        const canopyMaterial = palette % 5 === 4 ? marketAwning : (bay % 3 ? trim : doorFrame)
        const canopy = placeBox(along, paneWidth + .5, .2, 1.5, canopyMaterial, 3.45, .96)
        if (axis === 'z') canopy.rotation.x = -.055 * direction
        else canopy.rotation.z = .055 * direction
        for (const side of [-1, 1]) placeBox(along + side * (paneWidth / 2 - .16), .08, .64, .08, frameMetal, 3.12, 1.48)
      }
    }

    for (const edge of [-1, 1]) {
      const along = edge * span * .44
      placeBox(along, .55, 4.65, .62, concrete, 2.32, .12)
      placeBox(along, .72, .22, .78, trim, 4.62, .08)
    }

    const tenantMap = signTexture(label, style.trim)
    const tenantSign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(span * .58, 24), 1.25), new THREE.MeshBasicMaterial({ map: tenantMap, transparent: true, side: THREE.FrontSide, toneMapped: false }))
    tenantSign.position.set(axis === 'z' ? x : surface + direction * .09, 4.4, axis === 'z' ? surface + direction * .09 : z)
    tenantSign.rotation.y = axis === 'x' ? direction * Math.PI / 2 : direction < 0 ? Math.PI : 0
    scene.add(tenantSign)
  }
  for (const direction of [-1, 1] as const) {
    addStreetFrontage('z', direction)
    addStreetFrontage('x', direction)
  }
  if (palette % 5 === 1) {
    // Deco fins continue around the block, giving the hotel a recognizable
    // vertical rhythm when it is seen along either street.
    for (const side of [-1, 1]) for (const row of [-1, 1]) {
      addBox(scene, .44, height * .82, .5, trim, x + side * (width / 2 + .18), height * .43, z + row * depth * .34, false)
    }
  }
  if (palette % 5 === 2) {
    // Wrap the residential balconies around the exposed side elevations too.
    for (const side of [-1, 1]) for (let floor = 1; floor < Math.min(floors, 8); floor++) {
      const y = floor * 3.4 + .4
      for (let bay = 0; bay < 3; bay++) {
        const balconyZ = z - depth * .32 + bay * depth * .32
        addBox(scene, 1.45, .22, depth * .25, concrete, x + side * (width / 2 + .66), y, balconyZ, false)
        addBox(scene, .08, .58, depth * .25, trim, x + side * (width / 2 + 1.24), y + .32, balconyZ, false)
        for (const end of [-1, 1]) addBox(scene, 1.45, .56, .08, trim, x + side * (width / 2 + .66), y + .32, balconyZ + end * (depth * .125), false)
      }
    }
  }
  addBox(scene, 2.7, 4, .42, trim, x, 2.05, z - depth / 2 - .3)
  addBox(scene, 1.85, 3.1, .24, new THREE.MeshPhysicalMaterial({ color: '#7ab5b8', metalness: .32, roughness: .12, transparent: true, opacity: .68, clearcoat: 1 }), x, 1.65, z - depth / 2 - .58, false)
  addBox(scene, 2.2, .18, .38, doorFrame, x, 3.48, z - depth / 2 - .72)
  for (const side of [-1, 1]) addBox(scene, .14, 3.5, .16, doorFrame, x + side * 1.08, 1.86, z - depth / 2 - .76)
  // Give every block a clear, usable entrance on each street-facing side.
  const sideDoor = (axis: 'x' | 'z', direction: -1 | 1) => {
    const surface = axis === 'x' ? x + direction * width / 2 : z + direction * depth / 2
    const span = axis === 'z' ? width : depth
    for (const along of [-span * .3, 0, span * .3]) {
      // The front center already has a bespoke door, so avoid overlapping its frame.
      if (axis === 'z' && direction < 0 && Math.abs(along) < 1) continue
      sideDoorPoses.push({
        x: axis === 'x' ? surface : x + along,
        z: axis === 'z' ? surface : z + along,
        normalX: axis === 'x' ? direction : 0,
        normalZ: axis === 'z' ? direction : 0,
        rotationY: axis === 'x' ? Math.PI / 2 : 0,
      })
    }
  }
  sideDoor('z', 1)
  sideDoor('x', -1)
  sideDoor('x', 1)

  const portals: BuildingPortal[] = []
  for (const along of [-width * .3, 0, width * .3]) for (const direction of [-1, 1] as const) {
    portals.push({ name: label, x: x + along, z: z + direction * (depth / 2 + 4.2), interior: palette % 5 })
  }
  for (const along of [-depth * .3, 0, depth * .3]) for (const direction of [-1, 1] as const) {
    portals.push({ name: label, x: x + direction * (width / 2 + 4.2), z: z + along, interior: palette % 5 })
  }
  return portals
}

function makePerson(variant = 0, player = false) {
  const root = new THREE.Group()
  const outfits = [
    { jacket: '#48534d', shirt: '#b7ad99', pants: '#34393d', skin: '#8c604a', hair: '#211e1c', shoe: '#303238' },
    { jacket: '#76554a', shirt: '#c7bba6', pants: '#363638', skin: '#704a3b', hair: '#191819', shoe: '#38332f' },
    { jacket: '#536574', shirt: '#b9c0b5', pants: '#4c4b47', skin: '#b27e5d', hair: '#49392e', shoe: '#d2cabb' },
    { jacket: '#84714f', shirt: '#42494a', pants: '#353b37', skin: '#bd9475', hair: '#302820', shoe: '#2c302f' },
    { jacket: '#625568', shirt: '#cbb4a2', pants: '#3d4146', skin: '#805442', hair: '#211f20', shoe: '#a9a296' },
  ]
  const look = player ? outfits[0] : outfits[variant % outfits.length]
  const jacket = new THREE.MeshStandardMaterial({ color: look.jacket, roughness: .84, metalness: 0 })
  const shirt = new THREE.MeshStandardMaterial({ color: look.shirt, roughness: .92 })
  const pants = new THREE.MeshStandardMaterial({ color: look.pants, roughness: .91 })
  const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: .78 })
  const shoe = new THREE.MeshStandardMaterial({ color: look.shoe, roughness: .78 })
  const dark = new THREE.MeshStandardMaterial({ color: look.hair, roughness: .88 })
  const seam = new THREE.MeshStandardMaterial({ color: '#d9c9a3', roughness: .68, metalness: .22 })

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.33, .7, 12, 24), jacket)
  torso.position.y = 1.34
  torso.castShadow = true
  root.add(torso)
  const shirtPanel = new THREE.Mesh(new THREE.BoxGeometry(.13, .37, .025), shirt)
  shirtPanel.position.set(0, 1.69, -.322)
  root.add(shirtPanel)
  const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 32, 24), skin)
  head.position.y = 2.055
  head.castShadow = true
  root.add(head)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.166, 32, 20, 0, Math.PI * 2, 0, Math.PI * .48), dark)
  hair.position.set(0, 2.09, .016)
  root.add(hair)
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#1b1a19', roughness: .5 })
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.021, 12, 8), eyeMaterial)
    eye.position.set(side * .055, 2.06, -.147)
    root.add(eye)
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.037, 14, 10), skin)
    ear.position.set(side * .151, 2.045, 0)
    root.add(ear)
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.027, 16, 12), skin)
  nose.scale.set(.72, .74, 1)
  nose.position.set(0, 2.015, -.16)
  root.add(nose)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.17, .035, 10, 24), seam)
  collar.position.set(0, 1.76, 0)
  collar.rotation.x = Math.PI / 2
  root.add(collar)

  const belt = new THREE.Mesh(new THREE.BoxGeometry(.53, .07, .35), seam)
  belt.position.set(0, .94, 0)
  root.add(belt)
  if (player) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(.072, .82, .045), seam)
    strap.position.set(.18, 1.35, -.329)
    strap.rotation.z = -.34
    root.add(strap)
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(.17, .19, .045), jacket)
    pocket.position.set(-.19, 1.14, -.333)
    root.add(pocket)
  } else if (variant % 3 === 1) {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(.45, .5, .07), seam)
    apron.position.set(0, 1.12, -.33)
    root.add(apron)
  } else if (variant % 3 === 2) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(.44, .57, .22), dark)
    bag.position.set(0, 1.25, .34)
    root.add(bag)
  }

  const armPivots: any[] = []
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(side * .42, 1.68, 0)
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.112, .55, 10, 18), jacket)
    arm.position.y = -.34
    arm.castShadow = true
    pivot.add(arm)
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.119, .119, .1, 16), seam)
    cuff.position.y = -.63
    pivot.add(cuff)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), skin)
    hand.position.y = -.71
    pivot.add(hand)
    root.add(pivot)
    armPivots.push(pivot)

    const leg = new THREE.Group()
    leg.position.set(side * .21, .86, 0)
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .61, 10, 18), pants)
    thigh.position.y = -.32
    thigh.castShadow = true
    leg.add(thigh)
    const shoeUpper = new THREE.Mesh(new THREE.SphereGeometry(.15, 20, 14), shoe)
    shoeUpper.scale.set(.92, .56, 1.34)
    shoeUpper.position.set(0, -.675, -.105)
    leg.add(shoeUpper)
    const sole = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), dark)
    sole.scale.set(.94, .18, 1.35)
    sole.position.set(0, -.755, -.105)
    leg.add(sole)
    root.add(leg)
    armPivots.push(leg)
  }
  root.userData.limbs = armPivots
  root.scale.setScalar(player ? .88 : .84)
  return root
}

function makeTrafficCar(color: string, variant = 0) {
  const group = new THREE.Group()
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: .32, roughness: .38, clearcoat: .32, clearcoatRoughness: .24 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#14232d', metalness: .12, roughness: .28, clearcoat: .18, clearcoatRoughness: .2 })
  const carType = variant % 3
  const profiles = [
    [[-2.72,.28],[2.65,.28],[2.78,.78],[2.44,1.42],[1.48,1.56],[.94,2.17],[-.96,2.17],[-1.62,1.55],[-2.55,1.38]],
    [[-2.9,.3],[2.78,.3],[2.96,.92],[2.62,1.54],[1.62,1.68],[1.12,2.34],[-1.05,2.34],[-1.76,1.67],[-2.74,1.58]],
    [[-2.76,.24],[2.82,.24],[2.86,.62],[2.42,.98],[1.18,1.12],[.64,1.68],[-.72,1.68],[-1.46,1.15],[-2.58,1.02]],
  ]
  const silhouette = profiles[carType]
  const carWidth = carType === 1 ? 2.48 : carType === 2 ? 2.16 : 2.35
  const cabinBase = carType === 2 ? 1.08 : carType === 1 ? 1.67 : 1.62
  const cabinTop = carType === 2 ? 1.58 : carType === 1 ? 2.24 : 2.08
  const roofHeight = carType === 2 ? 1.7 : carType === 1 ? 2.34 : 2.17
  const profile = new THREE.Shape()
  profile.moveTo(silhouette[0][0], silhouette[0][1])
  for (const [px, py] of silhouette.slice(1)) profile.lineTo(px, py)
  profile.closePath()
  const bodyGeometry = new THREE.ExtrudeGeometry(profile, { depth: carWidth, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .1, bevelThickness: .1 })
  bodyGeometry.translate(0, 0, -carWidth / 2)
  const body = new THREE.Mesh(bodyGeometry, paint)
  body.castShadow = true
  group.add(body)
  const sideWindows = new THREE.Shape()
  sideWindows.moveTo(-1.49, cabinBase)
  sideWindows.lineTo(-1.02, cabinTop)
  sideWindows.lineTo(-.58, cabinTop)
  sideWindows.lineTo(-.58, cabinBase)
  sideWindows.closePath()
  const rearSideWindow = new THREE.Mesh(new THREE.ShapeGeometry(sideWindows), glass)
  const frontWindowShape = new THREE.Shape()
  frontWindowShape.moveTo(-.45, cabinBase)
  frontWindowShape.lineTo(-.39, cabinTop)
  frontWindowShape.lineTo(carType === 2 ? .6 : carType === 1 ? .95 : .87, cabinTop)
  frontWindowShape.lineTo(carType === 2 ? 1.02 : carType === 1 ? 1.4 : 1.31, cabinBase)
  frontWindowShape.closePath()
  const frontSideWindow = new THREE.Mesh(new THREE.ShapeGeometry(frontWindowShape), glass)
  for (const side of [-1, 1]) {
    const rearWindow = rearSideWindow.clone()
    rearWindow.position.z = side * (carWidth / 2 + .006)
    rearWindow.material = glass
    group.add(rearWindow)
    const frontWindow = frontSideWindow.clone()
    frontWindow.position.z = side * (carWidth / 2 + .006)
    frontWindow.material = glass
    group.add(frontWindow)
  }
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(.12, cabinTop - cabinBase, carWidth * .82), glass)
  windshield.position.set(.73, (cabinTop + cabinBase) / 2, 0)
  windshield.rotation.z = -.36
  group.add(windshield)
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(.12, cabinTop - cabinBase - .04, carWidth * .8), glass)
  rearGlass.position.set(-1.35, (cabinTop + cabinBase) / 2, 0)
  rearGlass.rotation.z = .52
  group.add(rearGlass)
  const chrome = new THREE.MeshStandardMaterial({ color: '#b5b9ad', metalness: .9, roughness: .2 })
  const grill = new THREE.Mesh(new THREE.BoxGeometry(.08, .42, 1.18), chrome)
  grill.position.set(2.86, carType === 2 ? .73 : .91, 0)
  group.add(grill)
  const lightFront = new THREE.MeshBasicMaterial({ color: '#ffe9b8', toneMapped: false })
  const lightRear = new THREE.MeshBasicMaterial({ color: '#ff534b', toneMapped: false })
  for (const side of [-1, 1]) {
    const headlamp = new THREE.Mesh(new THREE.BoxGeometry(.1, .27, .52), lightFront)
    headlamp.position.set(2.86, carType === 2 ? 1.0 : 1.34, side * .82)
    group.add(headlamp)
    const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(.1, .35, .36), lightRear)
    tailLamp.position.set(-2.83, carType === 2 ? .9 : 1.19, side * .86)
    group.add(tailLamp)
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(.38, .14, .16), paint)
    mirror.position.set(.32, roofHeight - .16, side * (carWidth / 2 - .02))
    group.add(mirror)
    for (const doorX of [-.95, .18]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(.3, .06, .05), chrome)
      handle.position.set(doorX, carType === 2 ? 1.2 : carType === 1 ? 1.79 : 1.7, side * (carWidth / 2 + .03))
      group.add(handle)
    }
  }
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#101417', roughness: .94 })
  const rimMat = new THREE.MeshStandardMaterial({ color: '#9ba7aa', metalness: .9, roughness: .24 })
  const wheels: any[] = []
  const wheelRadius = carType === 1 ? .52 : carType === 2 ? .4 : .46
  const wheelOffset = carType === 2 ? 1.78 : 1.7
  for (const x of [-wheelOffset, wheelOffset]) for (const z of [-carWidth / 2 - .05, carWidth / 2 + .05]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, .22, 20), wheelMat)
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(x, wheelRadius + .06, z)
    group.add(wheel)
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * .57, wheelRadius * .57, .24, 20), rimMat)
    rim.rotation.x = Math.PI / 2
    rim.position.set(x, wheelRadius + .06, z)
    group.add(rim)
    wheels.push(wheel, rim)
  }
  group.userData.modelName = ['SOLARA SEDAN', 'TIDELINE SUV', 'VELA SPORT'][carType]
  group.userData.wheels = wheels
  return group
}

function addInterior(scene: any, slot: number): InteriorCell {
  // Keep interiors below the city and inside the camera's 1,000 m draw range.
  const x = -80 + slot * 38
  const y = -48
  const z = 0
  const roomNames = ['TIDELINE HOTEL LOBBY', 'MERCADO CAFÉ', 'OLD PORT GARAGE', 'PALMA RECORDS', 'NEON ARCADE']
  // The camera is placed inside each room: render the inside faces of its shell.
  const plaster = new THREE.MeshStandardMaterial({ color: ['#b8aa92', '#d1b68d', '#65645b', '#907960', '#2e3946'][slot], roughness: .88, side: THREE.DoubleSide })
  const darkWood = new THREE.MeshStandardMaterial({ color: '#3d302a', roughness: .64, side: THREE.DoubleSide })
  const brass = new THREE.MeshStandardMaterial({ color: '#c19a5e', metalness: .76, roughness: .26, side: THREE.DoubleSide })
  const tile = new THREE.MeshStandardMaterial({ color: slot === 4 ? '#35434b' : '#71685b', roughness: .46, metalness: .18, side: THREE.DoubleSide })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#93c8c5', metalness: .2, roughness: .1, transparent: true, opacity: .45, clearcoat: 1, side: THREE.DoubleSide })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(27, 21), tile)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(x, y, z)
  floor.receiveShadow = true
  scene.add(floor)
  addBox(scene, 27, .38, 21, darkWood, x, y - .22, z, false)
  addBox(scene, .55, 5.4, 21, plaster, x - 13.5, y + 2.7, z)
  addBox(scene, .55, 5.4, 21, plaster, x + 13.5, y + 2.7, z)
  addBox(scene, 27, 5.4, .55, plaster, x, y + 2.7, z + 10.5)
  addBox(scene, 11.5, 5.4, .55, plaster, x - 7.75, y + 2.7, z - 10.5)
  addBox(scene, 11.5, 5.4, .55, plaster, x + 7.75, y + 2.7, z - 10.5)
  addBox(scene, 4, 1.35, .55, plaster, x, y + 4.72, z - 10.5)
  addBox(scene, 27, .35, 21, darkWood, x, y + 5.55, z)

  const trim = new THREE.MeshStandardMaterial({ color: '#d1b779', roughness: .4, metalness: .32 })
  for (const cornerX of [-12.4, 12.4]) for (const cornerZ of [-9.4, 9.4]) addBox(scene, .35, 5.25, .35, trim, x + cornerX, y + 2.62, z + cornerZ)
  const signMap = signTexture(roomNames[slot], slot === 4 ? '#6be0d3' : '#f4c47d')
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.7), new THREE.MeshBasicMaterial({ map: signMap, toneMapped: false, transparent: true, side: THREE.FrontSide }))
  sign.position.set(x, y + 4.2, z + 10.16)
  sign.rotation.y = Math.PI
  scene.add(sign)

  if (slot === 0) {
    addBox(scene, 8, 1.1, 2.1, darkWood, x, y + .75, z + 5.7)
    addBox(scene, 8.2, .14, 2.2, brass, x, y + 1.35, z + 5.7)
    for (const side of [-1, 1]) {
      addBox(scene, 4.3, .9, 1.5, plaster, x + side * 7.5, y + .6, z - 4)
      addBox(scene, 1.2, 1.4, 1.1, darkWood, x + side * 8.8, y + 1.15, z - 4)
      const lamp = new THREE.PointLight('#ffd695', 30, 17, 2)
      lamp.position.set(x + side * 8, y + 3.7, z + 2)
      scene.add(lamp)
    }
  } else if (slot === 1) {
    addBox(scene, 9, 1.2, 2, darkWood, x, y + .8, z + 6)
    addBox(scene, 9.2, .16, 2.2, brass, x, y + 1.45, z + 6)
    for (const tableX of [-7, 0, 7]) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, .16, 16), darkWood)
      table.position.set(x + tableX, y + 1.1, z - 1)
      scene.add(table)
      for (const seatX of [-1.7, 1.7]) {
        addBox(scene, .72, 1.05, .72, brass, x + tableX + seatX, y + .55, z - 1)
        addBox(scene, .8, .14, .8, darkWood, x + tableX + seatX, y + 1.1, z - 1)
      }
    }
  } else if (slot === 2) {
    for (let rack = 0; rack < 4; rack++) {
      const rx = x - 9 + rack * 6
      addBox(scene, .32, 4.6, 7.4, brass, rx, y + 2.3, z + 4)
      for (let level = 0; level < 4; level++) {
        addBox(scene, 5.4, .16, 7.3, darkWood, rx, y + .8 + level * 1.05, z + 4)
        for (let crate = 0; crate < 3; crate++) addBox(scene, 1.2, .9, 1.1, new THREE.MeshStandardMaterial({ color: ['#8b6346', '#576a63', '#b18855'][(rack + crate + level) % 3], roughness: .9 }), rx - 1.6 + crate * 1.6, y + 1.3 + level * 1.05, z + 4)
      }
    }
    addBox(scene, 7.6, 2.8, .35, glass, x, y + 1.5, z - 8.8)
  } else if (slot === 3) {
    for (let display = 0; display < 5; display++) {
      const displayX = x - 9 + display * 4.5
      addBox(scene, 3.2, 3.5, .8, darkWood, displayX, y + 1.8, z - 7.9)
      addBox(scene, 3.3, .16, .92, brass, displayX, y + 3.5, z - 7.9)
      addBox(scene, 2.8, 1.45, .08, glass, displayX, y + 2.2, z - 8.36, false)
    }
    for (const side of [-1, 1]) {
      addBox(scene, 6, 1.1, 2.4, darkWood, x + side * 7, y + .7, z + 4)
      addBox(scene, 5.8, .12, 2.3, brass, x + side * 7, y + 1.3, z + 4)
    }
  } else {
    for (const deskX of [-7, 0, 7]) {
      addBox(scene, 4, .25, 2.2, darkWood, x + deskX, y + 1.1, z - 1)
      addBox(scene, .2, 1.1, .2, brass, x + deskX - 1.7, y + .55, z - 1.8)
      addBox(scene, .2, 1.1, .2, brass, x + deskX + 1.7, y + .55, z - 1.8)
      addBox(scene, 2.5, 1.35, .1, glass, x + deskX, y + 2.15, z - 9.7, false)
    }
    addBox(scene, 10, .34, 1.4, darkWood, x, y + .18, z + 8)
    for (let shelf = 0; shelf < 6; shelf++) addBox(scene, 1.25, 2.1 + (shelf % 3) * .45, .72, brass, x - 4.3 + shelf * 1.72, y + 1.3 + (shelf % 3) * .2, z + 8)
  }

  const ceilingLight = new THREE.PointLight(slot === 4 ? '#8de9df' : '#ffdb9e', 115, 36, 1.6)
  ceilingLight.position.set(x, y + 4.5, z)
  ceilingLight.visible = false
  scene.add(ceilingLight)
  const worker = makePerson(slot + 1)
  worker.position.set(x + 3.8, y, z - 2)
  worker.rotation.y = Math.PI / 2
  scene.add(worker)
  return { x, y, z, label: roomNames[slot], person: worker, limbs: worker.userData.limbs as any[], light: ceilingLight }
}

function addPedestrian(scene: any, variant: number, axis: 'x' | 'z', fixed: number, start: number, end: number, progress: number, direction: 1 | -1, speed: number): Pedestrian {
  const object = makePerson(variant + 1)
  object.userData.name = ['MAYA', 'LEON', 'ZOE', 'MARCUS', 'ELENA', 'JAMAL'][variant % 6]
  object.position.set(axis === 'x' ? progress : fixed, 0, axis === 'z' ? progress : fixed)
  object.rotation.y = axis === 'x' ? (direction > 0 ? -Math.PI / 2 : Math.PI / 2) : (direction > 0 ? Math.PI : 0)
  scene.add(object)
  return { object, limbs: object.userData.limbs as any[], axis, fixed, start, end, progress, speed, direction, phase: variant * 1.7 }
}

function districtAt(x: number, z: number) {
  if (x > 170 && z < -130) return 'NEON ROW'
  if (z < -240) return 'MARINA DISTRICT'
  if (x < -170) return 'OLD PORT'
  if (z > 170) return 'SUNSET HEIGHTS'
  if (x > 170) return 'GLASS DISTRICT'
  return 'BAYFRONT'
}

export default function CityScene({ active, paused, objectives, onMission, onHud, onError, onReady }: CitySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const missionCallback = useRef(onMission)
  const hudCallback = useRef(onHud)
  const errorCallback = useRef(onError)
  const readyCallback = useRef(onReady)
  const pausedRef = useRef(paused)
  const objectiveRef = useRef(objectives)
  missionCallback.current = onMission
  hudCallback.current = onHud
  errorCallback.current = onError
  readyCallback.current = onReady
  pausedRef.current = paused
  objectiveRef.current = objectives

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    let renderer: any
    const devicePixelRatio = window.devicePixelRatio || 1
    // Start at the display's high-fidelity ceiling. The browser can still back
    // off under sustained load, but it no longer silently falls to an overly
    // soft 1x image on a capable desktop display.
    const maxRenderPixelRatio = Math.min(devicePixelRatio, 2)
    const minRenderPixelRatio = Math.min(devicePixelRatio, devicePixelRatio > 1 ? 1.25 : 1)
    let renderPixelRatio = maxRenderPixelRatio
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false })
    } catch {
      errorCallback.current('This browser could not start WebGL 2. Try a desktop browser with hardware acceleration enabled.')
      return
    }
    // The high-performance hint and full device pixel ratio keep the browser on
    // its hardware WebGL path and make the scene materially denser on PC GPUs.
    renderer.setPixelRatio(renderPixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08

    const scene = new THREE.Scene();
    // Store scene in ref for integration
    sceneRef.current = scene;
    useJapanIntegration(sceneRef.current);
    scene.background = new THREE.Color('#9db7b7')
    scene.fog = new THREE.FogExp2('#91aaa5', .00046)
    const camera = new THREE.PerspectiveCamera(62, 16 / 9, .1, 1000)
    const clock = new THREE.Clock()
    // Full-screen SSAO/bloom blurred the whole city and consumed a second render path.
    // Leave tone mapping and real shadows in the native renderer for a sharper field test.
    const blockers: BuildingBlocker[] = []
    const traffic: Traffic[] = []
    const portals: BuildingPortal[] = []
    const pedestrians: Pedestrian[] = []
    const driveableCars: DriveableCar[] = []
    const interiors: InteriorCell[] = []
    const streetLights: StreetLamp[] = []
    const textures: any[] = []
    let sceneDisposed = false
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    scene.environment = null
    scene.environmentIntensity = .52
    // The prior canvas "skyline" was only a painted reflection. A real,
    // licensed CC0 coastal HDR capture provides physically plausible ambient
    // color and highlights without pretending the road is a mirror.
    new RGBELoader().load('/assets/lighting/victoria_curve_01_1k.hdr', (hdrTexture: any) => {
      if (sceneDisposed) { hdrTexture.dispose(); return }
      const environmentMap = pmremGenerator.fromEquirectangular(hdrTexture).texture
      scene.environment = environmentMap
      textures.push(environmentMap)
      hdrTexture.dispose()
      pmremGenerator.dispose()
    }, undefined, () => {
      if (!sceneDisposed) pmremGenerator.dispose()
    })

    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(1, .05, .2) },
        uSunElevation: { value: -.08 },
        uDaylight: { value: .05 },
      },
      vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        varying vec3 vPosition;
        uniform vec3 uSunDirection;
        uniform float uSunElevation;
        uniform float uDaylight;
        void main(){
          vec3 ray = normalize(vPosition);
          float height = max(ray.y, 0.0);
          float horizon = 1.0 - smoothstep(-0.06, 0.48, ray.y);
          vec3 nightZenith = vec3(0.025, 0.055, 0.12);
          vec3 dayZenith = vec3(0.20, 0.43, 0.66);
          vec3 nightHorizon = vec3(0.11, 0.16, 0.23);
          vec3 dayHorizon = vec3(0.73, 0.82, 0.86);
          vec3 sky = mix(mix(nightHorizon, nightZenith, height), mix(dayHorizon, dayZenith, height), uDaylight);
          float dawn = exp(-abs(uSunElevation) * 18.0) * (1.0 - uDaylight);
          sky = mix(sky, vec3(1.0, 0.43, 0.22), horizon * dawn * 0.82);
          float sunDisc = pow(max(dot(ray, normalize(uSunDirection)), 0.0), 260.0);
          float sunHalo = pow(max(dot(ray, normalize(uSunDirection)), 0.0), 18.0) * (0.06 + dawn * 0.45);
          sky += vec3(1.0, 0.73, 0.46) * (sunDisc * 1.8 + sunHalo);
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    })
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMaterial)
    scene.add(sky)
    const hemisphere = new THREE.HemisphereLight('#d8f2f2', '#453a36', 1.42)
    scene.add(hemisphere)
    const sun = new THREE.DirectionalLight('#ffcf98', 3.3)
    sun.position.set(-90, 125, 75)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.radius = 1.15
    sun.shadow.camera.left = -96
    sun.shadow.camera.right = 96
    sun.shadow.camera.top = 96
    sun.shadow.camera.bottom = -96
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 280
    sun.shadow.bias = -.00018
    sun.shadow.normalBias = .025
    scene.add(sun)
    scene.add(sun.target)

    const textureLoader = new THREE.TextureLoader()
    const loadPbrTexture = (path: string, colorTexture: boolean, repeatX: number, repeatY: number) => {
      const texture = textureLoader.load(path)
      texture.colorSpace = colorTexture ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(repeatX, repeatY)
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      textures.push(texture)
      return texture
    }
    const asphaltMap = loadPbrTexture('/assets/materials/asphalt_01_diff_1k.jpg', true, 44, 44)
    const asphaltNormal = loadPbrTexture('/assets/materials/asphalt_01_nor_gl_1k.jpg', false, 44, 44)
    const asphaltRoughness = loadPbrTexture('/assets/materials/asphalt_01_rough_1k.jpg', false, 44, 44)
    const buildingSurfaceMaps: BuildingSurfaceMaps = {
      brickMap: loadPbrTexture('/assets/materials/patterned_brick_wall_diff_1k.jpg', true, 4, 4),
      brickNormal: loadPbrTexture('/assets/materials/patterned_brick_wall_nor_gl_1k.jpg', false, 4, 4),
      brickRoughness: loadPbrTexture('/assets/materials/patterned_brick_wall_rough_1k.jpg', false, 4, 4),
    }
    const groundMat = new THREE.MeshStandardMaterial({ color: '#526263', roughness: .92 })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1050, 1050), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -.18
    ground.receiveShadow = true
    scene.add(ground)

    // Asphalt should absorb light. The earlier clear-coat material made every road
    // look like a glossy flat plane under a fake environment reflection.
    const roadMat = new THREE.MeshStandardMaterial({ color: '#8b8074', map: asphaltMap, normalMap: asphaltNormal, normalScale: new THREE.Vector2(.48, .48), roughnessMap: asphaltRoughness, roughness: .92, metalness: .01 })
    const curbMat = new THREE.MeshStandardMaterial({ color: '#999e98', roughness: .91, metalness: .02 })
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#747c77', roughness: .96, metalness: 0 })
    const gutterMat = new THREE.MeshStandardMaterial({ color: '#3b4443', roughness: .98 })
    const roadEdgePoses: { x: number; z: number; rotation: number; normalX: number; normalZ: number }[] = []
    for (let k = -5; k <= 5; k++) {
      const p = k * 100
      for (const alongZ of [true, false]) {
        const road = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 18 : 1000, .16, alongZ ? 1000 : 18), roadMat)
        road.position.set(alongZ ? p : 0, -.05, alongZ ? 0 : p)
        road.receiveShadow = true
        scene.add(road)
        for (const side of [-1, 1]) {
          for (let segment = -5; segment < 5; segment++) {
            const along = segment * 100 + 50
            roadEdgePoses.push({
              x: alongZ ? p + side * 9.42 : along,
              z: alongZ ? along : p + side * 9.42,
              rotation: alongZ ? 0 : Math.PI / 2,
              normalX: alongZ ? side : 0,
              normalZ: alongZ ? 0 : side,
            })
          }
        }
      }
    }
    // Curbs and sidewalks stop at junctions. Instancing preserves this detail in
    // three draw calls instead of creating more than a thousand separate meshes.
    const edgeTransform = new THREE.Object3D()
    const gutters = new THREE.InstancedMesh(new THREE.BoxGeometry(.95, .035, 80), gutterMat, roadEdgePoses.length)
    const curbs = new THREE.InstancedMesh(new THREE.BoxGeometry(.65, .18, 80), curbMat, roadEdgePoses.length)
    const sidewalks = new THREE.InstancedMesh(new THREE.BoxGeometry(3.6, .13, 80), sidewalkMat, roadEdgePoses.length)
    roadEdgePoses.forEach((pose, index) => {
      edgeTransform.rotation.set(0, pose.rotation, 0)
      edgeTransform.position.set(pose.x, .045, pose.z)
      edgeTransform.updateMatrix(); gutters.setMatrixAt(index, edgeTransform.matrix)
      edgeTransform.position.set(pose.x + pose.normalX * .23, .12, pose.z + pose.normalZ * .23)
      edgeTransform.updateMatrix(); curbs.setMatrixAt(index, edgeTransform.matrix)
      edgeTransform.position.set(pose.x + pose.normalX * 2.33, .105, pose.z + pose.normalZ * 2.33)
      edgeTransform.updateMatrix(); sidewalks.setMatrixAt(index, edgeTransform.matrix)
    })
    for (const edge of [gutters, curbs, sidewalks]) {
      edge.instanceMatrix.needsUpdate = true
      edge.receiveShadow = true
      scene.add(edge)
    }

    const laneMarks: number[] = []
    for (let road = -5; road <= 5; road++) {
      const center = road * 100
      for (let step = -48; step <= 48; step += 5) {
        const z = step * 10
        laneMarks.push(center - .22, .043, z - 2, center - .22, .043, z + 2)
        laneMarks.push(center + .22, .043, z - 2, center + .22, .043, z + 2)
        const x = step * 10
        laneMarks.push(x - 2, .043, center - .22, x + 2, .043, center - .22)
        laneMarks.push(x - 2, .043, center + .22, x + 2, .043, center + .22)
      }
    }
    const marksGeometry = new THREE.BufferGeometry()
    marksGeometry.setAttribute('position', new THREE.Float32BufferAttribute(laneMarks, 3))
    scene.add(new THREE.LineSegments(marksGeometry, new THREE.LineBasicMaterial({ color: '#d7bc7d', transparent: true, opacity: .75 })))

    // Instanced worn crosswalk paint adds real road scale at every junction
    // without turning hundreds of small markings into hundreds of draw calls.
    const crosswalkPoses: { x: number; z: number; rotation: number }[] = []
    for (let x = -500; x <= 500; x += 100) for (let z = -500; z <= 500; z += 100) {
      for (let stripe = -2; stripe <= 2; stripe++) {
        crosswalkPoses.push({ x: x + stripe * 2.35, z: z - 12.2, rotation: 0 })
        crosswalkPoses.push({ x: x - 12.2, z: z + stripe * 2.35, rotation: Math.PI / 2 })
      }
    }
    const crosswalks = new THREE.InstancedMesh(new THREE.BoxGeometry(1.35, .018, 3.45), new THREE.MeshStandardMaterial({ color: '#c9c5b0', roughness: .95 }), crosswalkPoses.length)
    const crosswalkTransform = new THREE.Object3D()
    crosswalkPoses.forEach((pose, index) => {
      crosswalkTransform.position.set(pose.x, .044, pose.z)
      crosswalkTransform.rotation.set(0, pose.rotation, 0)
      crosswalkTransform.updateMatrix()
      crosswalks.setMatrixAt(index, crosswalkTransform.matrix)
    })
    crosswalks.instanceMatrix.needsUpdate = true
    crosswalks.receiveShadow = true
    scene.add(crosswalks)

    // Street-scale objects keep the city from reading as a grid of isolated
    // towers. They are deliberately instanced: hundreds of planters, benches
    // and bollards cost a handful of draw calls instead of hundreds.
    const planterPoses: { x: number; z: number }[] = []
    const benchPoses: { x: number; z: number; rotation: number }[] = []
    const bollardPoses: { x: number; z: number }[] = []
    for (let p = -500; p <= 500; p += 100) {
      for (const alongZ of [true, false]) {
        for (const side of [-1, 1]) {
          for (let segment = -5; segment < 5; segment++) {
            const along = segment * 100 + 50
            const x = alongZ ? p + side * 12.05 : along
            const z = alongZ ? along : p + side * 12.05
            const density = seeded(x, z, side + (alongZ ? 31 : 47))
            if (density > .16) planterPoses.push({ x, z })
            if (density > .58) {
              const offset = density > .8 ? 16 : -16
              benchPoses.push({
                x: alongZ ? x : x + offset,
                z: alongZ ? z + offset : z,
                rotation: alongZ ? Math.PI / 2 : 0,
              })
            }
          }
        }
      }
    }
    for (let x = -500; x <= 500; x += 100) for (let z = -500; z <= 500; z += 100) {
      for (const offsetX of [-1, 1]) for (const offsetZ of [-1, 1]) bollardPoses.push({ x: x + offsetX * 11.2, z: z + offsetZ * 11.2 })
    }
    const propTransform = new THREE.Object3D()
    const planterBase = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, .72, 1.3), new THREE.MeshStandardMaterial({ color: '#7c8078', roughness: .92 }), planterPoses.length)
    const planterGreen = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.86, 1), new THREE.MeshStandardMaterial({ color: '#326958', roughness: .9 }), planterPoses.length)
    planterPoses.forEach((pose, index) => {
      propTransform.rotation.set(0, seeded(pose.x, pose.z, 3) * Math.PI, 0)
      propTransform.position.set(pose.x, .46, pose.z)
      propTransform.updateMatrix(); planterBase.setMatrixAt(index, propTransform.matrix)
      propTransform.position.set(pose.x, 1.22, pose.z)
      propTransform.updateMatrix(); planterGreen.setMatrixAt(index, propTransform.matrix)
    })
    const benchSeat = new THREE.InstancedMesh(new THREE.BoxGeometry(1.85, .14, .52), new THREE.MeshStandardMaterial({ color: '#4c4036', roughness: .78, metalness: .05 }), benchPoses.length)
    const benchBack = new THREE.InstancedMesh(new THREE.BoxGeometry(1.85, .48, .1), new THREE.MeshStandardMaterial({ color: '#4c4036', roughness: .78, metalness: .05 }), benchPoses.length)
    benchPoses.forEach((pose, index) => {
      propTransform.rotation.set(0, pose.rotation, 0)
      propTransform.position.set(pose.x, .63, pose.z)
      propTransform.updateMatrix(); benchSeat.setMatrixAt(index, propTransform.matrix)
      propTransform.position.set(pose.x - Math.sin(pose.rotation) * .22, .92, pose.z - Math.cos(pose.rotation) * .22)
      propTransform.updateMatrix(); benchBack.setMatrixAt(index, propTransform.matrix)
    })
    const bollards = new THREE.InstancedMesh(new THREE.CylinderGeometry(.13, .17, .82, 8), new THREE.MeshStandardMaterial({ color: '#3d4548', roughness: .6, metalness: .4 }), bollardPoses.length)
    bollardPoses.forEach((pose, index) => {
      propTransform.rotation.set(0, 0, 0)
      propTransform.position.set(pose.x, .46, pose.z)
      propTransform.updateMatrix(); bollards.setMatrixAt(index, propTransform.matrix)
    })
    for (const prop of [planterBase, planterGreen, benchSeat, benchBack, bollards]) {
      prop.instanceMatrix.needsUpdate = true
      prop.castShadow = false
      prop.receiveShadow = true
      scene.add(prop)
    }

    const labels = ['PALMA', 'SOL CLUB', 'MIRAGE', 'CAFÉ SOL', 'GULF MOTEL', 'NIGHT OWL', 'MERCADO', 'ARCADE 84', 'BAY HOTEL', 'TIDELINE', 'VELA HOUSE', 'GOLDEN HOUR', 'PIER 09', 'THE CINDER', 'NORTHLINE']
    const landmarkStyles: Record<string, number> = { '0,-1': 1, '-1,-1': 3, '0,0': 2, '-1,0': 4 }
    const entranceMarkerMaterial = new THREE.MeshStandardMaterial({ color: '#8d744c', emissive: '#d89849', emissiveIntensity: .32, metalness: .4, roughness: .36 })
    const entranceMarkerPositions: any[] = []
    const sideDoorPoses: EntryDoorPose[] = []
    const registerPortal = (entries: BuildingPortal[]) => {
      for (const portal of entries) {
        portals.push(portal)
        entranceMarkerPositions.push(new THREE.Vector3(portal.x, .14, portal.z))
      }
    }
    for (let gx = -5; gx < 5; gx++) for (let gz = -5; gz < 5; gz++) {
      const centerX = gx * 100 + 50
      const centerZ = gz * 100 + 50
      const seed = seeded(gx, gz)
      if (seed < .09) {
        const park = new THREE.Mesh(new THREE.PlaneGeometry(68, 68), new THREE.MeshStandardMaterial({ color: '#2d5447', roughness: .96 }))
        park.rotation.x = -Math.PI / 2
        park.position.set(centerX, .12, centerZ)
        park.receiveShadow = true
        scene.add(park)
        for (let t = 0; t < 7; t++) addTree(scene, centerX + (seeded(gx, gz, t) - .5) * 54, centerZ + (seeded(gx, gz, t + 19) - .5) * 54, .8 + seeded(gx, gz, t + 31) * .5)
        continue
      }
      const width = 37 + Math.floor(seeded(gx, gz, 2) * 32)
      const depth = 38 + Math.floor(seeded(gx, gz, 3) * 30)
      const downtown = Math.max(Math.abs(gx), Math.abs(gz)) <= 2
      const floors = downtown ? 7 + Math.floor(seeded(gx, gz, 4) * 12) : 3 + Math.floor(seeded(gx, gz, 4) * 6)
      const label = labels[Math.floor(seeded(gx, gz, 5) * labels.length)]
      const architecture = landmarkStyles[`${gx},${gz}`] ?? Math.floor(seed * 17)
      const landmarkName = `${label} ${['TOWER', 'HOTEL', 'HOUSE', 'WORKS', 'ARCADE'][architecture % 5]}`
      registerPortal(addBuilding(scene, blockers, sideDoorPoses, centerX + (seeded(gx, gz, 6) - .5) * 7, centerZ + (seeded(gx, gz, 7) - .5) * 7, width, depth, floors, architecture, landmarkName, buildingSurfaceMaps))
      if (!downtown && seed > .64) {
        const extraWidth = 18 + seeded(gx, gz, 9) * 13
        const side = seeded(gx, gz, 10) > .5 ? 1 : -1
        registerPortal(addBuilding(scene, blockers, sideDoorPoses, centerX + side * 25, centerZ + (seeded(gx, gz, 11) - .5) * 22, extraWidth, 22, 2 + Math.floor(seed * 4), Math.floor(seed * 23), labels[(Math.floor(seed * 7) + 3) % labels.length], buildingSurfaceMaps))
      }
    }
    const sideDoorFrame = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, 4, .42), new THREE.MeshStandardMaterial({ color: '#70a9a9', roughness: .36, metalness: .46, emissive: '#204346', emissiveIntensity: .16 }), sideDoorPoses.length)
    const sideDoorGlass = new THREE.InstancedMesh(new THREE.BoxGeometry(1.85, 3.1, .24), new THREE.MeshPhysicalMaterial({ color: '#acd1d0', metalness: .3, roughness: .12, transparent: true, opacity: .68, clearcoat: 1, clearcoatRoughness: .07 }), sideDoorPoses.length)
    const sideDoorCanopy = new THREE.InstancedMesh(new THREE.BoxGeometry(3.1, .2, 1.8), new THREE.MeshStandardMaterial({ color: '#d7b47c', roughness: .68 }), sideDoorPoses.length)
    const doorTransform = new THREE.Object3D()
    sideDoorPoses.forEach((pose, index) => {
      doorTransform.rotation.set(0, pose.rotationY, 0)
      doorTransform.position.set(pose.x + pose.normalX * .3, 2.05, pose.z + pose.normalZ * .3)
      doorTransform.updateMatrix(); sideDoorFrame.setMatrixAt(index, doorTransform.matrix)
      doorTransform.position.set(pose.x + pose.normalX * .58, 1.65, pose.z + pose.normalZ * .58)
      doorTransform.updateMatrix(); sideDoorGlass.setMatrixAt(index, doorTransform.matrix)
      doorTransform.position.set(pose.x + pose.normalX * 1.15, 3.68, pose.z + pose.normalZ * 1.15)
      doorTransform.updateMatrix(); sideDoorCanopy.setMatrixAt(index, doorTransform.matrix)
    })
    sideDoorFrame.castShadow = true
    sideDoorGlass.castShadow = false
    sideDoorCanopy.castShadow = true
    scene.add(sideDoorFrame, sideDoorGlass, sideDoorCanopy)
    const entranceMarkers = new THREE.InstancedMesh(new THREE.TorusGeometry(.48, .065, 8, 24), entranceMarkerMaterial, entranceMarkerPositions.length)
    const entranceTransform = new THREE.Object3D()
    entranceMarkerPositions.forEach((position, index) => {
      entranceTransform.position.copy(position)
      entranceTransform.rotation.set(Math.PI / 2, 0, 0)
      entranceTransform.updateMatrix()
      entranceMarkers.setMatrixAt(index, entranceTransform.matrix)
    })
    entranceMarkers.instanceMatrix.needsUpdate = true
    entranceMarkers.castShadow = false
    entranceMarkers.receiveShadow = false
    scene.add(entranceMarkers)
    for (let room = 0; room < 5; room++) interiors.push(addInterior(scene, room))

    // Sidewalk foot traffic gives the districts scale and life.
    for (let i = 0; i < 24; i++) {
      const axis: 'x' | 'z' = i % 2 ? 'x' : 'z'
      const lane = Math.floor(seeded(i, 3, 6) * 9) - 4
      const alongBlock = Math.floor(seeded(i, 7, 4) * 9) - 4
      const side = seeded(i, 10, 3) > .5 ? 1 : -1
      const fixed = lane * 100 + side * 11.3
      const center = alongBlock * 100
      const start = center - 40
      const end = center + 40
      const direction: 1 | -1 = seeded(i, 9, 2) > .5 ? 1 : -1
      const progress = direction > 0 ? start + seeded(i, 1, 8) * 80 : end - seeded(i, 2, 7) * 80
      pedestrians.push(addPedestrian(scene, i, axis, fixed, start, end, progress, direction, .75 + seeded(i, 5, 4) * .55))
    }
    const localWalkers = [
      { axis: 'z' as const, fixed: -11.3, start: -34, end: 24, progress: -18, direction: 1 as const },
      { axis: 'z' as const, fixed: 11.3, start: -28, end: 32, progress: -9, direction: -1 as const },
      { axis: 'x' as const, fixed: -11.3, start: -30, end: 30, progress: -19, direction: 1 as const },
      { axis: 'x' as const, fixed: 11.3, start: -30, end: 30, progress: 21, direction: -1 as const },
      { axis: 'z' as const, fixed: -11.3, start: -34, end: 24, progress: 8, direction: -1 as const },
      { axis: 'x' as const, fixed: 11.3, start: -30, end: 30, progress: -7, direction: 1 as const },
    ]
    localWalkers.forEach((walker, index) => pedestrians.push(addPedestrian(scene, index + 24, walker.axis, walker.fixed, walker.start, walker.end, walker.progress, walker.direction, 1.05 + index * .06)))

    for (let x = -400; x <= 400; x += 100) for (let z = -400; z <= 400; z += 100) {
      if ((x / 100 + z / 100) % 2 === 0) streetLights.push(addStreetLamp(scene, x + 12, z + 11, seeded(x, z) > .5))
    }

    const palmMat = new THREE.MeshStandardMaterial({ color: '#36766f', roughness: .84 })
    for (let i = 0; i < 9; i++) {
      const x = 472 + Math.sin(i * 1.7) * 4
      const z = -400 + i * 100
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.38, .58, 12, 9), new THREE.MeshStandardMaterial({ color: '#735443', roughness: .9 }))
      trunk.position.set(x, 6, z)
      trunk.castShadow = true
      scene.add(trunk)
      for (let frond = 0; frond < 7; frond++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(.58, 7.5, 5), palmMat)
        leaf.position.set(x + Math.cos(frond * Math.PI / 3.5) * 2.2, 12.4, z + Math.sin(frond * Math.PI / 3.5) * 2.2)
        leaf.rotation.z = Math.cos(frond * Math.PI / 3.5) * .82
        leaf.rotation.x = Math.sin(frond * Math.PI / 3.5) * .82
        leaf.castShadow = true
        scene.add(leaf)
      }
    }

    const waterCanvas = document.createElement('canvas')
    waterCanvas.width = waterCanvas.height = 512
    const waterContext = waterCanvas.getContext('2d')!
    waterContext.fillStyle = '#1d606b'
    waterContext.fillRect(0, 0, 512, 512)
    for (let ripple = 0; ripple < 420; ripple++) {
      const y = seeded(ripple, 12, 3) * 512
      const x = seeded(ripple, 17, 4) * 512
      const length = 9 + seeded(ripple, 23, 5) * 45
      waterContext.strokeStyle = seeded(ripple, 28, 8) > .66 ? '#b5ded72c' : '#082f3a42'
      waterContext.lineWidth = .45 + seeded(ripple, 31, 7) * 1.1
      waterContext.beginPath()
      waterContext.moveTo(x, y)
      waterContext.quadraticCurveTo(x + length * .48, y - 1 + seeded(ripple, 41, 1) * 2, x + length, y)
      waterContext.stroke()
    }
    const waterTexture = new THREE.CanvasTexture(waterCanvas)
    waterTexture.colorSpace = THREE.SRGBColorSpace
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping
    waterTexture.repeat.set(3, 22)
    waterTexture.anisotropy = 8
    textures.push(waterTexture)
    const water = new THREE.Mesh(new THREE.PlaneGeometry(105, 920), new THREE.MeshStandardMaterial({ map: waterTexture, color: '#2d7180', roughness: .47, metalness: .08, envMapIntensity: .12 }))
    water.rotation.x = -Math.PI / 2
    water.position.set(535, .015, 0)
    water.receiveShadow = true
    scene.add(water)

    for (let i = 0; i < 12; i++) {
      const axis = i % 2 ? 'x' : 'z'
      const fixed = (Math.floor(i / 2) - 3) * 100 + (i % 3 ? 3.4 : -3.4)
      const car = makeTrafficCar(['#ba6659', '#487982', '#c4b58e', '#584e66'][i % 4], i % 3)
      scene.add(car)
      traffic.push({ object: car, axis, fixed, progress: -420 + i * 73, speed: 6 + (i % 4) * 1.7, limit: 440 })
    }

    const parkedSpots = [
      { x: 6.5, z: -3.5, yaw: Math.PI / 2 },
      { x: -7, z: -96, yaw: Math.PI / 2 },
      { x: 107, z: 96, yaw: Math.PI / 2 },
      { x: 193, z: -104, yaw: Math.PI / 2 },
      { x: -193, z: 204, yaw: Math.PI / 2 },
      { x: 307, z: -196, yaw: Math.PI / 2 },
      { x: -307, z: 296, yaw: Math.PI / 2 },
      { x: 407, z: 104, yaw: Math.PI / 2 },
    ]
    parkedSpots.forEach((spot, index) => {
      const car = makeTrafficCar(['#bd4237', '#246a73', '#e3c17a', '#34445c', '#e7e1d4', '#71514d', '#465e4d', '#aa653c'][index], index % 3)
      car.position.set(spot.x, 0, spot.z)
      car.rotation.y = spot.yaw
      car.userData.driveable = true
      scene.add(car)
      driveableCars.push({ object: car, x: spot.x, z: spot.z, yaw: spot.yaw, speed: 0, occupied: false })
    })

    const markerGroup = new THREE.Group()
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.35, 2.8, 15, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#f0bf78', transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false }))
    beacon.position.y = 7.5
    markerGroup.add(beacon)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, .22, 10, 32), new THREE.MeshStandardMaterial({ color: '#ffd08a', emissive: '#f18b43', emissiveIntensity: 2.2, metalness: .5, roughness: .26 }))
    ring.rotation.x = Math.PI / 2
    ring.position.y = .55
    markerGroup.add(ring)
    const markerCore = new THREE.Mesh(new THREE.SphereGeometry(.72, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff0c9' }))
    markerCore.position.y = 9.8
    markerGroup.add(markerCore)
    const markerLight = new THREE.PointLight('#f4a761', 34, 32, 2)
    markerLight.position.y = 8
    markerGroup.add(markerLight)
    scene.add(markerGroup)

    const player = makePerson(0, true)
    player.position.set(0, 0, 4)
    scene.add(player)

    // Static city pieces used to update their local transform matrices every frame.
    // Keep animation roots live, and freeze everything else after the world is built.
    const dynamicRoots = new Set<any>([
      player,
      markerGroup,
      sun,
      sun.target,
      ...traffic.map((vehicle) => vehicle.object),
      ...pedestrians.map((pedestrian) => pedestrian.object),
      ...driveableCars.map((car) => car.object),
      ...interiors.flatMap((interior) => [interior.person, interior.light]),
    ])
    scene.traverse((object: any) => {
      let ancestor: any = object
      while (ancestor) {
        if (dynamicRoots.has(ancestor)) return
        ancestor = ancestor.parent
      }
      if (object.isObject3D) {
        object.updateMatrix()
        object.matrixAutoUpdate = false
      }
    })
    const torso = player.children[0] as any
    const limbs = player.userData.limbs as any[]
    const keyState = new Set<string>()
    const exitPosition = new THREE.Vector3()
    let mode: 'walk' | 'drive' | 'interior' = 'walk'
    let activeInterior: InteriorCell | null = null
    let drivenCar: DriveableCar | null = null
    let snapCamera = false
    let interactPressed = false
    let yaw = .22
    let pitch = .08
    let jumpVelocity = 0
    let grounded = true
    let travelDistance = 0
    let hudClock = 0
    let missionIndex = 0
    let pointerDown = false
    let pointerLocked = false
    let activePointerId: number | null = null
    let spacePressed = false
    let viewTogglePressed = false
    let cameraMode: 'third' | 'first' = 'third'
    let lastPointerX = 0
    let lastPointerY = 0
    const target = new THREE.Vector3(0, 1.65, 4)
    const desiredCamera = new THREE.Vector3()
    const cameraDirection = new THREE.Vector3()
    const lookTarget = new THREE.Vector3()
    const alternateCamera = new THREE.Vector3()
    const alternateDirection = new THREE.Vector3()
    const velocity = new THREE.Vector3()
    const wish = new THREE.Vector3()
    const sunDirection = new THREE.Vector3(1, -.08, .24).normalize()
    const nightHemisphere = new THREE.Color('#35465d')
    const dayHemisphere = new THREE.Color('#d8f2f2')
    const nightGround = new THREE.Color('#18212a')
    const dayGround = new THREE.Color('#453a36')
    const nightFog = new THREE.Color('#17283a')
    const dawnFog = new THREE.Color('#d58970')
    const dayFog = new THREE.Color('#91aaa5')
    const lightColor = new THREE.Color()
    const dawnSun = new THREE.Color('#ff9d70')
    const middaySun = new THREE.Color('#fff3d8')
    desiredCamera.set(player.position.x + Math.sin(yaw) * 10.5, player.position.y + 3.65, player.position.z + Math.cos(yaw) * 10.5)
    camera.position.copy(desiredCamera)
    camera.lookAt(target)

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'escape' && pointerLocked) {
        document.exitPointerLock()
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      if (['w', 'a', 's', 'd', 'e', 'v', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key)) event.preventDefault()
      if (key === ' ' && !keyState.has(' ')) spacePressed = true
      if (key === 'e' && !keyState.has('e')) interactPressed = true
      if (key === 'v' && !keyState.has('v')) viewTogglePressed = true
      keyState.add(key)
    }
    const onKeyUp = (event: KeyboardEvent) => keyState.delete(event.key.toLowerCase())
    const clearInput = () => {
      keyState.clear()
      spacePressed = false
      interactPressed = false
      viewTogglePressed = false
      pointerDown = false
      activePointerId = null
      if (pointerLocked) document.exitPointerLock()
      velocity.set(0, 0, 0)
      if (drivenCar) drivenCar.speed = 0
    }
    const onVisibilityChange = () => { if (document.hidden) clearInput() }
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      pointerDown = true
      activePointerId = event.pointerId
      lastPointerX = event.clientX
      lastPointerY = event.clientY
      canvas.focus({ preventScroll: true })
      try {
        const lockAttempt = (canvas.requestPointerLock as any)?.()
        if (lockAttempt?.catch) lockAttempt.catch(() => canvas.setPointerCapture(event.pointerId))
        else if (!canvas.requestPointerLock) canvas.setPointerCapture(event.pointerId)
      } catch {
        canvas.setPointerCapture(event.pointerId)
      }
    }
    const onPointerUp = () => { pointerDown = false; activePointerId = null }
    const onPointerMove = (event: PointerEvent) => {
      if (pointerLocked) {
        yaw -= event.movementX * .0027
        pitch = clamp(pitch - event.movementY * .0024, -.85, 1.35)
        return
      }
      if (!pointerDown) return
      const dx = event.clientX - lastPointerX, dy = event.clientY - lastPointerY
      lastPointerX = event.clientX; lastPointerY = event.clientY
      yaw -= dx * .004
      pitch = clamp(pitch - dy * .0028, -.85, 1.35)
    }
    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === canvas
      canvas.classList.toggle('pointer-locked', pointerLocked)
      if (!pointerLocked) pointerDown = false
    }
    const onPointerLockError = () => {
      pointerLocked = false
      canvas.classList.remove('pointer-locked')
      if (pointerDown && activePointerId !== null) canvas.setPointerCapture(activePointerId)
    }
    const onContextMenu = (event: Event) => event.preventDefault()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearInput)
    document.addEventListener('visibilitychange', onVisibilityChange)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('pointerlockerror', onPointerLockError)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      renderer.setPixelRatio(renderPixelRatio)
      renderer.setSize(rect.width, rect.height, false)
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const canOccupy = (x: number, z: number) => {
      if (mode === 'interior' && activeInterior) return Math.abs(x - activeInterior.x) < 11.8 && Math.abs(z - activeInterior.z) < 8.5
      if (Math.abs(x) > 490 || Math.abs(z) > 490) return false
      if (blockers.some((box) => x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ)) return false
      const staticVehicleClearance = mode === 'drive' ? 3.65 : 1.25
      for (const car of driveableCars) {
        if (car === drivenCar) continue
        if (Math.hypot(x - car.x, z - car.z) < staticVehicleClearance) return false
      }
      const trafficClearance = mode === 'drive' ? 3.55 : 1.2
      for (const vehicle of traffic) {
        if (Math.hypot(x - vehicle.object.position.x, z - vehicle.object.position.z) < trafficClearance) return false
      }
      return true
    }
    const findNearbyInteraction = (): InteractionTarget | undefined => {
      const options: InteractionTarget[] = []
      for (const car of driveableCars) {
        if (car.occupied) continue
        const distance = Math.hypot(player.position.x - car.x, player.position.z - car.z)
        if (distance < 11) options.push({ kind: 'vehicle', distance, value: car })
      }
      for (const portal of portals) {
        const distance = Math.hypot(player.position.x - portal.x, player.position.z - portal.z)
        if (distance < 14) options.push({ kind: 'building', distance, value: portal })
      }
      for (const npc of pedestrians) {
        const distance = Math.hypot(player.position.x - npc.object.position.x, player.position.z - npc.object.position.z)
        if (distance < 4.2) options.push({ kind: 'person', distance, value: npc })
      }
      options.sort((a, b) => a.distance - b.distance)
      return options[0]
    }

    let raf = 0
    let readyRaf = 0
    let qualityTime = 0
    let qualityFrames = 0
    let qualityFrameTime = 0
    let lampClock = 0
    let interactionClock = .2
    let nearbyInteraction: InteractionTarget | undefined
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const rawDelta = clock.getDelta()
      if (document.hidden || pausedRef.current) return
      const dt = Math.min(rawDelta, .04)
      interactionClock += dt
      qualityTime += rawDelta
      qualityFrameTime += rawDelta
      qualityFrames += 1
      if (qualityTime >= 2 && qualityFrames > 30) {
        const averageFrame = qualityFrameTime / qualityFrames
        const nextRatio = averageFrame > .03
          ? Math.max(minRenderPixelRatio, renderPixelRatio - .1)
          : averageFrame < .015
            ? Math.min(maxRenderPixelRatio, renderPixelRatio + .05)
            : renderPixelRatio
        if (nextRatio !== renderPixelRatio) { renderPixelRatio = nextRatio; resize() }
        qualityTime = 0
        qualityFrameTime = 0
        qualityFrames = 0
      }
      const elapsed = clock.elapsedTime
      const forwardInput = Number(keyState.has('w') || keyState.has('arrowup')) - Number(keyState.has('s') || keyState.has('arrowdown'))
      const sideInput = Number(keyState.has('d') || keyState.has('arrowright')) - Number(keyState.has('a') || keyState.has('arrowleft'))
      if (viewTogglePressed) {
        viewTogglePressed = false
        cameraMode = cameraMode === 'third' ? 'first' : 'third'
        if (mode !== 'drive') player.visible = cameraMode === 'third'
        snapCamera = true
      }
      if (interactPressed) {
        interactPressed = false
        if (mode === 'interior' && activeInterior) {
          activeInterior.light.visible = false
          player.position.copy(exitPosition)
          player.visible = cameraMode === 'third'
          activeInterior = null
          mode = 'walk'
          snapCamera = true
        } else if (mode === 'drive' && drivenCar) {
          drivenCar.occupied = false
          drivenCar.speed = 0
          player.position.set(drivenCar.x, 0, drivenCar.z + 3.4)
          player.visible = cameraMode === 'third'
          drivenCar = null
          mode = 'walk'
        } else {
          const target = findNearbyInteraction()
          nearbyInteraction = target
          interactionClock = 0
          if (target?.kind === 'vehicle') {
            const car = target.value as DriveableCar
            drivenCar = car
            car.occupied = true
            car.speed = 0
            mode = 'drive'
            player.visible = false
            yaw = car.yaw - Math.PI / 2
            pitch = .1
            snapCamera = true
          } else if (target?.kind === 'building') {
            const portal = target.value as BuildingPortal
            activeInterior = interiors[portal.interior]
            activeInterior.light.visible = true
            exitPosition.set(portal.x, 0, portal.z)
            player.position.set(activeInterior.x, activeInterior.y, activeInterior.z - 4.7)
            player.rotation.y = 0
            yaw = 0
            pitch = .04
            mode = 'interior'
            player.visible = cameraMode === 'third'
            snapCamera = true
          } else if (target?.kind === 'person') {
            const name = String(target.value.object.userData.name || 'LOCAL')
            target.value.object.userData.greetUntil = elapsed + 2.2
            target.value.object.userData.dialogue = `${name}: Morning. Nice day by the water.`
          }
        }
      }

      const sprint = keyState.has('shift')
      let speed = 0
      if (mode === 'drive' && drivenCar) {
        const car = drivenCar
        if (forwardInput > 0) car.speed = Math.min(39, car.speed + 20 * dt)
        else if (forwardInput < 0) car.speed = car.speed > 1 ? Math.max(0, car.speed - 30 * dt) : Math.max(-10, car.speed - 11 * dt)
        else car.speed *= Math.max(0, 1 - 1.1 * dt)
        if (keyState.has(' ')) car.speed *= Math.max(0, 1 - 3.8 * dt)
        const turnRate = (.22 + Math.min(Math.abs(car.speed) / 17, 1.35)) * (car.speed < 0 ? -1 : 1)
        car.yaw += sideInput * turnRate * dt
        const nextX = car.x + Math.cos(car.yaw) * car.speed * dt
        const nextZ = car.z - Math.sin(car.yaw) * car.speed * dt
        if (canOccupy(nextX, nextZ)) { car.x = nextX; car.z = nextZ }
        else car.speed *= -.12
        car.object.position.set(car.x, 0, car.z)
        car.object.rotation.y = car.yaw
        for (const wheel of car.object.userData.wheels as any[]) wheel.rotation.z += car.speed * dt / .46
        speed = Math.abs(car.speed)
        travelDistance += speed * dt
      } else {
        wish.set(Math.cos(yaw) * sideInput + -Math.sin(yaw) * forwardInput, 0, -Math.sin(yaw) * sideInput + -Math.cos(yaw) * forwardInput)
        if (wish.lengthSq() > 0) wish.normalize()
        const topSpeed = mode === 'interior' ? 4.6 : (sprint ? 14 : 8.2)
        const response = wish.lengthSq() > 0 ? 7.5 : 9.5
        velocity.x = THREE.MathUtils.damp(velocity.x, wish.x * topSpeed, response, dt)
        velocity.z = THREE.MathUtils.damp(velocity.z, wish.z * topSpeed, response, dt)
        const nextX = player.position.x + velocity.x * dt
        const nextZ = player.position.z + velocity.z * dt
        if (canOccupy(nextX, player.position.z)) player.position.x = nextX
        else velocity.x = 0
        if (canOccupy(player.position.x, nextZ)) player.position.z = nextZ
        else velocity.z = 0
        speed = Math.hypot(velocity.x, velocity.z)
        if (mode === 'walk') travelDistance += speed * dt
        if (spacePressed && grounded && mode === 'walk') { jumpVelocity = 7.3; grounded = false }
        if (mode === 'interior') { player.position.y = activeInterior?.y ?? -48; grounded = true }
        spacePressed = false
        if (!grounded) {
          player.position.y += jumpVelocity * dt
          jumpVelocity -= 19 * dt
          if (player.position.y <= 0) { player.position.y = 0; jumpVelocity = 0; grounded = true }
        }
        if (speed > .15) {
          const desiredYaw = Math.atan2(-velocity.x, -velocity.z)
          player.rotation.y += Math.atan2(Math.sin(desiredYaw - player.rotation.y), Math.cos(desiredYaw - player.rotation.y)) * Math.min(1, dt * 9)
        }
        const stride = speed > .25 ? Math.sin(elapsed * (sprint ? 13 : 9)) * Math.min(speed / 5, 1) * .55 : Math.sin(elapsed * 2) * .025
        limbs[0].rotation.x = stride
        limbs[1].rotation.x = -stride
        limbs[2].rotation.x = -stride
        limbs[3].rotation.x = stride
        torso.position.y = 1.34 + (speed > .25 ? Math.abs(Math.sin(elapsed * (sprint ? 13 : 9))) * .045 : Math.sin(elapsed * 2) * .012)
        if (!grounded) {
          const airbornePose = clamp(1 - Math.abs(jumpVelocity) / 7.3, .18, 1)
          limbs[0].rotation.x = -.92 * airbornePose
          limbs[2].rotation.x = -.92 * airbornePose
          limbs[1].rotation.x = .25 * airbornePose
          limbs[3].rotation.x = .25 * airbornePose
          torso.rotation.x = -.045 * airbornePose
        } else {
          torso.rotation.x = 0
        }
      }

      for (const npc of pedestrians) {
        npc.progress += npc.direction * npc.speed * dt
        if (npc.progress > npc.end) { npc.progress = npc.end; npc.direction = -1 }
        if (npc.progress < npc.start) { npc.progress = npc.start; npc.direction = 1 }
        npc.object.position.set(npc.axis === 'x' ? npc.progress : npc.fixed, Math.sin(elapsed * 5 + npc.phase) * .018, npc.axis === 'z' ? npc.progress : npc.fixed)
        npc.object.rotation.y = npc.axis === 'x' ? (npc.direction > 0 ? -Math.PI / 2 : Math.PI / 2) : (npc.direction > 0 ? Math.PI : 0)
        const walk = Math.sin(elapsed * 7 + npc.phase) * .32
        npc.limbs[0].rotation.x = walk; npc.limbs[1].rotation.x = -walk
        npc.limbs[2].rotation.x = -walk; npc.limbs[3].rotation.x = walk
      }
      for (const cell of interiors) {
        const greet = Number(cell.person.userData.greetUntil || 0) > elapsed
        cell.limbs[0].rotation.x = greet ? Math.sin(elapsed * 8) * .8 : Math.sin(elapsed * 1.4) * .035
        cell.person.children[0].position.y = 1.34 + Math.sin(elapsed * 2) * .012
      }

      const currentObjectives = objectiveRef.current
      if (currentObjectives.length) {
        const objective = currentObjectives[missionIndex % currentObjectives.length]
        markerGroup.position.set(objective.x, 0, objective.z)
        markerGroup.rotation.y = elapsed * .45
        markerCore.position.y = 9.8 + Math.sin(elapsed * 2.8) * .8
        if (mode !== 'interior' && Math.hypot(player.position.x - objective.x, player.position.z - objective.z) < 7) {
          missionCallback.current(travelDistance)
          travelDistance = 0
          missionIndex += 1
        }
      }

      for (const vehicle of traffic) {
        vehicle.progress += vehicle.speed * dt
        if (vehicle.progress > vehicle.limit) vehicle.progress = -vehicle.limit
        for (const wheel of vehicle.object.userData.wheels as any[]) wheel.rotation.z += vehicle.speed * dt / .46
        if (vehicle.axis === 'x') {
          vehicle.object.position.set(vehicle.progress, 0, vehicle.fixed)
          vehicle.object.rotation.y = vehicle.speed > 0 ? -Math.PI / 2 : Math.PI / 2
        } else {
          vehicle.object.position.set(vehicle.fixed, 0, vehicle.progress)
          vehicle.object.rotation.y = vehicle.speed > 0 ? Math.PI : 0
        }
      }

      let action = mode === 'drive' ? 'E  EXIT VEHICLE' : mode === 'interior' ? `E  EXIT ${activeInterior?.label || 'BUILDING'}` : ''
      if (mode === 'walk') {
        if (interactionClock >= .12) {
          nearbyInteraction = findNearbyInteraction()
          interactionClock = 0
        }
        const target = nearbyInteraction
        if (target?.kind === 'vehicle') action = `E  ENTER ${String(target.value.object.userData.modelName || 'VEHICLE')}`
        else if (target?.kind === 'building') action = `E  ENTER ${target.value.name}`
        else if (target?.kind === 'person') {
          action = `E  TALK TO ${String(target.value.object.userData.name || 'LOCAL')}`
          if (Number(target.value.object.userData.greetUntil || 0) > elapsed) action = String(target.value.object.userData.dialogue || action)
        }
      }

      const focusX = drivenCar?.x ?? player.position.x
      const focusZ = drivenCar?.z ?? player.position.z
      const focusY = drivenCar ? 1.8 : player.position.y + (mode === 'interior' ? 1.5 : 1.7) + (speed > .2 && grounded ? Math.sin(elapsed * 9) * .025 : 0)
      target.set(focusX, focusY, focusZ)
      if (mode === 'drive' && drivenCar) {
        // Vehicle mode uses the same true orbit/look target as on foot. The
        // earlier follow camera always copied the car target, which made mouse
        // pitch and yaw appear broken while driving.
        const driveDistance = 12.4
        desiredCamera.set(
          drivenCar.x + Math.sin(yaw) * driveDistance,
          target.y + 3.15,
          drivenCar.z + Math.cos(yaw) * driveDistance,
        )
        const driveViewDistance = 22
        lookTarget.set(
          target.x - Math.sin(yaw) * Math.cos(pitch) * driveViewDistance,
          target.y + Math.sin(pitch) * driveViewDistance,
          target.z - Math.cos(yaw) * Math.cos(pitch) * driveViewDistance,
        )
      } else {
        const cameraDistance = mode === 'interior' ? 7.8 : 10.5
        const cameraHeight = mode === 'interior' ? 2.7 : 3.65
        desiredCamera.set(player.position.x + Math.sin(yaw) * cameraDistance, player.position.y + cameraHeight, player.position.z + Math.cos(yaw) * cameraDistance)
        // Mouse pitch moves the actual eye target through the world, rather than
        // only nudging camera height. That makes the sky and vertical facades viewable.
        const viewDistance = mode === 'interior' ? 12 : 18
        lookTarget.set(
          target.x - Math.sin(yaw) * Math.cos(pitch) * viewDistance,
          target.y + Math.sin(pitch) * viewDistance,
          target.z - Math.cos(yaw) * Math.cos(pitch) * viewDistance,
        )
      }
      cameraDirection.subVectors(desiredCamera, target).normalize()
      const fullCameraDistance = desiredCamera.distanceTo(target)
      const findSafeDistance = (direction: any) => {
        let safeDistance = fullCameraDistance
        for (const blocker of blockers) {
          if (Math.hypot((blocker.minX + blocker.maxX) / 2 - target.x, (blocker.minZ + blocker.maxZ) / 2 - target.z) > fullCameraDistance + 35) continue
          // Movement blockers include a clearance margin; trim it back for visual occlusion.
          const obstructionDistance = rayBoxDistance(target.x, target.z, direction.x, direction.z, blocker, fullCameraDistance, 1.4)
          if (obstructionDistance !== null && obstructionDistance < safeDistance) safeDistance = Math.max(.85, obstructionDistance - .85)
        }
        return safeDistance
      }
      let safeCameraDistance = findSafeDistance(cameraDirection)
      if (safeCameraDistance < 4.4) {
        // If a facade sits directly behind the player, orbit to the clearest nearby angle
        // instead of crushing the third-person camera against the character.
        const radius = Math.hypot(desiredCamera.x - target.x, desiredCamera.z - target.z)
        const baseAngle = Math.atan2(cameraDirection.z, cameraDirection.x)
        let bestClearance = safeCameraDistance
        let bestAngle = baseAngle
        for (const offset of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * .75, -Math.PI * .75, Math.PI]) {
          const angle = baseAngle + offset
          alternateCamera.set(target.x + Math.cos(angle) * radius, desiredCamera.y, target.z + Math.sin(angle) * radius)
          alternateDirection.subVectors(alternateCamera, target).normalize()
          const clearance = findSafeDistance(alternateDirection)
          if (clearance > bestClearance) { bestClearance = clearance; bestAngle = angle }
          if (clearance >= fullCameraDistance - .01) break
        }
        alternateCamera.set(target.x + Math.cos(bestAngle) * radius, desiredCamera.y, target.z + Math.sin(bestAngle) * radius)
        if (bestClearance < fullCameraDistance) {
          alternateDirection.subVectors(alternateCamera, target).normalize()
          alternateCamera.copy(target).addScaledVector(alternateDirection, bestClearance)
        }
        desiredCamera.copy(alternateCamera)
      } else if (safeCameraDistance < fullCameraDistance) {
        desiredCamera.copy(target).addScaledVector(cameraDirection, safeCameraDistance)
      }
      if (snapCamera) {
        camera.position.copy(desiredCamera)
        snapCamera = false
      } else {
        camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 5))
      }
      camera.lookAt(lookTarget)
      const gameHour = (8.25 + elapsed / 30) % 24
      const sunAngle = gameHour / 24 * Math.PI * 2 - Math.PI / 2
      const sunElevation = Math.sin(sunAngle)
      const daylight = clamp((sunElevation + .1) / .5, 0, 1)
      sunDirection.set(Math.cos(sunAngle), Math.max(-.16, sunElevation), .24).normalize()
      skyMaterial.uniforms.uSunDirection.value.copy(sunDirection)
      skyMaterial.uniforms.uSunElevation.value = sunElevation
      skyMaterial.uniforms.uDaylight.value = daylight
      sun.position.set(focusX + sunDirection.x * 130, focusY + sunDirection.y * 130, focusZ + sunDirection.z * 130)
      sun.color.copy(dawnSun).lerp(middaySun, daylight)
      sun.intensity = .04 + 3.25 * daylight
      hemisphere.color.copy(nightHemisphere).lerp(dayHemisphere, daylight)
      hemisphere.groundColor.copy(nightGround).lerp(dayGround, daylight)
      hemisphere.intensity = .2 + 1.05 * daylight
      const fog = scene.fog as any
      const fogColor = fog.color as any
      fogColor.copy(nightFog).lerp(dayFog, daylight)
      fogColor.lerp(dawnFog, Math.exp(-Math.abs(sunElevation) * 16) * (1 - daylight) * .42)
      fog.density = .00036 + (1 - daylight) * .00018
      scene.environmentIntensity = .38 + daylight * .38
      sun.target.position.set(focusX, mode === 'interior' ? -48 : 0, focusZ)
      lampClock += dt
      if (lampClock > .65) {
        const night = 1 - clamp(daylight * 1.4, 0, 1)
        const nearestLamps = new Set(streetLights.slice().sort((a, b) => Math.hypot(a.x - focusX, a.z - focusZ) - Math.hypot(b.x - focusX, b.z - focusZ)).slice(0, 6))
        for (const lamp of streetLights) {
          lamp.light.visible = nearestLamps.has(lamp)
          lamp.light.intensity = night * 10
          lamp.bulbMaterial.emissiveIntensity = night * 2.2
        }
        lampClock = 0
      }
      renderer.render(scene, camera)

      hudClock += dt
      if (hudClock > .22) {
        const hudX = mode === 'interior' ? exitPosition.x : focusX
        const hudZ = mode === 'interior' ? exitPosition.z : focusZ
        const district = mode === 'interior' && activeInterior ? activeInterior.label : districtAt(hudX, hudZ)
        const hudMode = mode === 'drive' ? 'DRIVING' : mode === 'interior' ? 'INSIDE' : 'ON FOOT'
        const hour = Math.floor(gameHour) % 24
        const minute = Math.floor((gameHour - Math.floor(gameHour)) * 60)
        const time = `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
        hudCallback.current({ district, x: hudX, z: hudZ, speed: Math.round(speed * 3.6), mode: hudMode, action, time })
        hudClock = 0
      }
    }
    animate()
    readyRaf = requestAnimationFrame(() => readyCallback.current())

    return () => {
      sceneDisposed = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(readyRaf)
      observer.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearInput)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('pointerlockerror', onPointerLockError)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      const geometries = new Set<any>()
      const materials = new Set<any>()
      scene.traverse((object: any) => {
        const mesh = object as any
        if (mesh.geometry) geometries.add(mesh.geometry)
        if (Array.isArray(mesh.material)) mesh.material.forEach((item: any) => materials.add(item))
        else if (mesh.material) materials.add(mesh.material)
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => {
        const maybeTextured = material as any
        if (maybeTextured.map) textures.push(maybeTextured.map)
        if (maybeTextured.emissiveMap) textures.push(maybeTextured.emissiveMap)
        material.dispose()
      })
      new Set(textures).forEach((texture) => texture.dispose())
      // These module-level caches are valid only for this renderer. Clear them
      // after disposal so Strict Mode/HMR never reuses a disposed CanvasTexture.
      facadeTextureCache.clear()
      signTextureCache.clear()
      pmremGenerator.dispose()
      renderer.dispose()
    }
  }, [active])

  return <canvas className="driving-canvas" ref={canvasRef} tabIndex={0} aria-label="Third person 3D city exploration. Click to capture the mouse and look around. WASD to move, Shift to sprint, Space to jump, E to enter vehicles or buildings." />
}
