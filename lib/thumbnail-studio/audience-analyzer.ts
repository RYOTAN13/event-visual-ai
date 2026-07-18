import type OpenAI from "openai";
import { TEXT_MODEL } from "@/lib/openai/client";
import {
  parseAudienceAnalysis,
  type AudienceAnalysis,
  type EventAnalysis,
} from "@/lib/thumbnail-studio/types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "targetViewer",
    "hookCandidates",
    "strongestInterest",
    "curiosityGap",
    "emotionalTrigger",
  ],
  properties: {
    targetViewer: { type: "string" },
    hookCandidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["point", "importance", "reason"],
        properties: {
          point: { type: "string" },
          importance: { type: "number" },
          reason: { type: "string" },
        },
      },
    },
    strongestInterest: { type: "string" },
    curiosityGap: { type: "string" },
    emotionalTrigger: { type: "string" },
  },
} as const;

export type AudienceAnalyzerInput = { event: EventAnalysis };
export type AudienceAnalyzerOutput = AudienceAnalysis;

/** Audience Analyzer — JSON input → JSON output. */
export async function runAudienceAnalyzer(
  openai: OpenAI,
  input: AudienceAnalyzerInput
): Promise<AudienceAnalyzerOutput> {
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are the Audience Analyzer for Japanese true-crime YouTube.",
          "Analyze which verified aspects of Event Analysis most strongly attract viewers.",
          "Do not write thumbnail copy and do not design images.",
          "Return 5-10 ranked interest points. importance is 0-100.",
          "Reward emotional stakes, supported numbers, mystery, institutional conflict, and curiosity gaps.",
          "Avoid exploitative framing, spoilers, unsupported accusations, and fabricated facts.",
        ].join("\n"),
      },
      { role: "user", content: JSON.stringify(input, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "audience_analysis", strict: true, schema },
    },
  });
  const content = response.choices[0]?.message?.content;
  const output = content ? parseAudienceAnalysis(JSON.parse(content)) : null;
  if (!output) throw new Error("視聴者分析の生成に失敗しました。");
  return output;
}

