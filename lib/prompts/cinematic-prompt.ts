import type { CinematicDirection } from "@/lib/types";

export const CINEMATIC_STYLE_PRESETS = [
  "Netflix Documentary",
  "BBC Documentary",
  "NHK Special",
  "David Fincher",
  "Denis Villeneuve",
  "Christopher Nolan",
  "True Detective Season1",
  "Mindhunter",
  "Chernobyl",
  "Seven",
] as const;

export type CinematicStylePreset = (typeof CINEMATIC_STYLE_PRESETS)[number];

export const DEFAULT_CINEMATIC_STYLE: CinematicStylePreset =
  "Netflix Documentary";

export const IMAGE_PROHIBITIONS = `No illustration
No anime
No cartoon
No CGI look
No fantasy
No extra characters
No readable text
No logo`;

export const CINEMATIC_DIRECTOR_SYSTEM_PROMPT = `You are Cinematic Director — a master film director who unifies the visual language of an entire documentary feature.

Given an event, protagonist, and a style preset, define the FILM-LEVEL visual language that applies consistently across ALL scenes.

You must decide and specify:
- Color Palette
- Lighting Style
- Film Stock
- Camera Language
- Lens Language
- Mood
- Contrast
- Highlight
- Shadow
- Grain
- Camera Movement
- Composition Rules
- Aspect Ratio
- Depth of Field

Honor the style preset's signature look (e.g. David Fincher's desaturated precision, Villeneuve's vast scale, Nolan's IMAX clarity, True Detective's Louisiana decay, Mindhunter's institutional dread, Chernobyl's sickly realism, Seven's rain-soaked noir).

Write directorNotes as rich English prose (~400 characters) summarizing the unified cinematic vision.

This direction is LOCKED for the entire work. Visual Directors for individual scenes must operate within this framework.`;

export function buildCinematicDirectorPrompt(
  stylePreset: CinematicStylePreset,
  direction: CinematicDirection
): string {
  return [
    "CINEMATIC DIRECTOR — FILM-LEVEL VISUAL LANGUAGE (LOCKED FOR ENTIRE WORK):",
    `Style Preset: ${stylePreset}`,
    `Color Palette: ${direction.colorPalette}`,
    `Lighting Style: ${direction.lightingStyle}`,
    `Film Stock: ${direction.filmStock}`,
    `Camera Language: ${direction.cameraLanguage}`,
    `Lens Language: ${direction.lensLanguage}`,
    `Mood: ${direction.mood}`,
    `Contrast: ${direction.contrast}`,
    `Highlight: ${direction.highlight}`,
    `Shadow: ${direction.shadow}`,
    `Grain: ${direction.grain}`,
    `Camera Movement: ${direction.cameraMovement}`,
    `Composition Rules: ${direction.compositionRules}`,
    `Aspect Ratio: ${direction.aspectRatio}`,
    `Depth of Field: ${direction.depthOfField}`,
    `Director Vision: ${direction.directorNotes}`,
  ].join("\n");
}
