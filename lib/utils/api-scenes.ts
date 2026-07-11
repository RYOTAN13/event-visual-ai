import type { Scene } from "@/lib/types";
import { isValidSceneCount } from "@/lib/utils/scene-count";

export function validateSceneBatch(
  scenes: unknown[],
  sceneCount?: number
): scenes is Scene[] {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return false;
  }

  if (sceneCount !== undefined && scenes.length !== sceneCount) {
    return false;
  }

  if (sceneCount !== undefined && !isValidSceneCount(sceneCount)) {
    return false;
  }

  if (sceneCount === undefined && !isValidSceneCount(scenes.length)) {
    return false;
  }

  return scenes.every(
    (scene) =>
      scene &&
      typeof scene === "object" &&
      typeof (scene as Scene).sceneNumber === "string" &&
      typeof (scene as Scene).narration === "string" &&
      typeof (scene as Scene).imageDescription === "string" &&
      typeof (scene as Scene).sceneAge === "string" &&
      Array.isArray((scene as Scene).charactersInScene)
  );
}

export function sceneBatchErrorMessage(sceneCount?: number): string {
  if (sceneCount !== undefined) {
    return `シーンは${sceneCount}件である必要があります。`;
  }
  return "シーン情報が不正です。";
}
