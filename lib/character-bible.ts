import type { CharacterBible } from "@/lib/types";

export type {
  CharacterBible,
  ProtagonistSettings,
} from "@/lib/types";
export {
  buildCharacterBibleBasePrompt,
  buildCharacterBiblePrompt,
  buildSceneCharactersPrompt,
  CHARACTER_LOCK,
  SCENE_CHARACTER_LOCK,
} from "@/lib/prompts/character-prompt";

/** @deprecated Import from @/lib/master-director */
export { NEGATIVE_PROMPT } from "@/lib/master-director";

export function isCharacterBiblePrompt(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("CHARACTER BIBLE") ||
    trimmed.startsWith("PROTAGONIST SETTINGS")
  );
}

export function isCharacterBible(value: unknown): value is CharacterBible {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.name === "string" &&
    typeof b.gender === "string" &&
    typeof b.height === "string" &&
    typeof b.physique === "string" &&
    typeof b.hairStyle === "string" &&
    typeof b.hairColor === "string" &&
    typeof b.skinTone === "string" &&
    typeof b.faceShape === "string" &&
    typeof b.eyes === "string" &&
    typeof b.nose === "string" &&
    typeof b.mouth === "string" &&
    typeof b.ears === "string" &&
    typeof b.eyebrows === "string" &&
    typeof b.distinguishingFeatures === "string" &&
    typeof b.clothing === "string" &&
    typeof b.belongings === "string" &&
    typeof b.referenceAge === "string"
  );
}
