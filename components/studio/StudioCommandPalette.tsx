"use client";

import dynamic from "next/dynamic";
import { CommandPalette } from "@/components/CommandPalette";
import type { CommandPaletteProps } from "@/components/CommandPalette";
import { useStudioExperience } from "@/lib/use-studio-experience";

const EnhancedCommandPalette = dynamic(
  () =>
    import("@/components/studio/enhanced/EnhancedCommandPalette").then((m) => ({
      default: m.EnhancedCommandPalette,
    })),
  { ssr: false },
);

export function StudioCommandPalette(props: CommandPaletteProps) {
  const { isEnhanced } = useStudioExperience();
  if (isEnhanced) return <EnhancedCommandPalette {...props} />;
  return <CommandPalette {...props} />;
}
