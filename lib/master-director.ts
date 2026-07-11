export type {
  MasterDirectionResult,
  MasterReviewScene,
  QualityCheckItem,
} from "@/lib/types";
export {
  buildMasterDirectorPrompt,
  formatChecklistForPrompt,
  MASTER_DIRECTOR_SYSTEM_PROMPT,
  NEGATIVE_PROMPT,
  QUALITY_CHECKLIST,
} from "@/lib/prompts/master-prompt";

export function isMasterDirectorPrompt(text: string): boolean {
  return text.trim().startsWith("MASTER DIRECTOR");
}

