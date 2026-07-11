import { NextResponse } from "next/server";
import { getOpenAIClient, IMAGE_MODEL } from "@/lib/openai/client";
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
    const prompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";
    const characterBiblePrompt =
      typeof body.characterBiblePrompt === "string"
        ? body.characterBiblePrompt.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "画像プロンプトが指定されていません。" },
        { status: 400 }
      );
    }

    const finalPrompt = characterBiblePrompt
      ? buildFinalImagePrompt(characterBiblePrompt, prompt)
      : prompt;

    const response = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: finalPrompt,
      size: "1024x1024",
      quality: "high",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: "画像データの取得に失敗しました。" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${b64}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "画像の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
