# AI providers — hybrid server + BYOK (RFC)

**Status:** Accepted (2026-08) — implement after this RFC.

## Problem

`/api/chat` is a single non-streaming proxy to OpenRouter using one hardcoded
server key, with a hardcoded two-model list. We want:

1. **Hybrid access:** VimTex's own (server) OpenRouter key serves cheap/free
   models for everyone; power users can **bring their own key (BYOK)** to
   unlock heavier models — with zero account or billing required.
2. **Many providers later:** the layer should not be OpenRouter-shaped forever;
   native providers (OpenAI, Anthropic, Gemini, Groq, local Ollama) should be
   config, not new code.
3. **Streaming + cancel** (M3) will build on the same layer.

## Design

### Provider layer

Adopt the **Vercel AI SDK** (`ai`) as the unified interface with per-provider
packages. OpenRouter is supported via `@openrouter/ai-sdk-provider`. This gives
`generateText` today and `streamText` tomorrow without changing call sites.

### Registry (`lib/ai-providers.ts`)

```ts
type AiProviderId = "openrouter" | "opencode" | "byok-openrouter";

type AiProvider = {
  id: AiProviderId;
  label: string;
  keySource: "server" | "user";
  backend: "openrouter" | "opencode";
  models: AiModel[];
};
```

- `openrouter` — free OpenRouter `:free` models via `OPENROUTER_API_KEY`.
- `opencode` — free [OpenCode Zen](https://opencode.ai/docs/zen/) models via `OPENCODE_API_KEY` (or a browser OpenCode key).
- `byok-openrouter` — heavier OpenRouter models; requires a user key in the picker.

Default: `google/gemma-4-26b-a4b-it:free`. Dead slugs such as `tencent/hy3:free` are removed.

### Key resolution (server)

`POST /api/chat` body gains:

```ts
{ instruction, document, model?: string, apiKey?: string }
```

The provider is **derived from `model`**: models listed under `openrouter`
(server-keyed) use the server key; anything else (registry BYOK models or a
custom slug) is routed as BYOK and requires a user key.

Resolution order (for OpenRouter-family providers):

1. `body.apiKey` (trimmed) — sent by the client from `localStorage`; used for
   this request **only**, never persisted or logged.
2. `OPENROUTER_API_KEY` server env.
3. If the model is not server-keyed and no `apiKey` is provided → `400`.

`apiKey` is stripped from any error/log output. Response keeps the current
shape `{ message, model, provider }` so both chat UIs are unaffected until
streaming lands.

### Model validation

- Registry models validated as today (`isAiModelId`).
- `byok-openrouter` additionally allows a **custom model slug** passed through
  (regex `^[a-zA-Z0-9/._:-]{1,64}$`) so power users can hit any OpenRouter
  model without a registry update.

### Key storage (client, `lib/ai-keys.ts`)

- `localStorage` key `vimtex:ai:openrouterKey`.
- Loaded lazily when sending a chat; sent per-request; never rendered.
- **Security rules:** no third-party scripts (strict CSP), keys never in URLs,
  never in server logs, never in Yjs shared state.

### UI

- `ChatModelPicker`: group models by provider; a "Bring your own key…" row
  reveals an input to save/clear the key; BYOK models disabled until a key is
  saved.
- Selection stays a single model id (see key resolution above); the provider is
  derived from it, so chat payloads are unchanged from the current
  `{ instruction, document, model }` plus `apiKey`.

## Build order

1. RFC (this doc) ✅
2. Backend: deps + registry + `/api/chat` refactor ✅
3. Client: `ai-keys.ts`, model picker grouping, chat payloads ✅
4. E2E + PR ✅ (102/102 passing)
5. Later: `streamText` + cancel, then AI diff accept/reject (#27).

## Non-goals (now)

- Server-side key storage / accounts (wait for M5 and retention proof).
- Native (non-OpenRouter) providers — enabled by the AI SDK later, config-only.
- Per-user quotas / metering on the server key.
