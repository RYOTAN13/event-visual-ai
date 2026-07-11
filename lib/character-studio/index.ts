import {
  buildCharacterBiblePrompt,
  CHARACTER_LOCK,
} from "@/lib/prompts/character-prompt";
import type { CharacterBible } from "@/lib/types/character";
import type { ProjectProtagonist } from "@/lib/types/character-studio";
import {
  EMPTY_PROJECT_PROTAGONIST,
  type CharacterStudio,
} from "@/lib/types/character-studio";

export function isProjectProtagonistConfigured(
  protagonist: ProjectProtagonist
): boolean {
  return protagonist.name.trim().length > 0;
}

/** Project Character を Character Bible 形式へ変換（API 互換） */
export function projectProtagonistToCharacterBible(
  protagonist: ProjectProtagonist
): CharacterBible {
  return {
    name: protagonist.name,
    gender: protagonist.gender || "未設定",
    height: "標準",
    physique: protagonist.physique || "標準",
    hairStyle: protagonist.hairStyle || "未設定",
    hairColor: protagonist.hairColor || "未設定",
    skinTone: "自然な肌色",
    faceShape: "自然",
    eyes: protagonist.facialFeatures || "自然",
    nose: "自然",
    mouth: protagonist.expressionTendency || "自然",
    ears: "自然",
    eyebrows: "自然",
    distinguishingFeatures: [
      protagonist.facialFeatures,
      protagonist.occupation ? `職業: ${protagonist.occupation}` : "",
      protagonist.expressionTendency
        ? `表情の傾向: ${protagonist.expressionTendency}`
        : "",
    ]
      .filter(Boolean)
      .join(" / "),
    clothing: protagonist.clothing || "未設定",
    belongings: protagonist.occupation || "なし",
    referenceAge: protagonist.age || "未設定",
  };
}

/** Character Studio が設定されていれば Project Character を、なければ Character Bible を返す */
export function resolveEffectiveCharacterBible(
  protagonist: ProjectProtagonist,
  fallback: CharacterBible | null
): CharacterBible | null {
  if (isProjectProtagonistConfigured(protagonist)) {
    return projectProtagonistToCharacterBible(protagonist);
  }
  return fallback;
}

export function buildProjectProtagonistPrompt(
  protagonist: ProjectProtagonist,
  sceneAge: string
): string {
  return [
    "CHARACTER STUDIO — PROJECT PROTAGONIST LOCK:",
    `氏名 / Name: ${protagonist.name}`,
    `性別 / Gender: ${protagonist.gender || "未設定"}`,
    `基準年齢 / Reference age: ${protagonist.age || "未設定"}`,
    `このシーンの年齢 / Scene age (ONLY this changes): ${sceneAge}`,
    `髪型 / Hair style: ${protagonist.hairStyle || "未設定"}`,
    `髪色 / Hair color: ${protagonist.hairColor || "未設定"}`,
    `服装 / Clothing: ${protagonist.clothing || "未設定"}`,
    `体格 / Physique: ${protagonist.physique || "未設定"}`,
    `顔の特徴 / Facial features: ${protagonist.facialFeatures || "未設定"}`,
    `職業 / Occupation: ${protagonist.occupation || "未設定"}`,
    `表情の傾向 / Expression tendency: ${protagonist.expressionTendency || "未設定"}`,
    "",
    "CHARACTER LOCK:",
    CHARACTER_LOCK,
  ].join("\n");
}

export function buildEffectiveCharacterPrompt(
  protagonist: ProjectProtagonist,
  sceneAge: string,
  fallbackBible: CharacterBible | null,
  fallbackPrompt: string | null
): string | null {
  if (isProjectProtagonistConfigured(protagonist)) {
    return buildProjectProtagonistPrompt(protagonist, sceneAge);
  }

  if (fallbackPrompt?.trim()) {
    return fallbackPrompt;
  }

  const bible = fallbackBible;
  if (!bible) return null;

  return buildCharacterBiblePrompt(bible, sceneAge);
}

export function normalizeCharacterStudio(
  studio: CharacterStudio | undefined | null
): CharacterStudio {
  if (!studio?.protagonist) {
    return { protagonist: { ...EMPTY_PROJECT_PROTAGONIST } };
  }
  return {
    protagonist: {
      ...EMPTY_PROJECT_PROTAGONIST,
      ...studio.protagonist,
    },
  };
}
