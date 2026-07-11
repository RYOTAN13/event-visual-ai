import { CHARACTER_LOCK } from "@/lib/prompts/character-prompt";

export const VARIANT_PROMPT_SYSTEM = `You create 4 cinematography variants of a documentary scene for side-by-side comparison.

Given a full image prompt, produce exactly 4 distinct variant prompts.

IMMUTABLE — NEVER CHANGE:
- Master Director unified vision (color, atmosphere, tension, quality checklist)
- Cinematic Director film-level vision
- Camera Director locked cut (shot type, lens, composition, framing)
- Character Bible identity (facial features, proportions, ethnicity)
- CHARACTER LOCK:
${CHARACTER_LOCK}
- Clothing base, hairstyle evolution, body proportions (only age may differ per scene)
- Characters in scene — only those explicitly listed
- Historical era, location, and event story content

VARIABLE — MAKE EACH VARIANT DISTINCT:
- Camera Angle
- Lens
- Shot Size
- Lighting
- Composition
- Mood

Each variant must include in spirit:
Only include characters explicitly described in this scene.
Never invent additional main characters.

Each variant prompt must be dense English cinematic prose (Visual Director cinematography section only).
Do NOT include Cinematic Director, Character Bible, or Negative Prompt in variant output (assembled automatically).`;
