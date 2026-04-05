import { useEffect, useRef } from 'react'
import { useBottomSheet } from './useBottomSheet'
import { PresetBrowser } from './PresetBrowser'
import { PALETTES, T, PANEL, PaletteSection, Slider, SectionGroup } from './App'

const PEEK_H = 90

// ── MobileLayout ──────────────────────────────────────────────────────────────
// Full-screen canvas + spring-animated bottom sheet.

export function MobileLayout({
  canvasRef,
  gridSize, setGridSize, cellSize, setCellSize, gap, setGap,
  fps, setFps, palette, setPalette, fg, setFg, bg, setBg,
  preset, onSelectPreset, expression, setExpression,
  onExport,
}) {
  const windowH = window.innerHeight
  const FULL_H  = windowH - 56
  const MID_H   = Math.round(windowH * 0.48)

  const { sheetRef, bind, snapTo, snapIndex } = useBottomSheet({
    peekHeight: PEEK_H,
    midHeight:  MID_H,
    fullHeight: FULL_H,
  })

  // Scale canvas CSS size to fill available space above the peek
  const sizeCanvas = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const availW = window.innerWidth  - 48
    const availH = windowH - PEEK_H  - 56
    const size   = Math.min(availW, availH)
    canvas.style.width  = size + 'px'
    canvas.style.height = size + 'px'
    sizeCanvas.current  = size
  }, [canvasRef, windowH, PEEK_H])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: bg,
      transition: 'background 0.35s ease',
      fontFamily: T.font,
      '--accent': fg,
      overflow: 'hidden',
      touchAction: 'none',
    }}>

      {/* ── Canvas area ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: windowH - PEEK_H,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
      </div>

      {/* ── Attribution (top-right, stays above sheet) ── */}
      <a
        href="https://www.corywilliams.com.au"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute', top: 16, right: 16,
          zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px',
          background: `color-mix(in srgb, ${fg} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${fg} 18%, transparent)`,
          borderRadius: 20,
          color: `color-mix(in srgb, ${fg} 50%, transparent)`,
          fontSize: 10.5, fontFamily: T.font,
          fontWeight: 500, letterSpacing: '-0.01em',
          textDecoration: 'none',
        }}
      >
        Made by Cory Williams
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6 }}>
          <path d="M4 2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M6 1h3v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 1L5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </a>

      {/* ── Bottom sheet ── */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: FULL_H,
          background: PANEL.bg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px 16px 0 0',
          border: `1px solid ${T.border}`,
          borderBottom: 'none',
          willChange: 'transform',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >

        {/* ── Drag handle + peek row ── */}
        <div
          {...bind()}
          style={{
            flexShrink: 0,
            paddingTop: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            cursor: 'grab', touchAction: 'none', userSelect: 'none',
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 12,
          }}
        >
          {/* Handle bar */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.2)',
          }} />

          {/* Peek row: palette dots + active name + export */}
          <div style={{
            width: '100%',
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 8,
          }}>

            {/* Palette dots */}
            <div style={{ display: 'flex', gap: 7, flex: 1, flexWrap: 'nowrap' }}>
              {Object.entries(PALETTES).map(([key, p]) => (
                <button
                  key={key}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setPalette(key) }}
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: p.fg,
                    border: palette === key
                      ? '2.5px solid rgba(255,255,255,0.85)'
                      : '2.5px solid transparent',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    outline: 'none',
                    transition: 'border-color 0.15s, transform 0.15s',
                    transform: palette === key ? 'scale(1.18)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {/* Export button */}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onExport() }}
              style={{
                height: 34, padding: '0 14px',
                background: fg, border: 'none', borderRadius: 9,
                color: bg, fontSize: 12, fontWeight: 600,
                fontFamily: T.font, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M3.5 4L1.5 6L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 4L10.5 6L8.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 2.5L5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* ── Scrollable sheet content ── */}
        <div
          style={{
            flex: 1, overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            // Allow scroll inside sheet without triggering sheet drag
            touchAction: 'pan-y',
          }}
        >
          {/* Tap anywhere on the peek to expand to mid */}
          {snapIndex === 2 && (
            <button
              onClick={() => snapTo(1)}
              style={{
                width: '100%', height: 44,
                background: 'none', border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6,
                color: T.textMuted, fontSize: 11.5, fontFamily: T.font,
                userSelect: 'none',
              }}
            >
              <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                <path d="M1 6L6 1L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Tap to expand controls
            </button>
          )}

          <SectionGroup label="Colours" defaultOpen={snapIndex < 2}>
            <PaletteSection
              palette={palette} setPalette={setPalette}
              fg={fg} setFg={setFg} bg={bg} setBg={setBg}
            />
          </SectionGroup>

          <SectionGroup label="Canvas" defaultOpen={false}>
            <Slider label="Grid"       value={gridSize} min={4}  max={64} onChange={setGridSize} />
            <Slider label="Pixel size" value={cellSize} min={1}  max={32} onChange={setCellSize} />
            <Slider label="Gap"        value={gap}      min={0}  max={8}  onChange={setGap}      />
            <Slider label="FPS"        value={fps}      min={1}  max={60} onChange={setFps}      />
          </SectionGroup>

          <SectionGroup label="Presets" noBorder defaultOpen={snapIndex === 0}>
            <PresetBrowser current={preset} onSelect={onSelectPreset} fg={fg} />
          </SectionGroup>
        </div>

      </div>
    </div>
  )
}
