import type OpenAI from "openai";
import { TEXT_MODEL } from "@/lib/openai/client";
import {
  parseThumbnailPromptPlan,
  type AudienceAnalysis,
  type CompositionPlan,
  type EventAnalysis,
  type HookScoreResult,
  type ThumbnailPromptPlan,
} from "@/lib/thumbnail-studio/types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["prompts"],
  properties: {
    prompts: {
      type: "object",
      additionalProperties: false,
      required: ["A", "B", "C", "D", "E", "F", "G", "H"],
      properties: {
        A: { type: "string" },
        B: { type: "string" },
        C: { type: "string" },
        D: { type: "string" },
        E: { type: "string" },
        F: { type: "string" },
        G: { type: "string" },
        H: { type: "string" },
      },
    },
  },
} as const;

export type ThumbnailPlannerInput = {
  event: EventAnalysis;
  audience: AudienceAnalysis;
  scoredHook: HookScoreResult;
  composition: CompositionPlan;
};
export type ThumbnailPlannerOutput = ThumbnailPromptPlan;

/** Thumbnail Planner — JSON input → final image-prompt JSON only. */
export async function runThumbnailPlanner(
  openai: OpenAI,
  input: ThumbnailPlannerInput
): Promise<ThumbnailPlannerOutput> {
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are the final Thumbnail Planner for Japanese true-crime YouTube.",
          "Your only responsibility is to convert each A-H Composition Plan into one complete final image-generation prompt.",
          "Return only prompts A-H. Do not explain, score, analyze, or propose UI.",
          "Each prompt must stand alone and include: subject, Japanese setting, era, background, camera distance, lens feel, person size, expression/gaze when relevant, lighting, palette, composition, and clean negative space.",
          "Use the adopted hook only as emotional intent; never ask the image model to render the headline.",
          "Every prompt must require: finished YouTube thumbnail background, 16:9 safe composition, high contrast, clear focal point, strong emotional impact, cinematic Japanese crime documentary.",
          "Every prompt must forbid: readable text of any kind, letters, kanji, kana, numbers, logos, watermarks, gore, corpses, graphic violence, military, battlefield, foreign police, Western cityscape.",
          "Respect Event Analysis facts, sensitivities, forbidden claims, and Hook ngWords.",
          "A-H must remain unmistakably different. Follow each composition entry literally.",
        ].join("\n"),
      },
      { role: "user", content: JSON.stringify(input, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "thumbnail_prompts", strict: true, schema },
    },
  });
  const content = response.choices[0]?.message?.content;
  const output = content ? parseThumbnailPromptPlan(JSON.parse(content)) : null;
  if (!output) throw new Error("最終画像Promptの生成に失敗しました。");
  return output;
}

