"use client";
// beui.dev/components/motion/dock

import { motion, useReducedMotion } from "motion/react";
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type ReactNode,
  type Ref,
} from "react";
import { SPRING_LAYOUT } from "@/components/beui/lib/ease";
import { cn } from "@/components/beui/lib/utils";

type DockContextValue = {
  size: number;
  pillLayoutId: string;
};

const DockContext = createContext<DockContextValue | null>(null);

export interface DockProps {
  children: ReactNode;
  className?: string;
  /** Size of each item in px. */
  size?: number;
}

export function Dock({ children, size = 44, className }: DockProps) {
  const pillLayoutId = useId();
  const ctx = useMemo(
    () => ({ size, pillLayoutId }),
    [size, pillLayoutId],
  );

  return (
    <DockContext.Provider value={ctx}>
      <div
        role="toolbar"
        className={cn(
          "inline-flex h-auto items-end gap-1.5 rounded-2xl border border-border bg-card/80 px-2 py-1 shadow-2xl backdrop-blur-xl",
          className,
        )}
      >
        {children}
      </div>
    </DockContext.Provider>
  );
}

export interface DockItemProps {
  children: ReactNode;
  className?: string;
  /** When set, the item renders as a button. Omit when children carry their own control. */
  onClick?: () => void;
  active?: boolean;
  "aria-label"?: string;
  "aria-haspopup"?: "dialog" | "menu" | "true" | "false";
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  id?: string;
  /** Visible hover/focus tooltip (preferred over native title). */
  tooltip?: string;
  title?: string;
  disabled?: boolean;
}

function DockTooltip({ label }: { label: string }) {
  return (
    <span className="vt-dock-tooltip" role="tooltip">
      {label}
    </span>
  );
}

/** Forwards ref so MorphPopover / other overlays can measure the trigger. */
export const DockItem = forwardRef<
  HTMLButtonElement | HTMLDivElement,
  DockItemProps
>(function DockItem(
  {
    children,
    className,
    onClick,
    active,
    disabled,
    tooltip,
    title,
    ...rest
  },
  ref,
) {
  const dock = useContext(DockContext);
  const reduce = useReducedMotion() ?? false;
  const size = dock?.size ?? 44;
  const pillLayoutId = dock?.pillLayoutId ?? "dock-pill";
  const tip = tooltip ?? title;

  const pill = active ? (
    <motion.span
      layoutId={pillLayoutId}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      className="vt-dock-item-pill absolute inset-0.5 -z-10 rounded-xl bg-primary/5"
    />
  ) : null;
  const sharedStyle = { width: size, height: size };
  const sharedClass = cn(
    "vt-dock-item relative flex shrink-0 items-center justify-center rounded-full text-foreground",
    className,
  );

  if (onClick) {
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={rest["aria-label"] ?? tip}
        aria-pressed={active}
        aria-haspopup={rest["aria-haspopup"]}
        aria-expanded={rest["aria-expanded"]}
        aria-controls={rest["aria-controls"]}
        id={rest.id}
        style={sharedStyle}
        className={cn(
          sharedClass,
          "cursor-pointer border-0 bg-transparent p-0 outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        {pill}
        {children}
        {tip ? <DockTooltip label={tip} /> : null}
      </button>
    );
  }

  return (
    <div
      ref={ref as Ref<HTMLDivElement>}
      style={sharedStyle}
      className={sharedClass}
      aria-label={rest["aria-label"] ?? tip}
    >
      {pill}
      {children}
      {tip ? <DockTooltip label={tip} /> : null}
    </div>
  );
});

export function DockSeparator({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("mx-1 h-6 w-px self-center bg-border", className)}
    />
  );
}
