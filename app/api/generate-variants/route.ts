import { NextResponse } from "next/server";
import {
  getOpenAIClient,
  IMAGE_MODEL,
  TEXT_MODEL,
  type OpenAIClient,
} from "@/lib/openai/client";
import { VARIANT_PROMPT_SYSTEM } from "@/lib/prompts/variant-prompt";
import { swapVisualDirectorSection } from "@/lib/visual-director";

type VariantPrompt = {
  label: string;
  cameraAngle: string;
  lens: string;
  shotSize: string;
  lighting: string;
  composition: string;
  mood: string;
  prompt: string;
};

type VariantPromptsResult = {
  variants: VariantPrompt[];
};

async function generateImage(
  openai: OpenAIClient,
  variantCinematographyPrompt: string,
  fullVisualDirectorPrompt: string
): Promise<string> {
  const finalPrompt = swapVisualDirectorSection(
    fullVisualDirectorPrompt,
    variantCinematographyPrompt
  );

  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: finalPrompt,
    size: "1024x1024",
    quality: "high",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("画像データの取得に失敗しました。");
  }

  return `data:image/png;base64,${b64}`;
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
    const visualDirectorPrompt =
      typeof body.visualDirectorPrompt === "string"
        ? body.visualDirectorPrompt.trim()
        : "";

    if (!visualDirectorPrompt) {
      return NextResponse.json(
        { error: "Visual Director Promptが指定されていません。" },
        { status: 400 }
      );
    }

    const textResponse = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: VARIANT_PROMPT_SYSTEM },
        {
          role: "user",
          content: [
            "Create exactly 4 cinematography variants of this scene.",
            "Keep Character Bible identity, CHARACTER LOCK, scene content, and era identical.",
            "Vary only: Camera Angle, Lens, Shot Size, Lighting, Composition, Mood.",
            "Output cinematography section only — not the full assembled prompt.",
            "",
            "=== Full Image Prompt (reference) ===",
            visualDirectorPrompt,
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scene_variants",
          strict: true,
          schema: {
            type: "object",
            properties: {
              variants: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    cameraAngle: { type: "string" },
                    lens: { type: "string" },
                    shotSize: { type: "string" },
                    lighting: { type: "string" },
                    composition: { type: "string" },
                    mood: { type: "string" },
                    prompt: { type: "string" },
                  },
                  required: [
                    "label",
                    "cameraAngle",
                    "lens",
                    "shotSize",
                    "lighting",
                    "composition",
                    "mood",
                    "prompt",
                  ],
                  additionalProperties: false,
                },
                minItems: 4,
                maxItems: 4,
              },
            },
            required: ["variants"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = textResponse.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "バリエーションプロンプトの生成に失敗しました。" },
        { status: 502 }
      );
    }

    const { variants } = JSON.parse(content) as VariantPromptsResult;

    const imageResults = await Promise.allSettled(
      variants.map((variant) =>
        generateImage(openai, variant.prompt, visualDirectorPrompt)
      )
    );

    const results = imageResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return {
          label: variants[index].label,
          imageUrl: result.value,
          error: null,
        };
      }
      return {
        label: variants[index].label,
        imageUrl: null,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "画像の生成に失敗しました。",
      };
    });

    const successCount = results.filter((r) => r.imageUrl).length;
    if (successCount === 0) {
      return NextResponse.json(
        { error: "4案すべての画像生成に失敗しました。" },
        { status: 502 }
      );
    }

    return NextResponse.json({ variants: results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "4案の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
