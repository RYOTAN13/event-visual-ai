import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { runThumbnailDirectorPipeline } from "@/lib/thumbnail-studio/pipeline";

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
    const caseName =
      typeof body.caseName === "string" ? body.caseName.trim() : "";
    if (!caseName) {
      return NextResponse.json(
        { error: "事件名を入力してください。" },
        { status: 400 }
      );
    }

    const result = await runThumbnailDirectorPipeline(openai, {
      caseName,
      thumbnailText:
        typeof body.thumbnailText === "string"
          ? body.thumbnailText.trim()
          : "",
      factPack: body.factPack
        ? JSON.stringify(body.factPack).slice(0, 14000)
        : "",
      script:
        typeof body.script === "string" ? body.script.slice(0, 14000) : "",
    });
    return NextResponse.json({
      hook: {
        adoptedCopy: result.scoredHook.adoptedCopy,
        candidates: result.hooks.candidates.map((item) => item.copy),
        emotionalTheme: result.scoredHook.emotionalTheme,
        clickPoint: result.scoredHook.clickPoint,
        ngWords: result.scoredHook.ngWords,
        selectionReason: result.scoredHook.selectionReason,
      },
    });
  } catch (error) {
    console.error("[generate-thumbnail-hook] planning failed:", error);
    return NextResponse.json(
      { error: "クリック切り口の生成に失敗しました。" },
      { status: 500 }
    );
  }
}
