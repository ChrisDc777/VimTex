const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function turnstileEnabled(): boolean {
  return SITE_KEY.length > 0;
}

export function turnstileSiteKey(): string {
  return SITE_KEY;
}

/**
 * Cloudflare test keys: always-pass site key 1x00000000000000000000AA
 * with secret 1x0000000000000000000000000000000AA.
 */
export async function requestTurnstileToken(
  action = "vimtex-ai",
): Promise<string | null> {
  if (!SITE_KEY || typeof window === "undefined") return null;
  const api = window.turnstile;
  if (!api) return null;
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-9999px";
    document.body.appendChild(host);
    const widgetId = api.render(host, {
      sitekey: SITE_KEY,
      size: "invisible",
      appearance: "interaction-only",
      callback: (token: string) => {
        resolve(token);
        try {
          api.remove(widgetId);
          host.remove();
        } catch {
          // ignore
        }
      },
      "error-callback": () => {
        resolve(null);
        try {
          api.remove(widgetId);
          host.remove();
        } catch {
          // ignore
        }
      },
    });
    api.execute(widgetId, { action });
  });
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: Record<string, unknown>,
      ) => string;
      execute: (id: string, opts?: { action?: string }) => void;
      remove: (id: string) => void;
    };
  }
}
