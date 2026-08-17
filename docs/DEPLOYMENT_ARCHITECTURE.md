# Deployment architecture — tiers, swaps, and scale

**Status:** Living doc (product at “option A”; client seams landed)  
**Related:** [`RFC-collab-persistence.md`](./RFC-collab-persistence.md) (M2 backend options), [`UI_VARIANTS.md`](./UI_VARIANTS.md) (shell vs shared layer)

This document explains **how VimTex is layered for deployment**, what can be swapped without rewriting the product, and how to grow infrastructure **without premature abstraction**.

---

## Public beta split deploy (selected)

**Milestone:** [Cloudflare public beta](https://github.com/chrisdco/VimTex/milestone/7) · umbrella [#154](https://github.com/chrisdco/VimTex/issues/154)

```text
Browser ──UI + same-origin /api/rooms rewrite──► Vercel (Next.js, /api/chat)
Browser ──Yjs WebSocket─────────────────────────► Cloudflare Worker
Vercel  ──rewrite /api/rooms/:path*─────────────► Worker ──► Room Durable Object (SQLite)
```

| Host | Owns |
|------|------|
| **Vercel** | Next 16, Studio/Forge, static assets, `POST /api/chat` |
| **Cloudflare** | `workers/collab/` — one SQLite Durable Object per room: Yjs, presence, ACL, password/TTL, history |
| **Node (`server.mjs`)** | Local/fallback only until CF is proven. Do **not** fail over at runtime (split-brain). |

**Non-goals for this beta:** R2, KV, D1, Queues, Redis, Hocuspocus, PartyKit, OpenNext, `y-crossws` / `y-durableobjects`. Snapshots live in DO SQLite (no billing-gated R2).

**Wiring:** server-only `ROOM_SERVICE_ORIGIN` `beforeFiles` rewrite of `/api/rooms/:path*`. Browser REST stays same-origin. `NEXT_PUBLIC_COLLAB_WS_URL` is the only direct cross-origin connection.

**Public-beta lifetime:** new Cloudflare rooms expire in **30 days** (renewable up to 30 days). `ttl=never` is rejected on CF and hidden in the UI when `NEXT_PUBLIC_HIDE_TTL_NEVER=1`. Local Node still allows “never”.

**Secrets:** `ROOM_SECRET` required on the Worker (fail closed). `TURNSTILE_SECRET_KEY` only on Cloudflare; `AI_ADMISSION_SECRET` on Vercel + Worker; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on Vercel.

**Local:** `npm run dev` / `npm start` = Node full stack. `npm run dev:cf` = Wrangler `:8787` + `next dev :3000` with rewrite + WS URL. Staging and production use **separate Durable Object namespaces**.

**Cutover:** new rooms on Cloudflare only. Old Node room links are not migrated. Export any local document you need to keep.

Re-evaluate **OpenNext / all-in Cloudflare** only after the room Worker is stable ([#162](https://github.com/chrisdco/VimTex/issues/162)) — not as part of this launch.

---

## Summary

VimTex is a **modular frontend around a monolithic collab backend** — a deliberate tradeoff for shipping at hobby/small-team scale.

| Question | Answer |
|----------|--------|
| Is this a system design issue? | **Yes** — mainly **tier 3** (collab + room backend), not the editor or shells. |
| Can we swap Cloudflare ↔ Node ↔ Hocuspocus later? | **Yes**, if we preserve **HTTP + WebSocket contracts**. UI and client domain code should not need rewrites. |
| Is the codebase “hexagonal” today? | **Partially.** Strong client seams; backend is one Node implementation, not a pluggable driver. |
| Should we abstract everything now? | **No.** Document contracts, avoid new coupling, add interfaces **when a second backend is real**. |

---

## Three tiers

Think in three layers. **Only tier 3 is deployment-specific.**

```text
┌──────────────────────────────────────────────────────────────┐
│  Tier 1 — Product UI                                         │
│  Studio / Forge shells, BEUI Enhanced, themes, chrome        │
│  Depends on: React, design tokens, localStorage prefs        │
└───────────────────────────────┬──────────────────────────────┘
                                │ WorkspaceProvider, props, events
┌───────────────────────────────▼──────────────────────────────┐
│  Tier 2 — Domain client (browser)                            │
│  WorkspaceController, room-meta, room-snapshots, room-chat,  │
│  collab URL helpers, AI client → /api/chat                   │
│  Depends on: Yjs protocol, REST shapes, WS query params      │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS + WebSocket (contracts)
┌───────────────────────────────▼──────────────────────────────┐
│  Tier 3 — Collab + room backend (server)                     │
│  server.mjs, scripts/y-ws/*, app/api/rooms/*, app/api/chat   │
│  Depends on: Node, fs, ws, optional LevelDB (today)          │
└──────────────────────────────────────────────────────────────┘
```

### Tier 1 — Product UI

**Location:** `components/shells/`, `components/studio/`, `components/beui/`, app CSS.

**Role:** Layout, motion, preferences chrome, Studio vs Forge policy.

**Swap trigger:** New shell, rebrand, BEUI upgrades — **never** because hosting changed.

**Rule (from UI variants):** Shell choice must not gate collaboration. Shared plumbing lives in tier 2.

### Tier 2 — Domain client

**Location:** `lib/workspace-controller.ts`, `lib/collab.ts`, `lib/room-meta.ts`, `lib/room-snapshots.ts`, `lib/room-auth.ts`, `lib/use-room-chat.ts`, `components/workspace/`.

**Role:** Single place the UI learns about rooms, sync, chat, snapshots, ACL tokens.

**Swap trigger:** Backend host changes — **keep this tier stable** by preserving:

- **WebSocket:** Yjs sync + awareness; query params `edit`, `view`, `auth` (see `WorkspaceControllerOptions` in `lib/workspace-controller.ts`).
- **HTTP:** `/api/rooms/:id/*` request/response shapes used by `lib/room-meta.ts` and `lib/room-snapshots.ts`.
- **Optional split:** `NEXT_PUBLIC_COLLAB_WS_URL` in `lib/collab.ts` — WS host can differ from page origin.

**Industry pattern:** **Contract-first client** — the browser speaks protocols and REST, not “filesystem” or “Durable Object id”.

### Tier 3 — Collab + room backend

**Location:** `server.mjs`, `scripts/y-ws/*`, `app/api/rooms/*`, `app/api/chat/route.ts`.

**Role:** Authoritative doc state (Yjs), WebSocket fan-out, room ACL/TTL/password, snapshots, AI proxy.

**Swap trigger:** Free tier (Cloudflare DO), VPS, Hocuspocus + Postgres, multi-region.

**Today:** One **Node monolith** — API routes `require()` the same `scripts/y-ws` modules that hold in-memory Yjs and disk metadata. Snapshots can call `getYDoc()` in-process. That coupling is **acceptable for option A**; it is what makes Cloudflare a **rewrite of tier 3**, not a config change.

---

## Scale scopes (what tier 3 looks like)

These map to [`RFC-collab-persistence.md`](./RFC-collab-persistence.md) options. Tiers 1–2 stay the same.

| Scope | Tier 3 shape | Persistence | Typical cost |
|-------|----------------|-------------|--------------|
| **Local / demo** | `node server.mjs` on laptop | In-memory; optional local LevelDB | $0 |
| **Share demo** | Same + Cloudflare quick tunnel (`AUTO_TUNNEL=1`) | Ephemeral while PC is on | $0 |
| **Hobby hosted** | Single VM / free Oracle / Fly | `YPERSISTENCE` + `ROOM_DATA_DIR` on disk | $0–low |
| **Small product** | Always-on Node or Hocuspocus | LevelDB or Postgres + object storage for snapshots | Low |
| **Growth** | Collab gateway fleet + shared store | Postgres + Redis pub/sub + R2/S3 | Medium |
| **Large** | Sharded doc actors, regional edge | Dedicated doc store, CRDT ops at scale | High |

**Client code does not need a milestone per row** — only tier 3 and ops change.

---

## The swap contract (preserve these when changing backend)

When replacing Node with Cloudflare Durable Objects, or moving to Hocuspocus, **do not break:**

### WebSocket (Yjs)

| Contract | Notes |
|----------|--------|
| Room id in URL path | `ws(s)://host/<roomId>` (see `server.mjs`) |
| Guest ACL | `edit`, `view`, `auth` query params; server enforces write denial |
| Shared Yjs types | Document text + chat array + awareness (existing client binding) |
| Read-only | View token → sync allowed, writes refused server-side |

### HTTP — room services

| Endpoint area | Client module |
|---------------|---------------|
| `GET/PATCH …/meta` | `lib/room-meta.ts` |
| `POST …/unlock` | `lib/room-meta.ts` |
| `POST …/capabilities`, view-token | `lib/room-auth.ts` |
| Snapshots CRUD, fork, diff | `lib/room-snapshots.ts` |

Headers: `x-vimtex-edit`, `x-vimtex-view`, session auth as today.

### HTTP — AI

| Endpoint | Client module |
|----------|---------------|
| `POST /api/chat` | `lib/ai-client.ts` |

Runs on Workers or Node; no Yjs coupling.

### Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_COLLAB_WS_URL` | WS base when UI and collab are on different hosts |
| `OPENROUTER_API_KEY`, etc. | Server-side AI (never in browser) |

**Version the contract:** If a backend change requires breaking REST or WS behavior, update tier 2 client helpers and this doc in the **same PR**.

---

## How to handle changes (playbook)

### 1. Default rule — **strangler, not big bang**

Run **new tier 3 alongside old** when possible:

1. Implement new backend behind the **same** WS + REST contracts.
2. Point `NEXT_PUBLIC_COLLAB_WS_URL` (or full stack URL) at the new host for testing.
3. Cut over DNS / primary deploy when e2e passes.
4. Retire old backend.

Avoid “stop the world” rewrites without a parallel path.

### 2. When swapping **host only** (same Node stack)

**Example:** Laptop → VPS, VPS → bigger VPS.

- Move `server.mjs` + env + data directory (`YPERSISTENCE`, `ROOM_DATA_DIR`).
- Tier 1–2 unchanged.
- **Lean:** no new abstractions.

### 3. When swapping **platform** (Node → Cloudflare DO)

**Rewrite tier 3 only:**

| Reimplement | Keep |
|-------------|------|
| WS + Yjs authority (DO per room) | All of tier 1–2 |
| Room meta store (DO SQLite / KV) | HTTP route paths + JSON shapes |
| Snapshot blobs (R2 / DO storage) | Client snapshot types |
| Deploy (Wrangler / OpenNext) | Share link UX, ACL model |

**Do not** fork tier 2 unless the contract must change.

### 4. When swapping **collab engine** (custom Yjs → Hocuspocus)

Same as platform swap: tier 3 replacement. Client still uses `y-websocket` if the server speaks compatible Yjs protocol.

RFC option B — planned for multi-instance / M5, not required for hobby.

### 5. When splitting **frontend and backend** hosts

**Example:** Static/Next on Vercel, collab on Fly.

- UI: Vercel (or CF Pages).
- Collab + **room APIs** must live where metadata and Yjs state live (same tier 3 deployment).
- Set `NEXT_PUBLIC_COLLAB_WS_URL` to collab host.
- Relative `/api/rooms/*` only works if those routes are proxied to the same backend or duplicated — **prefer one backend origin** for room API + WS early on.

---

## Industry / startup best practices (lean flexibility)

What successful teams do **before** multi-cloud abstraction:

### Do now (cheap, high leverage)

1. **Clear tier boundaries** — this doc + RFC + UI_VARIANTS; shells never import `scripts/y-ws`.
2. **Contract-first client** — tier 2 talks HTTP/WS, not storage implementation (already mostly true).
3. **One shared domain module per capability** — room meta, snapshots, chat (avoid duplicating fetch logic in shells).
4. **Env-based wiring** — WS URL, secrets, data dirs (already started).
5. **Honest docs** — room lifetime, idle GC, what “free” means (README + RFC).

### Do when a **second backend is real** (not before)

1. **Storage ports** — thin interfaces: `RoomMetaStore`, `SnapshotStore`, `CollabRoom` — one fs implementation, one DO implementation.
2. **Remove in-process shortcuts** — e.g. snapshot API calling `getYDoc()`; pass updates through a service API instead.
3. **Contract tests** — e2e or API tests that run against any tier 3 implementation.

### Avoid (complexity that doesn’t buy simplicity)

| Anti-pattern | Why |
|--------------|-----|
| Abstract every tier on day one | Interfaces without two implementations are guesswork |
| Microservices for collab at hobby scale | Ops cost >> benefit |
| Frontend knowing about DO/LevelDB/Postgres | Breaks tier 2 rule |
| “Share button starts infrastructure” | Tunnels/backends are deploy concerns, not UX events |
| Duplicate business rules in Studio and Forge | Already prevented by shared layer policy |

### Patterns that actually help long-term

| Pattern | VimTex mapping |
|---------|----------------|
| **Ports & adapters (light)** | Tier 2 = port consumer; tier 3 = adapter (today: one adapter) |
| **Strangler fig** | New backend, same contracts, gradual cutover |
| **Modular monolith** | Single repo, strict folders — `scripts/y-ws` is the “collab module” |
| **Evolutionary architecture** | RFC option A → B when pain appears, not when hypothetically needed |

**Startup heuristic:** *Make the change easy next time by stabilizing **boundaries** and **contracts**, not by adding indirection layers today.*

---

## Long-term evaluation

### What we got right

- **Product vs infrastructure separation** — Studio/Forge policy, WorkspaceController seam (RFC M2).
- **Guest ACL + snapshots as HTTP** — tier 2 already backend-agnostic.
- **Documented scale path** — RFC options A/B/C without committing early.

### Current coupling (accepted debt)

- API routes directly `require()` Node/fs modules.
- Live Yjs doc reachable from snapshot code in-process.
- Single deploy unit (`server.mjs` + Next).

This debt is **proportionate** for option A. It becomes **blocking** when:

- You need CF Workers, serverless-only, or multi-instance without sticky sessions.
- Snapshot/history traffic must scale independently of WS nodes.
- Compliance requires managed Postgres and audit trails.

### When to invest in more structure

| Signal | Action |
|--------|--------|
| Staying on one VPS 6+ months | Keep tier 3 as-is; backups + `YPERSISTENCE` |
| Moving to Cloudflare for $0 hosting | Rewrite tier 3 to DO; **don’t** abstract tier 1–2 |
| Second region or HA | RFC option B/C; storage ports + Redis or DO at scale |
| Team >2 on backend | Split `scripts/y-ws` into testable modules; add contract tests |
| Accounts / billing (M5) | New tier 2.5 (identity client); tier 3 gains ownership store |

### Cloudflare specifically

- **Not a dead end** — DO per room matches collab semantics.
- **Not plug-and-play** — tier 3 rewrite; moderate platform lock-in on **server code only**.
- **Exit path** — preserve swap contract; client unchanged; migrate storage export (R2 → S3) if needed.

---

## File map (quick reference)

| Tier | Key paths |
|------|-----------|
| 1 | `components/shells/`, `components/studio/`, `app/studio-theme.css` |
| 2 | `lib/workspace-controller.ts`, `lib/collab.ts`, `lib/room-meta.ts`, `lib/room-snapshots.ts`, `lib/room-auth.ts` |
| 3 | `server.mjs`, `scripts/y-ws/`, `app/api/rooms/`, `app/api/chat/` |

**Cross-cutting:** `docs/RFC-collab-persistence.md` (persistence options), `docs/UI_VARIANTS.md` (shared layer table), `lib/use-room-gate.ts` (client gate before WS connect).

---

## Checklist — changing deployment

Before merging a hosting/platform change:

- [ ] Tier 1–2 untouched unless contract intentionally versioned?
- [ ] WS: same room path + ACL query params?
- [ ] REST: same routes and JSON shapes tier 2 expects?
- [ ] Room lifetime / idle behavior documented for users?
- [ ] `NEXT_PUBLIC_COLLAB_WS_URL` documented if split deploy?
- [ ] e2e collab + share + snapshot smoke on new backend?
- [ ] No new `require('scripts/y-ws')` from tier 1 or tier 2?

---

## Related reading

- [`RFC-collab-persistence.md`](./RFC-collab-persistence.md) — M2 decision (option A now, B later)
- [`UI_VARIANTS.md`](./UI_VARIANTS.md) — shell vs shared layer
- [`CURRENT_STATE.md`](./CURRENT_STATE.md) — shipped inventory
- [`README.md`](../README.md) — room lifetime, tunnel, env vars
