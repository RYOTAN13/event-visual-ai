import { NextResponse } from "next/server";
import { toFile } from "openai";
import { getOpenAIClient, IMAGE_MODEL } from "@/lib/openai/client";
import { generateSceneImage } from "@/lib/openai/image-generation";
import {
  THUMBNAIL_VARIATION_IDS,
  type ThumbnailVariationId,
} from "@/lib/types/thumbnail-studio";

export { maxDuration, dynamic } from "@/lib/vercel/api-route-config";

const VARIATION_DIRECTIONS: Record<ThumbnailVariationId, string> = {
  A: [
    "ROLE: EMOTIONAL PERSON CLOSE-UP.",
    "- Background: almost-abstract, heavily blurred dark Japanese institutional interior; no recognizable courtroom, crime scene, evidence desk, newspaper collage, or interrogation room.",
    "- Camera distance: extreme close-up or tight head-and-shoulders portrait, 70-100mm portrait-lens feel.",
    "- Light: hard side key light across the face with a thin red rim light; deep black falloff.",
    "- Color: red, black, and neutral skin tones; the highest contrast of all variations.",
    "- Composition: one face only, asymmetric rule-of-thirds portrait, direct emotional confrontation.",
    "- Person size: face or upper body fills 55-70% of the frame and is unquestionably dominant.",
    "- Expression and gaze: intense restrained emotion; direct eye contact or sharp three-quarter gaze.",
    "- Negative space: clean dark area on the lower-left for the later headline overlay.",
    "- FORBIDDEN: wide shot, small person, crowd, landscape, evidence montage, newspaper layout.",
  ].join("\n"),
  B: [
    "ROLE: JAPANESE COURTROOM AS THE MAIN SUBJECT.",
    "- Background: unmistakable Japanese courtroom interior with judge's bench, gallery seating, restrained wood architecture, and institutional details.",
    "- Camera distance: wide establishing shot from gallery level, 24-28mm architectural-lens feel.",
    "- Light: soft daylight from high windows mixed with solemn overhead practical light.",
    "- Color: dark walnut brown, charcoal, muted cream, with one restrained crimson accent.",
    "- Composition: strong courtroom symmetry and leading lines toward the judge's bench; architecture is the focal subject.",
    "- Person size: no close-up. At most one or two tiny anonymous figures occupying under 12% of the frame.",
    "- Negative space: an uncluttered shadowed lower-left seating or wall area for the later headline.",
    "- FORBIDDEN: dominant face, interrogation room, prison corridor, evidence desk, newspaper collage.",
  ].join("\n"),
  C: [
    "ROLE: JAPANESE CRIME SCENE AS THE MAIN SUBJECT.",
    "- Background: an exterior or room in Japan appropriate to the case era, treated as a restrained reconstructed crime scene; generic police cordon and environmental traces only.",
    "- Camera distance: medium-wide observer viewpoint, 28-35mm documentary-lens feel.",
    "- Light: cold dawn, rainy night practicals, or a single forensic work light creating directional depth.",
    "- Color: cold steel blue and charcoal with a controlled yellow safety accent.",
    "- Composition: location-first diagonal composition with one strong environmental focal point and layered depth.",
    "- Person size: preferably no person; if necessary, one distant silhouette under 8% of the frame.",
    "- Negative space: dark uncluttered lower-left foreground or wall for the later headline.",
    "- FORBIDDEN: portrait, courtroom, interrogation room, evidence tabletop, readable police markings, blood, body, gore.",
  ].join("\n"),
  D: [
    "ROLE: EVIDENCE OBJECT AS THE MAIN SUBJECT.",
    "- Background: dark Japanese investigation desk or neutral evidence surface, shallow and out of focus.",
    "- Camera distance: macro close-up or tight tabletop shot, 85-100mm macro-lens feel.",
    "- Light: one hard forensic spotlight from above, sharp shadows, subtle reflected fill.",
    "- Color: near-black, muted beige, and amber-yellow evidence accents.",
    "- Composition: one symbolic generic object dominates; sparse triangular arrangement, tactile detail, very shallow depth of field.",
    "- Person size: no visible person, face, hands, or human silhouette.",
    "- Negative space: clean dark lower-left quadrant beside the object for the later headline.",
    "- Do not invent case-specific evidence. When facts are unavailable, use generic symbolic material without labels.",
    "- FORBIDDEN: courtroom, crime-scene establishing shot, newspaper collage, detention cell, portrait.",
  ].join("\n"),
  E: [
    "ROLE: NEWSPAPER AND ARCHIVAL DOCUMENTS AS THE MAIN SUBJECT.",
    "- Background: layered abstracted Japanese newspaper sheets, investigation files, maps, and archival photographs with all faces obscured.",
    "- Camera distance: straight-down bird's-eye flat-lay, 50mm editorial-lens feel.",
    "- Light: broad soft overhead light with paper-edge shadows and one narrow red light streak.",
    "- Color: aged off-white paper, ink black, faded sepia, and restrained red markers.",
    "- Composition: bold editorial collage with overlapping diagonals and one dominant archival photograph.",
    "- Person size: no live person; only obscured or cropped archival photo texture.",
    "- Negative space: one clean dark paper block at lower-left for the later headline.",
    "- All printed content must be illegible texture: no readable characters, letters, numbers, labels, or headlines.",
    "- FORBIDDEN: portrait scene, courtroom, crime-scene wide shot, interrogation room, prison corridor.",
  ].join("\n"),
  F: [
    "ROLE: JAPANESE DETENTION CELL OR INTERROGATION ROOM.",
    "- Background: austere Japanese detention cell or interrogation room with concrete walls, frosted glass, metal door, plain table, and institutional practical fixtures.",
    "- Camera distance: medium shot from across the room, 35-50mm observational-lens feel.",
    "- Light: one buzzing overhead fluorescent or desk lamp, strong pool of light surrounded by darkness.",
    "- Color: sickly green-gray, desaturated concrete, and a faint warm tungsten highlight.",
    "- Composition: boxed-in frame-within-a-frame using doorway, glass partition, or cell bars to communicate confinement.",
    "- Person size: one seated anonymous reenactment figure at 20-30% of frame, shown in profile or from behind; never a face-filling portrait.",
    "- Negative space: empty dark wall or tabletop at lower-left for the later headline.",
    "- FORBIDDEN: courtroom, exterior crime scene, evidence macro, newspaper collage, glamorous poster composition.",
  ].join("\n"),
  G: [
    "ROLE: CINEMATIC MOVIE-POSTER KEY ART.",
    "- Background: monumental Japanese architecture or symbolic case location, simplified into premium cinematic layers.",
    "- Camera distance: dramatic low-angle medium-wide shot, 28-35mm anamorphic poster feel.",
    "- Light: strong backlight, volumetric beam, controlled lens bloom, and warm-versus-cool separation.",
    "- Color: cinematic teal and amber with charcoal blacks; polished premium grade.",
    "- Composition: vertical visual hierarchy inside 16:9—large environment, one heroic silhouette, atmospheric depth, deliberate poster balance.",
    "- Person size: one anonymous figure or silhouette at 25-35% of frame, full or three-quarter body; not a close-up.",
    "- Negative space: clean cinematic darkness across the lower-left for the later headline.",
    "- FORBIDDEN: flat evidence desk, newspaper collage, ordinary interrogation-room realism, face-dominant portrait.",
  ].join("\n"),
  H: [
    "ROLE: PSYCHOLOGICAL SUSPENSE.",
    "- Background: abstract Japanese domestic or institutional space fragmented by glass reflections, doorway shadows, blinds, or a long corridor.",
    "- Camera distance: uneasy medium-close or distant voyeuristic viewpoint, 50-85mm compressed-lens feel.",
    "- Light: narrow slashes of light, partial silhouette, reflected highlights, and large areas of near-black.",
    "- Color: deep indigo, blue-black, pale cyan, with one minimal desaturated red accent.",
    "- Composition: deliberately off-balance with obstruction in the foreground, reflection or double-layer imagery, and unresolved visual tension.",
    "- Person size: fragmented profile, silhouette, or reflection occupying 15-30% of frame; identity partially hidden.",
    "- Expression and gaze: unreadable, withdrawn, looking away or obscured—never direct emotional eye contact.",
    "- Negative space: oppressive empty darkness at lower-left for the later headline.",
    "- FORBIDDEN: conventional close-up portrait, symmetrical courtroom, literal evidence desk, newspaper collage, polished heroic movie-poster pose.",
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
    const editMode =
      body.editMode === "person" || body.editMode === "background"
        ? body.editMode
        : null;
    const sourceImage =
      typeof body.sourceImage === "string" ? body.sourceImage : "";
    const factPack = body.factPack
      ? JSON.stringify(body.factPack).slice(0, 14000)
      : "";
    const script =
      typeof body.script === "string" ? body.script.slice(0, 14000) : "";
    const imagePrompt =
      typeof body.imagePrompt === "string" ? body.imagePrompt.trim() : "";

    if (!caseName) {
      return NextResponse.json(
        { error: "事件名を入力してください。" },
        { status: 400 }
      );
    }

    // Ver4ではThumbnail Plannerが最終Promptを完成させる。
    // imagePromptがない旧クライアントのみ、従来のVariation Promptへフォールバックする。
    const fallbackPrompt = [
      "Create a finished 1280x720-style YouTube thumbnail background for a serious Japanese true-crime video.",
      "The image must be 100% text-free: the headline is composited later as HTML, so never render the case name, title, or any words inside the image.",
      "",
      `Case context (for visual reference only — never render as text): ${caseName}`,
      "",
      "VARIATION DIRECTION (highest priority — decides composition, framing, and main focus):",
      VARIATION_DIRECTIONS[variation],
      "DIVERSITY CONTRACT: Render this role literally. Do not drift toward a generic person-in-a-dark-room thumbnail. The result must be instantly distinguishable from the other seven roles by its main subject, setting, camera distance, lighting pattern, palette, silhouette, and composition.",
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
    const finalPrompt = imagePrompt || fallbackPrompt;

    let imageUrl: string;
    if (editMode) {
      const match = sourceImage.match(
        /^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/
      );
      if (!match) {
        return NextResponse.json(
          { error: "編集元画像を読み込めませんでした。" },
          { status: 400 }
        );
      }

      const editInstruction =
        editMode === "person"
          ? [
              "EDIT ONLY THE PERSON.",
              "Keep the background, architecture, props, framing, camera angle, lighting, color grade, and negative space as unchanged as possible.",
              "Regenerate only the human subject as a different anonymous Japanese reenactment person appropriate to the case era.",
            ].join("\n")
          : [
              "EDIT ONLY THE BACKGROUND.",
              "Keep the foreground person, face, identity, expression, pose, clothing, scale, placement, and lighting as unchanged as possible.",
              "Regenerate only the surrounding Japanese background while preserving the same composition.",
            ].join("\n");

      const extension = match[1] === "jpg" ? "jpeg" : match[1];
      const imageFile = await toFile(
        Buffer.from(match[2], "base64"),
        `thumbnail-source.${extension}`,
        { type: `image/${extension}` }
      );
      const response = await openai.images.edit({
        model: IMAGE_MODEL,
        image: imageFile,
        prompt: `${editInstruction}\n\n${finalPrompt}`,
        input_fidelity: "high",
        size: "1536x1024",
        quality: "high",
      });
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error("編集画像データを取得できませんでした。");
      imageUrl = `data:image/png;base64,${b64}`;
    } else {
      // gpt-image-1の横長出力をUI/Exportで1280x720へ中央クロップする。
      imageUrl = await generateSceneImage(
        openai,
        finalPrompt,
        "high",
        "1536x1024"
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("[generate-thumbnail-image] generation failed:", error);
    const raw = error instanceof Error ? error.message : "";
    // 日本語のメッセージは自前のユーザー向け文言。英語はSDK等の技術メッセージなので隠す。
    const isUserFacing = /[\u3040-\u30ff\u4e00-\u9faf]/.test(raw);
    return NextResponse.json(
      {
        error: isUserFacing
          ? raw
          : "サムネ画像の生成に失敗しました。時間をおいて再生成してください。",
      },
      { status: 500 }
    );
  }
}
