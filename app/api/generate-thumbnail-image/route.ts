import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { generateSceneImage } from "@/lib/openai/image-generation";

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
    const imagePrompt =
      typeof body.imagePrompt === "string" ? body.imagePrompt.trim() : "";
    const additionalInstruction =
      typeof body.additionalInstruction === "string"
        ? body.additionalInstruction.trim()
        : "";

    if (!imagePrompt) {
      return NextResponse.json(
        { error: "サムネ画像Promptが指定されていません。" },
        { status: 400 }
      );
    }

    const finalPrompt = [
      imagePrompt,
      additionalInstruction
        ? `USER ADDITIONAL DIRECTION: ${additionalInstruction}`
        : "",
      "",
      "MANDATORY OUTPUT RULES:",
      "YouTube thumbnail background.",
      "Landscape 16:9 composition; keep all essential subjects in the central 16:9 safe area.",
      "Cinematic documentary.",
      "High contrast.",
      "Clear focal point.",
      "Large negative space for text.",
      "Image only — no readable text.",
      "No logo.",
      "No watermark.",
      "No gore.",
      "No graphic violence.",
      "If an exact real-person likeness is not verifiable, use an anonymous reenactment figure appropriate to the period.",
    ]
      .filter(Boolean)
      .join("\n");

    // GPT Image's landscape output is 1536x1024. UI/export center-crops it
    // to the exact 16:9 YouTube frame without altering Scene image settings.
    const imageUrl = await generateSceneImage(
      openai,
      finalPrompt,
      "high",
      "1536x1024"
    );

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "サムネ画像の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
