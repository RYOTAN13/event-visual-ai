/** Fact Pack のタイムライン項目 */
export type FactPackTimelineEntry = {
  date: string;
  event: string;
};

/** Fact Pack の人物項目 */
export type FactPackPerson = {
  name: string;
  role: string;
};

/** Fact Pack — 事件に関する構造化された事実データ */
export type FactPack = {
  title: string;
  summary: string;
  timeline: FactPackTimelineEntry[];
  people: FactPackPerson[];
  locations: string[];
  evidence: string[];
  investigation: string;
  trial: string;
  importantFacts: string[];
  warnings: string[];
};

export const FACT_PACK_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          event: { type: "string" },
        },
        required: ["date", "event"],
        additionalProperties: false,
      },
    },
    people: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
        },
        required: ["name", "role"],
        additionalProperties: false,
      },
    },
    locations: {
      type: "array",
      items: { type: "string" },
    },
    evidence: {
      type: "array",
      items: { type: "string" },
    },
    investigation: { type: "string" },
    trial: { type: "string" },
    importantFacts: {
      type: "array",
      items: { type: "string" },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "title",
    "summary",
    "timeline",
    "people",
    "locations",
    "evidence",
    "investigation",
    "trial",
    "importantFacts",
    "warnings",
  ],
  additionalProperties: false,
} as const;
