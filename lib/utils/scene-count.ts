export const SCENE_COUNT_OPTIONS = [5, 10, 20] as const;

export type SceneCount = (typeof SCENE_COUNT_OPTIONS)[number];

export const DEFAULT_SCENE_COUNT: SceneCount = 5;

export function parseSceneCount(value: unknown): SceneCount {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseInt(value, 10)
        : NaN;

  if (parsed === 10 || parsed === 20) {
    return parsed;
  }
  return DEFAULT_SCENE_COUNT;
}

export function isValidSceneCount(count: number): count is SceneCount {
  return (SCENE_COUNT_OPTIONS as readonly number[]).includes(count);
}

export function formatSceneNumber(index: number): string {
  return `Scene ${String(index).padStart(3, "0")}`;
}

export function formatLastSceneNumber(sceneCount: SceneCount): string {
  return formatSceneNumber(sceneCount);
}

export function buildSceneArraySchema(count: number) {
  return {
    minItems: count,
    maxItems: count,
  };
}
