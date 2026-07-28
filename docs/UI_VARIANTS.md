# UI variants — Classic Collaborative vs Quiet Craft

## Goals

1. **Default:** Classic Collaborative shell (local `edf2935` look and live-collab UX).
2. **Optional:** Quiet Craft shell (redesign workspace) via user preference.
3. **Never:** Couple shell choice to collaboration availability.

## Configuration model

```ts
type UiVariant = "classic" | "quietCraft";

interface WorkspacePreferences {
  uiVariant: UiVariant;           // persisted localStorage
  collaborationEnabled: boolean;  // default true for Classic; independent for Quiet Craft
  editorMode: "vim" | "standard"; // future M1
  viewMode?: "split" | "realtime"; // Classic only
}
```

## Shell responsibilities

### Classic Collaborative (`classic`)

- Header: brand, Share, Chat, Split/Realtime, Export
- Optional chat sidebar (not unified right panel)
- Name picker on first visit
- Status bar: vim mode, collab status, peers, editable name
- xAI-inspired tokens (`globals.css` classic scope)

### Quiet Craft (`quietCraft`)

- `AppHeader` + sheet menu, editor tab bar
- Right activity rail / mobile bottom tabs
- Unified right panel: Problem | Preview | Chat
- Resizable panes, persisted widths
- Quiet Craft tokens (`globals.css` under `.ui-quiet-craft` or separate import)

## Shared layer (extract from both)

| Module | Responsibility |
|--------|----------------|
| `useWorkspaceRoom` | room id, URL sync, collab status |
| `useDocumentBuffer` | single source of truth: Yjs ytext ↔ React note |
| `useRoomChat` | subscribe/append chat |
| `useAiInvoke` | fetch /api/chat, parse reply |
| `VimEditor` | props: `roomId`, `user`, `localSeed?`, `inlineMath`, `collaborationEnabled` |
| `lib/render-note` | shared parser (fork bare-math + classic line heuristics merged) |
| `lib/storage` | room-scoped autosave, tab session, panel prefs |

## CSS strategy

- Scope Classic: `.ui-classic` on `app-shell` + `app/classic-theme.css` (near-black canvas, sunset/breeze atmosphere, outline pills, stream chat, classic footer)
- Scope Quiet Craft: `:root` tokens in `globals.css` (mineral surfaces, bubble chat, three-zone footer)
- Quiet Craft remains optional; Classic is the design starting point

## Toggle UX

- **Settings / Sheet menu:** “Workspace style: Classic | Quiet Craft”
- First visit: stay on Classic; offer “Try new workspace” non-blocking
- Persist `vimtex:uiVariant`

## Test matrix

| Scenario | Classic | Quiet Craft |
|----------|---------|-------------|
| Two-peer edit sync | required | required |
| Share copy URL | required | required |
| @ai edit propagates | required | required |
| Split preview | required | N/A (preview panel) |
| Tab switch + autosave | N/A | required |
| Mobile toolbar | required | required |
| Reconnect after disconnect | required | required |

## Migration path (M0)

1. Land shared hooks on fork `master` without changing default page.
2. Port Classic `page.tsx` to consume shared hooks.
3. Wire Quiet Craft page as alternate route or conditional render.
4. Re-enable `connect: true` in both variants.
5. Remove `PremiumPlansDialog` gating for collab/chat (keep component stub for future billing if desired).

## Anti-patterns

- Two copies of `VimEditor` or `RoomChatSidebar`
- CSS-only toggle without shared state layer
- Quiet Craft as default before Classic parity verified
- Premium gate blocking Share on free tier
