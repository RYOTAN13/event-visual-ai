export const THUMBNAIL_COMPOSITION_STYLES = [
  "人物アップ",
  "人物＋事件現場",
  "人物＋法廷",
  "人物＋証拠品",
  "事件現場のみ",
  "シルエット＋事件現場",
  "新聞・資料風",
] as const;

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

export type ThumbnailCompositionStyle =
  (typeof THUMBNAIL_COMPOSITION_STYLES)[number];
export type ThumbnailMood = (typeof THUMBNAIL_MOODS)[number];
export type ThumbnailHorizontalAlign = "left" | "center" | "right";
export type ThumbnailVerticalAlign = "top" | "center" | "bottom";

export type ThumbnailTextStyle = {
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  horizontalAlign: ThumbnailHorizontalAlign;
  verticalAlign: ThumbnailVerticalAlign;
};

export type ThumbnailConcept = {
  id: string;
  catchCopy: string;
  composition: string;
  subjectDescription: string;
  backgroundDescription: string;
  colorDirection: string;
  emotion: string;
  ctrReason: string;
  imagePrompt: string;
  imageUrl: string | null;
  imageLoading: boolean;
  imageError: string | null;
};

export type ThumbnailStudioState = {
  caseName: string;
  videoTitle: string;
  thumbnailText: string;
  person: string;
  background: string;
  additionalInstruction: string;
  compositionStyle: ThumbnailCompositionStyle;
  moods: ThumbnailMood[];
  concepts: ThumbnailConcept[];
  selectedConceptId: string | null;
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

export const DEFAULT_THUMBNAIL_STUDIO: ThumbnailStudioState = {
  caseName: "",
  videoTitle: "",
  thumbnailText: "",
  person: "",
  background: "",
  additionalInstruction: "",
  compositionStyle: "人物＋事件現場",
  moods: [],
  concepts: [],
  selectedConceptId: null,
  textStyle: DEFAULT_THUMBNAIL_TEXT_STYLE,
};

export function normalizeThumbnailStudio(
  value: Partial<ThumbnailStudioState> | null | undefined
): ThumbnailStudioState {
  const concepts = Array.isArray(value?.concepts)
    ? value.concepts.map((concept, index) => ({
        ...concept,
        id: concept.id || `thumbnail-${index + 1}`,
        imageUrl: concept.imageUrl ?? null,
        imageLoading: false,
        imageError: null,
      }))
    : [];

  return {
    ...DEFAULT_THUMBNAIL_STUDIO,
    ...value,
    moods: Array.isArray(value?.moods) ? value.moods : [],
    concepts,
    selectedConceptId:
      value?.selectedConceptId &&
      concepts.some((concept) => concept.id === value.selectedConceptId)
        ? value.selectedConceptId
        : null,
    textStyle: {
      ...DEFAULT_THUMBNAIL_TEXT_STYLE,
      ...value?.textStyle,
    },
  };
}
