import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import { buildScriptDecompositionPrompt } from "@/lib/prompts/scene-prompt";
import { CHARACTER_BIBLE_SCHEMA } from "@/lib/types/schemas";
import {
  buildSceneArraySchema,
  parseSceneCount,
} from "@/lib/utils/scene-count";

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
    const scriptText =
      typeof body.script === "string" ? body.script.trim() : "";
    const sceneCount = parseSceneCount(body.sceneCount);

    if (!caseName) {
      return NextResponse.json(
        { error: "事件名を入力してください。" },
        { status: 400 }
      );
    }

    if (!scriptText) {
      return NextResponse.json(
        { error: "台本がありません。" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: buildScriptDecompositionPrompt(sceneCount),
        },
        {
          role: "user",
          content: `以下の台本を${sceneCount}個のSceneに分解してください。台本に忠実に。\n\n事件名: ${caseName}\n\n━━━ 台本 ━━━\n${scriptText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "script_scene_decomposition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              characterBible: CHARACTER_BIBLE_SCHEMA,
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sceneNumber: { type: "string" },
                    narration: { type: "string" },
                    imageDescription: { type: "string" },
                    charactersInScene: {
                      type: "array",
                      items: { type: "string" },
                    },
                    sceneAge: { type: "string" },
                    visualPurpose: { type: "string" },
                    emotion: { type: "string" },
                    sceneSourceText: { type: "string" },
                    gptImagePrompt: { type: "string" },
                  },
                  required: [
                    "sceneNumber",
                    "narration",
                    "imageDescription",
                    "charactersInScene",
                    "sceneAge",
                    "visualPurpose",
                    "emotion",
                    "sceneSourceText",
                    "gptImagePrompt",
                  ],
                  additionalProperties: false,
                },
                ...buildSceneArraySchema(sceneCount),
              },
            },
            required: ["characterBible", "scenes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Scene生成に失敗しました。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content);
    return NextResponse.json({ ...data, sceneCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scene生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
