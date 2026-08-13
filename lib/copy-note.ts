import { copyVimtexSource } from "./export.ts";
import { notify } from "./toasts.ts";

/** Clipboard copy of the live buffer (lossless VimTex source). */
export function copyVimtexSourceToClipboard(note: string): void {
  void copyVimtexSource(note).then((ok) => {
    if (ok) notify.success("Copied VimTex source");
    else notify.error("Could not copy to the clipboard");
  });
}
