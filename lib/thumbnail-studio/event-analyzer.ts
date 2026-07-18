import type OpenAI from "openai";
import { TEXT_MODEL } from "@/lib/openai/client";
import {
  parseEventAnalysis,
  type EventAnalysis,
  type PipelineSeed,
} from "@/lib/thumbnail-studio/types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "caseType",
    "keywords",
    "timeline",
    "people",
    "emotion",
    "mystery",
    "symbolObjects",
    "locations",
    "era",
    "essence",
    "sensitivities",
    "forbiddenClaims",
  ],
  properties: {
    caseType: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    timeline: { type: "array", items: { type: "string" } },
    people: { type: "array", items: { type: "string" } },
    emotion: { type: "array", items: { type: "string" } },
    mystery: { type: "array", items: { type: "string" } },
    symbolObjects: { type: "array", items: { type: "string" } },
    locations: { type: "array", items: { type: "string" } },
    era: { type: "string" },
    essence: { type: "string" },
    sensitivities: { type: "array", items: { type: "string" } },
    forbiddenClaims: { type: "array", items: { type: "string" } },
  },
} as const;

export type EventAnalyzerInput = PipelineSeed;
export type EventAnalyzerOutput = EventAnalysis;

/** Event Analyzer — JSON input → JSON output. */
export async function runEventAnalyzer(
  openai: OpenAI,
  input: EventAnalyzerInput
): Promise<EventAnalyzerOutput> {
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are the Event Analyzer for a Japanese true-crime YouTube thumbnail director.",
          "Extract structured facts and creative constraints; do not propose hooks or visuals.",
          "Return concise English strings, except proper Japanese names when needed.",
          "Use Fact Pack / Script as source of truth. Never invent people, evidence, motives, verdicts, numbers, or locations.",
          "If context is sparse, mark unknown facts generically instead of fabricating.",
          "timeline, people, symbols, locations, emotion, mystery, sensitivities, and forbiddenClaims must all contain at least one item.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `Case name: ${input.caseName}`,
          input.factPack ? `\n=== FACT PACK ===\n${input.factPack}` : "",
          input.script ? `\n=== SCRIPT ===\n${input.script}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "event_analysis", strict: true, schema },
    },
  });

  const content = response.choices[0]?.message?.content;
  const output = content ? parseEventAnalysis(JSON.parse(content)) : null;
  if (!output) throw new Error("事件分析の生成に失敗しました。");
  return output;
}

