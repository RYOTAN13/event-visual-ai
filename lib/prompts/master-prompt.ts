import type {
  MasterDirectionResult,
  QualityCheckItem,
} from "@/lib/types";

export const QUALITY_CHECKLIST = [
  "主人公は同一人物か / Same protagonist identity",
  "時代背景は一致するか / Consistent historical era",
  "光源は自然か / Natural light sources",
  "映画らしい構図か / Cinematic composition",
  "被写界深度は適切か / Appropriate depth of field",
  "余計な人物はいないか / No extra people",
  "日本らしい背景か / Japanese-authentic setting",
  "ドキュメンタリーらしい静けさがあるか / Documentary stillness",
  "ロゴは無いか / No logo",
  "文字は無いか / No readable text",
  "イラストになっていないか / Not illustration style",
] as const;

export const NEGATIVE_PROMPT = `No illustration
No anime
No cartoon
No CGI
No fantasy
No watermark
No logo
No readable text
No duplicate people
No malformed hands
No deformed face
No extra fingers`;

export const MASTER_DIRECTOR_SYSTEM_PROMPT = `You are Master Director AI — the final creative authority before documentary image generation.

Review the ENTIRE work (all scenes together) and unify:
- Color grading / 色味
- Character consistency / 人物
- Direction & mood / 演出
- Composition / 構図
- Atmosphere / 空気感
- Tension / 緊張感
- Cinematic quality / 映画性

Before approving image prompts, SELF-CHECK every scene against this checklist:
${QUALITY_CHECKLIST.map((item, i) => `${i + 1}. ${item}`).join("\n")}

SELF CORRECTION:
- For any failed checklist item, automatically correct the visualDirectorScenePrompt for that scene.
- Apply corrections in cinematography prose only — never change Character Bible identity.
- Ensure all scenes share unified color palette, atmosphere, and documentary tone.
- Reinforce: same protagonist face, Japanese setting authenticity, natural lighting, cinematic framing, no extra people, no text, no logos, photorealistic not illustration.

OUTPUT:
- masterDirectorPrompt: work-level unified direction (~500 chars English prose)
- unifiedColorGrade, unifiedAtmosphere, unifiedTension: brief locked strings for all scenes
- Per scene: checklist with pass/fail + correction note, and corrected visualDirectorScenePrompt (min 1200 chars, cinematography only)`;

export function buildMasterDirectorPrompt(
  review: Pick<
    MasterDirectionResult,
    | "masterDirectorPrompt"
    | "unifiedColorGrade"
    | "unifiedAtmosphere"
    | "unifiedTension"
  >
): string {
  return [
    "MASTER DIRECTOR — FINAL WORK REVIEW (LOCKED):",
    review.masterDirectorPrompt.trim(),
    `Unified Color Grade: ${review.unifiedColorGrade}`,
    `Unified Atmosphere: ${review.unifiedAtmosphere}`,
    `Unified Tension: ${review.unifiedTension}`,
    "",
    "QUALITY CHECKLIST — VERIFIED:",
    ...QUALITY_CHECKLIST.map((item) => `✓ ${item}`),
    "",
    "All checklist items verified and self-corrected before image generation.",
  ].join("\n");
}

export function formatChecklistForPrompt(
  checklist: QualityCheckItem[]
): string {
  return checklist
    .map((entry) => {
      const status = entry.passed ? "PASS" : "CORRECTED";
      const note = entry.correction ? ` — ${entry.correction}` : "";
      return `[${status}] ${entry.item}${note}`;
    })
    .join("\n");
}
