"use client";

import toast from "react-hot-toast";

export type ConfirmToastOptions = {
  message: string;
  /** Primary action label. Default: "OK". */
  confirmLabel?: string;
  /** Secondary action label. Default: "Cancel". */
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  tone?: "default" | "danger";
  /** Stable id so repeated opens replace the previous toast. */
  id?: string;
};

/**
 * Thin, styled access to the shared toast host (see components/VtToaster).
 * Confirm uses a custom JSX toast (react-hot-toast) so we never fall back to
 * browser `window.confirm`.
 */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),

  /** Promise that resolves true on confirm, false on cancel. */
  confirm: (opts: ConfirmToastOptions): Promise<boolean> =>
    new Promise((resolve) => {
      const id = opts.id ?? `vt-confirm-${Date.now()}`;
      const confirmLabel = opts.confirmLabel ?? "OK";
      const cancelLabel = opts.cancelLabel ?? "Cancel";
      const tone = opts.tone ?? "default";
      let settled = false;

      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        toast.dismiss(id);
        resolve(value);
      };

      toast.custom(
        () => (
          <div className="vt-toast-confirm" role="alertdialog" aria-modal="true">
            <p className="vt-toast-confirm__message">{opts.message}</p>
            <div className="vt-toast-confirm__actions">
              <button
                type="button"
                className="vt-btn vt-btn--ghost text-xs"
                onClick={() => finish(false)}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={
                  tone === "danger"
                    ? "vt-btn vt-btn--ghost text-xs vt-toast-confirm__danger"
                    : "vt-btn vt-btn--solid text-xs"
                }
                onClick={() => finish(true)}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        ),
        {
          id,
          duration: Infinity,
          className: "vt-toast-confirm-host",
        },
      );
    }),
};
