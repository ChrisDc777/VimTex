"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogoMark } from "@/components/BrandLogoMark";
import {
  BRAND_ANIM_SEQUENCES,
  BRAND_FINAL_TEXT,
  type BrandAnimStep,
} from "@/lib/brand-animation";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function splitBrandText(text: string) {
  if (text.startsWith("Vim") && text.length >= 3) {
    return { vim: text.slice(0, 3), tex: text.slice(3) };
  }
  return { vim: text, tex: "" };
}

function renderWithSelection(
  text: string,
  selection: [number, number] | undefined,
) {
  if (!selection) {
    const { vim, tex } = splitBrandText(text);
    return (
      <>
        <span className="vt-brand__vim">{vim}</span>
        {tex ? <span className="vt-brand__tex">{tex}</span> : null}
      </>
    );
  }

  const [start, end] = selection;
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  return (
    <>
      {before ? <span className="vt-brand__vim">{before}</span> : null}
      <span className="vt-brand__sel">{selected}</span>
      {after ? <span className="vt-brand__vim">{after}</span> : null}
    </>
  );
}

function BrandText({
  step,
}: {
  step: Pick<BrandAnimStep, "text" | "mode" | "selection">;
}) {
  const cursorClass =
    step.mode === "insert"
      ? "vt-brand__cursor vt-brand__cursor--block"
      : "vt-brand__cursor vt-brand__cursor--bar";

  return (
    <span className="vt-brand__text" aria-hidden="true">
      {renderWithSelection(step.text, step.selection)}
      <span className={cursorClass} aria-hidden="true" />
    </span>
  );
}

function StaticBrandText() {
  return (
    <span className="vt-brand__text" aria-hidden="true">
      <span className="vt-brand__vim">Vim</span>
      <span className="vt-brand__tex">Tex</span>
    </span>
  );
}

type AnimatedBrandLogoProps = {
  /** When false, finish the current sequence then stay on static VimTex. */
  canvasBlank?: boolean;
};

export function AnimatedBrandLogo({ canvasBlank = true }: AnimatedBrandLogoProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [seqIndex, setSeqIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [staticLogo, setStaticLogo] = useState(() => !canvasBlank);
  const finishAfterSequenceRef = useRef(!canvasBlank);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!canvasBlank) {
      finishAfterSequenceRef.current = true;
      return;
    }

    finishAfterSequenceRef.current = false;
    setStaticLogo(false);
    setSeqIndex(0);
    setStepIndex(0);
  }, [canvasBlank]);

  const sequence = BRAND_ANIM_SEQUENCES[seqIndex] ?? BRAND_ANIM_SEQUENCES[0];
  const step = sequence.steps[stepIndex] ?? sequence.steps[0];

  useEffect(() => {
    if (!mounted || reducedMotion || staticLogo) return;

    const timer = window.setTimeout(() => {
      const nextStep = stepIndex + 1;
      if (nextStep >= sequence.steps.length) {
        if (finishAfterSequenceRef.current) {
          setStaticLogo(true);
        } else {
          setSeqIndex((i) => (i + 1) % BRAND_ANIM_SEQUENCES.length);
          setStepIndex(0);
        }
      } else {
        setStepIndex(nextStep);
      }
    }, step.delayMs);

    return () => window.clearTimeout(timer);
  }, [
    mounted,
    reducedMotion,
    staticLogo,
    seqIndex,
    stepIndex,
    sequence.steps.length,
    step.delayMs,
  ]);

  if (!mounted || reducedMotion || staticLogo) {
    return (
      <div className="vt-brand vt-brand--animated" aria-label={BRAND_FINAL_TEXT}>
        <BrandLogoMark />
        <StaticBrandText />
        <span className="sr-only">{BRAND_FINAL_TEXT}</span>
      </div>
    );
  }

  return (
    <div className="vt-brand vt-brand--animated" aria-label={BRAND_FINAL_TEXT}>
      <BrandLogoMark />
      <BrandText step={step} />
      <span className="sr-only">{BRAND_FINAL_TEXT}</span>
    </div>
  );
}
