import type { SceneEditableSnapshot, SceneWithImage } from "@/lib/types/scene";

export type SceneEditableFieldKey =
  | "narration"
  | "imageDescription"
  | "visualPurpose"
  | "emotion"
  | "charactersInScene"
  | "additionalInstruction";

export const SCENE_EDITABLE_FIELD_LABELS: Record<SceneEditableFieldKey, string> =
  {
    narration: "ナレーション",
    imageDescription: "画像説明",
    visualPurpose: "Visual Purpose",
    emotion: "Emotion",
    charactersInScene: "Characters",
    additionalInstruction: "追加指示",
  };

export function createSceneSnapshot(
  scene: Pick<
    SceneWithImage,
    | "narration"
    | "imageDescription"
    | "visualPurpose"
    | "emotion"
    | "charactersInScene"
    | "additionalInstruction"
  >
): SceneEditableSnapshot {
  return {
    narration: scene.narration,
    imageDescription: scene.imageDescription,
    visualPurpose: scene.visualPurpose ?? "",
    emotion: scene.emotion ?? "",
    charactersInScene: [...scene.charactersInScene],
    additionalInstruction: scene.additionalInstruction,
  };
}

export function ensureOriginalSnapshot(scene: SceneWithImage): SceneWithImage {
  if (scene.originalSnapshot) {
    return scene;
  }
  return {
    ...scene,
    originalSnapshot: createSceneSnapshot(scene),
  };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export function isSceneEdited(scene: SceneWithImage): boolean {
  if (!scene.originalSnapshot) return false;
  const original = scene.originalSnapshot;
  return (
    scene.narration !== original.narration ||
    scene.imageDescription !== original.imageDescription ||
    (scene.visualPurpose ?? "") !== original.visualPurpose ||
    (scene.emotion ?? "") !== original.emotion ||
    scene.additionalInstruction !== original.additionalInstruction ||
    !arraysEqual(scene.charactersInScene, original.charactersInScene)
  );
}

export function getSceneFieldDisplayValue(
  scene: SceneWithImage,
  field: SceneEditableFieldKey
): string {
  switch (field) {
    case "charactersInScene":
      return scene.charactersInScene.join(", ");
    case "visualPurpose":
      return scene.visualPurpose ?? "";
    case "emotion":
      return scene.emotion ?? "";
    default:
      return scene[field];
  }
}

export function parseSceneFieldValue(
  field: SceneEditableFieldKey,
  draft: string
): Partial<SceneWithImage> {
  switch (field) {
    case "charactersInScene":
      return {
        charactersInScene: draft
          .split(/[,、]/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
    case "visualPurpose":
      return { visualPurpose: draft.trim() || undefined };
    case "emotion":
      return { emotion: draft.trim() || undefined };
    case "narration":
      return { narration: draft };
    case "imageDescription":
      return { imageDescription: draft };
    case "additionalInstruction":
      return { additionalInstruction: draft };
  }
}

/** Visual Director / Master Director へ渡す Scene（編集後データ + 補助フィールド） */
export function buildEnrichedSceneForPrompt(scene: SceneWithImage) {
  const extras: string[] = [];
  if (scene.visualPurpose?.trim()) {
    extras.push(`Visual Purpose: ${scene.visualPurpose.trim()}`);
  }
  if (scene.emotion?.trim()) {
    extras.push(`Emotion: ${scene.emotion.trim()}`);
  }

  const imageDescription =
    extras.length > 0
      ? `${scene.imageDescription}\n${extras.join("\n")}`
      : scene.imageDescription;

  return {
    sceneNumber: scene.sceneNumber,
    narration: scene.narration,
    imageDescription,
    sceneAge: scene.sceneAge,
    charactersInScene: scene.charactersInScene,
    cameraDirectorPrompt: scene.cameraDirectorPrompt ?? "",
  };
}

export function applySceneSnapshot(
  scene: SceneWithImage,
  snapshot: SceneEditableSnapshot
): Partial<SceneWithImage> {
  return {
    narration: snapshot.narration,
    imageDescription: snapshot.imageDescription,
    visualPurpose: snapshot.visualPurpose || undefined,
    emotion: snapshot.emotion || undefined,
    charactersInScene: [...snapshot.charactersInScene],
    additionalInstruction: snapshot.additionalInstruction,
  };
}
