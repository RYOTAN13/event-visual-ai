export {
  type CharacterBible,
  type ProtagonistSettings,
  CHARACTER_LOCK,
  SCENE_CHARACTER_LOCK,
  NEGATIVE_PROMPT,
  buildCharacterBiblePrompt,
  buildCharacterBibleBasePrompt,
  buildSceneCharactersPrompt,
  isCharacterBiblePrompt,
  isCharacterBible,
} from "@/lib/character-bible";

/** @deprecated Use CHARACTER_LOCK */
export const PROTAGONIST_IDENTITY_LOCK = `The exact same protagonist.
Never redesign the protagonist.
Keep identical face, hairstyle, clothing, body proportions and age across every scene.`;

/** @deprecated Use buildCharacterBiblePrompt */
export { buildCharacterBibleBasePrompt as buildProtagonistSettingsPrompt } from "@/lib/character-bible";

/** @deprecated Use isCharacterBiblePrompt */
export { isCharacterBiblePrompt as isProtagonistPrompt } from "@/lib/character-bible";
