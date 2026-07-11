export type CharacterBible = {
  name: string;
  gender: string;
  height: string;
  physique: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  faceShape: string;
  eyes: string;
  nose: string;
  mouth: string;
  ears: string;
  eyebrows: string;
  distinguishingFeatures: string;
  clothing: string;
  belongings: string;
  referenceAge: string;
};

/** @deprecated Use CharacterBible */
export type ProtagonistSettings = CharacterBible & {
  age?: string;
  face?: string;
  occupation?: string;
};
