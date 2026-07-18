import {
  createDefaultTextSettings,
  normalizeTextSettings,
  type ThumbnailTextSettings,
} from "@/lib/thumbnail-studio/text-settings";

export type ThumbnailVariationId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H";

export const THUMBNAIL_VARIATION_IDS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
] as const satisfies readonly ThumbnailVariationId[];

export type ThumbnailImage = {
  variation: ThumbnailVariationId;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  textSettings: ThumbnailTextSettings;
};

export type ThumbnailStudioState = {
  caseName: string;
  thumbnailText: string;
  images: ThumbnailImage[];
  adoptedVariation: ThumbnailVariationId | null;
};

export function createEmptyThumbnailImages(
  fallbackText = ""
): ThumbnailImage[] {
  return THUMBNAIL_VARIATION_IDS.map((variation) => ({
    variation,
    imageUrl: null,
    loading: false,
    error: null,
    textSettings: createDefaultTextSettings(fallbackText),
  }));
}

export const DEFAULT_THUMBNAIL_STUDIO: ThumbnailStudioState = {
  caseName: "",
  thumbnailText: "",
  images: createEmptyThumbnailImages(),
  adoptedVariation: null,
};

export function normalizeThumbnailStudio(
  value: Partial<ThumbnailStudioState> & {
    textStyle?: unknown;
  } | null | undefined
): ThumbnailStudioState {
  const savedImages = Array.isArray(value?.images) ? value.images : [];
  const fallbackText =
    typeof value?.thumbnailText === "string" ? value.thumbnailText : "";
  const legacyStyle = value?.textStyle;

  const images = THUMBNAIL_VARIATION_IDS.map((variation) => {
    const saved = savedImages.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as ThumbnailImage).variation === variation
    ) as
      | (Partial<ThumbnailImage> & { textSettings?: unknown })
      | undefined;

    return {
      variation,
      imageUrl:
        typeof saved?.imageUrl === "string" || saved?.imageUrl === null
          ? saved.imageUrl
          : null,
      loading: false,
      error: null,
      textSettings: normalizeTextSettings(
        saved?.textSettings ?? legacyStyle,
        fallbackText
      ),
    };
  });

  return {
    caseName: typeof value?.caseName === "string" ? value.caseName : "",
    thumbnailText: fallbackText,
    images,
    adoptedVariation:
      value?.adoptedVariation &&
      THUMBNAIL_VARIATION_IDS.includes(value.adoptedVariation) &&
      images.some(
        (image) =>
          image.variation === value.adoptedVariation && image.imageUrl
      )
        ? value.adoptedVariation
        : null,
  };
}
