/**
 * Single source of truth for which AI surfaces each shell exposes.
 * New features default Studio-only; Forge opt-in must be explicit (#59).
 */

import type { UiVariant } from "@/lib/ui-variant";

export type AiFeature =
  | "chat"
  | "chatDocumentEdit"
  | "diffAcceptReject"
  | "selectionActions"
  | "ghostText"
  | "slashCommands"
  | "diagnosticsFix"
  | "diagnosticsExplain"
  | "chatDocActions"
  | "templatesGen"
  | "outlineTodo"
  | "grammarReview"
  | "citeComplete"
  | "equationScopedAi"
  | "chatStreaming"
  | "chatMemory";

/** Studio: full AI surface as features ship. */
const STUDIO_FEATURES: ReadonlySet<AiFeature> = new Set<AiFeature>([
  "chat",
  "chatDocumentEdit",
  "diffAcceptReject",
  "selectionActions",
  "ghostText",
  "slashCommands",
  "diagnosticsFix",
  "diagnosticsExplain",
  "chatDocActions",
  "templatesGen",
  "outlineTodo",
  "grammarReview",
  "citeComplete",
  "equationScopedAi",
  "chatStreaming",
  "chatMemory",
]);

/**
 * Forge: suggest-only workbench.
 * Chat Q&A and read-only explain; no document mutation paths.
 */
const FORGE_FEATURES: ReadonlySet<AiFeature> = new Set<AiFeature>([
  "chat",
  "diagnosticsExplain",
  "chatStreaming",
]);

const BY_SHELL: Record<UiVariant, ReadonlySet<AiFeature>> = {
  studio: STUDIO_FEATURES,
  forge: FORGE_FEATURES,
};

export function aiFeaturesForShell(shell: UiVariant): ReadonlySet<AiFeature> {
  return BY_SHELL[shell];
}

export function aiFeatureEnabled(
  shell: UiVariant,
  feature: AiFeature,
): boolean {
  return BY_SHELL[shell].has(feature);
}

/** True when this shell may apply AI output to the Yjs note. */
export function aiMayMutateDocument(shell: UiVariant): boolean {
  return aiFeatureEnabled(shell, "chatDocumentEdit");
}
