const M = Math

// ── Helpers ──────────────────────────────────────────────────────────────────

const hash = (a, b) => {
  const h = M.sin(a * 127.1 + b * 311.7) * 43758.5453
  return h - M.floor(h)
}

const bit = (rows, ix, iy) =>
  iy >= 0 && iy < rows.length && ix >= 0 && ix < 8
    ? (rows[iy] >> (7 - ix)) & 1
    : 0

const fade = u => u * u * u * (u * (u * 6 - 15) + 10)
const lerp = (a, b, u) => a + (b - a) * u

// 3D value noise — smooth continuous movement
const noise3d = (x, y, t) => {
  const X = x * 4, Y = y * 4, T = t * 0.4
  const xi = M.floor(X), yi = M.floor(Y), ti = M.floor(T)
  const xf = X - xi, yf = Y - yi, tf = T - ti
  const h = (a, b, c) => hash(a + b * 31 + c * 127, a * 7 + b * 13)
  const z0 = lerp(
    lerp(h(xi, yi, ti),   h(xi + 1, yi, ti),   fade(xf)),
    lerp(h(xi, yi+1, ti), h(xi+1, yi+1, ti),   fade(xf)), fade(yf))
  const z1 = lerp(
    lerp(h(xi, yi, ti+1),   h(xi+1, yi, ti+1),   fade(xf)),
    lerp(h(xi, yi+1, ti+1), h(xi+1, yi+1, ti+1), fade(xf)), fade(yf))
  return lerp(z0, z1, fade(tf))
}

// ── Stateless Rules ───────────────────────────────────────────────────────────

const RULES = {

  // Waves
  wave: (x, y, t) =>
    M.sin(x * M.PI * 6 + t * 3) > M.sin(y * M.PI * 2 + t) ? 1 : 0,

  diagonal: (x, y, t) =>
    M.sin((x + y) * M.PI * 6 - t * 4) > 0 ? 1 : 0,

  concentric_squares: (x, y, t) => {
    const d = M.max(M.abs(x - 0.5), M.abs(y - 0.5)) * 2
    return M.sin(d * M.PI * 8 - t * 4) > 0 ? 1 : 0
  },

  diamond_ripple: (x, y, t) => {
    const d = M.abs(x - 0.5) + M.abs(y - 0.5)
    return M.sin(d * M.PI * 10 - t * 4) > 0 ? 1 : 0
  },

  rings: (x, y, t) => {
    const d = M.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2)
    return M.sin(d * M.PI * 14 - t * 4) > 0 ? 1 : 0
  },

  interference: (x, y, t) => {
    const a = M.sin(x * M.PI * 5 + t * 2)
    const b = M.sin(y * M.PI * 5 - t * 2)
    return a + b > 0.8 ? 1 : 0
  },

  moire: (x, y, t) => {
    const a = M.sin(x * M.PI * 8 + t * 0.5)
    const b = M.sin((x * 0.97 + y * 0.26) * M.PI * 8 - t * 0.5)
    return a + b > 0.6 ? 1 : 0
  },

  standing_wave: (x, y, t) =>
    M.sin(x * M.PI * 4) * M.cos(t * 3) > M.sin(y * M.PI * 4) * 0.5 ? 1 : 0,

  double_helix: (x, y, t, ix, iy, w) => {
    const phase = (iy / M.max(1, w - 1)) * M.PI * 4
    const s1 = M.abs(x - (M.sin(phase - t * 2) * 0.4 + 0.5)) < 0.1
    const s2 = M.abs(x - (M.sin(phase - t * 2 + M.PI) * 0.4 + 0.5)) < 0.1
    return s1 || s2 ? 1 : 0
  },

  zigzag: (x, y, t, ix, iy) => {
    const offset = (iy % 2) * 0.5
    return ((x + offset + t * 0.2) % 0.5) < 0.25 ? 1 : 0
  },

  scan_h: (x, y, t) => M.abs(y - (t * 0.4) % 1) * 8 < 1 ? 1 : 0,
  scan_v: (x, y, t) => M.abs(x - (t * 0.4) % 1) * 8 < 1 ? 1 : 0,

  tunnel: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy) + 0.001
    const a = M.atan2(cy, cx)
    return M.sin(0.38/r - t*2) > 0 && M.sin(a*4 + t*0.5) > 0 ? 1 : 0
  },

  ripple_point: (x, y, t) => {
    const px = M.sin(t*0.8)*0.25+0.5, py = M.cos(t*0.6)*0.25+0.5
    const d = M.sqrt((x-px)**2+(y-py)**2)
    return M.max(0, M.sin(d*M.PI*10 - t*4)) * M.max(0, 1 - d*1.8)
  },

  // Geometric
  rotate_square: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const rx = M.abs(cx * M.cos(t) - cy * M.sin(t))
    const ry = M.abs(cx * M.sin(t) + cy * M.cos(t))
    return rx < 0.3 && ry < 0.3 ? 1 : 0
  },

  rotate_cross: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const rx = M.abs(cx * M.cos(t) - cy * M.sin(t))
    const ry = M.abs(cx * M.sin(t) + cy * M.cos(t))
    return (rx < 0.1 || ry < 0.1) && M.sqrt(cx*cx+cy*cy) < 0.48 ? 1 : 0
  },

  rotate_star: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const angle = M.atan2(cy, cx) - t
    const r = M.sqrt(cx*cx + cy*cy)
    const tip = M.abs(M.sin(angle * 4)) * 0.3 + 0.05
    return r < tip + 0.04 && r > 0.01 ? 1 : 0
  },

  spiral: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy)
    const s = ((M.atan2(cy, cx) / (M.PI * 2) + r * 3 - t * 0.5) % 1 + 1) % 1
    return M.abs(s - 0.5) < 0.12 && r < 0.5 ? 1 : 0
  },

  vortex: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy)
    return r < 0.48 && M.sin(M.atan2(cy, cx) + r * 8 - t * 2) * 4 > 0.4 ? 1 : 0
  },

  propeller: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy)
    return M.abs(M.sin((M.atan2(cy, cx) - t * 3) * 2)) > 0.85 && r < 0.46 && r > 0.05 ? 1 : 0
  },

  hourglass: (x, y, t) => {
    const neck = 0.06 + M.abs(M.sin(t * 1.5)) * 0.1
    return M.abs(x - 0.5) < M.abs(y - 0.5) * 0.9 + neck ? 1 : 0
  },

  radar: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy)
    if (r > 0.48) return 0
    const diff = ((t * 1.5) % (M.PI * 2) - M.atan2(cy, cx) + M.PI * 2) % (M.PI * 2)
    return diff < 1.2 ? M.pow(1 - diff / 1.2, 1.5) : 0
  },

  clock: (x, y, t) => {
    const hand = (angle, length) => {
      const hx = M.sin(angle) * length, hy = -M.cos(angle) * length
      const ex = x - 0.5, ey = y - 0.5
      const dt = M.max(0, M.min(1, (ex*hx + ey*hy) / (length*length)))
      const px = ex - dt*hx, py = ey - dt*hy
      return px*px + py*py < 0.014
    }
    return hand(t * 0.15, 0.28) || hand(t * 1.8, 0.42) ? 1 : 0
  },

  pendulum: (x, y, t) => {
    const angle = M.sin(t * 1.7) * 0.85
    const len = 0.38
    const px = M.sin(angle) * len + 0.5, py = M.cos(angle) * len + 0.08
    if ((x-0.5)**2+(y-0.08)**2 < 0.008) return 0.4
    if ((x-px)**2+(y-py)**2 < 0.018) return 1
    const ux = (px-0.5)/len, uy = (py-0.08)/len
    const dx = x-0.5, dy = y-0.08
    const proj = dx*ux+dy*uy
    return proj>0 && proj<len && M.abs(dx*uy-dy*ux)<0.04 ? 0.45 : 0
  },

  orbit_rings: (x, y, t) => {
    const cx = x-0.5, cy = y-0.5
    const r = M.sqrt(cx*cx+cy*cy)
    if (M.abs(r-0.13)<0.025 || M.abs(r-0.27)<0.025 || M.abs(r-0.43)<0.025) return 0.15
    const d1 = (x-M.cos(t*2.2)*0.13-0.5)**2+(y-M.sin(t*2.2)*0.13-0.5)**2
    const d2 = (x-M.cos(-t*1.4+1)*0.27-0.5)**2+(y-M.sin(-t*1.4+1)*0.27-0.5)**2
    const d3 = (x-M.cos(t*0.8+2)*0.43-0.5)**2+(y-M.sin(t*0.8+2)*0.43-0.5)**2
    return d1<0.013||d2<0.014||d3<0.015 ? 1 : 0
  },

  // Cosmic
  stars: (x, y, t, ix, iy) => {
    const h = hash(ix, iy)
    if (h > 0.7) return 0
    return M.sin(hash(ix + 5, iy) * 60 + t * (2 + h * 4)) > 0.7 ? 1 : 0
  },

  meteor: (x, y, t, ix) => {
    const speed = hash(ix, 0) * 0.4 + 0.3
    const head = (hash(ix, 1) + t * speed) % 1.5 - 0.25
    if (y > head || y < head - 0.5) return 0
    return M.pow(1 - (head - y) / 0.5, 2)
  },

  binary_orbit: (x, y, t) => {
    const r = 0.27
    const s1x = M.cos(t*2)*r+0.5, s1y = M.sin(t*2)*r+0.5
    const s2x = M.cos(t*2+M.PI)*r+0.5, s2y = M.sin(t*2+M.PI)*r+0.5
    return ((x-s1x)**2+(y-s1y)**2 < 0.014 || (x-s2x)**2+(y-s2y)**2 < 0.014) ? 1 : 0
  },

  aurora: (x, y, t) => {
    const wave = M.sin(x * M.PI * 3 + t * 0.7) * 0.12 + 0.38
    const dist = M.abs(y - wave)
    return dist < 0.18 ? (1 - dist / 0.18) * (M.sin(x * M.PI * 5 + t) * 0.3 + 0.7) : 0
  },

  shooting_star: (x, y, t) => {
    const c = (t * 0.5) % 1
    const sx = c * 1.3 - 0.15, sy = c * 0.5 + 0.05
    const dx = x - sx, dy = y - sy
    const prj = dx * 0.9285 + dy * 0.3714
    const perp = M.abs(-dx * 0.3714 + dy * 0.9285)
    return perp < 0.06 && prj > -0.32 && prj < 0.04 ? M.max(0, 1 + prj / 0.32) : 0
  },

  black_hole: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy)
    const s = ((M.atan2(cy, cx) / (M.PI * 2) - r * 2.5 + t) % 1 + 1) % 1
    return r > 0.07 && r < 0.48 && M.abs(s - 0.5) < 0.08 + (0.48 - r) * 0.35 ? 1 : 0
  },

  pulsar: (x, y, t) => {
    const cx = x-0.5, cy = y-0.5
    const r = M.sqrt(cx*cx+cy*cy)
    const a = M.atan2(cy, cx)
    const b1 = M.pow(M.max(0, M.cos(a - t*2.5)), 8)
    const b2 = M.pow(M.max(0, M.cos(a - t*2.5 + M.PI)), 8)
    return M.min(1, (b1+b2) * M.exp(-r*5.5) * 3.5)
  },

  supernova: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy)
    const phase = (t * 0.5) % (M.PI * 2)
    const expand = (1 - M.cos(phase)) * 0.5   // 0→1 over one cycle
    const ring = M.exp(-M.pow((r - expand * 0.52) * 14, 2))
    const core = M.exp(-r * 22) * M.pow(1 - expand, 2)
    return M.min(1, ring * (1 - expand * 0.6) + core)
  },

  // Organic
  pulse: (x, y, t) => {
    const d = M.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2)
    return M.sin(t * 2) * 0.5 + 0.5 > d * 1.5 ? 1 : 0
  },

  fire: (x, y, t) => {
    const flicker = M.sin(x * M.PI * 7 + t * 9) * 0.1 + M.sin(x * M.PI * 3 + t * 5) * 0.1
    return (1 - y + flicker) * (1 - M.abs(x - 0.5) * 2.2) > 0.25 + M.sin(x * 11 + t * 7) * 0.12 ? 1 : 0
  },

  heartbeat: (x, y, t) => {
    const beat = M.max(0, M.sin(t * 1.8)) ** 2
    const d = M.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2)
    return d < beat * 0.45 + 0.05 ? (d < 0.05 ? 1 : beat) : 0
  },

  slime: (x, y, t) =>
    M.sin(x * M.PI * 4 + t * 0.8) * M.cos(y * M.PI * 5 - t * 0.6) +
    M.sin((x + y) * M.PI * 3 + t * 0.4) > 0.5 ? 1 : 0,

  moss: (x, y, t) => {
    const a = M.sin(x * 17.3 + y * 23.1 + t * 0.3) * 0.5
    const b = M.sin(x * 7.7 + y * 13.9 - t * 0.2) * 0.5
    return a + b > 0.25 ? 1 : 0
  },

  scatter: (x, y, t, ix, iy) => {
    const phase = (hash(ix, iy) + t * 0.4) % 1
    return phase < 0.25 ? 1 : 0
  },

  rain: (x, y, t, ix) => {
    const speed = 0.35 + hash(ix, 0) * 0.5
    const head = (hash(ix, 1) + t*speed) % 1.35 - 0.2
    if (y < head - 0.42 || y > head + 0.06) return 0
    if (y > head) return M.max(0, 1 - (y-head)/0.06)
    return M.pow(1 - (head-y)/0.42, 1.8) * 0.6
  },

  blob: (x, y, t) => {
    const cx = x-0.5, cy = y-0.5
    const a = M.atan2(cy, cx)
    const r = M.sqrt(cx*cx+cy*cy)
    const target = 0.28 + M.sin(a*3+t)*0.07 + M.sin(a*5-t*0.9)*0.04
    if (r > target + 0.07) return 0
    if (r > target) return (1-(r-target)/0.07)*0.55
    return 0.55 + (1-r/target)*0.45
  },

  breathe: (x, y, t) => {
    const r = M.sqrt((x-0.5)**2+(y-0.5)**2)
    const size = M.sin(t*0.9)*0.14 + 0.26
    if (r > size + 0.08) return 0
    if (r > size) return (1-(r-size)/0.08)*0.4
    return 0.4 + (1-r/size)*0.6
  },

  // Math
  xor: (x, y, t, ix, iy) => ((ix ^ iy) + M.floor(t * 5)) % 2 === 0 ? 1 : 0,

  sierpinski: (x, y, t, ix, iy) => {
    const s = M.floor(t * 1.5)
    return ((ix + s) & (iy + s)) === 0 ? 1 : 0
  },

  lissajous: (x, y, t) => {
    let min = Infinity
    for (let i = 0; i < 100; i++) {
      const s = (i / 100) * M.PI * 2
      const d = (x - M.sin(3*s+t)*0.45-0.5)**2 + (y - M.sin(2*s)*0.45-0.5)**2
      if (d < min) min = d
    }
    return min < 0.009 ? 1 : 0
  },

  rose: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx*cx + cy*cy)
    return M.abs(r - M.abs(M.cos(4 * (M.atan2(cy, cx) + t * 0.25))) * 0.44) < 0.08 ? 1 : 0
  },

  modular: (x, y, t, ix, iy) => (ix * iy) % (M.floor(t * 2) % 7 + 2) === 0 ? 1 : 0,

  noise: (x, y, t) => noise3d(x, y, t) > 0.5 ? 1 : 0,

  noise_smooth: (x, y, t) => noise3d(x, y, t),

  voronoi: (x, y, t) => {
    let d1 = Infinity, d2 = Infinity
    for (let i = 0; i < 6; i++) {
      const d = M.sqrt(
        (x - M.sin(i * 127.3 + t * 0.35) * 0.4 - 0.5) ** 2 +
        (y - M.cos(i * 311.7 + t * 0.28) * 0.4 - 0.5) ** 2
      )
      if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d
    }
    return d2 - d1 < 0.06 ? 1 : 0
  },

  plasma: (x, y, t) => {
    const v = M.sin(x*M.PI*8+t)
            + M.sin(y*M.PI*8-t*0.8)
            + M.sin((x+y)*M.PI*6+t*0.6)
            + M.sin(M.sqrt((x-0.5)**2+(y-0.5)**2)*M.PI*12-t*1.5)
    return v/4 + 0.5
  },

  julia: (x, y, t) => {
    const cr = M.sin(t*0.4)*0.7, ci = M.cos(t*0.3)*0.4
    let zr = x*2.5-1.25, zi = y*2.5-1.25
    let i = 0
    for (; i < 12; i++) {
      const nzr = zr*zr - zi*zi + cr
      zi = 2*zr*zi + ci; zr = nzr
      if (zr*zr+zi*zi > 4) break
    }
    return i / 12
  },

  // Loaders
  loading_bar: (x, y, t) => {
    const p = (t * 0.35) % 1
    if (y > 0.3 && y < 0.7 && (x < 0.05 || x > 0.95)) return 0.35
    return y > 0.38 && y < 0.62 && x < p * 0.9 + 0.05 ? 1 : 0
  },

  cascade: (x, y, t, ix, iy, w) => {
    const c = (t * 0.8) % 1, delay = (ix / M.max(1, w-1)) * 0.6
    const on = c > delay && c < delay + 0.3
    return on ? M.sin((c - delay) / 0.3 * M.PI) : 0
  },

  checker_wave: (x, y, t, ix, iy) => {
    const wave = M.sin((ix + iy) * 0.8 + t * 3) > 0 ? 1 : 0
    return (ix + iy) % 2 === 0 ? wave : 1 - wave
  },

  equalizer: (x, y, t, ix, iy, w) => {
    const bar = M.abs(M.sin(ix / M.max(1,w-1) * M.PI * 2.5 + t * 3)) * 0.75 + 0.1
    return y > 1 - bar ? 1 : 0
  },

  binary_count: (x, y, t, ix, iy, w, h) => {
    const total = M.floor((t * 6) % (w * h + 1))
    return iy * w + ix < total ? 1 : 0
  },

  matrix: (x, y, t, ix) => {
    const head = (hash(ix, 1) + t * (hash(ix, 0) * 0.45 + 0.3)) % 1.2 - 0.1
    if (y > head || y < head - 0.45) return 0
    return M.pow(1 - (head - y) / 0.45, 2)
  },

  ripple_grid: (x, y, t, ix, iy) => {
    const centers = [[1.5,1.5],[5.5,1.5],[1.5,5.5],[5.5,5.5]]
    const [cx, cy] = centers[M.floor(t * 1.5) % 4]
    return M.sin(M.sqrt((ix-cx)**2 + (iy-cy)**2) * M.PI * 1.5 - t * 4) > 0 ? 1 : 0
  },

  bouncing_ball: (x, y, t) =>
    (x - M.abs(M.sin(t*1.3))*0.8-0.1)**2 + (y - M.abs(M.sin(t*1.8))*0.8-0.1)**2 < 0.012 ? 1 : 0,

  spinner: (x, y, t) => {
    const cx = x-0.5, cy = y-0.5
    const r = M.sqrt(cx*cx+cy*cy)
    if (r < 0.14 || r > 0.43) return 0
    const a = ((M.atan2(cy,cx) + M.PI) / (M.PI*2) - t*0.6 + 2) % 1
    return a < 0.65 ? M.pow(a/0.65, 0.4) * (1-(r-0.14)/0.29) : 0
  },

  dots_wave: (x, y, t) => {
    for (let i = 0; i < 3; i++) {
      const px = (i+1)/4
      const py = 0.5 + M.sin(t*3 - i*1.1)*0.18
      if ((x-px)**2+(y-py)**2 < 0.014) return 1
    }
    return 0
  },

  orbit_loader: (x, y, t) => {
    const cx = x-0.5, cy = y-0.5
    const r = M.sqrt(cx*cx+cy*cy)
    if (M.abs(r-0.32)<0.025 || M.abs(r-0.16)<0.02) return 0.1
    const a1x = M.cos(t*2.5)*0.32+0.5, a1y = M.sin(t*2.5)*0.32+0.5
    const a2x = M.cos(-t*1.9)*0.16+0.5, a2y = M.sin(-t*1.9)*0.16+0.5
    return (x-a1x)**2+(y-a1y)**2<0.016 || (x-a2x)**2+(y-a2y)**2<0.012 ? 1 : 0
  },

  // Pixel Art
  invader: (x, y, t, ix, iy) => {
    const f = M.floor(t * 4) % 2
    return bit([
      0b01000010, 0b00100100, 0b01111110, 0b11011011,
      0b11111111, 0b01111110,
      f ? 0b10000001 : 0b01000010,
      f ? 0b01000010 : 0b10000001,
    ], ix, iy)
  },

  heart: (x, y, t, ix, iy) =>
    bit([0b00000000,0b01100110,0b11111111,0b11111111,
         0b01111110,0b00111100,0b00011000,0b00000000], ix, iy)
    * (M.sin(t * 1.8) * 0.3 + 0.7),

  tree: (x, y, t, ix, iy) =>
    bit([
      M.sin(t*5)>0.5 ? 0b00111000 : 0b00010000,
      0b00111000, 0b01111100, 0b00111000,
      0b01111100, 0b11111110, 0b00011000, 0b00011000,
    ], ix, iy),

  lightning: (x, y, t, ix, iy) =>
    bit([0b00011100,0b00111000,0b01110000,0b11111100,
         0b00011100,0b00111000,0b01110000,0b00000000], ix, iy)
    * (M.sin(t * 5) * 0.4 + 0.6),

  pacman: (x, y, t) => {
    const r = M.sqrt((x-0.35)**2 + (y-0.5)**2)
    return r < 0.34 && M.abs(M.atan2(y-0.5, x-0.35)) > M.abs(M.sin(t*6)) * 0.45 ? 1 : 0
  },

  ghost: (x, y, t, ix, iy) => {
    const f = M.floor(t*4)%2
    return bit([
      0b00111100,
      0b01111110,
      0b11011011,
      0b11111111,
      0b11111111,
      0b11111111,
      f ? 0b01101101 : 0b10110110,
      f ? 0b00010001 : 0b01000010,
    ], ix, iy)
  },

  rocket: (x, y, t, ix, iy) => {
    const f = M.floor(t*6)%2
    return bit([
      0b00011000,
      0b00111100,
      0b01111110,
      0b01111110,
      0b11111111,
      0b01111110,
      0b00100100,
      f ? 0b00011000 : 0b00100100,
    ], ix, iy)
  },

  worm: (x, y, t) => {
    let min = Infinity
    for (let i = 0; i < 6; i++) {
      const s = i / 6
      const d = (x - M.sin(t*1.5+s*M.PI*2)*0.33-0.5)**2 + (y - M.cos(t+s*M.PI*1.5)*0.33-0.5)**2
      if (d < min) min = d
    }
    return min < 0.013 ? 1 : 0
  },

  // Hourglass — sand trickles from top bulge through neck into bottom bulge
  hourglass: (x, y, t, ix, iy) => {
    const outline = [
      0b01111110,
      0b01000010,
      0b00100100,
      0b00011000,
      0b00011000,
      0b00100100,
      0b01000010,
      0b01111110,
    ]
    if (bit(outline, ix, iy)) return 1
    const c = (t * 0.45) % 1
    // Top interior: row1=cols2-5, row2=cols3-4
    if (iy === 1 && ix >= 2 && ix <= 5) return c < 0.55 ? 1 : 0
    if (iy === 2 && ix >= 3 && ix <= 4) return c < 0.28 ? 1 : 0
    // Drip through neck
    if (iy === 3 && ix === 3 && c > 0.18 && c < 0.55) return 0.85
    if (iy === 4 && ix === 4 && c > 0.35 && c < 0.65) return 0.85
    // Bottom interior fills
    if (iy === 5 && ix >= 3 && ix <= 4) return c > 0.72 ? 1 : 0
    if (iy === 6 && ix >= 2 && ix <= 5) return c > 0.52 ? 1 : 0
    return 0
  },

  // Battery — charges from empty to full then resets
  battery: (x, y, t, ix, iy) => {
    // Nub (top, centre)
    if (iy === 0 && (ix === 3 || ix === 4)) return 0.6
    // Outer casing
    if ((iy === 1 || iy === 7) && ix >= 1 && ix <= 6) return 1
    if ((ix === 1 || ix === 6) && iy >= 1 && iy <= 7) return 1
    // Fill rows 2-6 (5 rows), cols 2-5 (4 cols), bottom-up
    if (iy >= 2 && iy <= 6 && ix >= 2 && ix <= 5) {
      const fill = (t * 0.38) % 1
      const filledRows = M.floor(fill * 6)  // 0..5
      return (6 - iy) < filledRows ? 1 : 0
    }
    return 0
  },

  // Gear — rotating cog with hub, ring and 6 teeth
  gear: (x, y, t) => {
    const cx = x - 0.5, cy = y - 0.5
    const r = M.sqrt(cx * cx + cy * cy)
    const angle = M.atan2(cy, cx) - t * 1.4
    if (r < 0.09) return 0           // centre hole
    if (r < 0.18) return 1           // hub
    if (r < 0.26) return 0           // gap between hub and ring
    if (r < 0.38) return 1           // ring body
    // 6 teeth
    if (r < 0.50 && M.abs(M.sin(angle * 3)) > 0.45) return 1
    return 0
  },

  // Download — arrow descends into a filling progress bar
  download: (x, y, t, ix, iy) => {
    const progress = (t * 0.42) % 1
    // Shaft (rows 0-3, centre 2 cols)
    if (iy <= 3 && (ix === 3 || ix === 4)) return 1
    // Arrowhead (rows 4-5)
    if (iy === 4 && ix >= 2 && ix <= 5) return 1
    if (iy === 5 && (ix === 3 || ix === 4)) return 1
    // Progress bar track (row 7, dim)
    if (iy === 7 && ix >= 0 && ix <= 7) return 0.2
    // Progress bar fill
    if (iy === 7 && ix <= M.floor(progress * 8)) return 1
    return 0
  },
}

// ── Stateful Rules (Cellular Automata) ───────────────────────────────────────

function sandInit(w, h) {
  const grid = Array.from({length: h}, (_, iy) =>
    Array.from({length: w}, () => iy < 3 ? (M.random() < 0.4 ? 1 : 0) : 0)
  )
  grid._flipped = false
  return grid
}

export const STATEFUL_RULES = {
  conway: {
    init: (w, h) => Array.from({length: h}, () =>
      Array.from({length: w}, () => M.random() < 0.35 ? 1 : 0)
    ),
    step: (grid, w, h) => grid.map((row, iy) => row.map((cell, ix) => {
      let n = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (dx || dy) n += grid[(iy+dy+h)%h][(ix+dx+w)%w]
      return cell ? (n===2||n===3 ? 1 : 0) : (n===3 ? 1 : 0)
    })),
  },

  rule30: {
    init: (w, h) => Array.from({length: h}, (_, iy) =>
      Array.from({length: w}, (_, ix) => iy===0 && ix===M.floor(w/2) ? 1 : 0)
    ),
    step: (grid, w, h) => {
      const next = grid.map(row => [...row])
      for (let iy = h-1; iy > 0; iy--)
        for (let ix = 0; ix < w; ix++) next[iy][ix] = grid[iy-1][ix]
      for (let ix = 0; ix < w; ix++) {
        const l = grid[0][(ix-1+w)%w], c = grid[0][ix], r = grid[0][(ix+1)%w]
        next[0][ix] = (30 >> ((l<<2)|(c<<1)|r)) & 1
      }
      return next
    },
  },

  rule110: {
    init: (w, h) => Array.from({length: h}, (_, iy) =>
      Array.from({length: w}, (_, ix) => iy===0 ? (M.random() < 0.5 ? 1 : 0) : 0)
    ),
    step: (grid, w, h) => {
      const next = grid.map(row => [...row])
      for (let iy = h-1; iy > 0; iy--)
        for (let ix = 0; ix < w; ix++) next[iy][ix] = grid[iy-1][ix]
      for (let ix = 0; ix < w; ix++) {
        const l = grid[0][(ix-1+w)%w], c = grid[0][ix], r = grid[0][(ix+1)%w]
        next[0][ix] = (110 >> ((l<<2)|(c<<1)|r)) & 1
      }
      return next
    },
  },

  brian: {
    init: (w, h) => Array.from({length: h}, () =>
      Array.from({length: w}, () => {
        const r = M.random()
        return r < 0.45 ? 0 : r < 0.6 ? 1 : 0.5
      })
    ),
    step: (grid, w, h) => grid.map((row, iy) => row.map((cell, ix) => {
      if (cell === 1) return 0.5
      if (cell === 0.5) return 0
      let n = 0
      for (let dy=-1; dy<=1; dy++)
        for (let dx=-1; dx<=1; dx++)
          if (dx||dy) n += grid[(iy+dy+h)%h][(ix+dx+w)%w] === 1 ? 1 : 0
      return n === 2 ? 1 : 0
    })),
  },

  cyclic: {
    init: (w, h) => {
      const S = 5
      return Array.from({length: h}, () =>
        Array.from({length: w}, () => M.floor(M.random()*S) / (S-1))
      )
    },
    step: (grid, w, h) => {
      const S = 5
      return grid.map((row, iy) => row.map((cell, ix) => {
        const s = M.round(cell*(S-1))
        const ns = (s+1)%S
        const nv = ns/(S-1)
        for (let dy=-1; dy<=1; dy++)
          for (let dx=-1; dx<=1; dx++)
            if ((dx||dy) && M.round(grid[(iy+dy+h)%h][(ix+dx+w)%w]*(S-1))===ns) return nv
        return cell
      }))
    },
  },

  sand: {
    init: sandInit,
    step: (grid, w, h) => {
      const fullness = grid.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0) / (w * h)

      // Invert when ~3/4 full — hourglass flip
      if (!grid._flipped && fullness > 0.76) {
        const next = grid.map(row => row.map(c => 1 - c))
        next._flipped = true
        return next
      }

      const next = grid.map(row => [...row])
      next._flipped = !!grid._flipped

      // Gravity — sand falls down
      for (let iy = h - 2; iy >= 0; iy--) {
        for (let ix = 0; ix < w; ix++) {
          if (!grid[iy][ix]) continue
          if (!grid[iy+1][ix] && !next[iy+1][ix]) {
            next[iy][ix] = 0; next[iy+1][ix] = 1
          } else {
            const d = M.random() < 0.5 ? -1 : 1, nx = ix + d
            if (nx >= 0 && nx < w && !grid[iy+1][nx] && !next[iy+1][nx]) {
              next[iy][ix] = 0; next[iy+1][nx] = 1
            }
          }
        }
      }

      if (!grid._flipped) {
        // Add sand from top while filling
        if (M.random() < 0.35) {
          const ix = M.floor(M.random() * w)
          if (!next[0][ix]) next[0][ix] = 1
        }
      } else {
        // Resume filling once inverted sand has drained to bottom (top half empty)
        const topSand = grid.slice(0, M.floor(h / 2))
          .reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0)
        if (topSand === 0) next._flipped = false
      }

      return next
    },
  },
}

export const STATEFUL_PRESET_KEYS = new Set(Object.keys(STATEFUL_RULES))

// ── Exports ───────────────────────────────────────────────────────────────────

export const PRESET_GROUPS = [
  { label: 'Waves', presets: [
    ['Wave', 'wave'], ['Diagonal', 'diagonal'], ['Diamond Ripple', 'diamond_ripple'],
    ['Rings', 'rings'], ['Interference', 'interference'], ['Moire', 'moire'],
    ['Standing Wave', 'standing_wave'], ['Double Helix', 'double_helix'],
    ['Tunnel', 'tunnel'], ['Ripple Point', 'ripple_point'],
  ]},
  { label: 'Geometric', presets: [
    ['Rotate Cross', 'rotate_cross'], ['Rotate Star', 'rotate_star'],
    ['Spiral', 'spiral'], ['Vortex', 'vortex'], ['Propeller', 'propeller'],
    ['Radar', 'radar'], ['Clock', 'clock'],
    ['Pendulum', 'pendulum'], ['Orbit Rings', 'orbit_rings'],
  ]},
  { label: 'Cosmic', presets: [
    ['Stars', 'stars'], ['Meteor', 'meteor'], ['Binary Orbit', 'binary_orbit'],
    ['Aurora', 'aurora'], ['Shooting Star', 'shooting_star'], ['Black Hole', 'black_hole'],
    ['Pulsar', 'pulsar'], ['Supernova', 'supernova'],
  ]},
  { label: 'Organic', presets: [
    ['Pulse', 'pulse'], ['Fire', 'fire'], ['Heartbeat', 'heartbeat'],
    ['Slime', 'slime'], ['Moss', 'moss'], ['Scatter', 'scatter'],
    ['Rain', 'rain'], ['Blob', 'blob'], ['Breathe', 'breathe'],
  ]},
  { label: 'Math', presets: [
    ['Sierpinski', 'sierpinski'], ['Lissajous', 'lissajous'],
    ['Rose Curve', 'rose'], ['Modular', 'modular'], ['Noise', 'noise'],
    ['Noise Smooth', 'noise_smooth'], ['Voronoi', 'voronoi'],
    ['Plasma', 'plasma'], ['Julia', 'julia'],
  ]},
  { label: 'Cellular Automata', presets: [
    ['Conway', 'conway'], ['Rule 30', 'rule30'], ['Rule 110', 'rule110'],
    ['Sand', 'sand'], ["Brian's Brain", 'brian'], ['Cyclic', 'cyclic'],
  ]},
  { label: 'Loaders', presets: [
    ['Checker Wave', 'checker_wave'], ['Equalizer', 'equalizer'],
    ['Binary Count', 'binary_count'],
    ['Ripple Grid', 'ripple_grid'], ['Bouncing Ball', 'bouncing_ball'],
    ['Spinner', 'spinner'], ['Dots Wave', 'dots_wave'], ['Orbit Loader', 'orbit_loader'],
  ]},
  { label: 'Pixel Art', presets: [
    ['Invader', 'invader'], ['Heart', 'heart'], ['Tree', 'tree'],
    ['Lightning', 'lightning'], ['Pacman', 'pacman'], ['Worm', 'worm'],
    ['Ghost', 'ghost'], ['Rocket', 'rocket'],
  ]},
  { label: 'Custom', presets: [
    ['Custom', 'custom'],
  ]},
]

export const PRESET_OPTIONS = Object.fromEntries(
  PRESET_GROUPS.flatMap(g => g.presets)
)

export function getRule(preset, expression) {
  if (preset !== 'custom') return RULES[preset] ?? RULES.wave
  return buildCustomRule(expression)
}

export function buildCustomRule(expr) {
  if (!expr?.trim()) return () => 0
  try {
    return new Function(
      'x', 'y', 't', 'ix', 'iy', 'w', 'h',
      `const {sin,cos,tan,abs,floor,ceil,round,sqrt,pow,PI,min,max,sign,log} = Math;
       return +(${expr});`
    )
  } catch {
    return () => 0
  }
}

export const CUSTOM_DEFAULT = 'sin(x * PI * 6 + t * 3) > sin(y * PI * 2 + t)'

// Export raw function source for snippet generation
export const getRuleSource = (key) => {
  const fn = RULES[key]
  return fn ? fn.toString() : null
}

export const PIXEL_ART_KEYS = new Set([
  'invader','heart','tree','lightning','ghost','rocket','pacman','worm',
  'hourglass','battery','gear','download'
])
