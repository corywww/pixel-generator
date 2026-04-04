import { useRef, useEffect } from 'react'
import { getRule, STATEFUL_RULES, STATEFUL_PRESET_KEYS } from './rules'

export function usePixelGrid({ gridSize, fps, cellSize, gap, fg, bg, preset, expression }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const totalSize = gridSize * cellSize + (gridSize - 1) * gap
    canvas.width = totalSize
    canvas.height = totalSize

    const ctx = canvas.getContext('2d')
    const isStateful = STATEFUL_PRESET_KEYS.has(preset)

    // Initialize state grid for CA rules
    if (isStateful) {
      stateRef.current = STATEFUL_RULES[preset].init(gridSize, gridSize)
    }

    const ruleFn = isStateful ? null : getRule(preset, expression)
    const interval = 1000 / fps
    let startTime = null
    let lastFrameTime = -Infinity
    let rafId

    function frame(timestamp) {
      if (startTime === null) startTime = timestamp

      if (timestamp - lastFrameTime >= interval) {
        lastFrameTime = timestamp
        const t = (timestamp - startTime) / 1000

        // Evolve CA state
        if (isStateful && stateRef.current) {
          stateRef.current = STATEFUL_RULES[preset].step(stateRef.current, gridSize, gridSize)
        }

        ctx.fillStyle = bg
        ctx.fillRect(0, 0, totalSize, totalSize)

        for (let iy = 0; iy < gridSize; iy++) {
          for (let ix = 0; ix < gridSize; ix++) {
            let val = 0
            if (isStateful) {
              val = stateRef.current?.[iy]?.[ix] ?? 0
            } else {
              const x = gridSize > 1 ? ix / (gridSize - 1) : 0.5
              const y = gridSize > 1 ? iy / (gridSize - 1) : 0.5
              try { val = ruleFn(x, y, t, ix, iy, gridSize, gridSize) } catch { val = 0 }
              val = Math.max(0, Math.min(1, Number(val) || 0))
            }
            if (val > 0) {
              ctx.fillStyle = val >= 1 ? fg : lerpColor(bg, fg, val)
              ctx.fillRect(ix * (cellSize + gap), iy * (cellSize + gap), cellSize, cellSize)
            }
          }
        }
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [gridSize, fps, cellSize, gap, fg, bg, preset, expression])

  return canvasRef
}

function lerpColor(hex1, hex2, t) {
  const p = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
  const [r1,g1,b1] = p(hex1), [r2,g2,b2] = p(hex2)
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`
}
