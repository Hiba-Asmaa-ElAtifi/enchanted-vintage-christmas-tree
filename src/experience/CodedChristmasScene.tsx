import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

type Props = { wishId: number }

const C = {
  darkGreen: new THREE.Color('#101a0e'),
  green: new THREE.Color('#23351b'),
  lime: new THREE.Color('#40522a'),
  burgundy: new THREE.Color('#5c0f10'),
  red: new THREE.Color('#9c2a21'),
  gold: new THREE.Color('#ad8950'),
  champagne: new THREE.Color('#d6b477'),
  cream: new THREE.Color('#f3e8d6'),
  candle: new THREE.Color('#ffd98a'),
  snow: new THREE.Color('#eef2f6'),
}

function seeded(index: number, salt = 0) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function ease(min: number, max: number, value: number) {
  const x = THREE.MathUtils.clamp((value - min) / (max - min), 0, 1)
  return x * x * (3 - 2 * x)
}

function canopyRadius(h: number, angle: number) {
  const base = Math.pow(1 - h, 0.72) * 2.95 + 0.06
  const bulge = 1 + 0.22 * Math.sin(angle * 3 + h * 7) + 0.1 * Math.sin(angle * 5 - h * 4)
  return Math.max(0.05, base * THREE.MathUtils.clamp(bulge, 0.78, 1.26))
}

type CloudData = {
  positions: Float32Array
  starts?: Float32Array
  colors: Float32Array
  delays?: Float32Array
  centers?: Float32Array
}

function PixelCloud({ data, size = 3, reveal = [0, 1], twinkle = 0.25, opacity = 1 }: {
  data: CloudData; size?: number; reveal?: [number, number]; twinkle?: number; opacity?: number
}) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    g.setAttribute('aStart', new THREE.BufferAttribute(data.starts ?? data.positions, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3))
    g.setAttribute('aDelay', new THREE.BufferAttribute(data.delays ?? new Float32Array(data.positions.length / 3), 1))
    g.setAttribute('aCenter', new THREE.BufferAttribute(data.centers ?? data.positions, 3))
    return g
  }, [data])

  useFrame(({ clock }) => {
    if (!material.current) return
    const t = clock.getElapsedTime()
    material.current.uniforms.uTime.value = t
    material.current.uniforms.uProgress.value = ease(reveal[0], reveal[1], t)
  })

  return <points geometry={geometry} frustumCulled={false}>
    <shaderMaterial
      ref={material} transparent depthWrite={false} vertexColors blending={THREE.AdditiveBlending}
      uniforms={{ uTime: { value: 0 }, uProgress: { value: 0 }, uSize: { value: size }, uTwinkle: { value: twinkle }, uOpacity: { value: opacity } }}
      vertexShader={`
        attribute vec3 aStart; attribute vec3 aColor; attribute float aDelay; attribute vec3 aCenter;
        uniform float uTime; uniform float uProgress; uniform float uSize; uniform float uTwinkle;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float p = smoothstep(aDelay, min(1.0, aDelay + 0.34), uProgress);
          float orbit = (1.0 - p) * (2.0 + aDelay * 4.0) + uTime * 0.08;
          vec3 start = aStart;
          start.xz = mat2(cos(orbit), -sin(orbit), sin(orbit), cos(orbit)) * start.xz;
          vec3 target = mix(aCenter, position, p);
          vec3 pos = mix(start, target, p);
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          float flicker = 1.0 + sin(uTime * 3.2 + aDelay * 91.0) * uTwinkle;
          gl_PointSize = uSize * flicker * (12.0 / max(1.0, -mv.z));
          vColor = aColor; vAlpha = p;
        }`}
      fragmentShader={`
        uniform float uOpacity; varying vec3 vColor; varying float vAlpha;
        void main() {
          vec2 p = abs(gl_PointCoord - vec2(0.5));
          float square = 1.0 - smoothstep(0.38, 0.5, max(p.x, p.y));
          float core = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
          gl_FragColor = vec4(vColor * (1.05 + core * 0.55), square * vAlpha * uOpacity);
        }`}
    />
  </points>
}

function createTree(): CloudData {
  const positions: number[] = [], starts: number[] = [], colors: number[] = [], delays: number[] = []
  let index = 0
  const levels = 27
  for (let level = 0; level < levels; level++) {
    const h = level / (levels - 1)
    const y = -2.2 + h * 6.4 + (seeded(level, 97) - 0.5) * 0.22
    const branches = 13 + Math.floor((1 - h) * 7)
    for (let b = 0; b < branches; b++) {
      const angle = (b / branches) * Math.PI * 2 + level * 0.61
      const reach = canopyRadius(h, angle) * (0.86 + seeded(level * 40 + b, 9) * 0.16)
      const samples = 46 + Math.floor(reach * 15)
      for (let s = 0; s < samples; s++) {
        const t = s / (samples - 1)
        const side = (seeded(index, 1) - 0.5) * (0.3 * t + 0.04)
        const x = Math.cos(angle) * reach * t + Math.cos(angle + Math.PI / 2) * side
        const z = Math.sin(angle) * reach * t + Math.sin(angle + Math.PI / 2) * side
        const py = y - t * t * (0.13 + (1 - h) * 0.27) + (seeded(index, 2) - 0.5) * 0.075
        positions.push(x, py, z)
        const radius = 4 + seeded(index, 3) * 4
        const startAngle = seeded(index, 4) * Math.PI * 2
        starts.push(Math.cos(startAngle) * radius, -2.3 + seeded(index, 5) * 7.2, Math.sin(startAngle) * radius)
        const base = seeded(index, 6) > 0.68 ? C.lime : seeded(index, 7) > 0.32 ? C.green : C.darkGreen
        colors.push(base.r, base.g, base.b)
        delays.push(Math.min(0.76, h * 0.52 + seeded(index, 8) * 0.22))
        index++
      }
    }

    // Dense inner foliage prevents a dark, empty hole through the centre while
    // preserving the already approved outer silhouette and branch structure.
    const corePoints = 82 + Math.floor((1 - h) * 54)
    for (let p = 0; p < corePoints; p++) {
      const angle = seeded(index, 170) * Math.PI * 2
      const radius = Math.sqrt(seeded(index, 171)) * canopyRadius(h, angle) * 0.58
      const py = y + (seeded(index, 172) - 0.5) * 0.18
      positions.push(Math.cos(angle) * radius, py, Math.sin(angle) * radius)
      const startRadius = 4 + seeded(index, 173) * 4
      const startAngle = seeded(index, 174) * Math.PI * 2
      starts.push(Math.cos(startAngle) * startRadius, -2.3 + seeded(index, 175) * 7.2, Math.sin(startAngle) * startRadius)
      const base = seeded(index, 176) > 0.7 ? C.lime : seeded(index, 177) > 0.35 ? C.green : C.darkGreen
      colors.push(base.r, base.g, base.b)
      delays.push(Math.min(0.76, h * 0.52 + seeded(index, 178) * 0.2))
      index++
    }
  }
  return { positions: new Float32Array(positions), starts: new Float32Array(starts), colors: new Float32Array(colors), delays: new Float32Array(delays) }
}

function createSnowCaps(): CloudData {
  const positions: number[] = [], colors: number[] = [], delays: number[] = []
  const tiers = 20
  for (let i = 0; i < tiers; i++) {
    const h = i / (tiers - 1)
    const y = -2.0 + h * 6.3
    const ringPoints = 34 + Math.floor((1 - h) * 34)
    for (let k = 0; k < ringPoints; k++) {
      const angle = (k / ringPoints) * Math.PI * 2
      const radius = canopyRadius(h, angle) * (0.95 + seeded(i * 100 + k, 160) * 0.06)
      positions.push(Math.cos(angle) * radius, y + 0.06, Math.sin(angle) * radius)
      colors.push(C.snow.r, C.snow.g, C.snow.b)
      delays.push(0.5 + h * 0.3 + seeded(i * 100 + k, 161) * 0.2)
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), delays: new Float32Array(delays) }
}

function createFairyLights(): CloudData {
  const positions: number[] = [], colors: number[] = [], delays: number[] = []
  const count = 980
  for (let i = 0; i < count; i++) {
    const h = seeded(i, 100)
    const y = -2.08 + h * 6.28
    const angle = seeded(i, 101) * Math.PI * 2
    const radius = canopyRadius(h, angle) * (0.66 + seeded(i, 102) * 0.38)
    positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    const warm = seeded(i, 103) > 0.45 ? C.candle : C.champagne
    colors.push(warm.r, warm.g, warm.b)
    delays.push(0.2 + h * 0.5 + seeded(i, 104) * 0.3)
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), delays: new Float32Array(delays) }
}

function createTinsel(): CloudData {
  const positions: number[] = [], colors: number[] = [], delays: number[] = []
  const count = 1760
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const y = -1.9 + t * 5.9 + Math.sin(t * 23 + 2) * 0.05
    const h = THREE.MathUtils.clamp((y + 2.15) / 6.35, 0, 1)
    const angle = t * Math.PI * 8.4
    const wobble = 1 + 0.035 * Math.sin(t * 17) + 0.025 * Math.sin(t * 41 + 1)
    const radius = canopyRadius(h, angle) * 0.91 * wobble
    positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    const warm = seeded(i, 95) > 0.55 ? C.candle : C.gold
    colors.push(warm.r, warm.g, warm.b)
    delays.push(0.32 + t * 0.55)
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), delays: new Float32Array(delays) }
}

function sphereShape(n: number, salt: number): [number, number, number][] {
  const pts: [number, number, number][] = []
  for (let p = 0; p < n; p++) {
    const phi = Math.acos(1 - 2 * seeded(p, salt + 1)), theta = seeded(p, salt + 2) * Math.PI * 2
    pts.push([Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)])
  }
  return pts
}

function bowShape(n: number, salt: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < Math.floor(n * 0.85); i++) {
    const side = seeded(i, salt + 1) > 0.5 ? 1 : -1
    const t = seeded(i, salt + 2)
    pts.push([side * (0.15 + t * 0.78), (seeded(i, salt + 3) - 0.5) * (0.55 - t * 0.32)])
  }
  for (let i = 0; i < Math.floor(n * 0.15); i++) {
    const a = seeded(i, salt + 4) * Math.PI * 2, r = seeded(i, salt + 5) * 0.16
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return pts
}

function bellShape(n: number, salt: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const v = seeded(i, salt + 1) * 1.1 - 0.55
    const width = 0.14 + Math.max(0, v + 0.55) * 0.58
    pts.push([(seeded(i, salt + 2) - 0.5) * 2 * width, v])
  }
  return pts
}

function snowflakeShape(n: number, salt: number): [number, number][] {
  const pts: [number, number][] = []
  const spokes = 6
  for (let i = 0; i < n; i++) {
    const a = ((i % spokes) / spokes) * Math.PI * 2
    const r = seeded(i, salt + 1) * 0.58
    const jitter = (seeded(i, salt + 2) - 0.5) * 0.05
    pts.push([Math.cos(a) * r + jitter, Math.sin(a) * r + jitter])
  }
  return pts
}

function doveShape(n: number, salt: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const part = seeded(i, salt + 1)
    if (part < 0.42) {
      const a = seeded(i, salt + 2) * Math.PI * 2, r = seeded(i, salt + 3)
      pts.push([Math.cos(a) * 0.22 * r, Math.sin(a) * 0.15 * r + 0.02])
    } else {
      const side = part < 0.72 ? -1 : 1
      const t = seeded(i, salt + 4)
      pts.push([side * (0.14 + t * 0.46), 0.08 - t * 0.28])
    }
  }
  return pts
}

function candleShape(n: number, salt: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const flame = seeded(i, salt + 1) > 0.78
    if (flame) {
      const a = seeded(i, salt + 2) * Math.PI * 2
      const r = seeded(i, salt + 3) * 0.16
      pts.push([Math.cos(a) * r, 0.62 + Math.sin(a) * r * 1.8])
    } else {
      pts.push([(seeded(i, salt + 4) - 0.5) * 0.24, seeded(i, salt + 5) * 0.92 - 0.46])
    }
  }
  return pts
}

function medallionShape(n: number, salt: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = seeded(i, salt + 1) * Math.PI * 2
    const edge = seeded(i, salt + 2) > 0.38
    const r = edge ? 0.52 + seeded(i, salt + 3) * 0.08 : Math.sqrt(seeded(i, salt + 4)) * 0.38
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return pts
}

type OrnamentKind = 'bauble' | 'bow' | 'bell' | 'snowflake' | 'dove' | 'candle' | 'medallion'

function createOrnaments(): CloudData {
  const positions: number[] = [], centers: number[] = [], colors: number[] = [], delays: number[] = []
  const palette = [C.burgundy, C.red, C.gold, C.champagne, C.candle]
  const flatColor = { bow: C.burgundy, bell: C.champagne, snowflake: C.cream, dove: C.cream, candle: C.candle, medallion: C.gold }
  let idx = 0
  for (let o = 0; o < 112; o++) {
    const h = 0.08 + seeded(o, 40) * 0.78
    const angle = seeded(o, 41) * Math.PI * 2
    const radius = canopyRadius(h, angle) * (0.84 + seeded(o, 49) * 0.18)
    const y = -2.0 + h * 6.1
    const center = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    const roll = seeded(o, 42)
    const kind: OrnamentKind = roll > 0.94 ? 'dove' : roll > 0.87 ? 'candle' : roll > 0.8 ? 'medallion' : roll > 0.72 ? 'snowflake' : roll > 0.62 ? 'bell' : roll > 0.52 ? 'bow' : 'bauble'
    const scale = kind === 'bauble' ? 0.15 + seeded(o, 43) * 0.11 : kind === 'candle' ? 0.26 + seeded(o, 43) * 0.08 : 0.23 + seeded(o, 43) * 0.1
    const up = new THREE.Vector3(0, 1, 0)
    const outward = new THREE.Vector3(center.x, 0, center.z)
    if (outward.lengthSq() < 1e-6) outward.set(0, 0, 1)
    outward.normalize()
    const right = new THREE.Vector3().crossVectors(up, outward).normalize()
    const pointCount = kind === 'bauble' ? 54 : 42
    const color = kind === 'bauble' ? palette[Math.floor(seeded(o, 42) * palette.length)] : flatColor[kind]
    if (kind === 'bauble') {
      for (const [sx, sy, sz] of sphereShape(pointCount, o * 7)) {
        positions.push(center.x + sx * scale, center.y + sy * scale, center.z + sz * scale)
        centers.push(center.x, center.y, center.z)
        colors.push(color.r, color.g, color.b); delays.push(seeded(o, 46) * 0.7); idx++
      }
    } else {
      const flat = kind === 'bow' ? bowShape(pointCount, o * 7)
        : kind === 'bell' ? bellShape(pointCount, o * 7)
          : kind === 'snowflake' ? snowflakeShape(pointCount, o * 7)
            : kind === 'candle' ? candleShape(pointCount, o * 7)
              : kind === 'medallion' ? medallionShape(pointCount, o * 7)
                : doveShape(pointCount, o * 7)
      for (const [u, v] of flat) {
        const px = center.x + right.x * u * scale + up.x * v * scale + outward.x * 0.03
        const py = center.y + right.y * u * scale + up.y * v * scale + outward.y * 0.03
        const pz = center.z + right.z * u * scale + up.z * v * scale + outward.z * 0.03
        positions.push(px, py, pz)
        centers.push(center.x, center.y, center.z)
        colors.push(color.r, color.g, color.b); delays.push(seeded(o, 46) * 0.7); idx++
      }
    }
  }
  void idx
  return { positions: new Float32Array(positions), centers: new Float32Array(centers), colors: new Float32Array(colors), delays: new Float32Array(delays) }
}

function createGroundDust(): CloudData {
  const positions: number[] = [], colors: number[] = [], delays: number[] = []
  let idx = 0
  const count = 560
  for (let i = 0; i < count; i++) {
    const a = seeded(i, 52) * Math.PI * 2
    const r = Math.sqrt(seeded(i, 53)) * 3.3
    positions.push(Math.cos(a) * r, -2.43 + seeded(i, 54) * 0.03, Math.sin(a) * r)
    colors.push(C.candle.r, C.candle.g, C.candle.b)
    delays.push(seeded(idx++, 50) * 0.6)
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), delays: new Float32Array(delays) }
}

function createStar(): CloudData {
  const positions: number[] = [], colors: number[] = [], centers: number[] = []
  for (let ray = 0; ray < 8; ray++) {
    const a = (ray / 8) * Math.PI * 2
    const length = ray % 2 === 0 ? 0.55 : 0.32
    for (let i = 0; i < 32; i++) {
      const r = (i / 31) * length
      positions.push(Math.cos(a) * r, 4.55 + Math.sin(a) * r, (seeded(i + ray * 32, 60) - 0.5) * 0.05)
      centers.push(0, 4.55, 0); colors.push(C.cream.r, C.cream.g, C.cream.b)
    }
  }
  return { positions: new Float32Array(positions), centers: new Float32Array(centers), colors: new Float32Array(colors) }
}

function createGifts(): CloudData {
  const positions: number[] = [], colors: number[] = [], delays: number[] = []
  const gifts = [
    { x: -2.15, y: -2.35, z: 1.85, w: 0.95, h: 0.7, body: C.burgundy, ribbon: C.gold },
    { x: -1.28, y: -2.35, z: 2.05, w: 0.72, h: 1.05, body: C.gold, ribbon: C.burgundy },
    { x: -0.48, y: -2.35, z: 2.2, w: 0.92, h: 0.62, body: C.red, ribbon: C.champagne },
    { x: 0.42, y: -2.35, z: 2.24, w: 0.78, h: 1.18, body: C.champagne, ribbon: C.burgundy },
    { x: 1.28, y: -2.35, z: 2.08, w: 1.02, h: 0.8, body: C.burgundy, ribbon: C.gold },
    { x: 2.12, y: -2.35, z: 1.82, w: 0.64, h: 0.96, body: C.gold, ribbon: C.red },
    { x: 0.02, y: -2.35, z: 2.4, w: 0.58, h: 0.48, body: C.red, ribbon: C.gold },
  ]
  let index = 0
  gifts.forEach((gift, giftIndex) => {
    const columns = Math.max(13, Math.round(gift.w * 22))
    const rows = Math.max(12, Math.round(gift.h * 22))
    for (let ix = 0; ix < columns; ix++) {
      for (let iy = 0; iy < rows; iy++) {
        const nx = ix / (columns - 1)
        const ny = iy / (rows - 1)
        const x = gift.x + (nx - 0.5) * gift.w
        const y = gift.y + ny * gift.h
        const verticalRibbon = Math.abs(nx - 0.5) < 0.11
        const horizontalRibbon = Math.abs(ny - 0.58) < 0.075
        const patterned = giftIndex % 2 === 0 && (ix + iy) % 7 === 0
        const color = verticalRibbon || horizontalRibbon ? gift.ribbon : patterned ? C.candle : gift.body
        positions.push(x, y, gift.z)
        colors.push(color.r, color.g, color.b)
        delays.push(seeded(index++, 190) * 0.72)
      }
    }

    // A compact dotted bow above each parcel keeps the silhouette readable.
    for (let p = 0; p < 46; p++) {
      const side = seeded(p, giftIndex + 200) > 0.5 ? 1 : -1
      const t = seeded(p, giftIndex + 210)
      positions.push(
        gift.x + side * (0.06 + t * gift.w * 0.3),
        gift.y + gift.h + (seeded(p, giftIndex + 220) - 0.5) * 0.16,
        gift.z + 0.015,
      )
      colors.push(gift.ribbon.r, gift.ribbon.g, gift.ribbon.b)
      delays.push(seeded(index++, 230) * 0.72)
    }
  })
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), delays: new Float32Array(delays) }
}

function AuroraSky() {
  const { scene } = useThree()
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, '#140f22')
    grad.addColorStop(0.35, '#1c1320')
    grad.addColorStop(0.7, '#180f0d')
    grad.addColorStop(1, '#0d0808')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)
    const blobs: [number, number, number, string][] = [
      [160, 170, 230, 'rgba(229,159,196,0.22)'],
      [360, 120, 210, 'rgba(159,138,209,0.2)'],
      [260, 220, 260, 'rgba(107,194,174,0.14)'],
    ]
    blobs.forEach(([x, y, r, color]) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    })
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    scene.background = texture
    return () => texture.dispose()
  }, [scene])
  return null
}

function FallingSnow() {
  const material = useRef<THREE.ShaderMaterial>(null)
  const count = 920
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (seeded(i, 150) - 0.5) * 16
      positions[i * 3 + 1] = seeded(i, 151) * 14 - 3
      positions[i * 3 + 2] = (seeded(i, 152) - 0.5) * 11
      speeds[i] = 0.35 + seeded(i, 153) * 0.5
      phases[i] = seeded(i, 154) * Math.PI * 2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    return g
  }, [])
  useFrame(({ clock }) => { if (material.current) material.current.uniforms.uTime.value = clock.getElapsedTime() })
  return <points geometry={geometry} frustumCulled={false}>
    <shaderMaterial
      ref={material} transparent depthWrite={false}
      uniforms={{ uTime: { value: 0 } }}
      vertexShader={`
        attribute float aSpeed; attribute float aPhase; uniform float uTime; varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.y = mod(pos.y - uTime * aSpeed * 1.4 + 3.0, 14.0) - 3.0;
          pos.x += sin(uTime * 0.6 + aPhase) * 0.4;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (3.5 + sin(aPhase) * 1.15) * (10.0 / max(1.0, -mv.z));
          vAlpha = 0.58 + 0.28 * sin(uTime * 2.0 + aPhase);
        }`}
      fragmentShader={`
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float core = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(1.0, 1.0, 1.0, core * vAlpha * 0.9);
        }`}
    />
  </points>
}

function WishWave({ wishId }: Props) {
  const points = useMemo(() => createGroundDust(), [])
  const material = useRef<THREE.PointsMaterial>(null)
  const started = useRef(-100)
  useEffect(() => { if (wishId) started.current = performance.now() / 1000 }, [wishId])
  useFrame(() => {
    if (!material.current) return
    const elapsed = performance.now() / 1000 - started.current
    material.current.opacity = elapsed >= 0 && elapsed < 2.4 ? Math.sin((elapsed / 2.4) * Math.PI) : 0
    material.current.size = 0.025 + Math.max(0, elapsed) * 0.025
  })
  return <points position={[0, 0.05, 0]}><bufferGeometry><bufferAttribute attach="attributes-position" args={[points.positions, 3]} /></bufferGeometry><pointsMaterial ref={material} color="#ffd98a" size={0.03} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
}

export function CodedChristmasScene({ wishId }: Props) {
  const tree = useMemo(createTree, []), snowCaps = useMemo(createSnowCaps, []), fairyLights = useMemo(createFairyLights, [])
  const tinsel = useMemo(createTinsel, []), ornaments = useMemo(createOrnaments, [])
  const star = useMemo(createStar, []), gifts = useMemo(createGifts, [])
  return <>
    <AuroraSky />
    <OrbitControls enablePan={false} enableZoom minDistance={7} maxDistance={18} target={[0, 0.75, 0]} />
    <PixelCloud data={tree} size={4.15} reveal={[2.2, 8.4]} twinkle={0.1} />
    <PixelCloud data={snowCaps} size={2.6} reveal={[7.0, 10.0]} twinkle={0} />
    <PixelCloud data={fairyLights} size={2.8} reveal={[7.6, 11.4]} twinkle={0.45} />
    <PixelCloud data={tinsel} size={3.75} reveal={[9.6, 13.0]} twinkle={0.08} />
    <PixelCloud data={ornaments} size={3.9} reveal={[11.0, 15.4]} twinkle={0.2} />
    <PixelCloud data={gifts} size={4.65} reveal={[13.8, 17.2]} twinkle={0.08} />
    <PixelCloud data={star} size={4.8} reveal={[15.4, 17.2]} twinkle={0.6} />
    <WishWave wishId={wishId} />
    <FallingSnow />
  </>
}
