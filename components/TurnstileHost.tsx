"use client";

import { useEffect } from "react";
import { turnstileEnabled, turnstileSiteKey } from "@/lib/turnstile";

const SCRIPT_ID = "cf-turnstile-script";

/** Loads Turnstile once for shared-key AI requests. */
export function TurnstileHost() {
  useEffect(() => {
    if (!turnstileEnabled()) return;
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  if (!turnstileEnabled()) return null;
  return (
    <div
      className="hidden"
      data-turnstile-sitekey={turnstileSiteKey()}
      aria-hidden
    />
  );
}
