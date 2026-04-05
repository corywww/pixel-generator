import { useRef, useEffect, useCallback, useState } from 'react'
import { useDrag } from '@use-gesture/react'

const STIFFNESS = 300
const DAMPING   = 30

export function useBottomSheet({ peekHeight, midHeight, fullHeight, defaultSnap = 2 }) {
  const sheetRef      = useRef(null)
  const snapPoints    = [fullHeight, midHeight, peekHeight]
  const initPos       = snapPoints[defaultSnap]
  const posRef        = useRef(initPos)
  const velRef        = useRef(0)
  const targetRef     = useRef(initPos)
  const rafRef        = useRef(null)
  const lastTsRef     = useRef(null)
  const dragStartRef  = useRef(0)
  const [snapIndex, setSnapIndex] = useState(defaultSnap)

  // Write transform directly to the DOM — no React re-render during animation
  const applyTransform = useCallback((pos) => {
    if (!sheetRef.current) return
    sheetRef.current.style.transform = `translateY(${Math.round(fullHeight - pos)}px)`
  }, [fullHeight])

  const stopRaf = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  const startSpring = useCallback(() => {
    stopRaf()
    lastTsRef.current = null

    function tick(now) {
      if (lastTsRef.current === null) lastTsRef.current = now
      const dt = Math.min((now - lastTsRef.current) / 1000, 0.05)
      lastTsRef.current = now

      const acc = (targetRef.current - posRef.current) * STIFFNESS - velRef.current * DAMPING
      velRef.current  += acc * dt
      posRef.current  += velRef.current * dt
      applyTransform(posRef.current)

      if (Math.abs(velRef.current) < 0.5 && Math.abs(posRef.current - targetRef.current) < 0.5) {
        posRef.current = targetRef.current
        velRef.current = 0
        applyTransform(targetRef.current)
        rafRef.current = null
        const idx = snapPoints.indexOf(targetRef.current)
        if (idx !== -1) setSnapIndex(idx)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [applyTransform, stopRaf, fullHeight, midHeight, peekHeight]) // eslint-disable-line react-hooks/exhaustive-deps

  const snapTo = useCallback((idx) => {
    targetRef.current = snapPoints[idx]
    velRef.current = 0
    startSpring()
  }, [startSpring, fullHeight, midHeight, peekHeight]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start at defaultSnap position
  useEffect(() => {
    applyTransform(initPos)
    return stopRaf
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function nearestSnap(pos, velPxMs) {
    // Project 150ms forward then pick closest snap point
    const projected = pos + velPxMs * 150
    let best = snapPoints[0], bestDist = Infinity
    for (const sp of snapPoints) {
      const d = Math.abs(projected - sp)
      if (d < bestDist) { bestDist = d; best = sp }
    }
    return best
  }

  const bind = useDrag(({ first, movement: [, my], velocity: [, vy], last }) => {
    if (first) {
      dragStartRef.current = posRef.current
      stopRaf()
    }

    if (!last) {
      // Positive my = dragging DOWN = sheet closing = pos decreasing
      const newPos = Math.max(peekHeight * 0.3, Math.min(fullHeight + 16, dragStartRef.current - my))
      posRef.current = newPos
      applyTransform(newPos)
    } else {
      // vy positive = moving down → want to close (decrease pos)
      const velPxMs    = -vy         // flip: upward gesture → positive vel → bigger snap
      const snap       = nearestSnap(posRef.current, velPxMs)
      targetRef.current = snap
      velRef.current   = velPxMs * 1000
      startSpring()
    }
  }, { axis: 'y', filterTaps: true, pointer: { touch: true, mouse: true } })

  return { sheetRef, bind, snapTo, snapIndex }
}
