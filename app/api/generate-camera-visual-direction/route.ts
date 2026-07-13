import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import {
  buildCameraDirectorPrompt,
  validateUniqueCameraCuts,
  type CameraDirector,
} from "@/lib/camera-director";
import {
  buildCharacterBibleBasePrompt,
  isCharacterBible,
} from "@/lib/character-bible";
import {
  CAMERA_VISUAL_DIRECTOR_SYSTEM_PROMPT,
  COMPOSITION_OPTIONS,
  LENS_OPTIONS,
  SHOT_TYPES,
} from "@/lib/prompts/camera-visual-prompt";
import {
  getShortPromptWarning,
  isShortVisualDirectorScenePrompt,
  isVisualDirectorScenePromptEmpty,
  validateUniqueFraming,
} from "@/lib/visual-director";
import {
  sceneBatchErrorMessage,
  validateSceneBatch,
} from "@/lib/utils/api-scenes";
import { buildSceneArraySchema, parseSceneCount } from "@/lib/utils/scene-count";
import type { Scene } from "@/lib/types";

type CameraVisualSceneResult = CameraDirector & {
  cameraAngle: string;
  shotSize: string;
  cameraMovement: string;
  lighting: string;
  framingSignature: string;
  visualDirectorPrompt: string;
};

type CameraVisualDirectionResult = {
  scenes: CameraVisualSceneResult[];
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
            `--- Scene ${index + 1} ---`,
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
        { role: "system", content: CAMERA_VISUAL_DIRECTOR_SYSTEM_PROMPT },
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
            `Design camera cuts AND visual director scene prompts for all ${sceneCount} scenes in one response.`,
            "Each visualDirectorPrompt should be richly detailed scene cinematography.",
            "",
            sceneContext,
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "camera_visual_direction",
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
                    cameraAngle: { type: "string" },
                    shotSize: { type: "string" },
                    cameraMovement: { type: "string" },
                    lighting: { type: "string" },
                    framingSignature: { type: "string" },
                    visualDirectorPrompt: { type: "string" },
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
                    "cameraAngle",
                    "shotSize",
                    "cameraMovement",
                    "lighting",
                    "framingSignature",
                    "visualDirectorPrompt",
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
        { error: "Camera + Visual Directorからの応答がありませんでした。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content) as CameraVisualDirectionResult;

    const cutError = validateUniqueCameraCuts(data.scenes);
    if (cutError) {
      return NextResponse.json({ error: cutError }, { status: 502 });
    }

    const visualMeta = data.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      cameraAngle: scene.cameraAngle,
      lens: scene.lens,
      shotSize: scene.shotSize,
      focus: scene.focus,
      cameraMovement: scene.cameraMovement,
      lighting: scene.lighting,
      framingSignature: scene.framingSignature,
      visualDirectorPrompt: scene.visualDirectorPrompt,
    }));

    const framingError = validateUniqueFraming(visualMeta);
    if (framingError) {
      return NextResponse.json({ error: framingError }, { status: 502 });
    }

    const warnings: string[] = [];
    const results = data.scenes.map((scene) => {
      const scenePrompt = scene.visualDirectorPrompt.trim();
      if (isVisualDirectorScenePromptEmpty(scenePrompt)) {
        throw new Error(
          `${scene.sceneNumber} のVisual Director Promptが空です。`
        );
      }
      if (isShortVisualDirectorScenePrompt(scenePrompt)) {
        warnings.push(
          getShortPromptWarning(scene.sceneNumber, scenePrompt.length)
        );
      }

      const cameraDirector: CameraDirector = {
        sceneNumber: scene.sceneNumber,
        shotType: scene.shotType,
        cameraHeight: scene.cameraHeight,
        lens: scene.lens,
        distance: scene.distance,
        framing: scene.framing,
        composition: scene.composition,
        focus: scene.focus,
        depthOfField: scene.depthOfField,
        lightingDirection: scene.lightingDirection,
        perspective: scene.perspective,
        cutRationale: scene.cutRationale,
      };

      return {
        sceneNumber: scene.sceneNumber,
        cameraDirector,
        cameraDirectorPrompt: buildCameraDirectorPrompt(cameraDirector),
        visualDirectorScenePrompt: scenePrompt,
      };
    });

    return NextResponse.json({
      characterBible,
      characterBiblePrompt,
      scenes: results,
      warnings,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Camera + Visual Directorの設計に失敗しました。";
    const status = message.includes("空です") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
