import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import { buildLegacyScenePrompt } from "@/lib/prompts/scene-prompt";
import { CHARACTER_BIBLE_SCHEMA } from "@/lib/types/schemas";
import {
  buildSceneArraySchema,
  parseSceneCount,
} from "@/lib/utils/scene-count";
import type { GenerateScenesResponse } from "@/lib/types";

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
    const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
    const sceneCount = parseSceneCount(body.sceneCount);

    if (!eventName) {
      return NextResponse.json(
        { error: "事件名を入力してください。" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: buildLegacyScenePrompt(sceneCount) },
        {
          role: "user",
          content: `Create a Character Bible (once, shared across all scenes) and a documentary scene list for this event. Output exactly ${sceneCount} scenes with age progression.\n\nEvent: ${eventName}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "documentary_scenes",
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
                    sceneAge: { type: "string" },
                    charactersInScene: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "sceneNumber",
                    "narration",
                    "imageDescription",
                    "sceneAge",
                    "charactersInScene",
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
        { error: "OpenAIからの応答がありませんでした。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content) as GenerateScenesResponse;
    return NextResponse.json({ ...data, sceneCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "シーンの生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
