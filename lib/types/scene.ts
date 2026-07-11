import type { CinematicStylePreset } from "@/lib/prompts/cinematic-prompt";
import type { CharacterBible } from "@/lib/types/character";
import type { CameraDirector } from "@/lib/types/director";

export type Scene = {
  sceneNumber: string;
  narration: string;
  imageDescription: string;
  charactersInScene: string[];
  sceneAge: string;
  visualPurpose?: string;
  emotion?: string;
  sceneSourceText?: string;
  gptImagePrompt?: string;
};

export type SceneVariant = {
  label: string;
  imageUrl: string | null;
  error: string | null;
};

/** Scene Editor が追跡・復元する編集可能フィールドのスナップショット */
export type SceneEditableSnapshot = {
  narration: string;
  imageDescription: string;
  visualPurpose: string;
  emotion: string;
  charactersInScene: string[];
  additionalInstruction: string;
};

export type SceneWithImage = Scene & {
  /** Timeline Editor 用の安定 ID（React key・保存復元用） */
  timelineId?: string;
  characterBible: CharacterBible | null;
  masterDirectorPrompt: string | null;
  cinematicDirectorPrompt: string | null;
  cinematicStyle: CinematicStylePreset;
  cameraDirector: CameraDirector | null;
  cameraDirectorPrompt: string | null;
  visualDirectorScenePrompt: string | null;
  visualDirectorPrompt: string | null;
  visualDirectorError: string | null;
  characterBiblePrompt: string | null;
  additionalInstruction: string;
  imageUrl: string | null;
  imageError: string | null;
  imageLoading: boolean;
  variantsLoading: boolean;
  variants: SceneVariant[] | null;
  variantError: string | null;
  adoptedVariantIndex: number | null;
  /** 生成直後の編集可能フィールド（「元に戻す」用） */
  originalSnapshot?: SceneEditableSnapshot;
};
