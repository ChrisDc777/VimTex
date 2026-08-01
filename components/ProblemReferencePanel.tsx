"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import { SidePanelHeader } from "@/components/SidePanelHeader";
import {
  clearReferenceImage,
  loadReferenceImage,
  saveReferenceImage,
} from "@/lib/reference-storage";

export type ProblemReferencePanelProps = {
  open: boolean;
  roomId: string;
};

function imageFromClipboardEvent(event: ClipboardEvent): Blob | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

async function imageFromSystemClipboard(): Promise<Blob | null> {
  if (!navigator.clipboard?.read) return null;

  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (!imageType) continue;
    return item.getType(imageType);
  }
  return null;
}

export function ProblemReferencePanel({
  open,
  roomId,
}: ProblemReferencePanelProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const imageUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const revokeImageUrl = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const setPreviewUrl = useCallback(
    (url: string | null) => {
      revokeImageUrl(imageUrlRef.current);
      imageUrlRef.current = url;
      setImageUrl(url);
    },
    [revokeImageUrl],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      const blob = await loadReferenceImage(roomId);
      if (cancelled) return;
      if (blob) {
        setPreviewUrl(URL.createObjectURL(blob));
      } else {
        setPreviewUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, roomId, setPreviewUrl]);

  useEffect(
    () => () => {
      revokeImageUrl(imageUrlRef.current);
    },
    [revokeImageUrl],
  );

  const applyImageBlob = useCallback(
    async (blob: Blob) => {
      setError(null);
      setPreviewUrl(URL.createObjectURL(blob));
      await saveReferenceImage(roomId, blob);
    },
    [roomId, setPreviewUrl],
  );

  const handlePaste = useCallback(async () => {
    setError(null);
    setLoading(true);
    panelRef.current?.focus();

    try {
      const blob = await imageFromSystemClipboard();
      if (!blob) {
        setError(
          "No image on the clipboard. Choose an image or take a photo instead.",
        );
        return;
      }
      await applyImageBlob(blob);
    } catch {
      setError(
        "Could not read the clipboard. Choose an image or paste with Ctrl+V in this panel.",
      );
    } finally {
      setLoading(false);
    }
  }, [applyImageBlob]);

  const handleChooseImage = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  const handleTakePhoto = useCallback(() => {
    setError(null);
    cameraInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setLoading(true);
      try {
        await applyImageBlob(file);
      } catch {
        setError("Could not save the selected image.");
      } finally {
        setLoading(false);
      }
    },
    [applyImageBlob],
  );

  const handlePasteEvent = useCallback(
    async (event: ClipboardEvent<HTMLDivElement>) => {
      const blob = imageFromClipboardEvent(event);
      if (!blob) return;

      event.preventDefault();
      setError(null);
      setLoading(true);
      try {
        await applyImageBlob(blob);
      } catch {
        setError("Could not save the pasted image.");
      } finally {
        setLoading(false);
      }
    },
    [applyImageBlob],
  );

  const handleClear = useCallback(async () => {
    setError(null);
    setPreviewUrl(null);
    await clearReferenceImage(roomId);
    panelRef.current?.focus();
  }, [roomId, setPreviewUrl]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="vt-reference-panel flex h-full min-h-0 flex-col outline-none"
      tabIndex={-1}
      onPaste={handlePasteEvent}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <SidePanelHeader
        title="Problem"
        actions={
          imageUrl ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleChooseImage}
                disabled={loading}
                className="vt-btn vt-btn--ghost"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="vt-btn vt-btn--ghost"
              >
                Clear
              </button>
            </div>
          ) : null
        }
      />

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL from user upload; not optimizable by next/image
          <img
            src={imageUrl}
            alt="Problem reference"
            className="vt-reference-image"
            draggable={false}
          />
        ) : (
          <div className="vt-reference-empty">
            <p className="text-sm text-body-mid">
              Add a screenshot of the problem you are solving.
            </p>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading}
                className="vt-btn vt-btn--solid"
              >
                {loading ? "Reading…" : "Paste"}
              </button>
              <button
                type="button"
                onClick={handleChooseImage}
                disabled={loading}
                className="vt-btn"
              >
                Choose image
              </button>
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={loading}
                className="vt-btn"
              >
                Take photo
              </button>
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-3 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
