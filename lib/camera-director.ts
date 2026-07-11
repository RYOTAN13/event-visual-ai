import {
  COMPOSITION_OPTIONS,
  LENS_OPTIONS,
  SHOT_TYPES,
} from "@/lib/prompts/camera-prompt";
import type { CameraDirector } from "@/lib/types";

export type ShotType = (typeof SHOT_TYPES)[number];
export type LensOption = (typeof LENS_OPTIONS)[number];
export type CompositionOption = (typeof COMPOSITION_OPTIONS)[number];

export type { CameraDirector } from "@/lib/types";
export {
  buildCameraDirectorPrompt,
  CAMERA_DIRECTOR_SYSTEM_PROMPT,
  COMPOSITION_OPTIONS,
  LENS_OPTIONS,
  SHOT_TYPES,
} from "@/lib/prompts/camera-prompt";

export function isCameraDirectorPrompt(text: string): boolean {
  return text.trim().startsWith("CAMERA DIRECTOR");
}

export function validateUniqueCameraCuts(
  scenes: CameraDirector[]
): string | null {
  if (scenes.length > 10) {
    return null;
  }

  if (scenes.length <= SHOT_TYPES.length) {
    const shotTypes = scenes.map((s) => s.shotType.toLowerCase().trim());
    const shotSet = new Set(shotTypes);
    if (shotSet.size !== scenes.length) {
      return "Shot Typeが重複しています。各シーンで異なるカットを選んでください。";
    }
  }

  const signatures = scenes.map((s) =>
    [s.shotType, s.lens, s.composition].join("|").toLowerCase().trim()
  );
  const seen = new Set<string>();
  for (const sig of signatures) {
    if (seen.has(sig)) {
      return "カメラカットの組み合わせが重複しています。各シーンで異なる演出を設計してください。";
    }
    seen.add(sig);
  }

  return null;
}
