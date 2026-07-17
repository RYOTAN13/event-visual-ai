export const THUMBNAIL_MOODS = [
  "冤罪",
  "恐怖",
  "未解決",
  "怒り",
  "悲劇",
  "衝撃",
  "法廷",
  "捜査",
  "真相",
] as const;

export type ThumbnailMood = (typeof THUMBNAIL_MOODS)[number];
export type ThumbnailHorizontalAlign = "left" | "center" | "right";
export type ThumbnailVerticalAlign = "top" | "center" | "bottom";

export const THUMBNAIL_VARIATION_IDS = ["A", "B", "C", "D"] as const;
export type ThumbnailVariationId = (typeof THUMBNAIL_VARIATION_IDS)[number];

export const THUMBNAIL_VARIATION_LABELS: Record<ThumbnailVariationId, string> =
  {
    A: "A 王道",
    B: "B ドキュメンタリー",
    C: "C 捜査・衝撃",
    D: "D ミステリー",
  };

export type ThumbnailTextStyle = {
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  horizontalAlign: ThumbnailHorizontalAlign;
  verticalAlign: ThumbnailVerticalAlign;
};

export type ThumbnailImage = {
  variation: ThumbnailVariationId;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
};

export type ThumbnailStudioState = {
  caseName: string;
  videoTitle: string;
  thumbnailText: string;
  person: string;
  background: string;
  additionalInstruction: string;
  moods: ThumbnailMood[];
  images: ThumbnailImage[];
  adoptedVariation: ThumbnailVariationId | null;
  textStyle: ThumbnailTextStyle;
};

export const DEFAULT_THUMBNAIL_TEXT_STYLE: ThumbnailTextStyle = {
  fontSize: 96,
  color: "#ffffff",
  outlineColor: "#000000",
  outlineWidth: 10,
  shadow: true,
  horizontalAlign: "left",
  verticalAlign: "bottom",
};

export function createEmptyThumbnailImages(): ThumbnailImage[] {
  return THUMBNAIL_VARIATION_IDS.map((variation) => ({
    variation,
    imageUrl: null,
    loading: false,
    error: null,
  }));
}

export const DEFAULT_THUMBNAIL_STUDIO: ThumbnailStudioState = {
  caseName: "",
  videoTitle: "",
  thumbnailText: "",
  person: "",
  background: "",
  additionalInstruction: "",
  moods: [],
  images: createEmptyThumbnailImages(),
  adoptedVariation: null,
  textStyle: DEFAULT_THUMBNAIL_TEXT_STYLE,
};

export function normalizeThumbnailStudio(
  value: Partial<ThumbnailStudioState> | null | undefined
): ThumbnailStudioState {
  const savedImages = Array.isArray(value?.images) ? value.images : [];
  const images = THUMBNAIL_VARIATION_IDS.map((variation) => {
    const saved = savedImages.find((item) => item?.variation === variation);
    return {
      variation,
      imageUrl: saved?.imageUrl ?? null,
      loading: false,
      error: null,
    };
  });

  return {
    caseName: typeof value?.caseName === "string" ? value.caseName : "",
    videoTitle: typeof value?.videoTitle === "string" ? value.videoTitle : "",
    thumbnailText:
      typeof value?.thumbnailText === "string" ? value.thumbnailText : "",
    person: typeof value?.person === "string" ? value.person : "",
    background: typeof value?.background === "string" ? value.background : "",
    additionalInstruction:
      typeof value?.additionalInstruction === "string"
        ? value.additionalInstruction
        : "",
    moods: Array.isArray(value?.moods)
      ? value.moods.filter((mood): mood is ThumbnailMood =>
          (THUMBNAIL_MOODS as readonly string[]).includes(mood as string)
        )
      : [],
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
    textStyle: {
      ...DEFAULT_THUMBNAIL_TEXT_STYLE,
      ...value?.textStyle,
    },
  };
}
