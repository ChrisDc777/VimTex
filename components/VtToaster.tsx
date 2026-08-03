"use client";

import { Toaster } from "react-hot-toast";

/**
 * Themed toast host. Mount once per shell (inside a client tree) and keep it
 * mounted for the app lifetime; call sites use lib/toasts helpers.
 */
export function VtToaster() {
  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      toastOptions={{
        duration: 3200,
        style: {
          background: "var(--canvas-elevated)",
          color: "var(--ink)",
          border: "1px solid var(--hairline-strong)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
          fontFamily:
            'var(--font-geist), "Geist", ui-sans-serif, sans-serif',
          fontSize: "13px",
          fontWeight: "500",
          lineHeight: "1.35",
          padding: "9px 14px",
          maxWidth: "min(24rem, calc(100vw - 2rem))",
        },
        success: {
          iconTheme: { primary: "var(--success)", secondary: "var(--canvas-elevated)" },
        },
        error: {
          iconTheme: { primary: "var(--error)", secondary: "var(--canvas-elevated)" },
        },
      }}
    />
  );
}
