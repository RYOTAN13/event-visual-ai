import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import {
  buildScriptUserPromptFromFactPack,
  SCRIPT_MASTER_SYSTEM_PROMPT,
} from "@/lib/prompts/script-prompt";
import type { FactPack } from "@/lib/types/fact-pack";

function isValidFactPack(value: unknown): value is FactPack {
  if (!value || typeof value !== "object") return false;
  const pack = value as Record<string, unknown>;
  return (
    typeof pack.title === "string" &&
    typeof pack.summary === "string" &&
    Array.isArray(pack.timeline) &&
    Array.isArray(pack.people) &&
    Array.isArray(pack.locations) &&
    Array.isArray(pack.evidence) &&
    typeof pack.investigation === "string" &&
    typeof pack.trial === "string" &&
    Array.isArray(pack.importantFacts) &&
    Array.isArray(pack.warnings)
  );
}

export { maxDuration, dynamic } from "@/lib/vercel/api-route-config";

export async function POST(request: Request) {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const factPack = body.factPack;

    if (!isValidFactPack(factPack)) {
      return NextResponse.json(
        { error: "Fact Pack が必要です。" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SCRIPT_MASTER_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildScriptUserPromptFromFactPack(factPack),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "documentary_script",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              script: { type: "string" },
            },
            required: ["title", "script"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "台本の生成に失敗しました。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content) as { title: string; script: string };
    const characterCount = data.script.length;

    return NextResponse.json({
      title: data.title,
      script: data.script,
      characterCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "台本の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
