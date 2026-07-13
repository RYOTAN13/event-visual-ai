import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  generateSceneImage,
  type ImageQuality,
} from "@/lib/openai/image-generation";
import { buildFinalImagePrompt } from "@/lib/visual-director";

export { maxDuration, dynamic } from "@/lib/vercel/api-route-config";

function parseImageQuality(value: unknown): ImageQuality {
  return value === "high" ? "high" : "medium";
}

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
    const prompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";
    const characterBiblePrompt =
      typeof body.characterBiblePrompt === "string"
        ? body.characterBiblePrompt.trim()
        : "";
    const useFinalPrompt = body.useFinalPrompt === true;
    const quality = parseImageQuality(body.quality);

    if (!prompt) {
      return NextResponse.json(
        { error: "画像プロンプトが指定されていません。" },
        { status: 400 }
      );
    }

    const finalPrompt =
      useFinalPrompt || !characterBiblePrompt
        ? prompt
        : buildFinalImagePrompt(characterBiblePrompt, prompt);

    const imageUrl = await generateSceneImage(openai, finalPrompt, quality);

    return NextResponse.json({
      imageUrl,
      finalImagePrompt: finalPrompt,
      quality,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "画像の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
