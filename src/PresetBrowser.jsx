import { useRef, useEffect, useState } from 'react'
import { STATEFUL_RULES, STATEFUL_PRESET_KEYS, getRule } from './rules'

// Canvas thumbnail: 8×8 pixels at 10px each = 80×80px internal resolution
const CELLS   = 8
const CELL_PX = 10
const THUMB   = CELLS * CELL_PX  // 80

// Reorganised groups — shorter names, logical categories, all ≤10 chars
export const DISPLAY_GROUPS = [
  { label: 'Waves', presets: [
    ['Wave', 'wave'], ['Diagonal', 'diagonal'], ['Rings', 'rings'], ['Interfere', 'interference'],
    ['Moiré', 'moire'], ['S. Wave', 'standing_wave'], ['Helix', 'double_helix'],
    ['Ripple', 'ripple_point'],
  ]},
  { label: 'Motion', presets: [
    ['Spiral', 'spiral'], ['Vortex', 'vortex'], ['Cross', 'rotate_cross'], ['Star', 'rotate_star'],
    ['Propeller', 'propeller'], ['Orbit', 'orbit_rings'], ['Radar', 'radar'],
    ['Clock', 'clock'],
  ]},
  { label: 'Space', presets: [
    ['Stars', 'stars'], ['Meteor', 'meteor'], ['Aurora', 'aurora'], ['Supernova', 'supernova'],
    ['Pulsar', 'pulsar'], ['Black Hole', 'black_hole'], ['Binary', 'binary_orbit'], ['Comet', 'shooting_star'],
  ]},
  { label: 'Organic', presets: [
    ['Fire', 'fire'], ['Rain', 'rain'],
    ['Slime', 'slime'], ['Moss', 'moss'], ['Scatter', 'scatter'], ['Blob', 'blob'],
    ['Breathe', 'breathe'],
  ]},
  { label: 'Math', presets: [
    ['Plasma', 'plasma'], ['Noise', 'noise'], ['Smooth', 'noise_smooth'], ['Voronoi', 'voronoi'],
    ['Julia', 'julia'], ['Rose', 'rose'], ['Lissajous', 'lissajous'], ['D. Ripple', 'diamond_ripple'],
  ]},
  { label: 'Cellular', presets: [
    ['Conway', 'conway'], ['Rule 30', 'rule30'], ['Rule 110', 'rule110'],
    ['Sand', 'sand'], ['Brian', 'brian'], ['Cyclic', 'cyclic'],
  ]},
  { label: 'Loaders', presets: [
    ['Dots', 'dots_wave'], ['Equalizer', 'equalizer'], ['Checker', 'checker_wave'],
    ['Digital', 'matrix'], ['Binary', 'binary_count'], ['Bounce', 'bouncing_ball'], ['Rip Grid', 'ripple_grid'],
    ['Orbit', 'orbit_loader'],
  ]},
  { label: 'Pixel Art', presets: [
    ['Pac-Man', 'pacman'], ['Worm', 'worm'],
    ['Hourglass', 'hourglass'], ['Battery', 'battery'],
    ['Gear', 'gear'],
  ]},
]

// All preset items in flat array for RAF loop
const PRESET_ITEMS = DISPLAY_GROUPS.flatMap(g =>
  g.presets.map(([label, key]) => ({ label, key, group: g.label }))
)

// Parse hex → [r, g, b]
function hexRgb(hex) {
  const h = hex.replace('#', '')
  const n = h.length === 3
    ? h.split('').map(c => parseInt(c + c, 16))
    : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
  return n.every(v => !isNaN(v)) ? n : [255, 255, 255]
}

export function PresetBrowser({ current, onSelect, fg = '#ffffff' }) {
  const canvasRefs = useRef({})   // key → canvas element
  const currentRef = useRef(current)
  const fgRef      = useRef(fg)
  const statesRef  = useRef({})
  const evolveRef  = useRef(0)
  const [hoveredKey, setHoveredKey] = useState(null)

  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => { fgRef.current = fg }, [fg])

  useEffect(() => {
    // Size each canvas
    PRESET_ITEMS.forEach(({ key }) => {
      const c = canvasRefs.current[key]
      if (c) { c.width = THUMB; c.height = THUMB }
    })

    // Init stateful grids
    PRESET_ITEMS.forEach(({ key }) => {
      if (STATEFUL_PRESET_KEYS.has(key)) {
        statesRef.current[key] = STATEFUL_RULES[key].init(CELLS, CELLS)
      }
    })

    // Pre-build stateless rule fns
    const ruleFns = {}
    PRESET_ITEMS.forEach(({ key }) => {
      if (!STATEFUL_PRESET_KEYS.has(key) && key !== 'custom') {
        ruleFns[key] = getRule(key, '')
      }
    })

    // Track which canvases are in the scrollable viewport
    const visible = new Set(PRESET_ITEMS.map(i => i.key))
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const key = e.target.dataset.presetKey
        if (!key) return
        if (e.isIntersecting) visible.add(key)
        else visible.delete(key)
      })
    }, { rootMargin: '120px', threshold: 0 })

    PRESET_ITEMS.forEach(({ key }) => {
      const c = canvasRefs.current[key]
      if (c) { c.dataset.presetKey = key; observer.observe(c) }
    })

    let rafId

    function frame(ts) {
      const t = ts / 1000

      // Step CAs at ~8 fps (only visible ones)
      if (ts - evolveRef.current > 125) {
        evolveRef.current = ts
        PRESET_ITEMS.forEach(({ key }) => {
          if (STATEFUL_PRESET_KEYS.has(key) && visible.has(key)) {
            statesRef.current[key] = STATEFUL_RULES[key].step(statesRef.current[key], CELLS, CELLS)
          }
        })
      }

      PRESET_ITEMS.forEach(({ key }) => {
        if (!visible.has(key)) return          // skip off-screen canvases
        const canvas = canvasRefs.current[key]
        if (!canvas) return
        const ctx  = canvas.getContext('2d')
        const live = key === currentRef.current
        const [fr, fg2, fb] = hexRgb(fgRef.current)

        ctx.clearRect(0, 0, THUMB, THUMB)

        for (let iy = 0; iy < CELLS; iy++) {
          for (let ix = 0; ix < CELLS; ix++) {
            let val = 0

            if (STATEFUL_PRESET_KEYS.has(key)) {
              val = statesRef.current[key]?.[iy]?.[ix] ?? 0
            } else if (key !== 'custom' && ruleFns[key]) {
              const x = ix / (CELLS - 1), y = iy / (CELLS - 1)
              try { val = ruleFns[key](x, y, t, ix, iy, CELLS, CELLS) } catch { val = 0 }
              val = Math.max(0, Math.min(1, Number(val) || 0))
            }

            if (val > 0) {
              const b = Math.min(1, val)
              ctx.fillStyle = live
                ? `rgb(${Math.round(fr*b)},${Math.round(fg2*b)},${Math.round(fb*b)})`
                : `rgb(${Math.round(255*b)},${Math.round(255*b)},${Math.round(255*b)})`
              ctx.fillRect(ix * CELL_PX, iy * CELL_PX, CELL_PX, CELL_PX)
            }
          }
        }
      })

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(rafId); observer.disconnect() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {DISPLAY_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 4 }}>

          {/* Group header */}
          <div style={{
            padding: '8px 12px 4px',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            userSelect: 'none',
          }}>
            {group.label}
          </div>

          {/* Grid — padded 12px each side to match header alignment */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            padding: '0 8px',
          }}>
            {group.presets.map(([label, key]) => {
              const live = key === current
              const hovered = hoveredKey === key
              return (
                <div
                  key={key}
                  onClick={() => onSelect(key)}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    cursor: 'pointer',
                    padding: '4px 4px 3px',
                    borderRadius: 5,
                    background: live
                      ? 'rgba(255,255,255,0.06)'
                      : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                    outline: live
                      ? `1.5px solid ${fg}`
                      : hovered ? '1.5px solid rgba(255,255,255,0.22)' : '1.5px solid transparent',
                    outlineOffset: '-1px',
                    transition: 'background 0.1s, outline-color 0.1s',
                  }}
                >
                  {/* Pixel canvas */}
                  <canvas
                    ref={el => {
                      if (el) { el.width = THUMB; el.height = THUMB }
                      canvasRefs.current[key] = el
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '1',
                      imageRendering: 'pixelated',
                      borderRadius: 2,
                    }}
                  />
                  {/* Label */}
                  <div style={{
                    marginTop: 3,
                    fontSize: 9.5,
                    fontWeight: live ? 600 : 400,
                    color: live ? fg : 'rgba(255,255,255,0.7)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.3,
                    userSelect: 'none',
                  }}>
                    {label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
