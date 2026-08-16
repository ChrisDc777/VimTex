# UI variants — Studio vs Forge

## Goals

1. **Default:** Studio shell (near-black canvas, atmosphere accents, live-collab UX).
2. **Optional:** Forge shell (tabs, unified right panel) via user preference.
3. **Never:** Couple shell choice to collaboration availability.

## Configuration model

```ts
type UiVariant = "studio" | "forge";
type StudioExperience = "enhanced" | "basic";

interface WorkspacePreferences {
  uiVariant: UiVariant;                 // localStorage "vimtex:uiVariant"
  studioExperience: StudioExperience;   // localStorage "vimtex:studioExperience" (Studio only)
  editorMode: "vim" | "standard";       // "vimtex:editorMode"
  relativeLineNumbers: boolean;         // "vimtex:relativeLineNumbers"
}
```

Legacy `classic`/`quietCraft` localStorage values are migrated on load (`lib/ui-variant.ts`).

**Shell vs experience vs motion**

| Concern | What it controls | Persistence |
|---------|------------------|-------------|
| **Shell** (`studio` \| `forge`) | Layout, chrome, Forge tabs / Studio session URL | `vimtex:uiVariant` |
| **Studio experience** (`enhanced` \| `basic`) | Component trees: BEUI Enhanced vs pre-BEUI Basic | `vimtex:studioExperience` (Studio only; Forge ignored) |
| **`prefers-reduced-motion`** | Accessibility: shorten/disable animations inside whichever tree is active | OS / browser |

Basic is **not** “Enhanced with animation off.” It renders the shipped pre-BEUI composer, dialogs, palette, AI diff, and message actions. Enhanced still honors reduced motion.

## Shell responsibilities

### Studio (`studio`)

- Header: brand, **Import & Export (Bloom ↓)** (Enhanced), Live/Split, snippets, Menu —
  Enhanced moves **Share (Morphing Modal)** / Outline / History / Chat / Preferences to a
  **bottom dock**; Basic keeps Share + panel toggles as topbar pills
- Side rail + mobile bottom tabs; command palette (Ctrl/Cmd+K)
- Split Live / Split preview (`ViewToggle`)
- Name picker on first visit; Preferences (dialog in Basic, BEUI Drawer in Enhanced)
- Status bar: vim mode, collab status, peers, editable name
- Tokens scoped under `.ui-studio` (`app/studio-theme.css`): near-black canvas, sunset/breeze atmosphere, outline pill controls
- **Experience default Enhanced:** vendored BEUI under `components/beui/` + adapters in `components/studio/enhanced/` (Prompt Input + Ask/Plan chips, Action Swap, Thinking Shimmer, focused note-diff, Streaming Response, Command Palette, Drawer, Bloom Import & Export, Morphing Modal Share, bottom Dock)
- **Basic fallback:** Preferences → Workspace → Studio experience: Basic — same room data, pre-BEUI trees

### Forge (`forge`)

- `AppHeader` + sheet menu, editor tab bar
- Right activity rail / mobile bottom tabs
- Unified right panel: Problem | Preview | Chat | **History** (toolbar/rail icons; Chat and History are separate panels)

- Resizable panes, persisted widths
- Preferences dialog (Editor keys, relative line numbers, Workspace style)
- Base `:root` tokens in `app/globals.css`: mineral surfaces, stepped dark neutrals
- **Always Basic UI** for this slice — does not import BEUI / Enhanced adapters

## Differentiation policy

Studio and Forge are deliberate product shells, not just themes. Workspace
features must stay distinct; only shared plumbing converges.

**Philosophy**

- **Studio is session-first:** one room = one shareable URL. Collaboration is
  the point. Tabs are inherently per-client/local and conflict with "the URL is
  the session", so Forge-style room tabs should NOT be added to Studio.
- **Forge is a workbench:** many rooms as tabs, keyboard-first, quiet chrome,
  with a single-user focus and collaboration available (not primary).

**Rules**

1. Multi-room / workspace features (tabs, panel rails, per-room autosave,
   problem reference) belong to **Forge** first.
2. Single-session / sharing features (share, live preview, templates,
   onboarding) belong to **Studio** first.
3. Shared plumbing (editor, collab, chat, preferences, export, recent rooms) is
   built once in the shared layer and surfaced in both shells.

| Capability | Studio | Forge |
|------------|--------|-------|
| Rooms | One at a time (URL = session) | Many via tabs |
| Preview | Split / live view toggle | Right preview panel |
| Problem image reference | — | Problem rail |
| Editor tabs | — | ✓ |
| Command palette | ✓ (Ctrl/Cmd+K) | Parity (deliberate) |
| Standard editing mode | ✓ (skips name gate) | ✓ |

## Shared layer

| Module | Responsibility |
|--------|----------------|
| `lib/collab.ts` | room id, URL sync, collab status, display name |
| `VimEditor` | CodeMirror + Vim/Standard modes, Yjs binding, carets |
| `RoomChatSidebar` | subscribe/append chat |
| `lib/room-chat.ts`, `api/chat/route.ts` | @vimothy invoke, reply parsing |
| `lib/use-editor-tabs.ts` | Forge tab session (open/close/rename/reopen recent room) |
| `lib/render-note.ts` | shared parser (bare math + line heuristics) |
| `lib/storage.ts` | room-scoped autosave, view mode |
| `lib/recent-rooms.ts` | recently visited rooms (localStorage) |
| `components/PreferencesDialog.tsx` | editor/workspace settings in both shells |

## CSS strategy

- Scope Studio: `.ui-studio` on `app-shell` + `app/studio-theme.css` (near-black canvas, outline pills, atmosphere gradients)
- Scope Forge: `:root` tokens in `app/globals.css` (mineral surfaces, rounded rectangles)
- Studio is the design starting point; Forge remains optional

## Toggle UX

- **Preferences dialog:** “Workspace style: Studio | Forge” (both shells)
- **Studio only:** “Studio experience: Enhanced | Basic” (helper: Basic keeps the simple, pre-BEUI interface)
- First visit: stay on Studio + Enhanced; switches are non-blocking
- Persist `vimtex:uiVariant` and (Studio) `vimtex:studioExperience`

## Test matrix

| Scenario | Studio | Forge |
|----------|--------|-------|
| Two-peer edit sync | required | required |
| Share copy URL | required | required |
| @vimothy edit propagates | required | required (suggest-only apply) |
| Split preview | required | preview panel |
| Tab switch + autosave | N/A | required |
| Mobile toolbar | required | required |
| Reconnect after disconnect | required | required |

## Anti-patterns

- Duplicate chat AI/send logic — use `lib/use-room-chat.ts` with thin Studio/Forge skins
- Two copies of `VimEditor` (one editor + WorkspaceProvider is enough)
- CSS-only toggle without shared state layer
- Forge as default before Studio parity verified
- Premium gate blocking Share on free tier
- Room tabs in Studio (dilutes "URL = session"; see Differentiation policy)
- Forge without tabs (dilutes workbench identity)
- Palette in only one shell without a deliberate decision (see Differentiation policy)
