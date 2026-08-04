---
version: 1.0
name: forge
description: VimTex Forge design system — a writing-first, keyboard-first dark workspace where the editor is the primary surface and side panes are quiet supporting panels.

colors:
  canvas: "#111214"
  canvas-soft: "#181a1e"
  canvas-card: "#1e2024"
  canvas-mid: "#2a2d32"
  canvas-elevated: "#1c1e22"
  ink: "#e8eaed"
  ink-hover: "#f4f5f7"
  body: "#b4b8be"
  body-mid: "#8b9098"
  mute: "#6e737a"
  hairline: "#2a2d32"
  hairline-strong: "#35383f"
  focus: "#7aa2c8"
  focus-soft: "#4a6d8f"
  on-primary: "#111214"
  primary: "#e8eaed"
  success: "#6dba82"
  warning: "#d4a843"
  error: "#d47272"

typography:
  ui-lg:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 17px
    fontWeight: 500
    lineHeight: 24px
  ui-md:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  ui-sm:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  body-md:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 24px
  body-sm:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  mono-md:
    fontFamily: GeistMono, ui-monospace, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  mono-sm:
    fontFamily: GeistMono, ui-monospace, monospace
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  mono-xs:
    fontFamily: GeistMono, ui-monospace, monospace
    fontSize: 11px
    fontWeight: 400
    lineHeight: 14px

rounded:
  sm: 6px
  md: 8px
  lg: 10px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
---

# VimTex — Forge (formerly "Quiet Craft")

## Overview

VimTex is a keyboard-first Vim + LaTeX scratchpad. The interface should feel like a refined writing instrument: calm, legible, and hierarchy-driven. The **editor** is the primary surface; **Problem** and **Preview/Chat** are recessed supporting panels. Chrome is minimal, labels are sentence case, and accents are used sparingly for focus and state.

**Key characteristics:**
- Stepped dark neutrals — no pure black, no atmospheric gradients
- Editor surface slightly elevated above side panes
- Mineral-blue focus accent for rings, active rails, and caret-adjacent cues
- Geist for UI and prose; Geist Mono for TeX, status values, and code
- 6–8px rounded rectangles for controls — no universal pills
- Weight 400–500 hierarchy; emphasis via size and color, not all-caps tracking
- Hairline borders only — no glows, no decorative brand dots

## Colors

### Surfaces (darkest → lightest)

| Token | Value | Use |
|---|---|---|
| `canvas` | `#111214` | App shell, status bar, rails |
| `canvas-soft` | `#181a1e` | Chrome headers, inputs |
| `canvas-card` | `#1e2024` | Side panes (Problem, Preview, Chat) |
| `canvas-elevated` | `#1c1e22` | Editor surface — primary work area |
| `canvas-mid` | `#2a2d32` | Hover fills, nested surfaces |

### Text

| Token | Value | Use |
|---|---|---|
| `ink` | `#e8eaed` | Primary text, headings |
| `body` | `#b4b8be` | Editor and preview body |
| `body-mid` | `#8b9098` | Secondary copy |
| `mute` | `#6e737a` | Labels, gutters, disabled |

### Accent & semantic

| Token | Value | Use |
|---|---|---|
| `focus` | `#7aa2c8` | Focus rings, active rail indicator, resize handle hover |
| `focus-soft` | `#4a6d8f` | Math widget tint, subtle highlights |
| `success` | `#6dba82` | Connected status |
| `warning` | `#d4a843` | Connecting status |
| `error` | `#d47272` | Disconnected, validation errors |

### Borders

| Token | Value | Use |
|---|---|---|
| `hairline` | `#2a2d32` | Default dividers |
| `hairline-strong` | `#35383f` | Panel edges, chrome borders |

## Typography

### Principles
- **Sentence case everywhere** — no uppercase chrome labels
- **Geist** for UI, panel titles, preview prose, chat
- **Geist Mono** for Vim mode, status metadata, TeX source, line numbers
- Use **weight 500** for titles and active labels; **400** for body
- Mono labels use normal letter-spacing (0–0.02em), not tracked caps

### Hierarchy

| Role | Font | Size | Weight | Use |
|---|---|---|---|---|
| Brand | Geist | 17px | 500 | App title |
| Panel title | Geist | 14px | 500 | Problem, Preview, Chat headers |
| Body | Geist | 15px | 400 | Editor, preview content |
| UI control | Geist | 14px | 400 | Buttons, menu items |
| Status meta | Geist Mono | 12px | 400 | Connection, peer count, user name |
| Vim mode | Geist Mono | 12px | 500 | Status bar mode indicator |
| Code / TeX | Geist Mono | 13–14px | 400 | Editor, math widgets |

## Layout

### Workspace structure

```
[Header — chrome]
[Editor — elevated] | [Problem|Preview|Chat?] | [Right rail]
[Status bar — chrome]
```

### Pane hierarchy

1. **Editor** — `canvas-elevated`, no side border on focus; visually dominant
2. **Side pane** — `canvas-card`, recessed; Problem, Preview, and Chat share one right panel
3. **Rail** — `canvas` on the right with slim vertical accent on active button
4. **Chrome** — header and footer at `canvas-soft`

### Spacing

4px base unit. Panel padding: 16–20px. Header/footer height: 40px. Touch targets: minimum 40px (44px on mobile).

### Responsive

| Breakpoint | Behavior |
|---|---|
| < 768px | Side panes stack below editor; right panel height capped at 48vh |
| ≥ 768px | Horizontal three-column layout with resize handles |
| < 480px | Header wraps; toolbar scrolls horizontally |

## Elevation & depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow | Default surfaces |
| Hairline | 1px `hairline-strong` border | Panel edges, chrome dividers |
| Inset | `inset 0 1px 0` highlight | Active rail button (optional) |

No drop shadows on panels. No radial gradients on the body.

## Shapes

| Token | Value | Use |
|---|---|---|
| `sm` | 6px | Buttons, rail buttons, inputs |
| `md` | 8px | Cards, menus, dialogs, math widgets |
| `lg` | 10px | Chat composer field |

Pills (`9999px`) are **not** used for controls.

## Components

### Header (`vt-header`)
- Background: `canvas-soft`, bottom hairline
- Brand: Geist 17px/500, no decorative mark
- Actions: compact rounded-rectangle buttons (`vt-header-btn`), 40px min height

### Panel header (`vt-panel-header`)
- Title: Geist 14px/500, sentence case
- Actions: ghost buttons or compact controls, not pills

### Editor tab bar (`vt-editor-tabs`)
- Height: `--panel-header-h` (40px), same as panel headers
- Sits above the CodeMirror editor inside the editor pane
- Fixed tab width: `--editor-tab-w` (9rem); labels truncate with ellipsis
- New tab (+) sits immediately after the last tab
- Active tab: `ink` text, subtle fill, 2px `focus` bottom accent
- Inactive tab: `body-mid` text; hover → `canvas-mid` fill
- Close button: 28×28, visible on hover/focus and always on active tab
- New tab (+): trailing ghost button; disabled at 5 tabs
- Double-click tab label to rename; custom name persists in tab session storage
- Maximum 5 open tabs

### Side rails (`vt-panel-rail`)
- Width: 48px
- Active button: mineral-blue left/right accent bar (2px), subtle background fill
- Icons: 1.25px stroke, 18px

### Editor pane
- Background: `canvas-elevated` — slightly lighter than side panes
- Gutter: transparent with hairline border
- Caret: `ink`; selection: 15% ink mix
- Math widgets: soft `focus-soft` tint, no glow

### Preview pane
- Background: `canvas-card`
- Body: Geist 16px, line-height 1.7
- KaTeX inherits `ink`

### Status bar (`vt-footer`)
- Three zones: **mode** (left), **identity** (center), **connection** (right)
- Height: `--footer-h` (40px); background `canvas-soft`, top hairline
- Vim mode: `vt-mode-chip`, Geist Mono 12px/500, sentence case; abbreviated on mobile (`N` / `I` / `V` / `R`)
- Identity: editable `vt-footer__name-chip` (mono, hairline border); opens name picker
- Connection: status dot + human label ("Connected", "Connecting…", "Offline"); peer count when connected (`2 peers`)
- Status zone uses `aria-live="polite"`; connecting dot pulses subtly

### Buttons

**`vt-btn`** — default control
- Background: transparent; border: `hairline`
- Radius: 6px; padding: 0 12px; min-height: 40px
- Hover: `canvas-mid` fill; focus: 2px `focus` ring

**`vt-btn--solid`** — primary action (Paste, Save)
- Background: `primary`; text: `on-primary`
- No glow

### Dialogs & menus
- Background: `canvas-card`; border: `hairline-strong`
- Radius: 8px; enter animation: fade + 10px rise (220ms ease-out)
- Reduced motion: no animation

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 120ms | Hover, color |
| `duration-med` | 200ms | Panel open, dialogs |
| `ease-out` | cubic-bezier(0.22, 1, 0.36, 1) | All transitions |

Respect `prefers-reduced-motion: reduce`.

## Accessibility

- Focus rings: 2px solid `focus`, 2px offset
- Touch targets: ≥ 40px on desktop, ≥ 44px on mobile
- Contrast: `ink` on `canvas-elevated` ≥ 12:1; `body` on `canvas-card` ≥ 7:1
- `color-scheme: dark` always

## Do's and Don'ts

### Do
- Keep the editor visually dominant
- Use sentence-case labels throughout
- Reserve mineral blue for focus, active states, and math highlights
- Use stepped surface colors to communicate pane hierarchy
- Keep chrome thin and quiet

### Don't
- Don't use atmospheric gradients or glowing brand marks
- Don't use all-caps tracked mono for UI chrome
- Don't use pill shapes for buttons
- Don't apply drop shadows to workspace panels
- Don't bold everything — use weight 500 sparingly for titles and active states
