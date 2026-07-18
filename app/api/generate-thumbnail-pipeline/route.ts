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

    // UIには表示しない。画像生成へ渡す内部JSONのみ返す。
    return NextResponse.json(result);
  } catch (error) {
    console.error("[generate-thumbnail-pipeline] failed:", error);
    const raw = error instanceof Error ? error.message : "";
    const isUserFacing = /[\u3040-\u30ff\u4e00-\u9faf]/.test(raw);
    return NextResponse.json(
      {
        error: isUserFacing
          ? raw
          : "サムネ設計パイプラインの実行に失敗しました。",
      },
      { status: 500 }
    );
  }
}
