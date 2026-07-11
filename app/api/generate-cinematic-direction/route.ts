import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import {
  buildCinematicDirectorPrompt,
  CINEMATIC_DIRECTOR_SYSTEM_PROMPT,
  DEFAULT_CINEMATIC_STYLE,
  isValidCinematicStyle,
  type CinematicDirection,
  type CinematicStylePreset,
} from "@/lib/cinematic-director";
import { isCharacterBible } from "@/lib/character-bible";
import type { CharacterBible, Scene } from "@/lib/types";

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
    const styleInput =
      typeof body.cinematicStyle === "string"
        ? body.cinematicStyle.trim()
        : DEFAULT_CINEMATIC_STYLE;
    const cinematicStyle: CinematicStylePreset = isValidCinematicStyle(
      styleInput
    )
      ? styleInput
      : DEFAULT_CINEMATIC_STYLE;
    const characterBible: CharacterBible | undefined =
      body.characterBible ?? body.protagonist;
    const scenes = Array.isArray(body.scenes) ? body.scenes : [];

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

    const sceneSummary = (scenes as Scene[])
      .map(
        (scene) =>
          `${scene.sceneNumber}: ${scene.narration.slice(0, 120)}...`
      )
      .join("\n");

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: CINEMATIC_DIRECTOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Event: ${eventName}`,
            `Style Preset: ${cinematicStyle}`,
            `Protagonist: ${characterBible.name}, reference age ${characterBible.referenceAge}, ${characterBible.gender}`,
            "Age progresses across scenes — same facial identity throughout.",
            "",
            "Scene overview:",
            sceneSummary,
            "",
            "Define the unified cinematic visual language for this entire documentary.",
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cinematic_direction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              colorPalette: { type: "string" },
              lightingStyle: { type: "string" },
              filmStock: { type: "string" },
              cameraLanguage: { type: "string" },
              lensLanguage: { type: "string" },
              mood: { type: "string" },
              contrast: { type: "string" },
              highlight: { type: "string" },
              shadow: { type: "string" },
              grain: { type: "string" },
              cameraMovement: { type: "string" },
              compositionRules: { type: "string" },
              aspectRatio: { type: "string" },
              depthOfField: { type: "string" },
              directorNotes: { type: "string" },
            },
            required: [
              "colorPalette",
              "lightingStyle",
              "filmStock",
              "cameraLanguage",
              "lensLanguage",
              "mood",
              "contrast",
              "highlight",
              "shadow",
              "grain",
              "cameraMovement",
              "compositionRules",
              "aspectRatio",
              "depthOfField",
              "directorNotes",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Cinematic Directorからの応答がありませんでした。" },
        { status: 502 }
      );
    }

    const direction = JSON.parse(content) as CinematicDirection;
    const cinematicDirectorPrompt = buildCinematicDirectorPrompt(
      cinematicStyle,
      direction
    );

    return NextResponse.json({
      cinematicStyle,
      cinematicDirectorPrompt,
      direction,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Cinematic Directorの設計に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
