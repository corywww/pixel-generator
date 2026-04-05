import { useState, useEffect, useRef } from 'react'
import { MobileLayout } from './MobileLayout'
import { usePixelGrid } from './usePixelGrid'
import { PresetBrowser, DISPLAY_GROUPS } from './PresetBrowser'
import { generateSnippet, PIXEL_ART_KEYS } from './generateSnippet'
import { CUSTOM_DEFAULT } from './rules'

const PRESET_FLAT = DISPLAY_GROUPS.flatMap(g => g.presets.map(([, key]) => key))

// ── Design tokens ─────────────────────────────────────────────────────────────

export const T = {
  sidebar:   '#141517',
  surface:   '#252729',
  border:    'rgba(255,255,255,0.13)',
  text:      '#f0f1f3',
  textSub:   'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.38)',
  font:      '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
  mono:      '"JetBrains Mono", "SF Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
  ease:      'cubic-bezier(0.4, 0, 0.2, 1)',
}

// ── Palettes ──────────────────────────────────────────────────────────────────

export const PALETTES = {
  matrix:   { label: 'Matrix',   fg: '#39d353', bg: '#0d1117' },
  void:     { label: 'Void',     fg: '#ffffff', bg: '#0a0a0a' },
  paper:    { label: 'Paper',    fg: '#2d2d2d', bg: '#f0ece0' },
  slate:    { label: 'Slate',    fg: '#1e2d4a', bg: '#edf1f7' },
  amber:    { label: 'Amber',    fg: '#ffb000', bg: '#130f00' },
  sepia:    { label: 'Sepia',    fg: '#c9a96e', bg: '#100e08' },
  phosphor: { label: 'Phosphor', fg: '#00d4ff', bg: '#001219' },
  crimson:  { label: 'Crimson',  fg: '#ff4560', bg: '#130008' },
  neon:     { label: 'Neon',     fg: '#ff2cf7', bg: '#0d0010' },
}

// ── Global CSS ────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

input[type=range] {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 18px;
  background: transparent; outline: none; cursor: pointer;
}
input[type=range]::-webkit-slider-runnable-track {
  height: 3px; border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--accent) var(--fill, 0%),
    rgba(255,255,255,0.1) var(--fill, 0%)
  );
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 13px; height: 13px; border-radius: 50%;
  background: #fff; margin-top: -5px;
  box-shadow: 0 0 0 1.5px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.45);
  transition: transform 0.12s ease;
}
input[type=range]:hover::-webkit-slider-thumb { transform: scale(1.15); }
input[type=range]::-moz-range-track {
  height: 3px; border-radius: 2px; background: rgba(255,255,255,0.1);
}
input[type=range]::-moz-range-progress {
  height: 3px; border-radius: 2px; background: var(--accent);
}
input[type=range]::-moz-range-thumb {
  width: 13px; height: 13px; border-radius: 50%; border: none;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

/* Native colour picker — full-bleed, no chrome */
input[type=color] {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 32px; display: block;
  border: none; padding: 0; cursor: pointer;
  border-radius: 4px;
}
input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
input[type=color]::-webkit-color-swatch { border: none; border-radius: 4px; }

input[type=text]:focus, textarea:focus { outline: none !important; }
select { cursor: pointer; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

/* ── Mobile ── */
@media (max-width: 768px) {
  html, body { overscroll-behavior: none; touch-action: none; }

  input[type=range] { height: 44px; padding: 14px 0; }
  input[type=range]::-webkit-slider-thumb {
    width: 20px; height: 20px; margin-top: -8.5px;
  }
  input[type=range]::-moz-range-thumb { width: 20px; height: 20px; }
}
`

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
}

// ── Smooth reveal wrapper (grid trick) ────────────────────────────────────────
// Animates height from 0 → auto without knowing the content height.

function Reveal({ open, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: open ? '1fr' : '0fr',
      transition: `grid-template-rows 0.22s ${T.ease}`,
    }}>
      <div style={{ overflow: 'hidden', minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', gap: 8 }}>
      <div style={{
        flex: '0 0 80px', fontSize: 11.5, color: T.text,
        fontFamily: T.font, userSelect: 'none', whiteSpace: 'nowrap',
        letterSpacing: '-0.005em',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ── SectionGroup (collapsible) ────────────────────────────────────────────────

export function SectionGroup({ label, noBorder, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: noBorder ? 'none' : `1px solid ${T.border}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em',
          color: T.text, fontFamily: T.font,
          userSelect: 'none',
        }}
      >
        {label}
        <svg width="6" height="5" viewBox="0 0 6 5" style={{
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: `transform 0.2s ${T.ease}`,
          opacity: 0.5, flexShrink: 0,
        }}>
          <polygon points="0,0 6,0 3,5" fill="currentColor" />
        </svg>
      </button>
      <Reveal open={open}>
        <div style={{ padding: '2px 16px 12px' }}>
          {children}
        </div>
      </Reveal>
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────────────────────

export function Slider({ label, value, min, max, step = 1, onChange }) {
  const pct = ((value - min) / (max - min) * 100).toFixed(1) + '%'
  return (
    <Row label={label}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, '--fill': pct }}
      />
      <div style={{
        fontSize: 11.5, fontFamily: T.mono, fontVariantNumeric: 'tabular-nums',
        color: T.text, textAlign: 'right', minWidth: 28, flexShrink: 0,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
    </Row>
  )
}

// ── ColorSwatch (single clickable swatch opening OS picker) ──────────────────

function ColorSwatch({ value, onChange }) {
  return (
    <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 6,
        background: value, border: '1px solid rgba(255,255,255,0.18)',
        pointerEvents: 'none',
      }} />
      <input
        type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', border: 'none', padding: 0,
        }}
      />
    </div>
  )
}

// ── HexInput ──────────────────────────────────────────────────────────────────

function HexInput({ label, value, onChange }) {
  return (
    <Row label={label}>
      <ColorSwatch value={value} onChange={onChange} />
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1, minWidth: 0,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 4, color: T.text, fontSize: 11,
          fontFamily: T.mono, padding: '3px 6px', height: 26,
        }}
      />
    </Row>
  )
}

// ── PaletteSection (6 thumbnail swatches + custom expand) ─────────────────────

export function PaletteSection({ palette, setPalette, fg, setFg, bg, setBg }) {
  const [customOpen, setCustomOpen] = useState(false)
  const keys = Object.keys(PALETTES)

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 5, padding: '2px 0 10px',
      }}>
        {keys.map(key => {
          const p = PALETTES[key]
          const active = palette === key
          return (
            <button
              key={key}
              onClick={() => { setPalette(key); setCustomOpen(false) }}
              style={{
                position: 'relative', height: 38, borderRadius: 7,
                background: p.bg, border: active
                  ? `1.5px solid ${p.fg}`
                  : `1px solid rgba(255,255,255,0.08)`,
                cursor: 'pointer', overflow: 'hidden', padding: 0,
                boxShadow: active ? `0 0 0 1px ${p.fg}22` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.01em',
                color: p.fg, opacity: active ? 1 : 0.7,
                fontFamily: T.font,
              }}>
                {p.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom toggle row */}
      <button
        onClick={() => setCustomOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '6px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: customOpen ? T.text : T.textSub,
          fontFamily: T.font, letterSpacing: '-0.005em',
          userSelect: 'none',
        }}
      >
        Custom colours
        <svg width="6" height="5" viewBox="0 0 6 5" style={{
          transform: customOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: `transform 0.2s ${T.ease}`, opacity: 0.35,
        }}>
          <polygon points="0,0 6,0 3,5" fill="currentColor" />
        </svg>
      </button>
      <Reveal open={customOpen}>
        <div style={{ paddingTop: 4 }}>
          <HexInput label="Foreground" value={fg} onChange={setFg} />
          <HexInput label="Background" value={bg} onChange={setBg} />
        </div>
      </Reveal>
    </div>
  )
}

// ── Shared floating panel style ───────────────────────────────────────────────

export const PANEL = {
  bg:     'rgba(18, 19, 23, 0.96)',
  radius: 14,
}

// ── LeftPanel (controls + presets, unified) ───────────────────────────────────

function LeftPanel({
  gridSize, setGridSize, cellSize, setCellSize, gap, setGap,
  fps, setFps, palette, setPalette,
  fg, setFg, bg, setBg, preset, onSelectPreset, expression, setExpression,
  onExport,
}) {
  const [presetsOpen, setPresetsOpen] = useState(true)

  return (
    <div style={{
      width: 288,
      background: PANEL.bg,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${T.border}`,
      borderRadius: PANEL.radius,
      display: 'flex', flexDirection: 'column',
      pointerEvents: 'all',
      // Fill space when presets open so the region can scroll.
      // Otherwise shrink to content height.
      flex: presetsOpen ? '1 1 0' : '0 0 auto',
      minHeight: 0,
      transition: `flex 0.3s ${T.ease}`,
      overflow: 'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        height: 50, display: 'flex', alignItems: 'center',
        padding: '0 12px 0 14px', gap: 10,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <svg width="18" height="18" viewBox="0 0 4 4" style={{ flexShrink: 0 }}>
          <rect x="0"   y="0"   width="1.7" height="1.7" fill={fg} opacity="1"  />
          <rect x="2.3" y="0"   width="1.7" height="1.7" fill={fg} opacity="0.5"/>
          <rect x="0"   y="2.3" width="1.7" height="1.7" fill={fg} opacity="0.3"/>
          <rect x="2.3" y="2.3" width="1.7" height="1.7" fill={fg} opacity="0.8"/>
        </svg>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: T.text, letterSpacing: '-0.015em', lineHeight: 1.2 }}>
          Pixel Generator
        </div>
      </div>

      {/* ── Controls — always fully visible (no scroll) ── */}
      <div style={{ flexShrink: 0 }}>
        <SectionGroup label="Colors">
          <PaletteSection
            palette={palette} setPalette={setPalette}
            fg={fg} setFg={setFg} bg={bg} setBg={setBg}
          />
        </SectionGroup>
        <SectionGroup label="Canvas">
          <Slider label="Grid"       value={gridSize} min={4}  max={64} onChange={setGridSize} />
          <Slider label="Pixel size" value={cellSize} min={1}  max={32} onChange={setCellSize} />
          <Slider label="Gap"        value={gap}      min={0}  max={8}  onChange={setGap}      />
        </SectionGroup>
        <SectionGroup label="Animation" noBorder>
          <Slider label="FPS" value={fps} min={1} max={60} onChange={setFps} />
        </SectionGroup>
      </div>

      {/* ── Presets — scrollable in own flex region ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        borderTop: `1px solid ${T.border}`,
      }}>
        <button
          onClick={() => setPresetsOpen(v => !v)}
          style={{
            flexShrink: 0,
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '10px 16px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em',
            color: T.text, fontFamily: T.font,
            userSelect: 'none',
            borderBottom: presetsOpen ? `1px solid ${T.border}` : 'none',
          }}
        >
          Presets
          <div style={{ marginLeft: 'auto', marginRight: 8, display: 'flex', gap: 4 }}>
            {[['←', -1], ['→', 1]].map(([arrow, dir]) => (
              <button
                key={arrow}
                onClick={e => {
                  e.stopPropagation()
                  onSelectPreset(cur => {
                    const i = PRESET_FLAT.indexOf(cur)
                    return PRESET_FLAT[(i + dir + PRESET_FLAT.length) % PRESET_FLAT.length]
                  })
                }}
                style={{
                  width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 4,
                  color: T.textMuted,
                  fontSize: 10, lineHeight: 1,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: T.font,
                  transition: 'background 0.12s, color 0.12s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.13)'
                  e.currentTarget.style.color = T.text
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.color = T.textMuted
                }}
              >
                {arrow}
              </button>
            ))}
          </div>
          <svg width="6" height="5" viewBox="0 0 6 5" style={{
            transform: presetsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: `transform 0.2s ${T.ease}`, opacity: 0.35, flexShrink: 0,
          }}>
            <polygon points="0,0 6,0 3,5" fill="currentColor" />
          </svg>
        </button>
        {presetsOpen && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <PresetBrowser current={preset} onSelect={onSelectPreset} fg={fg} />
          </div>
        )}
      </div>

      {/* ── Expression — only when custom preset selected, pinned at base ── */}
      {preset === 'custom' && (
        <div style={{
          flexShrink: 0,
          borderTop: `1px solid ${T.border}`,
          padding: '10px 16px 14px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '-0.01em',
            color: T.text, fontFamily: T.font, marginBottom: 8,
          }}>
            Expression
          </div>
          <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textMuted, marginBottom: 6 }}>
            fn(x, y, t, ix, iy, w, h) → 0..1
          </div>
          <textarea
            value={expression} onChange={e => setExpression(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%', background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 4, color: T.text, fontSize: 11,
              fontFamily: T.mono, padding: '5px 7px',
              resize: 'none', height: 60, lineHeight: 1.5,
            }}
          />
        </div>
      )}

      {/* ── Export button — pinned at base of panel ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 12px 12px',
        borderTop: `1px solid ${T.border}`,
      }}>
        <button
          onClick={onExport}
          style={{
            width: '100%', height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8,
            background: fg,
            border: 'none',
            borderRadius: 9,
            cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: bg,
            fontFamily: T.font, letterSpacing: '-0.01em',
            userSelect: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" style={{ color: bg, opacity: 0.55 }}>
            <path d="M3.5 4L1.5 6L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 4L10.5 6L8.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 2.5L5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Export to code
        </button>
      </div>
    </div>
  )
}

// ── Syntax highlighting ───────────────────────────────────────────────────────

// One Dark Pro–inspired palette
const HL = {
  comment:  '#5c6370',   // muted gray — clearly secondary
  string:   '#98c379',   // green — easy to scan
  number:   '#d19a66',   // warm orange
  keyword:  '#c678dd',   // purple — control flow
  builtin:  '#e5c07b',   // yellow — Math, Array, etc.
  tag:      '#e06c75',   // soft red — HTML tags
  attr:     '#d19a66',   // orange — HTML attributes
  plain:    '#abb2bf',   // base text — blue-gray, easier on eyes than white
  punct:    'rgba(171,178,191,0.55)', // faint — braces/semicolons recede
}

const JS_KW = new Set([
  'const','let','var','function','return','if','else','for','while','do',
  'break','continue','new','this','true','false','null','undefined',
  'typeof','instanceof','in','of','class','export','default',
  'async','await','try','catch','finally','throw','switch','case',
])

const JS_BUILTIN = new Set([
  'Math','Array','Object','String','Number','Boolean','Date','JSON',
  'Promise','Error','Map','Set','console','document','window',
  'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent',
  'requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout',
])

function tokenizeHtml(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    if (src[i] === '<') {
      let j = i + 1
      while (j < src.length && src[j] !== '>') {
        if (src[j] === '"') { j++; while (j < src.length && src[j] !== '"') j++ }
        j++
      }
      out.push({ c: HL.tag, t: src.slice(i, Math.min(j + 1, src.length)) })
      i = j + 1
    } else {
      let j = i
      while (j < src.length && src[j] !== '<') j++
      if (j > i) out.push({ c: HL.plain, t: src.slice(i, j) })
      i = j
    }
  }
  return out
}

function tokenizeJs(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    // line comment
    if (c === '/' && src[i+1] === '/') {
      let j = i
      while (j < src.length && src[j] !== '\n') j++
      out.push({ c: HL.comment, t: src.slice(i, j) }); i = j; continue
    }
    // block comment
    if (c === '/' && src[i+1] === '*') {
      let j = i + 2
      while (j < src.length - 1 && !(src[j] === '*' && src[j+1] === '/')) j++
      j = Math.min(j + 2, src.length)
      out.push({ c: HL.comment, t: src.slice(i, j) }); i = j; continue
    }
    // template literal
    if (c === '`') {
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '`') { j++; break }
        j++
      }
      out.push({ c: HL.string, t: src.slice(i, j) }); i = j; continue
    }
    // string
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === c) { j++; break }
        j++
      }
      out.push({ c: HL.string, t: src.slice(i, j) }); i = j; continue
    }
    // number
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.eE]/.test(src[j])) j++
      out.push({ c: HL.number, t: src.slice(i, j) }); i = j; continue
    }
    // identifier / keyword / builtin
    if (/[a-zA-Z_$]/.test(c)) {
      let j = i
      while (j < src.length && /[a-zA-Z0-9_$]/.test(src[j])) j++
      const word = src.slice(i, j)
      const color = JS_KW.has(word) ? HL.keyword
        : JS_BUILTIN.has(word)      ? HL.builtin
        : HL.plain
      out.push({ c: color, t: word })
      i = j; continue
    }
    // punctuation — braces, parens, operators recede slightly
    if (/[{}()[\];,.]/.test(c)) {
      out.push({ c: HL.punct, t: c }); i++; continue
    }
    out.push({ c: HL.plain, t: c }); i++
  }
  return out
}

function mergeAndRender(tokens) {
  // Collapse adjacent plain tokens to reduce React node count
  const merged = []
  for (const tok of tokens) {
    if (tok.c === HL.plain && merged.length && merged[merged.length - 1].c === HL.plain) {
      merged[merged.length - 1].t += tok.t
    } else {
      merged.push({ ...tok })
    }
  }
  return merged.map((tok, idx) =>
    tok.c === HL.plain
      ? <span key={idx}>{tok.t}</span>
      : <span key={idx} style={{ color: tok.c }}>{tok.t}</span>
  )
}

function CodeHighlight({ code }) {
  const si = code.indexOf('<script>\n')
  if (si === -1) return <>{mergeAndRender(tokenizeJs(code))}</>

  const ei = code.lastIndexOf('\n</script>')
  const before = code.slice(0, si)
  const js = ei === -1
    ? code.slice(si + '<script>\n'.length)
    : code.slice(si + '<script>\n'.length, ei)

  return (
    <>
      {mergeAndRender(tokenizeHtml(before))}
      <span style={{ color: HL.tag }}>{'<script>'}</span>{'\n'}
      {mergeAndRender(tokenizeJs(js))}
      {ei !== -1 && <>{'\n'}<span style={{ color: HL.tag }}>{'</script>'}</span></>}
    </>
  )
}

// ── ExportModal ───────────────────────────────────────────────────────────────

const CODE_SIZE = 13.5
const CODE_LINE_H = 1.7
const CODE_BG = '#09090c'

function ExportModal({ params, onClose }) {
  const [copied, setCopied] = useState(false)
  const { html, js, label, isPixelArt } = generateSnippet(params)
  const full = `${html}\n<script>\n${js}\n</script>`
  const lineCount = full.split('\n').length
  const gutterWidth = lineCount >= 100 ? 52 : 44

  function copy() {
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(85vw, 1400px)', maxWidth: 'calc(100vw - 32px)',
          height: 'calc(100dvh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          marginTop: 'max(20px, env(safe-area-inset-top, 20px))',
          background: PANEL.bg,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${T.border}`,
          borderRadius: PANEL.radius,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          flexShrink: 0, height: 52,
          display: 'flex', alignItems: 'center',
          padding: '0 14px 0 18px', gap: 12,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <svg width="15" height="15" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
            <path d="M3.5 4L1.5 6L3.5 8" stroke={T.text} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 4L10.5 6L8.5 8" stroke={T.text} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 2.5L5 9.5" stroke={T.text} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
            Export to code
          </div>
          {/* File tag */}
          <div style={{
            fontSize: 11, fontFamily: T.mono,
            color: T.textMuted, letterSpacing: 0,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${T.border}`,
            borderRadius: 5, padding: '2px 8px',
          }}>
            snippet.html
          </div>
          {/* Line count */}
          <div style={{
            fontSize: 11, fontFamily: T.mono,
            color: T.textMuted,
          }}>
            {lineCount} lines
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T.textMuted, fontSize: 20, lineHeight: 1,
              padding: '3px 6px', borderRadius: 4,
              fontFamily: T.font, marginLeft: 2,
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = T.text }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textMuted }}
          >
            ×
          </button>
        </div>

        {/* ── Pixel art warning ── */}
        {isPixelArt && params.gridSize !== 8 && (
          <div style={{
            flexShrink: 0, padding: '8px 18px',
            background: 'rgba(255,180,0,0.06)',
            borderBottom: `1px solid rgba(255,180,0,0.12)`,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 12 }}>⚠</span>
            <span style={{ fontSize: 11, color: 'rgba(255,200,80,0.85)', lineHeight: 1.5 }}>
              <strong>{label}</strong> is 8×8. Grid is {params.gridSize}×{params.gridSize} — snippet uses 8×8.
            </span>
          </div>
        )}

        {/* ── Code area — line numbers + code in shared scroll ── */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto', overflowX: 'auto',
          background: CODE_BG,
        }}>
          <div style={{ display: 'flex', minWidth: 'fit-content' }}>

            {/* Gutter — sticky left so it stays visible on h-scroll */}
            <div style={{
              flexShrink: 0, width: gutterWidth,
              padding: `16px 0`,
              background: CODE_BG,
              borderRight: '1px solid rgba(255,255,255,0.05)',
              position: 'sticky', left: 0, zIndex: 1,
              userSelect: 'none',
            }}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{
                  paddingRight: 14, paddingLeft: 8,
                  textAlign: 'right',
                  fontSize: CODE_SIZE, lineHeight: CODE_LINE_H,
                  fontFamily: T.mono,
                  color: 'rgba(255,255,255,0.2)',
                }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code */}
            <pre style={{
              flex: 1, margin: 0,
              padding: '16px 28px 24px 20px',
              fontSize: CODE_SIZE, lineHeight: CODE_LINE_H,
              fontFamily: T.mono,
              color: HL.plain,
              whiteSpace: 'pre',
              tabSize: 2,
            }}>
              <CodeHighlight code={full} />
            </pre>

          </div>
        </div>

        {/* ── Footer / copy ── */}
        <div style={{
          flexShrink: 0,
          padding: '10px 14px max(14px, env(safe-area-inset-bottom, 14px))',
          borderTop: `1px solid ${T.border}`,
          background: PANEL.bg,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <button onClick={copy} style={{
            flex: 1, height: 38,
            background: copied ? 'rgba(80,200,120,0.12)' : params.fg,
            border: `1.5px solid ${copied ? 'rgba(80,200,120,0.45)' : params.fg}`,
            borderRadius: 8, cursor: 'pointer',
            color: copied ? '#50c878' : params.bg,
            fontSize: 12.5, fontFamily: T.font, fontWeight: 600,
            letterSpacing: '-0.015em',
            transition: 'all 0.18s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            {copied
              ? <><span style={{ fontSize: 14 }}>✓</span> Copied!</>
              : <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="4.5" y="0.5" width="8" height="10" rx="1.5" stroke={params.bg} strokeWidth="1.2" opacity="0.55"/>
                    <rect x="0.5" y="2.5" width="8" height="10" rx="1.5" stroke={params.bg} strokeWidth="1.2" fill={params.fg}/>
                  </svg>
                  Copy to clipboard
                </>
            }
          </button>
        </div>

      </div>
    </div>
  )
}

// ── useIsMobile ───────────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth <= breakpoint)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = e => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return mobile
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [gridSize,   setGridSize]   = useState(8)
  // On mobile, default to a larger cell size so the canvas fills the screen nicely
  const [cellSize,   setCellSize]   = useState(() =>
    window.innerWidth <= 768 ? Math.max(8, Math.floor((window.innerWidth * 0.46) / 8)) : 8
  )
  const [gap,        setGap]        = useState(2)
  const [fps,        setFps]        = useState(12)
  const [palette,    setPalette]    = useState('matrix')
  const [fg,         setFg]         = useState('#39d353')
  const [bg,         setBg]         = useState('#0d1117')
  const [preset,        setPreset]        = useState('wave')
  const [expression,    setExpression]    = useState(CUSTOM_DEFAULT)
  const [exportOpen,    setExportOpen]    = useState(false)

  // Read URL params on first mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.has('preset') && PRESET_FLAT.includes(p.get('preset'))) setPreset(p.get('preset'))
    if (p.has('palette') && PALETTES[p.get('palette')]) setPalette(p.get('palette'))
    if (p.has('size'))  setGridSize(Math.max(4,  Math.min(64, Number(p.get('size')))))
    if (p.has('cell'))  setCellSize(Math.max(1,  Math.min(32, Number(p.get('cell')))))
    if (p.has('gap'))   setGap(     Math.max(0,  Math.min(8,  Number(p.get('gap')))))
    if (p.has('fps'))   setFps(     Math.max(1,  Math.min(60, Number(p.get('fps')))))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep URL in sync with state
  useEffect(() => {
    const p = new URLSearchParams()
    p.set('preset', preset)
    p.set('palette', palette)
    if (gridSize !== 8)  p.set('size', gridSize)
    if (cellSize !== 8)  p.set('cell', cellSize)
    if (gap !== 2)       p.set('gap', gap)
    if (fps !== 12)      p.set('fps', fps)
    history.replaceState(null, '', '?' + p.toString())
  }, [preset, palette, gridSize, cellSize, gap, fps])

  // Sync palette → fg / bg
  useEffect(() => {
    const p = PALETTES[palette]
    if (p) { setFg(p.fg); setBg(p.bg) }
  }, [palette])

  // Arrow key navigation through presets
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setPreset(cur => PRESET_FLAT[(PRESET_FLAT.indexOf(cur) + 1) % PRESET_FLAT.length])
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setPreset(cur => PRESET_FLAT[(PRESET_FLAT.indexOf(cur) - 1 + PRESET_FLAT.length) % PRESET_FLAT.length])
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])

  const isMobile  = useIsMobile()
  const canvasRef = usePixelGrid({ gridSize, fps, cellSize, gap, fg, bg, preset, expression })

  const sharedProps = {
    canvasRef,
    gridSize, setGridSize, cellSize, setCellSize, gap, setGap,
    fps, setFps, palette, setPalette, fg, setFg, bg, setBg,
    preset, onSelectPreset: setPreset,
    expression, setExpression,
    onExport: () => setExportOpen(true),
  }

  return (
    <>
      <GlobalStyles />

      {isMobile ? (
        <>
          <MobileLayout {...sharedProps} />
          {exportOpen && (
            <ExportModal
              params={{ preset, gridSize, cellSize, gap, fps, fg, bg, expression }}
              onClose={() => setExportOpen(false)}
            />
          )}
        </>
      ) : (
        <div style={{
          position: 'relative', width: '100vw', height: '100vh',
          overflow: 'hidden', background: bg,
          transition: 'background 0.35s ease',
          fontFamily: T.font, '--accent': fg,
        }}>

          {/* Canvas */}
          <canvas ref={canvasRef} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            imageRendering: 'pixelated',
          }} />

          {/* Left panel */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            width: 288, height: 'calc(100vh - 32px)',
            display: 'flex', flexDirection: 'column',
            zIndex: 10, pointerEvents: 'none',
          }}>
            <LeftPanel
              gridSize={gridSize}     setGridSize={setGridSize}
              cellSize={cellSize}     setCellSize={setCellSize}
              gap={gap}               setGap={setGap}
              fps={fps}               setFps={setFps}
              palette={palette}       setPalette={setPalette}
              fg={fg}                 setFg={setFg}
              bg={bg}                 setBg={setBg}
              preset={preset}         onSelectPreset={setPreset}
              expression={expression} setExpression={setExpression}
              onExport={() => setExportOpen(true)}
            />
          </div>

          {/* Attribution */}
          <a
            href="https://www.corywilliams.com.au"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'absolute', bottom: 16, right: 16,
              zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: `color-mix(in srgb, ${fg} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${fg} 18%, transparent)`,
              borderRadius: 20,
              color: `color-mix(in srgb, ${fg} 50%, transparent)`,
              fontSize: 11, fontFamily: T.font,
              fontWeight: 500, letterSpacing: '-0.01em',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = fg
              e.currentTarget.style.background = `color-mix(in srgb, ${fg} 14%, transparent)`
              e.currentTarget.style.borderColor = `color-mix(in srgb, ${fg} 35%, transparent)`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = `color-mix(in srgb, ${fg} 50%, transparent)`
              e.currentTarget.style.background = `color-mix(in srgb, ${fg} 8%, transparent)`
              e.currentTarget.style.borderColor = `color-mix(in srgb, ${fg} 18%, transparent)`
            }}
          >
            Made by Cory Williams
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6 }}>
              <path d="M4 2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M6 1h3v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 1L5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </a>

          {/* Export modal */}
          {exportOpen && (
            <ExportModal
              params={{ preset, gridSize, cellSize, gap, fps, fg, bg, expression }}
              onClose={() => setExportOpen(false)}
            />
          )}
        </div>
      )}
    </>
  )
}
