import type { CinematicStylePreset } from "@/lib/prompts/cinematic-prompt";
import type { SceneCount } from "@/lib/utils/scene-count";
import type { FactPack, SceneWithImage } from "@/lib/types";
import type { CharacterStudio } from "@/lib/types/character-studio";
import { DEFAULT_CHARACTER_STUDIO } from "@/lib/types/character-studio";
import type { ThumbnailStudioState } from "@/lib/types/thumbnail-studio";

export const PROJECT_STORAGE_KEY = "event-visual-project";
export const PROJECT_STORAGE_VERSION = 1;

/**
 * localStorage に保存する Project スナップショット。
 * 画面の状態（画像・4案・採用状態・追加指示含む）をそのまま復元できる形で保持する。
 * 将来 Supabase 等へ移行する場合もこの構造を保存単位とする。
 */
export type StoredProject = {
  version: number;
  savedAt: string;
  eventName: string;
  cinematicStyle: CinematicStylePreset;
  sceneCount: SceneCount;
  factPack: FactPack | null;
  scriptTitle: string;
  script: string;
  editedScript: string;
  scriptCharCount: number;
  characterStudio: CharacterStudio;
  /** Scene画像から独立した事件系YouTubeサムネイル制作状態 */
  thumbnail: ThumbnailStudioState;
  /** Character Bible / Visual Director / 画像 / 4案 / 採用 / 追加指示を含む */
  scenes: SceneWithImage[];
};

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export type LoadResult =
  | { ok: true; project: StoredProject }
  | { ok: false; error: string };

export function saveProject(project: StoredProject): SaveResult {
  try {
    const json = JSON.stringify(project);
    window.localStorage.setItem(PROJECT_STORAGE_KEY, json);
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return {
        ok: false,
        error:
          "保存容量を超えました。画像が多い場合はブラウザのlocalStorage上限（約5MB）を超えることがあります。",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "保存に失敗しました。",
    };
  }
}

export function loadProject(): LoadResult {
  try {
    const json = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!json) {
      return { ok: false, error: "保存されたProjectがありません。" };
    }

    const parsed = JSON.parse(json) as StoredProject;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.eventName !== "string" ||
      !Array.isArray(parsed.scenes)
    ) {
      return { ok: false, error: "保存データが破損しています。" };
    }

    return { ok: true, project: parsed };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "読込に失敗しました。",
    };
  }
}
