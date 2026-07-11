import { CINEMATIC_STYLE_PRESETS } from "@/lib/prompts/cinematic-prompt";
import type { CinematicStylePreset } from "@/lib/prompts/cinematic-prompt";

export type { CinematicDirection } from "@/lib/types";
export type { CinematicStylePreset } from "@/lib/prompts/cinematic-prompt";
export {
  buildCinematicDirectorPrompt,
  CINEMATIC_DIRECTOR_SYSTEM_PROMPT,
  CINEMATIC_STYLE_PRESETS,
  DEFAULT_CINEMATIC_STYLE,
  IMAGE_PROHIBITIONS,
} from "@/lib/prompts/cinematic-prompt";

export function isFullImagePrompt(text: string): boolean {
  return text.trim().startsWith("CINEMATIC DIRECTOR");
}

export function isValidCinematicStyle(
  value: string
): value is CinematicStylePreset {
  return (CINEMATIC_STYLE_PRESETS as readonly string[]).includes(value);
}
