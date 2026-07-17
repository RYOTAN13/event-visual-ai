import type { ThumbnailTextStyle } from "@/lib/types/thumbnail-studio";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("背景画像を読み込めませんでした。"));
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

export async function downloadThumbnail(
  imageUrl: string,
  text: string,
  style: ThumbnailTextStyle,
  format: "png" | "jpg",
  filename: string
) {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvasを初期化できませんでした。");

  const image = await loadImage(imageUrl);
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

  const fontSize = style.fontSize;
  const lineHeight = fontSize * 1.08;
  const margin = 52;
  context.font = `900 ${fontSize}px "Noto Sans JP", "Arial Black", sans-serif`;
  context.lineJoin = "round";
  context.textAlign = style.horizontalAlign;

  // UIオーバーレイ（max-width: 45%・最大3行）と同じ折り返しに合わせる
  const lines = wrapCharacters(context, text, width * 0.45).slice(0, 3);
  const blockHeight = lineHeight * lines.length;
  const x =
    style.horizontalAlign === "left"
      ? margin
      : style.horizontalAlign === "right"
        ? width - margin
        : width / 2;
  const firstY =
    style.verticalAlign === "top"
      ? margin
      : style.verticalAlign === "bottom"
        ? height - margin - blockHeight
        : (height - blockHeight) / 2;

  if (style.shadow) {
    context.shadowColor = "rgba(0, 0, 0, 0.9)";
    context.shadowBlur = 20;
    context.shadowOffsetX = 7;
    context.shadowOffsetY = 8;
  }

  lines.forEach((line, index) => {
    const y = firstY + lineHeight * (index + 0.82);
    if (style.outlineWidth > 0) {
      context.strokeStyle = style.outlineColor;
      context.lineWidth = style.outlineWidth * 2;
      context.strokeText(line, x, y);
    }
    context.fillStyle = style.color;
    context.fillText(line, x, y);
  });

  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const extension = format === "png" ? "png" : "jpg";
  const link = document.createElement("a");
  link.href = canvas.toDataURL(mimeType, format === "jpg" ? 0.92 : 1);
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
