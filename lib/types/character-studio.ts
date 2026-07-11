/** Character Studio — プロジェクト単位の主人公設定 */
export type ProjectProtagonist = {
  name: string;
  age: string;
  gender: string;
  hairStyle: string;
  hairColor: string;
  clothing: string;
  physique: string;
  facialFeatures: string;
  occupation: string;
  expressionTendency: string;
};

export type CharacterStudio = {
  protagonist: ProjectProtagonist;
};

export const EMPTY_PROJECT_PROTAGONIST: ProjectProtagonist = {
  name: "",
  age: "",
  gender: "",
  hairStyle: "",
  hairColor: "",
  clothing: "",
  physique: "",
  facialFeatures: "",
  occupation: "",
  expressionTendency: "",
};

export const DEFAULT_CHARACTER_STUDIO: CharacterStudio = {
  protagonist: { ...EMPTY_PROJECT_PROTAGONIST },
};
