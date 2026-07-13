import type { OpenAI } from "openai";
import { IMAGE_MODEL } from "@/lib/openai/client";

export const IMAGE_SIZE = "1024x1024" as const;
export type ImageQuality = "medium" | "high";

export async function generateSceneImage(
  openai: OpenAI,
  prompt: string,
  quality: ImageQuality = "medium"
): Promise<string> {
  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: IMAGE_SIZE,
    quality,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("画像データの取得に失敗しました。");
  }

  return `data:image/png;base64,${b64}`;
}
