import type { ThumbnailVariationId } from "@/lib/types/thumbnail-studio";

export type PipelineSeed = {
  caseName: string;
  thumbnailText: string;
  factPack: string;
  script: string;
};

export type EventAnalysis = {
  caseType: string;
  keywords: string[];
  timeline: string[];
  people: string[];
  emotion: string[];
  mystery: string[];
  symbolObjects: string[];
  locations: string[];
  era: string;
  essence: string;
  sensitivities: string[];
  forbiddenClaims: string[];
};

export type AudienceInterest = {
  point: string;
  importance: number;
  reason: string;
};

export type AudienceAnalysis = {
  targetViewer: string;
  hookCandidates: AudienceInterest[];
  strongestInterest: string;
  curiosityGap: string;
  emotionalTrigger: string;
};

export type HookCandidate = {
  copy: string;
  emotionalTheme: string;
  clickPoint: string;
};

export type HookPlan = {
  candidates: HookCandidate[];
  ngWords: string[];
  userCopy: string | null;
};

export type HookScoreItem = {
  copy: string;
  ctr: number;
  curiosity: number;
  emotion: number;
  readability: number;
  spoilerRisk: number;
  caseFit: number;
  total: number;
  reason: string;
};

export type HookScoreResult = {
  adoptedCopy: string;
  emotionalTheme: string;
  clickPoint: string;
  ngWords: string[];
  scores: HookScoreItem[];
  selectionReason: string;
};

export type VariationComposition = {
  variation: ThumbnailVariationId;
  role: string;
  person: string;
  background: string;
  negativeSpace: string;
  textPosition: string;
  gaze: string;
  lighting: string;
  color: string;
  composition: string;
  cameraDistance: string;
  personSize: string;
};

export type CompositionPlan = {
  sharedDirection: string;
  variations: VariationComposition[];
};

export type ThumbnailPromptPlan = {
  prompts: Record<ThumbnailVariationId, string>;
};

export type ThumbnailDirectorResult = {
  event: EventAnalysis;
  audience: AudienceAnalysis;
  hooks: HookPlan;
  scoredHook: HookScoreResult;
  composition: CompositionPlan;
  thumbnail: ThumbnailPromptPlan;
};

function isString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return result.length > 0 ? result : null;
}

export function parseEventAnalysis(value: unknown): EventAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = [
    "keywords",
    "timeline",
    "people",
    "emotion",
    "mystery",
    "symbolObjects",
    "locations",
    "sensitivities",
    "forbiddenClaims",
  ] as const;
  const arrays = Object.fromEntries(
    keys.map((key) => [key, stringArray(record[key])])
  ) as Record<(typeof keys)[number], string[] | null>;
  if (
    !isString(record.caseType) ||
    !isString(record.era) ||
    !isString(record.essence) ||
    keys.some((key) => !arrays[key])
  ) {
    return null;
  }
  return {
    caseType: record.caseType.trim(),
    era: record.era.trim(),
    essence: record.essence.trim(),
    keywords: arrays.keywords!,
    timeline: arrays.timeline!,
    people: arrays.people!,
    emotion: arrays.emotion!,
    mystery: arrays.mystery!,
    symbolObjects: arrays.symbolObjects!,
    locations: arrays.locations!,
    sensitivities: arrays.sensitivities!,
    forbiddenClaims: arrays.forbiddenClaims!,
  };
}

export function parseAudienceAnalysis(value: unknown): AudienceAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    !isString(record.targetViewer) ||
    !isString(record.strongestInterest) ||
    !isString(record.curiosityGap) ||
    !isString(record.emotionalTrigger) ||
    !Array.isArray(record.hookCandidates)
  ) {
    return null;
  }
  const hookCandidates: AudienceInterest[] = [];
  for (const item of record.hookCandidates) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    if (
      !isString(candidate.point) ||
      typeof candidate.importance !== "number" ||
      !isString(candidate.reason)
    ) {
      return null;
    }
    hookCandidates.push({
      point: candidate.point.trim(),
      importance: candidate.importance,
      reason: candidate.reason.trim(),
    });
  }
  if (hookCandidates.length === 0) return null;
  return {
    targetViewer: record.targetViewer.trim(),
    hookCandidates,
    strongestInterest: record.strongestInterest.trim(),
    curiosityGap: record.curiosityGap.trim(),
    emotionalTrigger: record.emotionalTrigger.trim(),
  };
}

export function parseHookPlan(value: unknown): HookPlan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.candidates)) return null;
  const candidates: HookCandidate[] = [];
  for (const item of record.candidates) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    if (
      !isString(candidate.copy) ||
      !isString(candidate.emotionalTheme) ||
      !isString(candidate.clickPoint)
    ) {
      return null;
    }
    candidates.push({
      copy: candidate.copy.trim(),
      emotionalTheme: candidate.emotionalTheme.trim(),
      clickPoint: candidate.clickPoint.trim(),
    });
  }
  const ngWords = stringArray(record.ngWords);
  const userCopy =
    record.userCopy === null
      ? null
      : isString(record.userCopy)
        ? record.userCopy.trim()
        : undefined;
  if (candidates.length === 0 || !ngWords || userCopy === undefined) return null;
  return { candidates, ngWords, userCopy };
}

export function parseHookScoreResult(value: unknown): HookScoreResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    !isString(record.adoptedCopy) ||
    !isString(record.emotionalTheme) ||
    !isString(record.clickPoint) ||
    !isString(record.selectionReason) ||
    !Array.isArray(record.scores)
  ) {
    return null;
  }
  const ngWords = stringArray(record.ngWords);
  if (!ngWords) return null;
  const scores: HookScoreItem[] = [];
  for (const item of record.scores) {
    if (!item || typeof item !== "object") return null;
    const score = item as Record<string, unknown>;
    const numericKeys = [
      "ctr",
      "curiosity",
      "emotion",
      "readability",
      "spoilerRisk",
      "caseFit",
      "total",
    ] as const;
    if (
      !isString(score.copy) ||
      !isString(score.reason) ||
      numericKeys.some((key) => typeof score[key] !== "number")
    ) {
      return null;
    }
    scores.push({
      copy: score.copy.trim(),
      ctr: score.ctr as number,
      curiosity: score.curiosity as number,
      emotion: score.emotion as number,
      readability: score.readability as number,
      spoilerRisk: score.spoilerRisk as number,
      caseFit: score.caseFit as number,
      total: score.total as number,
      reason: score.reason.trim(),
    });
  }
  if (scores.length === 0) return null;
  return {
    adoptedCopy: record.adoptedCopy.trim(),
    emotionalTheme: record.emotionalTheme.trim(),
    clickPoint: record.clickPoint.trim(),
    ngWords,
    scores,
    selectionReason: record.selectionReason.trim(),
  };
}

const VARIATIONS: ThumbnailVariationId[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
];

export function parseCompositionPlan(value: unknown): CompositionPlan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isString(record.sharedDirection) || !Array.isArray(record.variations)) {
    return null;
  }
  const variations: VariationComposition[] = [];
  const stringKeys = [
    "role",
    "person",
    "background",
    "negativeSpace",
    "textPosition",
    "gaze",
    "lighting",
    "color",
    "composition",
    "cameraDistance",
    "personSize",
  ] as const;
  for (const item of record.variations) {
    if (!item || typeof item !== "object") return null;
    const variation = item as Record<string, unknown>;
    if (
      !VARIATIONS.includes(variation.variation as ThumbnailVariationId) ||
      stringKeys.some((key) => !isString(variation[key]))
    ) {
      return null;
    }
    variations.push({
      variation: variation.variation as ThumbnailVariationId,
      role: (variation.role as string).trim(),
      person: (variation.person as string).trim(),
      background: (variation.background as string).trim(),
      negativeSpace: (variation.negativeSpace as string).trim(),
      textPosition: (variation.textPosition as string).trim(),
      gaze: (variation.gaze as string).trim(),
      lighting: (variation.lighting as string).trim(),
      color: (variation.color as string).trim(),
      composition: (variation.composition as string).trim(),
      cameraDistance: (variation.cameraDistance as string).trim(),
      personSize: (variation.personSize as string).trim(),
    });
  }
  if (
    variations.length !== VARIATIONS.length ||
    VARIATIONS.some(
      (id) =>
        variations.filter((variation) => variation.variation === id).length !== 1
    )
  ) {
    return null;
  }
  return { sharedDirection: record.sharedDirection.trim(), variations };
}

export function parseThumbnailPromptPlan(
  value: unknown
): ThumbnailPromptPlan | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const promptsValue = record.prompts;
  if (!promptsValue || typeof promptsValue !== "object") return null;
  const promptsRecord = promptsValue as Record<string, unknown>;
  if (VARIATIONS.some((id) => !isString(promptsRecord[id]))) return null;
  return {
    prompts: Object.fromEntries(
      VARIATIONS.map((id) => [id, (promptsRecord[id] as string).trim()])
    ) as Record<ThumbnailVariationId, string>,
  };
}

