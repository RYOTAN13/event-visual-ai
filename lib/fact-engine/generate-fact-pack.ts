import type OpenAI from "openai";
import { TEXT_MODEL } from "@/lib/openai/client";
import {
  buildFactPackUserPrompt,
  FACT_PACK_SYSTEM_PROMPT,
} from "@/lib/prompts/fact-pack-prompt";
import type { FactPack } from "@/lib/types/fact-pack";
import { FACT_PACK_JSON_SCHEMA } from "@/lib/types/fact-pack";

/**
 * Fact Pack を生成する。
 * 現在は OpenAI のみ。後から外部ソース（Wikipedia 等）へ差し替え可能な境界。
 */
export async function generateFactPack(
  openai: OpenAI,
  incidentName: string
): Promise<FactPack> {
  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: FACT_PACK_SYSTEM_PROMPT },
      { role: "user", content: buildFactPackUserPrompt(incidentName) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "fact_pack",
        strict: true,
        schema: FACT_PACK_JSON_SCHEMA,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Fact Pack の生成に失敗しました。");
  }

  return JSON.parse(content) as FactPack;
}
