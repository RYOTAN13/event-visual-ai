import type OpenAI from "openai";
import { TEXT_MODEL } from "@/lib/openai/client";
import {
  parseCompositionPlan,
  type AudienceAnalysis,
  type CompositionPlan,
  type EventAnalysis,
  type HookScoreResult,
} from "@/lib/thumbnail-studio/types";

const variationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "variation",
    "role",
    "person",
    "background",
    "negativeSpace",
    "textPosition",
    "gaze",
    "lighting",
    "color",
    "composition",
    "cameraDistance",
    "personSize",
  ],
  properties: {
    variation: { type: "string", enum: ["A", "B", "C", "D", "E", "F", "G", "H"] },
    role: { type: "string" },
    person: { type: "string" },
    background: { type: "string" },
    negativeSpace: { type: "string" },
    textPosition: { type: "string" },
    gaze: { type: "string" },
    lighting: { type: "string" },
    color: { type: "string" },
    composition: { type: "string" },
    cameraDistance: { type: "string" },
    personSize: { type: "string" },
  },
} as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["sharedDirection", "variations"],
  properties: {
    sharedDirection: { type: "string" },
    variations: { type: "array", items: variationSchema },
  },
} as const;

export type CompositionPlannerInput = {
  event: EventAnalysis;
  audience: AudienceAnalysis;
  scoredHook: HookScoreResult;
};
export type CompositionPlannerOutput = CompositionPlan;

/** Composition Planner — JSON input → JSON output with eight distinct strategies. */
export async function runCompositionPlanner(
  openai: OpenAI,
  input: CompositionPlannerInput
): Promise<CompositionPlannerOutput> {
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are the Composition Planner for a Japanese true-crime YouTube thumbnail director.",
          "Use the adopted hook to specify person, background, negative space, text position, gaze, lighting, color, composition, camera distance, and person size.",
          "Return exactly eight entries A-H, one of each, with visibly different strategies:",
          "A emotional person close-up; B Japanese courtroom main; C Japanese crime scene main; D evidence object main; E newspaper/documents main; F detention/interrogation room; G cinematic movie-poster; H psychological suspense.",
          "A-H must differ in focal subject, background, distance, light pattern, palette, silhouette, and layout.",
          "Default text overlay is bottom-left. Keep that area clean unless a specific strategy justifies another position.",
          "Do not invent case-specific evidence, people, or locations. Use generic symbolic material when facts are unknown.",
          "Any person is an anonymous Japanese reenactment subject; no gore, corpses, readable text, logos, or watermarks.",
          "Answer visual directions in concrete English.",
        ].join("\n"),
      },
      { role: "user", content: JSON.stringify(input, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "composition_plan", strict: true, schema },
    },
  });
  const content = response.choices[0]?.message?.content;
  const output = content ? parseCompositionPlan(JSON.parse(content)) : null;
  if (!output) throw new Error("構図設計の生成に失敗しました。");
  return output;
}

