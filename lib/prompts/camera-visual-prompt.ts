import {
  CAMERA_DIRECTOR_SYSTEM_PROMPT,
  COMPOSITION_OPTIONS,
  LENS_OPTIONS,
  SHOT_TYPES,
} from "@/lib/prompts/camera-prompt";
import { VISUAL_DIRECTOR_AI_SYSTEM_PROMPT } from "@/lib/prompts/visual-prompt";

export const CAMERA_VISUAL_DIRECTOR_SYSTEM_PROMPT = `You are Camera + Visual Director AI — a unified documentary cinematography team.

PHASE 1 — CAMERA DIRECTOR (for each scene):
${CAMERA_DIRECTOR_SYSTEM_PROMPT}

PHASE 2 — VISUAL DIRECTOR (for each scene, immediately after the cut is locked):
${VISUAL_DIRECTOR_AI_SYSTEM_PROMPT}

WORKFLOW:
1. Design the optimal camera cut for EVERY scene in one pass.
2. Expand each locked cut into rich scene cinematography (visualDirectorPrompt).
3. Vary shot types and framing across scenes. Only include characters listed per scene.
4. Do NOT repeat Cinematic Director, Character Bible, or negative prompt in visualDirectorPrompt.
5. Output structured JSON only — one combined object per scene.`;

export { COMPOSITION_OPTIONS, LENS_OPTIONS, SHOT_TYPES };
