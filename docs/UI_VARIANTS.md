# UI variants — Studio vs Forge

## Goals

1. **Default:** Studio shell (near-black canvas, atmosphere accents, live-collab UX).
2. **Optional:** Forge shell (tabs, unified right panel) via user preference.
3. **Never:** Couple shell choice to collaboration availability.

## Configuration model

```ts
type UiVariant = "studio" | "forge";

interface WorkspacePreferences {
  uiVariant: UiVariant;           // persisted localStorage "vimtex:uiVariant"
  editorMode: "vim" | "standard"; // persisted "vimtex:editorMode"
  relativeLineNumbers: boolean;   // persisted "vimtex:relativeLineNumbers"
}
```

Legacy `classic`/`quietCraft` localStorage values are migrated on load (`lib/ui-variant.ts`).

## Shell responsibilities

### Studio (`studio`)

- Header: brand, Share, Outline, **History**, Chat, Live/Split toggle
- Side rail + mobile bottom tabs; command palette (Ctrl/Cmd+K)
- Split Live / Split preview (`ViewToggle`)
- Name picker on first visit; Preferences dialog
- Status bar: vim mode, collab status, peers, editable name
- Tokens scoped under `.ui-studio` (`app/studio-theme.css`): near-black canvas, sunset/breeze atmosphere, outline pill controls

### Forge (`forge`)

- `AppHeader` + sheet menu, editor tab bar
- Right activity rail / mobile bottom tabs
- Unified right panel: Problem | Preview | Chat | **History** (toolbar/rail icons; Chat and History are separate panels)

- Resizable panes, persisted widths
- Preferences dialog (Editor keys, relative line numbers, Workspace style)
- Base `:root` tokens in `app/globals.css`: mineral surfaces, stepped dark neutrals

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
- First visit: stay on Studio; switch is non-blocking
- Persist `vimtex:uiVariant`

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
