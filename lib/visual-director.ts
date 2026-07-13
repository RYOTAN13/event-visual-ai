import type { SceneDirectionMeta } from "@/lib/types";

export type { SceneDirectionMeta } from "@/lib/types";
export {
  buildFinalImagePrompt,
  buildFullImagePrompt,
  buildSceneImagePrompt,
  MIN_VISUAL_DIRECTOR_PROMPT_LENGTH,
  swapVisualDirectorSection,
  VISUAL_DIRECTOR_AI_SYSTEM_PROMPT,
} from "@/lib/prompts/visual-prompt";
export {
  buildStrengthenedImagePrompt,
  getShortPromptWarning,
  isShortVisualDirectorScenePrompt,
  isVisualDirectorScenePromptEmpty,
  sceneHasImagePromptSource,
  strengthenVisualDirectorScenePrompt,
} from "@/lib/utils/strengthen-image-prompt";

export function isValidVisualDirectorScenePrompt(prompt: string): boolean {
  return prompt.trim().length > 0;
}

/** @deprecated Use isValidVisualDirectorScenePrompt */
export function isValidVisualDirectorPrompt(prompt: string): boolean {
  return isValidVisualDirectorScenePrompt(prompt);
}

export function validateUniqueFraming(
  scenes: SceneDirectionMeta[]
): string | null {
  if (scenes.length > 10) {
    return null;
  }

  const signatures = scenes.map((scene) =>
    [
      scene.cameraAngle,
      scene.lens,
      scene.shotSize,
      scene.framingSignature,
    ]
      .join("|")
      .toLowerCase()
      .trim()
  );

  const seen = new Set<string>();
  for (const signature of signatures) {
    if (seen.has(signature)) {
      return "同一の画角・カメラ設定が重複しています。映像演出を再設計してください。";
    }
    seen.add(signature);
  }

  const angles = scenes.map((s) => s.cameraAngle.toLowerCase().trim());
  const angleSet = new Set(angles);
  if (angleSet.size !== scenes.length) {
    return "Camera Angleが重複しています。各シーンで画角を変えてください。";
  }

  return null;
}
