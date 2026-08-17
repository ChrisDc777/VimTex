const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

export function allowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS?.split(",") ?? [];
  const extra = raw.map((s) => s.trim()).filter(Boolean);
  return extra.length > 0 ? extra : DEFAULT_ORIGINS;
}

export function originAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return true;
  return allowedOrigins(env).includes(origin);
}

export function corsHeaders(env: Env, origin: string | null): HeadersInit {
  const allow = origin && originAllowed(origin, env) ? origin : allowedOrigins(env)[0]!;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type,x-vimtex-edit,x-vimtex-view,x-vimtex-auth,x-vimtex-internal",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(
  env: Env,
  request: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(env, request.headers.get("Origin")),
    },
  });
}
