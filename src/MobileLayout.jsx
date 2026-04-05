import { useBottomSheet } from './useBottomSheet'
import { PresetBrowser } from './PresetBrowser'
import { PALETTES, T, PANEL, PaletteSection, Slider, SectionGroup } from './App'

// Sheet starts at 50% of screen height showing presets
// Drag up to ~90% to reveal colours + sliders
// Drag down to a minimal 56px handle strip

const PEEK_H = 56  // just handle + export button

export function MobileLayout({
  canvasRef,
  gridSize, setGridSize, cellSize, setCellSize, gap, setGap,
  fps, setFps, palette, setPalette, fg, setFg, bg, setBg,
  preset, onSelectPreset, expression, setExpression,
  onExport,
}) {
  const windowH = window.innerHeight
  const FULL_H  = windowH - 56
  const MID_H   = Math.round(windowH * 0.50)

  const { sheetRef, bind, snapTo, snapIndex } = useBottomSheet({
    peekHeight:  PEEK_H,
    midHeight:   MID_H,
    fullHeight:  FULL_H,
    defaultSnap: 1,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: bg,
      transition: 'background 0.35s ease',
      fontFamily: T.font,
      '--accent': fg,
      overflow: 'hidden',
    }}>

      {/* ── Canvas — top half ── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: windowH - MID_H,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
      </div>

      {/* ── Attribution — top right ── */}
      <a
        href="https://www.corywilliams.com.au"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top, 16px))',
          right: 16,
          zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px',
          background: `color-mix(in srgb, ${fg} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${fg} 18%, transparent)`,
          borderRadius: 20,
          color: `color-mix(in srgb, ${fg} 50%, transparent)`,
          fontSize: 10, fontFamily: T.font, fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        Made by Cory Williams
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

        {/* ── Drag handle + export row ── */}
        <div
          {...bind()}
          style={{
            flexShrink: 0,
            paddingTop: 10, paddingBottom: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: 'grab', touchAction: 'none', userSelect: 'none',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {/* Handle bar */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.2)',
          }} />

          {/* Export + active preset name */}
          <div style={{
            width: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.text,
              letterSpacing: '-0.02em',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <svg width="14" height="14" viewBox="0 0 4 4" style={{ flexShrink: 0 }}>
                <rect x="0"   y="0"   width="1.7" height="1.7" fill={fg} opacity="1"  />
                <rect x="2.3" y="0"   width="1.7" height="1.7" fill={fg} opacity="0.5"/>
                <rect x="0"   y="2.3" width="1.7" height="1.7" fill={fg} opacity="0.3"/>
                <rect x="2.3" y="2.3" width="1.7" height="1.7" fill={fg} opacity="0.8"/>
              </svg>
              Pixel Generator
            </div>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onExport() }}
              style={{
                height: 32, padding: '0 14px',
                background: fg, border: 'none', borderRadius: 8,
                color: bg, fontSize: 11.5, fontWeight: 600,
                fontFamily: T.font, cursor: 'pointer',
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

        {/* ── Scrollable content ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}>
          {/* Colours + Canvas sliders — collapsed by default, expand by dragging up */}
          <SectionGroup label="Colours" defaultOpen={false}>
            <PaletteSection
              palette={palette} setPalette={setPalette}
              fg={fg} setFg={setFg} bg={bg} setBg={setBg}
            />
          </SectionGroup>

          <SectionGroup label="Canvas" defaultOpen={false}>
            <Slider label="Grid"       value={gridSize} min={4}  max={64} onChange={setGridSize} />
            <Slider label="Pixel size" value={cellSize} min={1}  max={32} onChange={setCellSize} />
            <Slider label="Gap"        value={gap}      min={0}  max={8}  onChange={setGap}      />
            <Slider label="FPS"        value={fps}      min={1}  max={60} onChange={setFps} />
          </SectionGroup>

          {/* Presets — always visible at default 50% height */}
          <SectionGroup label="Presets" noBorder defaultOpen>
            <PresetBrowser current={preset} onSelect={onSelectPreset} fg={fg} />
          </SectionGroup>
        </div>

      </div>
    </div>
  )
}
