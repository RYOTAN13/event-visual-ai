import type { CameraDirector } from "@/lib/types";

export const SHOT_TYPES = [
  "Extreme Wide",
  "Wide",
  "Full",
  "Medium",
  "Medium Close",
  "Close Up",
  "Extreme Close Up",
  "Over Shoulder",
  "POV",
  "Dutch",
  "Top View",
  "Low Angle",
  "High Angle",
  "Tracking",
  "Symmetrical",
  "Silhouette",
] as const;

export const LENS_OPTIONS = [
  "14mm",
  "24mm",
  "35mm",
  "50mm",
  "85mm",
  "135mm",
  "200mm",
] as const;

export const COMPOSITION_OPTIONS = [
  "Rule of Thirds",
  "Centered",
  "Negative Space",
  "Golden Ratio",
  "Leading Lines",
  "Layered Composition",
] as const;

export const CAMERA_DIRECTOR_SYSTEM_PROMPT = `You are Cinematic Camera Director — a master cinematographer who designs film cut lists for documentary features.

Given an event, locked Cinematic Director vision, Character Bible, and scene storyboard, design the OPTIMAL camera cut for EACH scene like a feature film edit.

For EACH scene, decide:
- Shot Type (choose from allowed list — match scene narrative beat)
- Camera Height
- Lens (choose from allowed list)
- Distance (camera-to-subject distance)
- Framing (how subjects are placed in frame)
- Composition (choose from allowed list)
- Focus (what is sharp, what falls off)
- Depth of Field
- Lighting Direction (key/fill/rim relative to subject)
- Perspective (spatial relationship viewer feels)
- cutRationale: one sentence why this cut serves the story (~120 chars)

SHOT TYPE — choose ONE per scene from:
${SHOT_TYPES.join(", ")}

LENS — choose ONE per scene from:
${LENS_OPTIONS.join(", ")}

COMPOSITION — choose ONE per scene from:
${COMPOSITION_OPTIONS.join(", ")}

CAMERA LOGIC:
- Optimize cuts automatically based on event content and scene emotion.
- Scene 001: often establish scale or intimacy of the incident — choose deliberately.
- Build visual rhythm across all scenes — vary shot types; reuse only when scene count exceeds available shot types.
- Match lens to shot type (wide scenes → wider lenses, intimacy → 85mm/135mm, etc.).
- Operate within the locked Cinematic Director film language.
- Do NOT change character identity or add characters.

Output structured data only. cutRationale in English.`;

export function buildCameraDirectorPrompt(director: CameraDirector): string {
  return [
    "CAMERA DIRECTOR — SCENE CUT (LOCKED):",
    `Scene: ${director.sceneNumber}`,
    `Shot Type: ${director.shotType}`,
    `Camera Height: ${director.cameraHeight}`,
    `Lens: ${director.lens}`,
    `Distance: ${director.distance}`,
    `Framing: ${director.framing}`,
    `Composition: ${director.composition}`,
    `Focus: ${director.focus}`,
    `Depth of Field: ${director.depthOfField}`,
    `Lighting Direction: ${director.lightingDirection}`,
    `Perspective: ${director.perspective}`,
    `Cut Rationale: ${director.cutRationale}`,
  ].join("\n");
}
