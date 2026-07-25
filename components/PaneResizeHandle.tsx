"use client";

import { useCallback, useRef, useState } from "react";

const KEYBOARD_STEP = 16;

export type PaneResizeHandleProps = {
  orientation: "vertical" | "horizontal";
  onResize: (delta: number) => void;
  onReset?: () => void;
  label: string;
  className?: string;
};

export function PaneResizeHandle({
  orientation,
  onResize,
  onReset,
  label,
  className = "",
}: PaneResizeHandleProps) {
  const [active, setActive] = useState(false);
  const lastPosRef = useRef(0);

  const endDrag = useCallback(() => {
    setActive(false);
    document.body.removeAttribute("data-pane-resizing");
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      lastPosRef.current =
        orientation === "vertical" ? event.clientX : event.clientY;
      setActive(true);
      document.body.setAttribute("data-pane-resizing", orientation);
      document.body.style.cursor =
        orientation === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [orientation],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!active) return;
      const pos =
        orientation === "vertical" ? event.clientX : event.clientY;
      const delta = pos - lastPosRef.current;
      if (delta === 0) return;
      lastPosRef.current = pos;
      onResize(delta);
    },
    [active, onResize, orientation],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!active) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      endDrag();
    },
    [active, endDrag],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft" && orientation === "vertical") {
        event.preventDefault();
        onResize(-KEYBOARD_STEP);
        return;
      }
      if (event.key === "ArrowRight" && orientation === "vertical") {
        event.preventDefault();
        onResize(KEYBOARD_STEP);
        return;
      }
      if (event.key === "ArrowUp" && orientation === "horizontal") {
        event.preventDefault();
        onResize(-KEYBOARD_STEP);
        return;
      }
      if (event.key === "ArrowDown" && orientation === "horizontal") {
        event.preventDefault();
        onResize(KEYBOARD_STEP);
        return;
      }
      if (event.key === "Home" && onReset) {
        event.preventDefault();
        onReset();
      }
    },
    [onResize, onReset, orientation],
  );

  const handleDoubleClick = useCallback(() => {
    onReset?.();
  }, [onReset]);

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      tabIndex={0}
      data-active={active ? "true" : undefined}
      className={`vt-pane-resize-handle vt-pane-resize-handle--${orientation} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
    />
  );
}
