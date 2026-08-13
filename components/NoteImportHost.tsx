"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { notify } from "@/lib/toasts";
import {
  NOTE_IMPORT_ACCEPT,
  NOTE_IMPORT_MAX_BYTES,
  prepareImportedNote,
} from "@/lib/import-note";
import { subscribeOpenNoteImport } from "@/lib/ui-events";

/**
 * Hidden file picker for #31. Menus/palette call `openNoteImport()`;
 * the host replaces the live Yjs buffer (syncs to peers).
 */
export function NoteImportHost() {
  const workspace = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeOpenNoteImport(() => {
      if (!workspace) {
        notify.info("Wait until the room connects.");
        return;
      }
      if (workspace.readOnly) {
        notify.error("This room is view-only.");
        return;
      }
      inputRef.current?.click();
    });
  }, [workspace]);

  return (
    <input
      ref={inputRef}
      type="file"
      accept={NOTE_IMPORT_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      data-testid="note-import-input"
      onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !workspace) return;
        if (workspace.readOnly) {
          notify.error("This room is view-only.");
          return;
        }
        if (file.size > NOTE_IMPORT_MAX_BYTES) {
          notify.error("File is too large (max 1 MB).");
          return;
        }
        let raw: string;
        try {
          raw = await file.text();
        } catch {
          notify.error("Could not read that file.");
          return;
        }
        const prepared = prepareImportedNote(raw, file.name);
        if (!prepared.content.trim()) {
          notify.error("That file has no importable note text.");
          return;
        }
        workspace.replaceAll(prepared.content, "file-import");
        notify.success(
          prepared.convertedDollarMath
            ? `Imported ${file.name} (converted $ math)`
            : `Imported ${file.name}`,
        );
      }}
    />
  );
}
