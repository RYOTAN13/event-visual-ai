import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { generateFactPack } from "@/lib/fact-engine/generate-fact-pack";

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
    const incidentName =
      typeof body.incidentName === "string" ? body.incidentName.trim() : "";

    if (!incidentName) {
      return NextResponse.json(
        { error: "事件名を入力してください。" },
        { status: 400 }
      );
    }

    const factPack = await generateFactPack(openai, incidentName);

    return NextResponse.json(factPack);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Fact Pack の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
