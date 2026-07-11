import {
  buildCharacterBiblePrompt,
  buildSceneCharactersPrompt,
} from "@/lib/prompts/character-prompt";
import { NEGATIVE_PROMPT } from "@/lib/prompts/master-prompt";
import type { CharacterBible } from "@/lib/types";

export const MIN_VISUAL_DIRECTOR_PROMPT_LENGTH = 1200;

export const VISUAL_DIRECTOR_AI_SYSTEM_PROMPT = `You are Visual Director AI — a scene-level cinematographer operating under locked Cinematic Director, Camera Director, and Character Bible layers.

The CINEMATIC DIRECTOR, CAMERA DIRECTOR, and CHARACTER BIBLE are already defined. Do NOT override them.
Execute the locked Camera Director cut (shot type, lens, composition, framing) with rich cinematic prose.
The protagonist is the SAME person in every frame — only age changes per scene.

CHARACTER RULES — STRICT:
- Identical facial identity across all scenes. Only age progresses.
- Only depict characters listed for each specific scene.
- Never invent additional main characters.

For EACH scene, expand the locked Camera Director cut into immersive scene cinematography:
- Honor the locked Shot Type, Lens, Composition, Framing, Focus, Depth of Field
- Add scene-specific lighting nuance, texture, atmosphere, and emotional beat
- Every scene MUST have a unique framingSignature within the locked cut

OUTPUT:
- Each visualDirectorPrompt: minimum 1200 characters — scene cinematography ONLY
- Do NOT repeat Master Director, Cinematic Director, Camera Director, or Character Bible (prepended automatically)
- Do NOT include negative prompt (appended automatically)
- Do NOT use markdown or bullet lists inside visualDirectorPrompt`;

export type ImagePromptParts = {
  masterDirectorPrompt: string;
  cinematicDirectorPrompt: string;
  cameraDirectorPrompt: string;
  characterBible: CharacterBible;
  sceneAge: string;
  visualDirectorScenePrompt: string;
  charactersInScene: string[];
  sceneContent: string;
};

export function buildFullImagePrompt(parts: ImagePromptParts): string {
  const characterBiblePrompt = buildCharacterBiblePrompt(
    parts.characterBible,
    parts.sceneAge
  );
  const sceneCharactersPrompt = buildSceneCharactersPrompt(
    parts.charactersInScene
  );

  return [
    parts.masterDirectorPrompt.trim(),
    "",
    parts.cinematicDirectorPrompt.trim(),
    "",
    parts.cameraDirectorPrompt.trim(),
    "",
    characterBiblePrompt,
    "",
    "VISUAL DIRECTOR — SCENE CINEMATOGRAPHY:",
    parts.visualDirectorScenePrompt.trim(),
    "",
    "SCENE:",
    parts.sceneContent.trim(),
    sceneCharactersPrompt,
    "",
    "NEGATIVE PROMPT:",
    NEGATIVE_PROMPT,
  ].join("\n");
}

export function buildSceneImagePrompt(
  masterDirectorPrompt: string,
  cinematicDirectorPrompt: string,
  cameraDirectorPrompt: string,
  visualDirectorScenePrompt: string,
  characterBible: CharacterBible,
  sceneAge: string,
  charactersInScene: string[],
  sceneContent: string
): string {
  return buildFullImagePrompt({
    masterDirectorPrompt,
    cinematicDirectorPrompt,
    cameraDirectorPrompt,
    characterBible,
    sceneAge,
    visualDirectorScenePrompt,
    charactersInScene,
    sceneContent,
  });
}

export function swapVisualDirectorSection(
  fullPrompt: string,
  newVisualDirectorScenePrompt: string
): string {
  const startMarker = "VISUAL DIRECTOR — SCENE CINEMATOGRAPHY:";
  const sceneMarker = "\nSCENE:";
  const startIdx = fullPrompt.indexOf(startMarker);
  const sceneIdx = fullPrompt.indexOf(sceneMarker, startIdx);
  if (startIdx === -1 || sceneIdx === -1) {
    return fullPrompt;
  }
  const before = fullPrompt.slice(0, startIdx + startMarker.length);
  const after = fullPrompt.slice(sceneIdx);
  return `${before}\n${newVisualDirectorScenePrompt.trim()}${after}`;
}

export function buildFinalImagePrompt(
  characterBiblePrompt: string,
  scenePrompt: string
): string {
  const scenePart = scenePrompt.trim();
  const characterPart = characterBiblePrompt.trim();
  if (!characterPart) {
    return scenePart;
  }
  if (!scenePart) {
    return characterPart;
  }
  return `${characterPart}\n\n${scenePart}`;
}
