import type { CinematicStylePreset } from "@/lib/prompts/cinematic-prompt";
import type { SceneCount } from "@/lib/utils/scene-count";
import type { CharacterBible } from "@/lib/types/character";
import type { CharacterStudio } from "@/lib/types/character-studio";
import type { Scene } from "@/lib/types/scene";

export type ProcessingStatus =
  | "idle"
  | "pending"
  | "generating"
  | "ready"
  | "error";

export type GeneratedImage = {
  id: string;
  sceneId: string;
  imageUrl: string;
  promptUsed: string;
  generatedAt: string;
  isAdopted: boolean;
  error: string | null;
};

export type ProjectSettings = {
  sceneCount: SceneCount;
  cinematicStyle: CinematicStylePreset;
  imageSize: "1024x1024";
  imageQuality: "high";
  language: "ja";
};

export type Project = {
  id: string;
  name: string;
  settings: ProjectSettings;
  scenes: Scene[];
  characterBible: CharacterBible | null;
  characterStudio: CharacterStudio;
  createdAt: string;
  updatedAt: string;
  version: "2.0";
};
