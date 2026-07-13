import { createSceneSnapshot, ensureOriginalSnapshot } from "@/lib/utils/scene-editor";
import type { SceneWithImage } from "@/lib/types/scene";

export function formatSceneNumber(index: number): string {
  return String(index + 1).padStart(3, "0");
}

export function generateTimelineId(): string {
  return `tl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function renumberScenes(scenes: SceneWithImage[]): SceneWithImage[] {
  return scenes.map((scene, index) => {
    const sceneNumber = formatSceneNumber(index);
    return {
      ...scene,
      sceneNumber,
      cameraDirector: scene.cameraDirector
        ? { ...scene.cameraDirector, sceneNumber }
        : null,
    };
  });
}

export function duplicateScene(scene: SceneWithImage): SceneWithImage {
  const duplicated = ensureOriginalSnapshot({
    ...scene,
    timelineId: generateTimelineId(),
    sceneNumber: "000",
    variants: scene.variants
      ? scene.variants.map((variant) => ({ ...variant }))
      : null,
    charactersInScene: [...scene.charactersInScene],
    cameraDirector: scene.cameraDirector
      ? { ...scene.cameraDirector, sceneNumber: "000" }
      : null,
    originalSnapshot: scene.originalSnapshot
      ? {
          ...scene.originalSnapshot,
          charactersInScene: [...scene.originalSnapshot.charactersInScene],
        }
      : createSceneSnapshot(scene),
    imageLoading: false,
    variantsLoading: false,
  });

  return duplicated;
}

export function createEmptySceneFromTemplate(
  template: SceneWithImage
): SceneWithImage {
  const empty: SceneWithImage = {
    timelineId: generateTimelineId(),
    sceneNumber: "000",
    narration: "",
    imageDescription: "",
    visualPurpose: undefined,
    emotion: undefined,
    charactersInScene: [],
    sceneAge: template.sceneAge,
    characterBible: template.characterBible,
    masterDirectorPrompt: template.masterDirectorPrompt,
    cinematicDirectorPrompt: template.cinematicDirectorPrompt,
    cinematicStyle: template.cinematicStyle,
    cameraDirector: template.cameraDirector
      ? { ...template.cameraDirector, sceneNumber: "000" }
      : null,
    cameraDirectorPrompt: template.cameraDirectorPrompt,
    visualDirectorScenePrompt: null,
    visualDirectorPrompt: null,
    visualDirectorWarning: null,
    visualDirectorError: null,
    characterBiblePrompt: template.characterBiblePrompt,
    additionalInstruction: "",
    imageUrl: null,
    imageError: null,
    imageLoading: false,
    variantsLoading: false,
    variants: null,
    variantError: null,
    adoptedVariantIndex: null,
  };

  return ensureOriginalSnapshot(empty);
}

export function moveSceneUp(
  scenes: SceneWithImage[],
  index: number
): SceneWithImage[] {
  if (index <= 0) return scenes;
  const next = [...scenes];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return renumberScenes(next);
}

export function moveSceneDown(
  scenes: SceneWithImage[],
  index: number
): SceneWithImage[] {
  if (index >= scenes.length - 1) return scenes;
  const next = [...scenes];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return renumberScenes(next);
}

export function insertSceneAfter(
  scenes: SceneWithImage[],
  index: number,
  scene: SceneWithImage
): SceneWithImage[] {
  const next = [...scenes];
  next.splice(index + 1, 0, scene);
  return renumberScenes(next);
}

export function removeSceneAt(
  scenes: SceneWithImage[],
  index: number
): SceneWithImage[] {
  if (index < 0 || index >= scenes.length) return scenes;
  const next = scenes.filter((_, i) => i !== index);
  return renumberScenes(next);
}

export function ensureTimelineId(scene: SceneWithImage): SceneWithImage {
  if (scene.timelineId) return scene;
  return { ...scene, timelineId: generateTimelineId() };
}

export function normalizeScenes(scenes: SceneWithImage[]): SceneWithImage[] {
  return renumberScenes(scenes.map(ensureTimelineId));
}
