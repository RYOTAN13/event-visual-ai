import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import { INSTRUCTION_INTEGRATION_SYSTEM_PROMPT } from "@/lib/prompts/instruction-prompt";
import { buildFinalImagePrompt } from "@/lib/visual-director";

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
    const visualDirectorPrompt =
      typeof body.visualDirectorPrompt === "string"
        ? body.visualDirectorPrompt.trim()
        : "";
    const characterBiblePrompt =
      typeof body.characterBiblePrompt === "string"
        ? body.characterBiblePrompt.trim()
        : "";
    const additionalInstruction =
      typeof body.additionalInstruction === "string"
        ? body.additionalInstruction.trim()
        : "";

    if (!visualDirectorPrompt) {
      return NextResponse.json(
        { error: "Visual Director Promptが指定されていません。" },
        { status: 400 }
      );
    }

    if (!additionalInstruction) {
      return NextResponse.json(
        { error: "追加指示を入力してください。" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: INSTRUCTION_INTEGRATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "Merge the full image prompt with additional instructions.",
            "ONLY change camera position, distance, lighting, rain, color grading, or lens.",
            "NEVER change the character identity or CHARACTER LOCK.",
            "",
            characterBiblePrompt
              ? `=== Character Bible reference (identity locked) ===\n${characterBiblePrompt}`
              : "",
            "",
            "=== Full Image Prompt ===",
            visualDirectorPrompt,
            "",
            "=== Additional Instructions (may be Japanese — cinematography only) ===",
            additionalInstruction,
          ].join("\n"),
        },
      ],
    });

    const integratedPrompt = response.choices[0]?.message?.content?.trim();
    if (!integratedPrompt) {
      return NextResponse.json(
        { error: "プロンプトの統合に失敗しました。" },
        { status: 502 }
      );
    }

    const finalPrompt = characterBiblePrompt
      ? buildFinalImagePrompt(characterBiblePrompt, integratedPrompt)
      : integratedPrompt;

    return NextResponse.json({ integratedPrompt: finalPrompt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "プロンプトの統合に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
