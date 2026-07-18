import { buildSceneImagePrompt } from "@/lib/prompts/visual-prompt";
import { NEGATIVE_PROMPT } from "@/lib/prompts/master-prompt";
import type { CharacterBible } from "@/lib/types/character";
import type { CameraDirector } from "@/lib/types/director";

export const MIN_VISUAL_DIRECTOR_PROMPT_LENGTH = 1200;

export function isVisualDirectorScenePromptEmpty(
  prompt: string | null | undefined
): boolean {
  return !prompt?.trim();
}

export function isShortVisualDirectorScenePrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  return (
    trimmed.length > 0 && trimmed.length < MIN_VISUAL_DIRECTOR_PROMPT_LENGTH
  );
}

export function getShortPromptWarning(
  sceneNumber: string,
  length: number
): string {
  return `${sceneNumber} のVisual Director Promptが${MIN_VISUAL_DIRECTOR_PROMPT_LENGTH}文字未満です（${length}文字）。自動補強して画像生成を続行します。`;
}

/** 内部処理ログのみ。ユーザー向けUIには表示しない。 */
export function logShortPromptAutoStrengthen(
  sceneNumber: string,
  length: number
): void {
  console.info(
    `[visual-director] ${getShortPromptWarning(sceneNumber, length)}`
  );
}

export type StrengthenSceneInput = {
  sceneNumber: string;
  visualDirectorScenePrompt: string;
  narration: string;
  imageDescription: string;
  visualPurpose?: string;
  emotion?: string;
  sceneAge: string;
  charactersInScene: string[];
  cameraDirector?: CameraDirector | null;
  cameraDirectorPrompt?: string | null;
  masterDirectorPrompt?: string | null;
  cinematicDirectorPrompt?: string | null;
  characterBible: CharacterBible;
  characterStudioPrompt?: string | null;
};

export function strengthenVisualDirectorScenePrompt(
  input: StrengthenSceneInput
): string {
  const base = input.visualDirectorScenePrompt.trim();
  const supplemental: string[] = [];

  if (input.narration.trim()) {
    supplemental.push(`Scene narration: ${input.narration.trim()}`);
  }
  if (input.imageDescription.trim()) {
    supplemental.push(`Image description: ${input.imageDescription.trim()}`);
  }
  if (input.visualPurpose?.trim()) {
    supplemental.push(`Visual purpose: ${input.visualPurpose.trim()}`);
  }
  if (input.emotion?.trim()) {
    supplemental.push(`Emotional tone: ${input.emotion.trim()}`);
  }
  if (input.charactersInScene.length > 0) {
    supplemental.push(
      `Characters in scene: ${input.charactersInScene.join(", ")}`
    );
  }
  if (input.sceneAge.trim()) {
    supplemental.push(`Protagonist age in this scene: ${input.sceneAge.trim()}`);
  }

  if (input.characterStudioPrompt?.trim()) {
    supplemental.push(input.characterStudioPrompt.trim());
  }

  const cameraMeta = input.cameraDirector;
  if (cameraMeta) {
    supplemental.push(
      [
        `Shot type: ${cameraMeta.shotType}`,
        `Lens: ${cameraMeta.lens}`,
        `Composition: ${cameraMeta.composition}`,
        `Framing: ${cameraMeta.framing}`,
        `Focus: ${cameraMeta.focus}`,
        `Depth of field: ${cameraMeta.depthOfField}`,
        `Lighting direction: ${cameraMeta.lightingDirection}`,
        `Perspective: ${cameraMeta.perspective}`,
      ].join(". ")
    );
  } else if (input.cameraDirectorPrompt?.trim()) {
    supplemental.push(`Camera direction: ${input.cameraDirectorPrompt.trim()}`);
  }

  if (input.cinematicDirectorPrompt?.trim()) {
    supplemental.push(
      `Cinematic direction: ${input.cinematicDirectorPrompt.trim()}`
    );
  }

  if (input.masterDirectorPrompt?.trim()) {
    supplemental.push(
      `Master direction: ${input.masterDirectorPrompt.trim()}`
    );
  }

  supplemental.push(
    "Historical era and location must match the narration and image description. Authentic Japanese documentary setting."
  );
  supplemental.push(
    "Natural volumetric lighting. Kodak Vision3 film grain. ARRI Alexa LF aesthetic. Unified cinematic color grade."
  );
  supplemental.push(`Restrictions: ${NEGATIVE_PROMPT.replace(/\n/g, ", ")}`);

  if (base && supplemental.length > 0) {
    return `${base}\n\n${supplemental.join("\n")}`;
  }
  if (base) {
    return base;
  }
  return supplemental.join("\n");
}

export function buildStrengthenedImagePrompt(
  input: StrengthenSceneInput
): { prompt: string; warning: string | null } {
  const rawScenePrompt = input.visualDirectorScenePrompt.trim();
  if (!rawScenePrompt) {
    return { prompt: "", warning: null };
  }

  const strengthenedScenePrompt = isShortVisualDirectorScenePrompt(rawScenePrompt)
    ? strengthenVisualDirectorScenePrompt(input)
    : rawScenePrompt;

  const sceneContent = [
    input.narration.trim(),
    input.imageDescription.trim(),
    input.visualPurpose?.trim(),
    input.emotion?.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const warning = null;
  if (isShortVisualDirectorScenePrompt(rawScenePrompt)) {
    logShortPromptAutoStrengthen(input.sceneNumber, rawScenePrompt.length);
  }

  const prompt = buildSceneImagePrompt(
    input.masterDirectorPrompt ?? "",
    input.cinematicDirectorPrompt ?? "",
    input.cameraDirectorPrompt ?? "",
    strengthenedScenePrompt,
    input.characterBible,
    input.sceneAge,
    input.charactersInScene,
    sceneContent
  );

  return { prompt, warning };
}

export function sceneHasImagePromptSource(scene: {
  visualDirectorPrompt?: string | null;
  visualDirectorScenePrompt?: string | null;
}): boolean {
  return (
    Boolean(scene.visualDirectorPrompt?.trim()) ||
    Boolean(scene.visualDirectorScenePrompt?.trim())
  );
}
