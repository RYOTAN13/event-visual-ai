import type OpenAI from "openai";
import { TEXT_MODEL } from "@/lib/openai/client";
import {
  parseHookPlan,
  type AudienceAnalysis,
  type EventAnalysis,
  type HookPlan,
} from "@/lib/thumbnail-studio/types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["candidates", "ngWords", "userCopy"],
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["copy", "emotionalTheme", "clickPoint"],
        properties: {
          copy: { type: "string" },
          emotionalTheme: { type: "string" },
          clickPoint: { type: "string" },
        },
      },
    },
    ngWords: { type: "array", items: { type: "string" } },
    userCopy: { type: ["string", "null"] },
  },
} as const;

export type HookPlannerInput = {
  event: EventAnalysis;
  audience: AudienceAnalysis;
  thumbnailText: string;
};
export type HookPlannerOutput = HookPlan;

/** Hook Planner — JSON input → JSON output. Always produces 20 candidates. */
export async function runHookPlanner(
  openai: OpenAI,
  input: HookPlannerInput
): Promise<HookPlannerOutput> {
  const userCopy = input.thumbnailText.trim();
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are the Hook Planner for Japanese true-crime YouTube thumbnails.",
          "Generate exactly 20 distinct Japanese thumbnail-copy candidates from Audience Analysis.",
          "Copies must be short, emotionally active, curiosity-driven, mobile-readable, and not overly revealing.",
          "Ideal length is 6-14 Japanese characters; maximum about 18.",
          "If userCopy exists, include it exactly as one candidate and set userCopy to that exact text. Otherwise userCopy is null.",
          "Do not select a winner and do not score candidates.",
          "Only use facts supported by Event Analysis. Never invent numbers, innocence/guilt, evidence, motives, or people.",
          "ngWords must include unsafe accusations, spoilers, gore, and case-specific forbidden claims.",
        ].join("\n"),
      },
      { role: "user", content: JSON.stringify({ ...input, userCopy }, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "hook_plan", strict: true, schema },
    },
  });
  const content = response.choices[0]?.message?.content;
  let output = content ? parseHookPlan(JSON.parse(content)) : null;
  if (!output || output.candidates.length !== 20) {
    throw new Error("クリック切り口の候補生成に失敗しました。");
  }

  if (userCopy) {
    const existing = output.candidates.find(
      (candidate) => candidate.copy === userCopy
    );
    if (!existing) {
      output = {
        ...output,
        candidates: [
          {
            copy: userCopy,
            emotionalTheme: input.audience.emotionalTrigger,
            clickPoint: input.audience.strongestInterest,
          },
          ...output.candidates.slice(0, 19),
        ],
      };
    }
    output.userCopy = userCopy;
  } else {
    output.userCopy = null;
  }
  return output;
}

