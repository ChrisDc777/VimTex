"use client";
// beui.dev/components/blocks/bloom-menu — adapted as a reusable item menu

import { FolderOpen, Plus, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { EASE_OUT } from "@/components/beui/lib/ease";
import { cn } from "@/components/beui/lib/utils";
import { subscribeOpenPreferences } from "@/lib/ui-events";

export type BloomMenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
};

const SPRING_FOLDER = {
  type: "spring",
  stiffness: 300,
  damping: 32,
  mass: 0.9,
} as const;

export interface BloomMenuProps {
  items: BloomMenuItem[];
  onSelect?: (id: string) => void;
  triggerLabel?: string;
  panelTitle?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  columns?: 2 | 3;
  /**
   * `center` — iris around trigger (can clip off-screen at edges).
   * `above` — bloom upward (dock).
   * `below` — bloom downward (topbar-safe, portaled above preview).
   */
  placement?: "center" | "above" | "below";
  triggerIcon?: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function BloomMenu({
  items,
  onSelect,
  triggerLabel = "Create",
  panelTitle = triggerLabel,
  className,
  triggerClassName,
  disabled = false,
  columns = 3,
  placement = "center",
  triggerIcon,
  onOpenChange,
}: BloomMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const reduce = useReducedMotion() ?? false;
  const layoutId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const above = placement === "above";
  const below = placement === "below";

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => setMounted(true), []);

  useEffect(() => subscribeOpenPreferences(() => setOpenState(false)), []);

  useLayoutEffect(() => {
    if (!open || !below || !triggerRef.current) {
      setPanelPos(null);
      return;
    }
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(22 * 16, window.innerWidth * 0.86);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setPanelPos({ top: r.bottom + 6, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, below]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpenState(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const morph = reduce ? { duration: 0.15 } : SPRING_FOLDER;
  const cols = columns;
  const rows = Math.max(1, Math.ceil(items.length / cols));

  const panelInner = (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-sm font-medium text-foreground">{panelTitle}</span>
        <button
          type="button"
          onClick={() => setOpenState(false)}
          aria-label="Close menu"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <motion.div
        initial={
          reduce
            ? false
            : {
                clipPath: above
                  ? "inset(70% 20% 0% 20%)"
                  : below
                    ? "inset(0% 20% 70% 20%)"
                    : "inset(45% 34% 45% 34%)",
              }
        }
        animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
        transition={{
          delay: reduce ? 0 : 0.08,
          duration: 0.45,
          ease: EASE_OUT,
        }}
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const dist = Math.hypot(col - (cols - 1) / 2, row - (rows - 1) / 2);
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect?.(item.id);
                setOpenState(false);
              }}
              className={cn(
                "flex items-center justify-center px-3 py-5 text-muted-foreground transition-colors hover:text-foreground",
                col !== cols - 1 && "border-r border-border",
                row < rows - 1 && "border-b border-border",
              )}
            >
              <motion.span
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.85, filter: "blur(6px)" }
                }
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{
                  delay: reduce ? 0 : 0.1 + dist * 0.07,
                  type: "spring",
                  stiffness: 440,
                  damping: 34,
                }}
                className="flex flex-col items-center gap-1.5"
              >
                <item.icon className="size-5" />
                <span className="text-xs font-medium">{item.label}</span>
                {item.hint ? (
                  <span className="text-[10px] text-muted-foreground/80">
                    {item.hint}
                  </span>
                ) : null}
              </motion.span>
            </button>
          );
        })}
      </motion.div>
    </>
  );

  const trigger = (
    <motion.button
      key="trigger"
      ref={triggerRef}
      type="button"
      layoutId={below ? undefined : layoutId}
      transition={morph}
      style={{ borderRadius: 999 }}
      disabled={disabled}
      onClick={() => setOpenState(true)}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={triggerLabel}
      title={panelTitle}
      whileTap={reduce || disabled ? undefined : { scale: 0.97 }}
      className={cn(
        above
          ? "grid size-full place-items-center rounded-full border-0 bg-transparent text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          : "inline-flex h-9 items-center justify-center gap-1.5 border border-border bg-card px-3 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        triggerClassName,
      )}
    >
      <motion.span
        layout={!below}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
          above && "size-full",
        )}
      >
        {above ? (
          (triggerIcon ?? <FolderOpen className="size-4" aria-hidden />)
        ) : (
          <>
            {triggerIcon ?? <Plus className="size-3.5 opacity-70" aria-hidden />}
            {triggerLabel}
          </>
        )}
      </motion.span>
    </motion.button>
  );

  if (above) {
    return (
      <div
        ref={rootRef}
        className={cn(
          "relative flex size-full items-end justify-center",
          className,
        )}
      >
        <span
          aria-hidden
          className="invisible grid size-full place-items-center"
        >
          {triggerIcon ?? <FolderOpen className="size-4" />}
        </span>
        <div className="pointer-events-none absolute bottom-0 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center">
          <div className="pointer-events-auto flex flex-col items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {open ? (
                <motion.div
                  key="panel"
                  layoutId={layoutId}
                  transition={morph}
                  style={{ borderRadius: 16, transformOrigin: "bottom center" }}
                  role="menu"
                  aria-label={panelTitle}
                  className="mb-2 w-[min(86vw,22rem)] overflow-hidden border border-border bg-card shadow-2xl"
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduce ? 0 : 0.12, duration: 0.2 }}
                  >
                    {panelInner}
                  </motion.div>
                </motion.div>
              ) : (
                <div className="size-[42px]">{trigger}</div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  if (below) {
    const portal =
      mounted && open && panelPos
        ? createPortal(
            <AnimatePresence>
              <motion.div
                key="bloom-portal"
                ref={panelRef}
                role="menu"
                aria-label={panelTitle}
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: -6, clipPath: "inset(0% 20% 70% 20%)" }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  clipPath: "inset(0% 0% 0% 0%)",
                }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: -4, clipPath: "inset(0% 20% 70% 20%)" }
                }
                transition={{ duration: reduce ? 0.12 : 0.32, ease: EASE_OUT }}
                style={{
                  position: "fixed",
                  top: panelPos.top,
                  left: panelPos.left,
                  width: "min(86vw, 22rem)",
                  borderRadius: 16,
                  zIndex: 80,
                  transformOrigin: "top center",
                }}
                className="overflow-hidden border border-border bg-card shadow-2xl"
              >
                {panelInner}
              </motion.div>
            </AnimatePresence>,
            document.body,
          )
        : null;

    return (
      <div ref={rootRef} className={cn("relative inline-flex", className)}>
        {trigger}
        {portal}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <span
        aria-hidden
        className={cn(
          "invisible inline-flex h-9 items-center px-3 text-sm",
          triggerClassName,
        )}
      >
        {triggerLabel}
      </span>

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[80] -translate-x-1/2 -translate-y-1/2">
        <div className="pointer-events-auto grid place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {open ? (
              <motion.div
                key="panel"
                layoutId={layoutId}
                transition={morph}
                style={{ borderRadius: 16 }}
                role="menu"
                aria-label={panelTitle}
                className="w-[min(86vw,22rem)] overflow-hidden border border-border bg-card shadow-2xl"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduce ? 0 : 0.12, duration: 0.2 }}
                >
                  {panelInner}
                </motion.div>
              </motion.div>
            ) : (
              trigger
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
