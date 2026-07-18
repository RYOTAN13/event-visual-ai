import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import {
  buildMasterDirectorPrompt,
  MASTER_DIRECTOR_SYSTEM_PROMPT,
  type MasterDirectionResult,
} from "@/lib/master-director";
import { buildCharacterBibleBasePrompt, isCharacterBible } from "@/lib/character-bible";
import { buildSceneArraySchema } from "@/lib/utils/scene-count";
import {
  buildSceneImagePrompt,
  isVisualDirectorScenePromptEmpty,
  isShortVisualDirectorScenePrompt,
  strengthenVisualDirectorScenePrompt,
  logShortPromptAutoStrengthen,
} from "@/lib/visual-director";
import type { Scene } from "@/lib/types";

type SceneInput = Scene & {
  cameraDirectorPrompt: string;
  visualDirectorScenePrompt: string;
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

    if (batchSize === 0) {
      return NextResponse.json(
        { error: "レビュー対象のシーンがありません。" },
        { status: 400 }
      );
    }

    const validScenes = scenes.every(
      (scene: SceneInput) =>
        scene &&
        typeof scene.sceneNumber === "string" &&
        typeof scene.narration === "string" &&
        typeof scene.imageDescription === "string" &&
        typeof scene.sceneAge === "string" &&
        typeof scene.cameraDirectorPrompt === "string" &&
        typeof scene.visualDirectorScenePrompt === "string" &&
        scene.cameraDirectorPrompt.trim().length > 0 &&
        scene.visualDirectorScenePrompt.trim().length > 0 &&
        Array.isArray(scene.charactersInScene)
    );

    if (!validScenes) {
      return NextResponse.json(
        { error: "シーン情報が不正です。" },
        { status: 400 }
      );
    }

    const typedScenes = scenes as SceneInput[];

    const characterBiblePrompt = buildCharacterBibleBasePrompt(characterBible);

    const sceneContext = typedScenes
      .map(
        (scene, index) =>
          [
            `--- Scene ${index + 1}: ${scene.sceneNumber} ---`,
            `Age: ${scene.sceneAge}`,
            `Characters: ${scene.charactersInScene.join(", ") || "Protagonist only"}`,
            `Narration: ${scene.narration}`,
            `Image Description: ${scene.imageDescription}`,
            "",
            "Camera Director:",
            scene.cameraDirectorPrompt,
            "",
            "Visual Director (draft — review and correct):",
            scene.visualDirectorScenePrompt,
          ].join("\n")
      )
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: MASTER_DIRECTOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Event: ${eventName}`,
            "",
            "=== CINEMATIC DIRECTOR ===",
            cinematicDirectorPrompt,
            "",
            "=== CHARACTER BIBLE ===",
            characterBiblePrompt,
            "",
            "Review ALL scenes below. Unify color, character, direction, composition, atmosphere, tension, and cinematic quality.",
            "Run the quality checklist on each scene. Self-correct any failures in visualDirectorScenePrompt.",
            "",
            sceneContext,
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "master_direction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              masterDirectorPrompt: { type: "string" },
              unifiedColorGrade: { type: "string" },
              unifiedAtmosphere: { type: "string" },
              unifiedTension: { type: "string" },
              scenes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sceneNumber: { type: "string" },
                    checklist: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          item: { type: "string" },
                          passed: { type: "boolean" },
                          correction: { type: "string" },
                        },
                        required: ["item", "passed", "correction"],
                        additionalProperties: false,
                      },
                    },
                    visualDirectorScenePrompt: { type: "string" },
                  },
                  required: [
                    "sceneNumber",
                    "checklist",
                    "visualDirectorScenePrompt",
                  ],
                  additionalProperties: false,
                },
                ...buildSceneArraySchema(batchSize),
              },
            },
            required: [
              "masterDirectorPrompt",
              "unifiedColorGrade",
              "unifiedAtmosphere",
              "unifiedTension",
              "scenes",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Master Directorからの応答がありませんでした。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content) as MasterDirectionResult;
    const masterDirectorPrompt = buildMasterDirectorPrompt(data);

    const sceneMap = new Map(
      typedScenes.map((scene) => [scene.sceneNumber, scene])
    );

    const results = data.scenes.map((scene) => {
      const inputScene = sceneMap.get(scene.sceneNumber);
      const charactersInScene = inputScene?.charactersInScene ?? [
        characterBible.name,
      ];
      const sceneAge = inputScene?.sceneAge ?? characterBible.referenceAge;
      const cameraDirectorPrompt = inputScene?.cameraDirectorPrompt ?? "";
      const sceneContent = inputScene
        ? `${inputScene.narration}\n${inputScene.imageDescription}`
        : "";
      const rawScenePrompt = scene.visualDirectorScenePrompt.trim();

      if (isVisualDirectorScenePromptEmpty(rawScenePrompt)) {
        throw new Error(`${scene.sceneNumber} のVisual Director Promptが空です。`);
      }

      const strengthenedScenePrompt = isShortVisualDirectorScenePrompt(
        rawScenePrompt
      )
        ? strengthenVisualDirectorScenePrompt({
            sceneNumber: scene.sceneNumber,
            visualDirectorScenePrompt: rawScenePrompt,
            narration: inputScene?.narration ?? "",
            imageDescription: inputScene?.imageDescription ?? "",
            visualPurpose: inputScene?.visualPurpose,
            emotion: inputScene?.emotion,
            sceneAge,
            charactersInScene,
            cameraDirectorPrompt,
            masterDirectorPrompt,
            cinematicDirectorPrompt,
            characterBible,
          })
        : rawScenePrompt;

      if (isShortVisualDirectorScenePrompt(rawScenePrompt)) {
        logShortPromptAutoStrengthen(scene.sceneNumber, rawScenePrompt.length);
      }

      const visualDirectorPrompt = buildSceneImagePrompt(
        masterDirectorPrompt,
        cinematicDirectorPrompt,
        cameraDirectorPrompt,
        strengthenedScenePrompt,
        characterBible,
        sceneAge,
        charactersInScene,
        sceneContent
      );

      return {
        sceneNumber: scene.sceneNumber,
        visualDirectorScenePrompt: rawScenePrompt,
        visualDirectorPrompt,
        checklist: scene.checklist,
      };
    });

    return NextResponse.json({
      masterDirectorPrompt,
      characterBiblePrompt,
      scenes: results,
      warnings: [],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Master Directorのレビューに失敗しました。";
    const status = message.includes("空です") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
