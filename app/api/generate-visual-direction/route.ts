import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import {
  buildCharacterBibleBasePrompt,
  isCharacterBible,
} from "@/lib/character-bible";
import {
  VISUAL_DIRECTOR_AI_SYSTEM_PROMPT,
  isValidVisualDirectorScenePrompt,
  validateUniqueFraming,
  type SceneDirectionMeta,
} from "@/lib/visual-director";
import { buildSceneArraySchema } from "@/lib/utils/scene-count";
import type { Scene } from "@/lib/types";

type SceneInput = Scene & {
  cameraDirectorPrompt: string;
};

type VisualDirectionResult = {
  scenes: SceneDirectionMeta[];
};

function isValidVisualSceneInput(scene: unknown): scene is SceneInput {
  if (!scene || typeof scene !== "object") return false;
  const s = scene as SceneInput;
  return (
    typeof s.sceneNumber === "string" &&
    typeof s.narration === "string" &&
    typeof s.imageDescription === "string" &&
    typeof s.sceneAge === "string" &&
    typeof s.cameraDirectorPrompt === "string" &&
    s.cameraDirectorPrompt.trim().length > 0 &&
    Array.isArray(s.charactersInScene)
  );
}

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
    const batchSize = scenes.length;

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

    if (batchSize === 0 || !scenes.every(isValidVisualSceneInput)) {
      return NextResponse.json(
        { error: "シーン情報またはCamera Directorが不正です。" },
        { status: 400 }
      );
    }

    const typedScenes = scenes as SceneInput[];
    const characterBiblePrompt = buildCharacterBibleBasePrompt(characterBible);

    const sceneContext = typedScenes
      .map(
        (scene, index) =>
          [
            `--- Storyboard Frame ${index + 1} ---`,
            `Scene Number: ${scene.sceneNumber}`,
            `Protagonist Age in this scene: ${scene.sceneAge} (ONLY age changes — same face)`,
            `Characters in this scene ONLY: ${scene.charactersInScene.join(", ") || "Protagonist only"}`,
            `Narration (Japanese): ${scene.narration}`,
            `Image Description (Japanese): ${scene.imageDescription}`,
            "",
            "=== LOCKED CAMERA DIRECTOR CUT FOR THIS SCENE ===",
            scene.cameraDirectorPrompt,
          ].join("\n")
      )
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: VISUAL_DIRECTOR_AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Event: ${eventName}`,
            "",
            "=== LOCKED CINEMATIC DIRECTOR — OPERATE WITHIN THIS VISION ===",
            cinematicDirectorPrompt,
            "",
            "=== LOCKED CHARACTER BIBLE (shared identity — only age changes per scene) ===",
            characterBiblePrompt,
            "",
            `Generate ${batchSize} scene-level storyboard frame(s). Execute each locked Camera Director cut.`,
            "Only include characters listed for each scene.",
            "Each visualDirectorPrompt must be at least 1200 characters (scene cinematography only).",
            "Do NOT include Cinematic Director, Camera Director, or Character Bible in output.",
            "",
            sceneContext,
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "visual_storyboard",
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
                    cameraAngle: { type: "string" },
                    lens: { type: "string" },
                    shotSize: { type: "string" },
                    focus: { type: "string" },
                    cameraMovement: { type: "string" },
                    lighting: { type: "string" },
                    framingSignature: { type: "string" },
                    visualDirectorPrompt: { type: "string" },
                  },
                  required: [
                    "sceneNumber",
                    "cameraAngle",
                    "lens",
                    "shotSize",
                    "focus",
                    "cameraMovement",
                    "lighting",
                    "framingSignature",
                    "visualDirectorPrompt",
                  ],
                  additionalProperties: false,
                },
                ...buildSceneArraySchema(batchSize),
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
        { error: "Visual Director AIからの応答がありませんでした。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content) as VisualDirectionResult;

    const framingError = validateUniqueFraming(data.scenes);
    if (framingError) {
      return NextResponse.json({ error: framingError }, { status: 502 });
    }

    const results = data.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      cameraAngle: scene.cameraAngle,
      lens: scene.lens,
      shotSize: scene.shotSize,
      focus: scene.focus,
      cameraMovement: scene.cameraMovement,
      lighting: scene.lighting,
      framingSignature: scene.framingSignature,
      visualDirectorScenePrompt: scene.visualDirectorPrompt,
    }));

    for (const result of results) {
      if (!isValidVisualDirectorScenePrompt(result.visualDirectorScenePrompt)) {
        return NextResponse.json(
          {
            error: `${result.sceneNumber} のVisual Director Promptが1200文字未満です。`,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      characterBible,
      characterBiblePrompt,
      scenes: results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Visual Director AIの設計に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
