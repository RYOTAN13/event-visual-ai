export type ThumbnailTextAlign = "left" | "center" | "right";

export type ThumbnailFontId =
  | "gothic-bold"
  | "mincho-bold"
  | "kakugo-extra"
  | "rounded"
  | "system";

export type ThumbnailTextSettings = {
  text: string;
  fontFamily: ThumbnailFontId;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowStrength: number;
  xPercent: number;
  yPercent: number;
  lineHeight: number;
  textAlign: ThumbnailTextAlign;
  fontWeight: number;
  maxWidthPercent: number;
};

export const THUMBNAIL_FONT_OPTIONS: Array<{
  value: ThumbnailFontId;
  label: string;
  stack: string;
}> = [
  {
    value: "gothic-bold",
    label: "ゴシック太字",
    stack:
      '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif',
  },
  {
    value: "mincho-bold",
    label: "明朝太字",
    stack:
      '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "MS PMincho", serif',
  },
  {
    value: "kakugo-extra",
    label: "角ゴシック極太",
    stack:
      '"Arial Black", "Helvetica Neue", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
  },
  {
    value: "rounded",
    label: "丸ゴシック",
    stack:
      '"Hiragino Maru Gothic ProN", "M PLUS Rounded 1c", "Yu Gothic", Meiryo, sans-serif',
  },
  {
    value: "system",
    label: "システムフォント",
    stack:
      'system-ui, -apple-system, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
  },
];

export const COLOR_PRESETS = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#000000" },
  { label: "赤", value: "#ef4444" },
  { label: "黄", value: "#facc15" },
  { label: "オレンジ", value: "#f97316" },
] as const;

export const DEFAULT_THUMBNAIL_TEXT_SETTINGS: ThumbnailTextSettings = {
  text: "",
  fontFamily: "gothic-bold",
  fontSize: 96,
  color: "#ffffff",
  strokeColor: "#000000",
  strokeWidth: 8,
  shadowEnabled: true,
  shadowStrength: 14,
  xPercent: 8,
  yPercent: 72,
  lineHeight: 1.1,
  textAlign: "left",
  fontWeight: 900,
  maxWidthPercent: 45,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asFontId(value: unknown): ThumbnailFontId {
  if (
    value === "gothic-bold" ||
    value === "mincho-bold" ||
    value === "kakugo-extra" ||
    value === "rounded" ||
    value === "system"
  ) {
    return value;
  }
  // 旧フォントIDからの移行
  if (value === "gothic" || value === "impact") return "gothic-bold";
  if (value === "mincho") return "mincho-bold";
  return DEFAULT_THUMBNAIL_TEXT_SETTINGS.fontFamily;
}

export function getFontStack(fontFamily: ThumbnailFontId): string {
  return (
    THUMBNAIL_FONT_OPTIONS.find((option) => option.value === fontFamily)
      ?.stack ?? THUMBNAIL_FONT_OPTIONS[0].stack
  );
}

export function createDefaultTextSettings(
  text = ""
): ThumbnailTextSettings {
  return {
    ...DEFAULT_THUMBNAIL_TEXT_SETTINGS,
    text,
  };
}

/**
 * 旧 textStyle / thumbnailText 形式からも補完する。
 */
export function normalizeTextSettings(
  value: unknown,
  fallbackText = ""
): ThumbnailTextSettings {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  // 旧 ThumbnailTextStyle 互換
  const legacyOutline =
    typeof record.outlineColor === "string" ? record.outlineColor : undefined;
  const legacyOutlineWidth =
    typeof record.outlineWidth === "number" ? record.outlineWidth : undefined;
  const legacyShadow =
    typeof record.shadow === "boolean" ? record.shadow : undefined;
  const legacyAlign =
    record.horizontalAlign === "left" ||
    record.horizontalAlign === "center" ||
    record.horizontalAlign === "right"
      ? record.horizontalAlign
      : undefined;
  const legacyVertical =
    record.verticalAlign === "top" ||
    record.verticalAlign === "center" ||
    record.verticalAlign === "bottom"
      ? record.verticalAlign
      : undefined;

  const yFromLegacy =
    legacyVertical === "top"
      ? 8
      : legacyVertical === "center"
        ? 42
        : DEFAULT_THUMBNAIL_TEXT_SETTINGS.yPercent;

  return {
    text: asString(record.text, fallbackText),
    fontFamily: asFontId(record.fontFamily),
    fontSize: clamp(asNumber(record.fontSize, DEFAULT_THUMBNAIL_TEXT_SETTINGS.fontSize), 24, 160),
    color: asString(record.color, DEFAULT_THUMBNAIL_TEXT_SETTINGS.color),
    strokeColor: asString(
      record.strokeColor ?? legacyOutline,
      DEFAULT_THUMBNAIL_TEXT_SETTINGS.strokeColor
    ),
    strokeWidth: clamp(
      asNumber(
        record.strokeWidth ?? legacyOutlineWidth,
        DEFAULT_THUMBNAIL_TEXT_SETTINGS.strokeWidth
      ),
      0,
      16
    ),
    shadowEnabled:
      typeof record.shadowEnabled === "boolean"
        ? record.shadowEnabled
        : typeof legacyShadow === "boolean"
          ? legacyShadow
          : DEFAULT_THUMBNAIL_TEXT_SETTINGS.shadowEnabled,
    shadowStrength: clamp(
      asNumber(record.shadowStrength, DEFAULT_THUMBNAIL_TEXT_SETTINGS.shadowStrength),
      0,
      30
    ),
    xPercent: clamp(
      asNumber(record.xPercent, DEFAULT_THUMBNAIL_TEXT_SETTINGS.xPercent),
      0,
      100
    ),
    yPercent: clamp(asNumber(record.yPercent, yFromLegacy), 0, 100),
    lineHeight: clamp(
      asNumber(record.lineHeight, DEFAULT_THUMBNAIL_TEXT_SETTINGS.lineHeight),
      0.7,
      1.8
    ),
    textAlign:
      record.textAlign === "left" ||
      record.textAlign === "center" ||
      record.textAlign === "right"
        ? record.textAlign
        : legacyAlign ?? DEFAULT_THUMBNAIL_TEXT_SETTINGS.textAlign,
    fontWeight: clamp(
      asNumber(record.fontWeight, DEFAULT_THUMBNAIL_TEXT_SETTINGS.fontWeight),
      400,
      900
    ),
    maxWidthPercent: clamp(
      asNumber(
        record.maxWidthPercent,
        DEFAULT_THUMBNAIL_TEXT_SETTINGS.maxWidthPercent
      ),
      20,
      90
    ),
  };
}

export function clampTextPosition(
  xPercent: number,
  yPercent: number
): { xPercent: number; yPercent: number } {
  return {
    xPercent: clamp(xPercent, 0, 100),
    yPercent: clamp(yPercent, 0, 100),
  };
}
