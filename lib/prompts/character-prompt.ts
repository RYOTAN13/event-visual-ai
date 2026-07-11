import type { CharacterBible } from "@/lib/types";

export const CHARACTER_LOCK = `Same person throughout the documentary.
Maintain identical facial identity, facial proportions, eye shape, nose, ears, jawline, hairstyle evolution, body proportions and ethnicity.
Only age changes.`;

export const SCENE_CHARACTER_LOCK = `Only include characters explicitly described in this scene.
Never invent additional main characters.`;

export function buildCharacterBiblePrompt(
  bible: CharacterBible,
  sceneAge: string
): string {
  return [
    "CHARACTER BIBLE — CHARACTER LOCK SYSTEM (shared across all scenes):",
    `氏名 / Name: ${bible.name}`,
    `性別 / Gender: ${bible.gender}`,
    `身長 / Height: ${bible.height}`,
    `体型 / Physique: ${bible.physique}`,
    `髪型 / Hair style: ${bible.hairStyle}`,
    `髪色 / Hair color: ${bible.hairColor}`,
    `肌色 / Skin tone: ${bible.skinTone}`,
    `顔型 / Face shape: ${bible.faceShape}`,
    `目 / Eyes: ${bible.eyes}`,
    `鼻 / Nose: ${bible.nose}`,
    `口 / Mouth: ${bible.mouth}`,
    `耳 / Ears: ${bible.ears}`,
    `眉 / Eyebrows: ${bible.eyebrows}`,
    `特徴 / Distinguishing features: ${bible.distinguishingFeatures}`,
    `服装 / Clothing: ${bible.clothing}`,
    `持ち物 / Belongings: ${bible.belongings}`,
    `基準年齢 / Reference age: ${bible.referenceAge}`,
    `このシーンの年齢 / Scene age (ONLY this changes): ${sceneAge}`,
    "",
    "CHARACTER LOCK:",
    CHARACTER_LOCK,
  ].join("\n");
}

export function buildCharacterBibleBasePrompt(bible: CharacterBible): string {
  return buildCharacterBiblePrompt(bible, bible.referenceAge);
}

export function buildSceneCharactersPrompt(
  charactersInScene: string[]
): string {
  const list =
    charactersInScene.length > 0
      ? charactersInScene.map((name) => `- ${name}`).join("\n")
      : "- Protagonist only";

  return ["CHARACTERS IN THIS SCENE ONLY:", list, SCENE_CHARACTER_LOCK].join(
    "\n"
  );
}
