/**
 * Studio-only Enhanced | Basic experience preference.
 * Enhanced vendors BEUI; Basic keeps pre-BEUI component trees.
 * Independent of prefers-reduced-motion and Forge (always Basic).
 */

export type StudioExperience = "enhanced" | "basic";

export const STUDIO_EXPERIENCE_KEY = "vimtex:studioExperience";
export const STUDIO_EXPERIENCE_EVENT = "vimtex:studio-experience";
export const DEFAULT_STUDIO_EXPERIENCE: StudioExperience = "enhanced";

export const STUDIO_EXPERIENCES = ["enhanced", "basic"] as const;

export function normalizeStudioExperience(
  value: unknown,
): StudioExperience | null {
  return value === "enhanced" || value === "basic" ? value : null;
}

export function studioExperienceLabel(value: StudioExperience): string {
  return value === "enhanced" ? "Enhanced" : "Basic";
}

export function loadStudioExperience(): StudioExperience {
  if (typeof localStorage === "undefined") return DEFAULT_STUDIO_EXPERIENCE;
  try {
    const raw = localStorage.getItem(STUDIO_EXPERIENCE_KEY);
    return normalizeStudioExperience(raw) ?? DEFAULT_STUDIO_EXPERIENCE;
  } catch {
    return DEFAULT_STUDIO_EXPERIENCE;
  }
}

export function saveStudioExperience(experience: StudioExperience): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STUDIO_EXPERIENCE_KEY, experience);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(STUDIO_EXPERIENCE_EVENT, { detail: { experience } }),
      );
    }
  } catch {
    // ignore quota / private mode
  }
}
