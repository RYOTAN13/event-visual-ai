import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import {
  sceneBatchErrorMessage,
  validateSceneBatch,
} from "@/lib/utils/api-scenes";
import {
  buildCameraDirectorPrompt,
  CAMERA_DIRECTOR_SYSTEM_PROMPT,
  COMPOSITION_OPTIONS,
  LENS_OPTIONS,
  SHOT_TYPES,
  validateUniqueCameraCuts,
  type CameraDirector,
} from "@/lib/camera-director";
import { buildCharacterBibleBasePrompt, isCharacterBible } from "@/lib/character-bible";
import {
  buildSceneArraySchema,
  parseSceneCount,
} from "@/lib/utils/scene-count";
import type { Scene } from "@/lib/types";

type CameraDirectionResult = {
  scenes: CameraDirector[];
};

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
    const eventName =
      typeof body.eventName === "string" ? body.eventName.trim() : "";
    const characterBible = body.characterBible ?? body.protagonist;
    const cinematicDirectorPrompt =
      typeof body.cinematicDirectorPrompt === "string"
        ? body.cinematicDirectorPrompt.trim()
        : "";
    const scenes = Array.isArray(body.scenes) ? body.scenes : [];
    const sceneCount = parseSceneCount(body.sceneCount ?? scenes.length);

    if (!eventName) {
      return NextResponse.json(
        { error: "事件名が指定されていません。" },
        { status: 400 }
      );
    }

    if (!isCharacterBible(characterBible)) {
      return NextResponse.json(
        { error: "Character Bibleが指定されていません。" },
        { status: 400 }
      );
    }

    if (!cinematicDirectorPrompt) {
      return NextResponse.json(
        { error: "Cinematic Director Promptが指定されていません。" },
        { status: 400 }
      );
    }

    if (!validateSceneBatch(scenes, sceneCount)) {
      return NextResponse.json(
        { error: sceneBatchErrorMessage(sceneCount) },
        { status: 400 }
      );
    }

    const typedScenes = scenes as Scene[];
    const characterBiblePrompt = buildCharacterBibleBasePrompt(characterBible);

    const sceneContext = typedScenes
      .map(
        (scene, index) =>
          [
            `--- Cut ${index + 1} ---`,
            `Scene Number: ${scene.sceneNumber}`,
            `Protagonist Age: ${scene.sceneAge}`,
            `Characters: ${scene.charactersInScene.join(", ") || "Protagonist only"}`,
            `Narration: ${scene.narration}`,
            `Image Description: ${scene.imageDescription}`,
          ].join("\n")
      )
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: CAMERA_DIRECTOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Event: ${eventName}`,
            "",
            "=== LOCKED CINEMATIC DIRECTOR ===",
            cinematicDirectorPrompt,
            "",
            "=== LOCKED CHARACTER BIBLE ===",
            characterBiblePrompt,
            "",
            `Design the optimal film cut for each of ${sceneCount} scenes. Vary shot types across the full documentary.`,
            "Optimize automatically based on event content and narrative beat.",
            "",
            sceneContext,
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "camera_direction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sceneNumber: { type: "string" },
                    shotType: { type: "string", enum: [...SHOT_TYPES] },
                    cameraHeight: { type: "string" },
                    lens: { type: "string", enum: [...LENS_OPTIONS] },
                    distance: { type: "string" },
                    framing: { type: "string" },
                    composition: {
                      type: "string",
                      enum: [...COMPOSITION_OPTIONS],
                    },
                    focus: { type: "string" },
                    depthOfField: { type: "string" },
                    lightingDirection: { type: "string" },
                    perspective: { type: "string" },
                    cutRationale: { type: "string" },
                  },
                  required: [
                    "sceneNumber",
                    "shotType",
                    "cameraHeight",
                    "lens",
                    "distance",
                    "framing",
                    "composition",
                    "focus",
                    "depthOfField",
                    "lightingDirection",
                    "perspective",
                    "cutRationale",
                  ],
                  additionalProperties: false,
                },
                ...buildSceneArraySchema(sceneCount),
              },
            },
            required: ["scenes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Camera Directorからの応答がありませんでした。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content) as CameraDirectionResult;

    const cutError = validateUniqueCameraCuts(data.scenes);
    if (cutError) {
      return NextResponse.json({ error: cutError }, { status: 502 });
    }

    const results = data.scenes.map((scene) => ({
      ...scene,
      cameraDirectorPrompt: buildCameraDirectorPrompt(scene),
    }));

    return NextResponse.json({ scenes: results });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Camera Directorの設計に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
