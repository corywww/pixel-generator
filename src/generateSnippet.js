import { getRuleSource, STATEFUL_PRESET_KEYS, PIXEL_ART_KEYS, PRESET_GROUPS } from './rules'

export { PIXEL_ART_KEYS }

// Build a label lookup from PRESET_GROUPS
const LABEL = {}
for (const g of PRESET_GROUPS)
  for (const [label, key] of g.presets) LABEL[key] = label

// Helper functions inlined into every snippet (tiny, makes each snippet self-contained)
const HELPERS = `\
  const M = Math
  const hash = (a, b) => { const h = M.sin(a*127.1+b*311.7)*43758.5453; return h-M.floor(h) }
  const bit = (rows, ix, iy) => iy>=0&&iy<rows.length&&ix>=0&&ix<8?(rows[iy]>>(7-ix))&1:0
  const fade = u => u*u*u*(u*(u*6-15)+10)
  const lerp = (a, b, u) => a+(b-a)*u
  const noise3d = (x, y, t) => {
    const X=x*4,Y=y*4,T=t*0.4,xi=M.floor(X),yi=M.floor(Y),ti=M.floor(T)
    const xf=X-xi,yf=Y-yi,tf=T-ti
    const h=(a,b,c)=>hash(a+b*31+c*127,a*7+b*13)
    const z0=lerp(lerp(h(xi,yi,ti),h(xi+1,yi,ti),fade(xf)),lerp(h(xi,yi+1,ti),h(xi+1,yi+1,ti),fade(xf)),fade(yf))
    const z1=lerp(lerp(h(xi,yi,ti+1),h(xi+1,yi,ti+1),fade(xf)),lerp(h(xi,yi+1,ti+1),h(xi+1,yi+1,ti+1),fade(xf)),fade(yf))
    return lerp(z0,z1,fade(tf))
  }`

// Stateful CA rules — inlined as readable init + step + getVal
const STATEFUL_CODE = {
  conway: `\
  let grid = Array.from({length:SIZE}, () =>
    Array.from({length:SIZE}, () => Math.random() < 0.35 ? 1 : 0))
  function step() {
    grid = grid.map((row, iy) => row.map((cell, ix) => {
      let n = 0
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++)
        if (dx||dy) n += grid[(iy+dy+SIZE)%SIZE][(ix+dx+SIZE)%SIZE]
      return cell ? (n===2||n===3?1:0) : (n===3?1:0)
    }))
  }
  const getVal = (ix, iy) => grid[iy][ix]`,

  rule30: `\
  let grid = Array.from({length:SIZE}, (_,iy) =>
    Array.from({length:SIZE}, (_,ix) => iy===0 && ix===Math.floor(SIZE/2) ? 1 : 0))
  function step() {
    const next = grid.map(r => [...r])
    for (let iy=SIZE-1;iy>0;iy--) for (let ix=0;ix<SIZE;ix++) next[iy][ix]=grid[iy-1][ix]
    for (let ix=0;ix<SIZE;ix++) {
      const l=grid[0][(ix-1+SIZE)%SIZE], c=grid[0][ix], r=grid[0][(ix+1)%SIZE]
      next[0][ix] = (30 >> ((l<<2)|(c<<1)|r)) & 1
    }
    grid = next
  }
  const getVal = (ix, iy) => grid[iy][ix]`,

  rule110: `\
  let grid = Array.from({length:SIZE}, (_,iy) =>
    Array.from({length:SIZE}, () => iy===0 ? (Math.random()<0.5?1:0) : 0))
  function step() {
    const next = grid.map(r => [...r])
    for (let iy=SIZE-1;iy>0;iy--) for (let ix=0;ix<SIZE;ix++) next[iy][ix]=grid[iy-1][ix]
    for (let ix=0;ix<SIZE;ix++) {
      const l=grid[0][(ix-1+SIZE)%SIZE], c=grid[0][ix], r=grid[0][(ix+1)%SIZE]
      next[0][ix] = (110 >> ((l<<2)|(c<<1)|r)) & 1
    }
    grid = next
  }
  const getVal = (ix, iy) => grid[iy][ix]`,

  sand: `\
  let grid = Array.from({length:SIZE}, (_,iy) =>
    Array.from({length:SIZE}, () => iy < 3 ? (Math.random()<0.4?1:0) : 0))
  let flipped = false
  function step() {
    const full = grid.reduce((s,r)=>s+r.reduce((a,b)=>a+b,0),0)/(SIZE*SIZE)
    if (!flipped && full > 0.76) {
      grid = grid.map(r => r.map(c => 1-c)); flipped = true; return
    }
    const next = grid.map(r => [...r])
    for (let iy=SIZE-2;iy>=0;iy--) for (let ix=0;ix<SIZE;ix++) {
      if (!grid[iy][ix]) continue
      if (!grid[iy+1][ix] && !next[iy+1][ix]) { next[iy][ix]=0; next[iy+1][ix]=1 }
      else {
        const d=Math.random()<0.5?-1:1, nx=ix+d
        if (nx>=0&&nx<SIZE&&!grid[iy+1][nx]&&!next[iy+1][nx]) { next[iy][ix]=0; next[iy+1][nx]=1 }
      }
    }
    if (!flipped) {
      if (Math.random()<0.35) { const ix=Math.floor(Math.random()*SIZE); if(!next[0][ix]) next[0][ix]=1 }
    } else {
      const top = grid.slice(0,Math.floor(SIZE/2)).reduce((s,r)=>s+r.reduce((a,b)=>a+b,0),0)
      if (top===0) flipped = false
    }
    grid = next
  }
  const getVal = (ix, iy) => grid[iy][ix]`,

  brian: `\
  // States: 0 = dead, 0.5 = refractory, 1 = firing
  let grid = Array.from({length:SIZE}, () => Array.from({length:SIZE}, () => {
    const r = Math.random(); return r<0.45 ? 0 : r<0.6 ? 1 : 0.5
  }))
  function step() {
    grid = grid.map((row, iy) => row.map((cell, ix) => {
      if (cell===1) return 0.5
      if (cell===0.5) return 0
      let n = 0
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++)
        if (dx||dy) n += grid[(iy+dy+SIZE)%SIZE][(ix+dx+SIZE)%SIZE]===1 ? 1 : 0
      return n===2 ? 1 : 0
    }))
  }
  const getVal = (ix, iy) => grid[iy][ix]`,

  cyclic: `\
  const STATES = 5
  let grid = Array.from({length:SIZE}, () =>
    Array.from({length:SIZE}, () => Math.floor(Math.random()*STATES)/(STATES-1)))
  function step() {
    grid = grid.map((row, iy) => row.map((cell, ix) => {
      const s=Math.round(cell*(STATES-1)), ns=(s+1)%STATES, nv=ns/(STATES-1)
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++)
        if ((dx||dy) && Math.round(grid[(iy+dy+SIZE)%SIZE][(ix+dx+SIZE)%SIZE]*(STATES-1))===ns) return nv
      return cell
    }))
  }
  const getVal = (ix, iy) => grid[iy][ix]`,
}

export function generateSnippet({ preset, gridSize, cellSize, gap, fps, fg, bg, expression }) {
  const isPixelArt = PIXEL_ART_KEYS.has(preset)
  const isStateful = STATEFUL_PRESET_KEYS.has(preset)
  const size      = isPixelArt ? 8 : gridSize
  const label     = LABEL[preset] ?? preset
  const dim       = size * (cellSize + gap)
  const id        = `pl-${preset.replace(/_/g, '')}`
  const interval  = Math.round(1000 / fps)

  // Rule / state block
  let logicBlock
  if (preset === 'custom') {
    logicBlock = `  const rule = (x, y, t, ix, iy, w, h) => {
    const {sin,cos,tan,abs,floor,ceil,round,sqrt,pow,PI,min,max,sign,log} = Math
    return +(${expression})
  }`
  } else if (isStateful) {
    logicBlock = STATEFUL_CODE[preset] ?? `  const getVal = () => 0`
  } else {
    const src = getRuleSource(preset) ?? '() => 0'
    logicBlock = `  const rule = ${src}`
  }

  const valExpr  = isStateful
    ? 'getVal(ix, iy)'
    : '+rule(ix/(SIZE-1), iy/(SIZE-1), t, ix, iy, SIZE, SIZE)'
  const stepLine = isStateful ? '\n      step()' : ''

  const html = `<canvas id="${id}" width="${dim}" height="${dim}" style="image-rendering:pixelated"></canvas>`

  const js = `/* pixel loading — ${label}
   https://github.com/your-handle/pixel-loading  ← update this
   MIT licence — free to use and modify */
;(function () {
  const canvas = document.getElementById('${id}')
  const ctx    = canvas.getContext('2d')
  const SIZE = ${size}, CELL = ${cellSize}, GAP = ${gap}, FPS = ${fps}
  const FG = '${fg}', BG = '${bg}'
  const DIM = SIZE * (CELL + GAP)
  let last = 0

${HELPERS}

${logicBlock}

  ;(function loop(ts) {
    if (ts - last >= ${interval}) {
      last = ts${stepLine}
      const t = ts / 1000
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, DIM, DIM)
      for (let iy = 0; iy < SIZE; iy++)
        for (let ix = 0; ix < SIZE; ix++) {
          const v = Math.max(0, Math.min(1, ${valExpr} || 0))
          if (v > 0) {
            ctx.globalAlpha = v
            ctx.fillStyle = FG
            ctx.fillRect(ix * (CELL + GAP), iy * (CELL + GAP), CELL, CELL)
          }
        }
      ctx.globalAlpha = 1
    }
    requestAnimationFrame(loop)
  })(0)
})()`

  return { html, js, label, isPixelArt, isStateful, size }
}
