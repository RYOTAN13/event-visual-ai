import type { ThumbnailTextSettings } from "@/lib/thumbnail-studio/text-settings";
import { downloadRenderedThumbnail } from "@/lib/thumbnail-studio/thumbnail-renderer";

/** @deprecated Prefer downloadRenderedThumbnail from thumbnail-renderer. */
export async function downloadThumbnail(
  imageUrl: string,
  text: string,
  style: Partial<ThumbnailTextSettings> & {
    outlineColor?: string;
    outlineWidth?: number;
    shadow?: boolean;
    horizontalAlign?: "left" | "center" | "right";
    fontFamily?: ThumbnailTextSettings["fontFamily"] | string;
  },
  _format: "png" | "jpg",
  filename: string
) {
  const settings: ThumbnailTextSettings = {
    text,
    fontFamily:
      style.fontFamily === "gothic-bold" ||
      style.fontFamily === "mincho-bold" ||
      style.fontFamily === "kakugo-extra" ||
      style.fontFamily === "rounded" ||
      style.fontFamily === "system"
        ? style.fontFamily
        : "gothic-bold",
    fontSize: style.fontSize ?? 96,
    color: style.color ?? "#ffffff",
    strokeColor: style.strokeColor ?? style.outlineColor ?? "#000000",
    strokeWidth: style.strokeWidth ?? style.outlineWidth ?? 8,
    shadowEnabled: style.shadowEnabled ?? style.shadow ?? true,
    shadowStrength: style.shadowStrength ?? 14,
    xPercent: style.xPercent ?? 8,
    yPercent: style.yPercent ?? 72,
    lineHeight: style.lineHeight ?? 1.1,
    textAlign: style.textAlign ?? style.horizontalAlign ?? "left",
    fontWeight: style.fontWeight ?? 900,
    maxWidthPercent: style.maxWidthPercent ?? 45,
  };
  await downloadRenderedThumbnail(imageUrl, settings, filename);
}
