interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  ROOM: DurableObjectNamespace;
  ROOM_SECRET: string;
  AI_ADMISSION_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  ALLOWED_ORIGINS: string;
  TTL_NEVER_ALLOWED: string;
  DEFAULT_TTL_MS: string;
  WORKER_VERSION?: string;
  AI_RATE_LIMITER?: RateLimit;
}

interface DurableObjectConstructor {
  new (ctx: DurableObjectState, env: Env): DurableObject;
}
