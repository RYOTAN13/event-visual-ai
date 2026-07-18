import type OpenAI from "openai";
import { TEXT_MODEL } from "@/lib/openai/client";
import {
  parseHookScoreResult,
  type AudienceAnalysis,
  type EventAnalysis,
  type HookPlan,
  type HookScoreResult,
} from "@/lib/thumbnail-studio/types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "adoptedCopy",
    "emotionalTheme",
    "clickPoint",
    "ngWords",
    "scores",
    "selectionReason",
  ],
  properties: {
    adoptedCopy: { type: "string" },
    emotionalTheme: { type: "string" },
    clickPoint: { type: "string" },
    ngWords: { type: "array", items: { type: "string" } },
    selectionReason: { type: "string" },
    scores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "copy",
          "ctr",
          "curiosity",
          "emotion",
          "readability",
          "spoilerRisk",
          "caseFit",
          "total",
          "reason",
        ],
        properties: {
          copy: { type: "string" },
          ctr: { type: "number" },
          curiosity: { type: "number" },
          emotion: { type: "number" },
          readability: { type: "number" },
          spoilerRisk: { type: "number" },
          caseFit: { type: "number" },
          total: { type: "number" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

export type HookScorerInput = {
  event: EventAnalysis;
  audience: AudienceAnalysis;
  hooks: HookPlan;
};
export type HookScorerOutput = HookScoreResult;

/** Hook Scorer — JSON input → JSON output. Scores every one of the 20 hooks. */
export async function runHookScorer(
  openai: OpenAI,
  input: HookScorerInput
): Promise<HookScorerOutput> {
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are the Hook Scorer for Japanese true-crime YouTube thumbnails.",
          "Score all 20 candidates. Each metric is 0-100.",
          "Metrics: CTR, curiosity, emotion, readability, spoilerRisk, and caseFit.",
          "spoilerRisk is risk (100 = reveals too much), so penalize it in total.",
          "total must reflect expected CTR while preserving truth and viewer trust.",
          "adoptedCopy must be one of the candidates and normally the highest total.",
          "If hooks.userCopy is non-null, it must be adopted exactly, while still scoring all candidates.",
          "Return internal reasons only; do not write image direction.",
        ].join("\n"),
      },
      { role: "user", content: JSON.stringify(input, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "hook_scores", strict: true, schema },
    },
  });
  const content = response.choices[0]?.message?.content;
  let output = content ? parseHookScoreResult(JSON.parse(content)) : null;
  if (!output || output.scores.length !== 20) {
    throw new Error("クリック切り口の評価に失敗しました。");
  }

  if (input.hooks.userCopy) {
    const candidate = input.hooks.candidates.find(
      (item) => item.copy === input.hooks.userCopy
    );
    output = {
      ...output,
      adoptedCopy: input.hooks.userCopy,
      emotionalTheme: candidate?.emotionalTheme ?? output.emotionalTheme,
      clickPoint: candidate?.clickPoint ?? output.clickPoint,
    };
  } else if (
    !input.hooks.candidates.some(
      (candidate) => candidate.copy === output!.adoptedCopy
    )
  ) {
    const best = [...output.scores].sort((a, b) => b.total - a.total)[0];
    const candidate =
      input.hooks.candidates.find((item) => item.copy === best.copy) ??
      input.hooks.candidates[0];
    output = {
      ...output,
      adoptedCopy: candidate.copy,
      emotionalTheme: candidate.emotionalTheme,
      clickPoint: candidate.clickPoint,
    };
  }
  return output;
}

