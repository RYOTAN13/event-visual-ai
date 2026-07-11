import type { SceneCount } from "@/lib/utils/scene-count";
import type { CharacterBible } from "@/lib/types/character";
import type { CameraDirector } from "@/lib/types/director";
import type { Scene } from "@/lib/types/scene";

export type GenerateScenesResponse = {
  characterBible: CharacterBible;
  scenes: Scene[];
  sceneCount?: SceneCount;
};

export type VisualDirectionScene = {
  sceneNumber: string;
  cameraAngle: string;
  lens: string;
  shotSize: string;
  focus: string;
  cameraMovement: string;
  lighting: string;
  framingSignature: string;
  visualDirectorScenePrompt: string;
};

export type GenerateMasterDirectionResponse = {
  masterDirectorPrompt: string;
  characterBiblePrompt: string;
  scenes: Array<{
    sceneNumber: string;
    visualDirectorScenePrompt: string;
    visualDirectorPrompt: string;
  }>;
};

export type GenerateVisualDirectionResponse = {
  characterBible: CharacterBible;
  characterBiblePrompt: string;
  scenes: VisualDirectionScene[];
};

export type GenerateCameraDirectionResponse = {
  scenes: Array<CameraDirector & { cameraDirectorPrompt: string }>;
};

export type GenerateImageResponse = {
  imageUrl: string;
};
