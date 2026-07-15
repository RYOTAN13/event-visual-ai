import { NextResponse } from "next/server";
import { getOpenAIClient, TEXT_MODEL } from "@/lib/openai/client";

type ConceptDraft = {
  catchCopy: string;
  composition: string;
  subjectDescription: string;
  backgroundDescription: string;
  colorDirection: string;
  emotion: string;
  ctrReason: string;
  imagePrompt: string;
};

type ConceptResponse = {
  concepts: ConceptDraft[];
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
    const caseName =
      typeof body.caseName === "string" ? body.caseName.trim() : "";
    const videoTitle =
      typeof body.videoTitle === "string" ? body.videoTitle.trim() : "";
    const thumbnailText =
      typeof body.thumbnailText === "string" ? body.thumbnailText.trim() : "";
    const person = typeof body.person === "string" ? body.person.trim() : "";
    const background =
      typeof body.background === "string" ? body.background.trim() : "";
    const compositionStyle =
      typeof body.compositionStyle === "string"
        ? body.compositionStyle.trim()
        : "";
    const moods = Array.isArray(body.moods)
      ? body.moods.filter((mood: unknown): mood is string => typeof mood === "string")
      : [];
    const additionalInstruction =
      typeof body.additionalInstruction === "string"
        ? body.additionalInstruction.trim()
        : "";
    const factPack = body.factPack
      ? JSON.stringify(body.factPack).slice(0, 14000)
      : "";
    const script =
      typeof body.script === "string" ? body.script.slice(0, 14000) : "";

    if (!caseName || !videoTitle || !thumbnailText) {
      return NextResponse.json(
        { error: "事件名・動画タイトル・サムネ文字を入力してください。" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a creative director for serious Japanese true-crime documentary YouTube thumbnails.

Create exactly four high-impact but factual thumbnail concepts.

FACTUAL SAFETY — ABSOLUTE:
- Use only people, evidence, locations, and events explicitly present in the supplied Fact Pack or script.
- Never invent a suspect, victim, evidence item, crime scene, court event, police action, or factual claim.
- If a real person's exact appearance cannot be verified from the supplied material, depict an anonymous reenactment figure evoking the historical period, never a claimed exact likeness.
- Avoid bodies, blood, gore, injury detail, and graphic violence.
- No sensational visual that contradicts the supplied facts.

IMAGE RULES:
- Design a landscape 16:9 YouTube thumbnail background.
- The image will contain NO typography. Catch copy is rendered later as HTML/CSS.
- imagePrompt must explicitly require: YouTube thumbnail background, cinematic documentary, high contrast, clear focal point, large negative space for text, no readable text, no logo, no watermark, no gore, no graphic violence.
- Keep each concept visually distinct while respecting the requested composition style and moods.
- Return JSON only.`,
        },
        {
          role: "user",
          content: [
            `Case name: ${caseName}`,
            `Video title: ${videoTitle}`,
            `Requested thumbnail text: ${thumbnailText}`,
            `Requested person: ${person || "Not specified"}`,
            `Requested background: ${background || "Not specified"}`,
            `Composition style: ${compositionStyle}`,
            `Moods: ${moods.join(", ") || "Not specified"}`,
            `Additional instruction: ${additionalInstruction || "None"}`,
            "",
            "=== FACT PACK ===",
            factPack || "Not available",
            "",
            "=== SCRIPT ===",
            script || "Not available",
            "",
            "For each concept return: catchCopy, composition, subjectDescription, backgroundDescription, colorDirection, emotion, ctrReason, imagePrompt.",
            "Prefer the requested thumbnail text as catchCopy; only shorten it when needed for mobile readability.",
          ].join("\n"),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "true_crime_thumbnail_concepts",
          strict: true,
          schema: {
            type: "object",
            properties: {
              concepts: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    catchCopy: { type: "string" },
                    composition: { type: "string" },
                    subjectDescription: { type: "string" },
                    backgroundDescription: { type: "string" },
                    colorDirection: { type: "string" },
                    emotion: { type: "string" },
                    ctrReason: { type: "string" },
                    imagePrompt: { type: "string" },
                  },
                  required: [
                    "catchCopy",
                    "composition",
                    "subjectDescription",
                    "backgroundDescription",
                    "colorDirection",
                    "emotion",
                    "ctrReason",
                    "imagePrompt",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["concepts"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "サムネ案の生成結果を取得できませんでした。" },
        { status: 502 }
      );
    }

    const data = JSON.parse(content) as ConceptResponse;
    const concepts = data.concepts.map((concept, index) => ({
      id: `thumbnail-${Date.now()}-${index + 1}`,
      ...concept,
    }));

    return NextResponse.json({ concepts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "サムネ案の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
