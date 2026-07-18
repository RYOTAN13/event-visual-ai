import {
  getFontStack,
  type ThumbnailTextSettings,
} from "@/lib/thumbnail-studio/text-settings";

export const THUMBNAIL_EXPORT_WIDTH = 1280;
export const THUMBNAIL_EXPORT_HEIGHT = 720;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("背景画像を読み込めませんでした。"));
    image.src = src;
  });
}

function wrapCharacters(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const lines: string[] = [];
  for (const sourceLine of text.split(/\r?\n/)) {
    if (!sourceLine) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const character of Array.from(sourceLine)) {
      const candidate = line + character;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
}

export function drawThumbnailText(
  context: CanvasRenderingContext2D,
  settings: ThumbnailTextSettings,
  width: number,
  height: number
) {
  const text = settings.text;
  if (!text) return;

  const fontSize = settings.fontSize;
  const lineHeightPx = fontSize * settings.lineHeight;
  const maxWidth = (width * settings.maxWidthPercent) / 100;
  const fontStack = getFontStack(settings.fontFamily);
  context.font = `${settings.fontWeight} ${fontSize}px ${fontStack}`;
  context.textAlign = settings.textAlign;
  context.textBaseline = "top";
  context.lineJoin = "round";
  context.miterLimit = 2;

  const lines = wrapCharacters(context, text, maxWidth);
  const blockHeight = lineHeightPx * Math.max(lines.length, 1);
  const blockWidth = Math.min(
    maxWidth,
    Math.max(...lines.map((line) => context.measureText(line).width), 0)
  );

  // xPercent / yPercent はテキストブロック左上を基準に配置
  let left = (width * settings.xPercent) / 100;
  let top = (height * settings.yPercent) / 100;
  left = Math.min(Math.max(0, left), Math.max(0, width - blockWidth));
  top = Math.min(Math.max(0, top), Math.max(0, height - blockHeight));

  const shadowStrength = settings.shadowEnabled ? settings.shadowStrength : 0;
  if (shadowStrength > 0) {
    context.shadowColor = "rgba(0, 0, 0, 0.9)";
    context.shadowBlur = shadowStrength * 1.2;
    context.shadowOffsetX = shadowStrength * 0.35;
    context.shadowOffsetY = shadowStrength * 0.4;
  } else {
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  }

  lines.forEach((line, index) => {
    const y = top + lineHeightPx * index;
    const x =
      settings.textAlign === "left"
        ? left
        : settings.textAlign === "right"
          ? left + blockWidth
          : left + blockWidth / 2;

    if (settings.strokeWidth > 0) {
      context.strokeStyle = settings.strokeColor;
      context.lineWidth = settings.strokeWidth * 2;
      context.strokeText(line, x, y);
    }
    context.fillStyle = settings.color;
    context.fillText(line, x, y);
  });
}

export async function renderThumbnailToDataUrl(
  imageUrl: string,
  settings: ThumbnailTextSettings,
  format: "png" | "jpg" = "png"
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_EXPORT_WIDTH;
  canvas.height = THUMBNAIL_EXPORT_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvasを初期化できませんでした。");

  const image = await loadImage(imageUrl);
  drawCoverImage(
    context,
    image,
    THUMBNAIL_EXPORT_WIDTH,
    THUMBNAIL_EXPORT_HEIGHT
  );
  drawThumbnailText(
    context,
    settings,
    THUMBNAIL_EXPORT_WIDTH,
    THUMBNAIL_EXPORT_HEIGHT
  );

  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(mimeType, format === "jpg" ? 0.92 : 1);
}

export async function downloadRenderedThumbnail(
  imageUrl: string,
  settings: ThumbnailTextSettings,
  filename: string
) {
  try {
    const href = await renderThumbnailToDataUrl(imageUrl, settings, "png");
    const link = document.createElement("a");
    link.href = href;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("[ThumbnailRenderer] download failed:", error);
    throw new Error("画像のダウンロードに失敗しました。");
  }
}

export function sanitizeThumbnailFilename(caseName: string): string {
  return (
    caseName
      .trim()
      .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "case"
  );
}
