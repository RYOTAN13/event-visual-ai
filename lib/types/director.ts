export type CameraDirector = {
  sceneNumber: string;
  shotType: string;
  cameraHeight: string;
  lens: string;
  distance: string;
  framing: string;
  composition: string;
  focus: string;
  depthOfField: string;
  lightingDirection: string;
  perspective: string;
  cutRationale: string;
};

export type CinematicDirection = {
  colorPalette: string;
  lightingStyle: string;
  filmStock: string;
  cameraLanguage: string;
  lensLanguage: string;
  mood: string;
  contrast: string;
  highlight: string;
  shadow: string;
  grain: string;
  cameraMovement: string;
  compositionRules: string;
  aspectRatio: string;
  depthOfField: string;
  directorNotes: string;
};

export type QualityCheckItem = {
  item: string;
  passed: boolean;
  correction: string;
};

export type MasterReviewScene = {
  sceneNumber: string;
  checklist: QualityCheckItem[];
  visualDirectorScenePrompt: string;
};

export type MasterDirectionResult = {
  masterDirectorPrompt: string;
  unifiedColorGrade: string;
  unifiedAtmosphere: string;
  unifiedTension: string;
  scenes: MasterReviewScene[];
};

export type SceneDirectionMeta = {
  sceneNumber: string;
  cameraAngle: string;
  lens: string;
  shotSize: string;
  focus: string;
  cameraMovement: string;
  lighting: string;
  framingSignature: string;
  visualDirectorPrompt: string;
};
