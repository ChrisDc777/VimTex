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

- Header: brand, Share, Room menu, Live/Split toggle, Chat
- Side rail + mobile bottom tabs; command palette (Ctrl/Cmd+K)
- Split Live / Split preview (`ViewToggle`)
- Name picker on first visit; Preferences dialog
- Status bar: vim mode, collab status, peers, editable name
- Tokens scoped under `.ui-studio` (`app/studio-theme.css`): near-black canvas, sunset/breeze atmosphere, outline pill controls

### Forge (`forge`)

- `AppHeader` + sheet menu, editor tab bar
- Right activity rail / mobile bottom tabs
- Unified right panel: Problem | Preview | Chat
- Resizable panes, persisted widths
- Preferences dialog (Editor keys, relative line numbers, Workspace style)
- Base `:root` tokens in `app/globals.css`: mineral surfaces, stepped dark neutrals

## Shared layer

| Module | Responsibility |
|--------|----------------|
| `lib/collab.ts` | room id, URL sync, collab status, display name |
| `VimEditor` | CodeMirror + Vim/Standard modes, Yjs binding, carets |
| `RoomChatSidebar` | subscribe/append chat |
| `lib/room-chat.ts`, `api/chat/route.ts` | @ai invoke, reply parsing |
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
| @ai edit propagates | required | required |
| Split preview | required | preview panel |
| Tab switch + autosave | N/A | required |
| Mobile toolbar | required | required |
| Reconnect after disconnect | required | required |

## Anti-patterns

- Two copies of `VimEditor` or `RoomChatSidebar`
- CSS-only toggle without shared state layer
- Forge as default before Studio parity verified
- Premium gate blocking Share on free tier
