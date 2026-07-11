import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";
import { buildCharacterBibleBasePrompt } from "@/lib/character-bible";
import {
  buildSceneImagePrompt,
  VISUAL_DIRECTOR_AI_SYSTEM_PROMPT,
} from "@/lib/visual-director";
import type { CharacterBible } from "@/lib/types";

const PLACEHOLDER_BIBLE: CharacterBible = {
  name: "Unknown",
  gender: "Unknown",
  height: "Unknown",
  physique: "Unknown",
  hairStyle: "Unknown",
  hairColor: "Unknown",
  skinTone: "Unknown",
  faceShape: "Unknown",
  eyes: "Unknown",
  nose: "Unknown",
  mouth: "Unknown",
  ears: "Unknown",
  eyebrows: "Unknown",
  distinguishingFeatures: "Unknown",
  clothing: "Unknown",
  belongings: "Unknown",
  referenceAge: "Unknown",
};

/** @deprecated Use /api/generate-visual-direction for batch visual arc design */
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
    const sceneNumber =
      typeof body.sceneNumber === "string" ? body.sceneNumber.trim() : "";
    const narration =
      typeof body.narration === "string" ? body.narration.trim() : "";
    const imageDescription =
      typeof body.imageDescription === "string"
        ? body.imageDescription.trim()
        : "";
    const eventName =
      typeof body.eventName === "string" ? body.eventName.trim() : "";
    const sceneAge =
      typeof body.sceneAge === "string" ? body.sceneAge.trim() : "Unknown";

    if (!sceneNumber || !narration || !imageDescription) {
      return NextResponse.json(
        { error: "シーン情報が不足しています。" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: VISUAL_DIRECTOR_AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Event: ${eventName || "Unknown"}`,
            `Scene: ${sceneNumber}`,
            `Narration (Japanese): ${narration}`,
            `Image Description (Japanese): ${imageDescription}`,
            "",
            "Write ONE scene Visual Director Prompt in English (at least 1200 characters).",
          ].join("\n"),
        },
      ],
    });

    const basePrompt = response.choices[0]?.message?.content?.trim();
    if (!basePrompt) {
      return NextResponse.json(
        { error: "Visual Director Promptの生成に失敗しました。" },
        { status: 502 }
      );
    }

    const masterDirectorPrompt =
      "MASTER DIRECTOR — PLACEHOLDER\nUnified documentary quality verified.";

    const cinematicDirectorPrompt =
      "CINEMATIC DIRECTOR — PLACEHOLDER\nStyle Preset: Netflix Documentary";

    const cameraDirectorPrompt =
      "CAMERA DIRECTOR — SCENE CUT (LOCKED):\nShot Type: Medium\nLens: 50mm\nComposition: Rule of Thirds";

    const visualDirectorPrompt = buildSceneImagePrompt(
      masterDirectorPrompt,
      cinematicDirectorPrompt,
      cameraDirectorPrompt,
      basePrompt,
      PLACEHOLDER_BIBLE,
      sceneAge,
      [PLACEHOLDER_BIBLE.name],
      `${narration}\n${imageDescription}`
    );

    return NextResponse.json({
      visualDirectorPrompt,
      characterBiblePrompt: buildCharacterBibleBasePrompt(PLACEHOLDER_BIBLE),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Visual Director Promptの生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
