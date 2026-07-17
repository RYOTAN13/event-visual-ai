import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { generateSceneImage } from "@/lib/openai/image-generation";
import {
  THUMBNAIL_VARIATION_IDS,
  type ThumbnailVariationId,
} from "@/lib/types/thumbnail-studio";

export { maxDuration, dynamic } from "@/lib/vercel/api-route-config";

const VARIATION_DIRECTIONS: Record<ThumbnailVariationId, string> = {
  A: [
    "VARIATION A — Classic high-impact person close-up:",
    "- Close-up portrait: the anonymous Japanese reenactment subject's face or upper body fills 40-60% of the frame.",
    "- subject occupies at least 50 percent of the frame.",
    "- The person is the foreground and dominant element; clear single focal subject.",
    "- Looking at the camera or in three-quarter profile, with a strong facial expression conveying intense emotion.",
    "- Background limited to a Japanese courtroom, a Japanese detention facility, or case documents — kept soft and secondary.",
    "- High-contrast palette centered on red, black, and white.",
    "- not a wide shot, not a crowd scene, not a landscape. The person must never appear small or distant.",
    "- Reserve a large clean area for headline text.",
  ].join("\n"),
  B: [
    "VARIATION B — Cinematic documentary poster:",
    "- Evoke the gravity of Netflix, BBC, and NHK Special documentaries.",
    "- Movie-poster-like composition set inside a Japanese courtroom or Japanese detention facility.",
    "- Dark background, heavy weighty atmosphere, restrained desaturated color grading.",
    "- Convey premium production value and quiet tension.",
  ].join("\n"),
  C: [
    "VARIATION C — Investigation and shock:",
    "- Build the frame around Japanese case evidence: evidence items, aged Japanese newspaper pages, investigation files, and case documents on a desk.",
    "- Use black with strong yellow accents and touches of red.",
    "- Strong sense of urgency and tension, like an active Japanese police investigation room.",
    "- Strictly no blood, no bodies, no graphic content.",
  ].join("\n"),
  D: [
    "VARIATION D — Unsolved mystery:",
    "- A silhouetted figure or an empty Japanese crime scene, such as a dim Showa-era Japanese street or building.",
    "- Deep shadows, fog, dark blue and black tones.",
    "- Unsettling, enigmatic composition with a strong sense of an unsolved case.",
    "- Make the viewer wonder what happened here.",
  ].join("\n"),
};

const JAPANESE_SETTING_RULES = [
  "JAPANESE SETTING — ABSOLUTE:",
  "Japanese crime documentary.",
  "Japanese setting: Showa-era or present-day Japan.",
  "Japanese architecture.",
  "Japanese courtroom or detention facility when an institutional interior is shown.",
  "anonymous Japanese reenactment subject for any person depicted.",
  "no military.",
  "no battlefield.",
  "no war imagery, no soldiers, no ruined warzone streets.",
  "no foreign police.",
  "no Western cityscape, no European or American streets or buildings.",
].join("\n");

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
    const variation = body.variation as ThumbnailVariationId;
    if (!THUMBNAIL_VARIATION_IDS.includes(variation)) {
      return NextResponse.json(
        { error: "Variationが指定されていません。" },
        { status: 400 }
      );
    }

    const caseName =
      typeof body.caseName === "string" ? body.caseName.trim() : "";
    const videoTitle =
      typeof body.videoTitle === "string" ? body.videoTitle.trim() : "";
    const person = typeof body.person === "string" ? body.person.trim() : "";
    const background =
      typeof body.background === "string" ? body.background.trim() : "";
    const moods = Array.isArray(body.moods)
      ? body.moods.filter(
          (mood: unknown): mood is string => typeof mood === "string"
        )
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

    if (!caseName) {
      return NextResponse.json(
        { error: "事件名を入力してください。" },
        { status: 400 }
      );
    }

    const finalPrompt = [
      "Design a YouTube thumbnail for a serious Japanese true-crime documentary video.",
      "The image must be 100% text-free: the headline is composited later as HTML, so never render the case name, title, or any words inside the image.",
      "",
      `Case context (for visual reference only — never render as text): ${caseName}`,
      videoTitle
        ? `Video context (for visual reference only — never render as text): ${videoTitle}`
        : "",
      person ? `Person to depict: ${person}` : "",
      background ? `Background to depict: ${background}` : "",
      moods.length > 0 ? `Mood keywords: ${moods.join(", ")}` : "",
      additionalInstruction
        ? `USER ADDITIONAL DIRECTION: ${additionalInstruction}`
        : "",
      "",
      VARIATION_DIRECTIONS[variation],
      "",
      JAPANESE_SETTING_RULES,
      "",
      "FACTUAL SAFETY — ABSOLUTE:",
      factPack
        ? "Use only people, evidence, and locations present in the FACT PACK / SCRIPT below. Never invent a suspect, victim, evidence item, or crime scene."
        : "Do not invent specific named people, evidence, or claims about the case.",
      "If an exact real-person likeness is not verifiable, depict an anonymous reenactment figure appropriate to the period, never a claimed exact likeness.",
      "",
      "MANDATORY OUTPUT RULES:",
      "YouTube thumbnail.",
      "16:9 composition; keep all essential subjects in the central 16:9 safe area.",
      "High contrast.",
      "Clear focal point.",
      "Strong emotional impact.",
      "Large negative space for headline text.",
      "Cinematic crime documentary.",
      "No readable text. Absolutely no letters, words, kanji, kana, numbers, typography, captions, subtitles, headlines, or lettering of any kind anywhere in the image — not on posters, newspapers, signs, tape, or documents.",
      "No logo.",
      "No watermark.",
      "No gore.",
      "No corpse.",
      "No graphic violence.",
      factPack ? "\n=== FACT PACK ===\n" + factPack : "",
      script ? "\n=== SCRIPT ===\n" + script : "",
    ]
      .filter(Boolean)
      .join("\n");

    // GPT Image's landscape output is 1536x1024. UI/export center-crops it
    // to the exact 16:9 YouTube frame without altering Scene image settings.
    const imageUrl = await generateSceneImage(
      openai,
      finalPrompt,
      "high",
      "1536x1024"
    );

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "サムネ画像の生成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
