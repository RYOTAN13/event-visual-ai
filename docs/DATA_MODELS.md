# Event Visual AI データモデル設計（Ver2）

本ドキュメントは Ver2 向けの **目標データ構造** を定義します。  
現在の `lib/types.ts` との対応関係も併記します。

---

## 共通型

```typescript
/** 生成・処理の状態 */
export type ProcessingStatus =
  | "idle"
  | "pending"
  | "generating"
  | "ready"
  | "error";

/** Scene 数の選択肢 */
export type SceneCount = 5 | 10 | 20;

/** ユニーク ID（Ver2 で導入） */
export type EntityId = string;
```

---

## ProjectSettings

```typescript
export type CinematicStylePreset =
  | "Netflix Documentary"
  | "BBC Documentary"
  | "NHK Special"
  | "David Fincher"
  | "Denis Villeneuve"
  | "Christopher Nolan"
  | "True Detective Season1"
  | "Mindhunter"
  | "Chernobyl"
  | "Seven";

export type ProjectSettings = {
  sceneCount: SceneCount;                    // 現在: sceneCount state（デフォルト 5）
  cinematicStyle: CinematicStylePreset;      // 現在: cinematicStyle state
  imageSize: "1024x1024";                     // 現在: 固定
  imageQuality: "high";                       // 現在: 固定
  language: "ja";                             // ナレーション言語
};
```

---

## SourceReference（Ver2 新規）

```typescript
export type SourceReferenceType = "url" | "text" | "note";

export type SourceReference = {
  id: EntityId;
  type: SourceReferenceType;
  title: string;
  content: string;          // URL または本文テキスト
  addedAt: string;          // ISO 8601
};
```

---

## FactPack（Ver2 新規）

```typescript
export type FactPackPerson = {
  name: string;
  role: string;             // 事件における立場
  description: string;
  sourceIds: EntityId[];    // 根拠となる SourceReference.id
};

export type FactPackTimelineEvent = {
  date: string;
  event: string;
  significance: string;
  sourceIds: EntityId[];
  certainty: "confirmed" | "reported" | "disputed" | "unknown";
};

export type FactPack = {
  id: EntityId;
  caseName: string;
  summary: string;          // 事件概要（200〜400 文字）
  keyQuestions: string[];   // 未解決の論点
  persons: FactPackPerson[];
  timeline: FactPackTimelineEvent[];
  evidence: string[];       // 主要証拠・資料
  legalOutcomes: string[];  // 判決・裁判結果
  uncertainties: string[];  // 不確実な情報（推測と明示）
  sources: SourceReference[];
  generatedAt: string;
  status: ProcessingStatus;
  error?: string;
};
```

---

## Script

```typescript
export type Script = {
  id: EntityId;
  caseName: string;
  title: string;
  /** 生成された台本本文 */
  content: string;
  /** ユーザー編集後の台本。存在する場合は content より優先 */
  editedContent: string | null;
  characterCount: number;
  /** Fact Pack を根拠に生成した場合 */
  factPackId: EntityId | null;
  status: ProcessingStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

/** 実際に Scene 生成に使う台本テキスト */
export function getActiveScriptContent(script: Script): string {
  return (script.editedContent ?? script.content).trim();
}
```

**現在の対応:** `scriptTitle`, `script`, `editedScript`, `scriptCharCount`, `scriptStatus`（React state）

---

## CharacterBible

```typescript
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
  referenceAge: string;     // Scene 001 時点の基準年齢
};
```

**現在の対応:** `lib/character-bible.ts` — 変更なし

---

## Scene

```typescript
export type SceneStatus =
  | "draft"           // Scene 分解直後
  | "prompt_ready"    // Director チェーン完了
  | "image_generating"
  | "image_ready"
  | "error";

export type Scene = {
  id: EntityId;
  sceneNumber: string;          // "Scene 001" 形式

  /** 台本から抜き出したナレーション（短縮可、意味は変えない） */
  narration: string;

  /** 台本のどの部分を画像化したか */
  sceneSourceText: string;

  /** 日本語での画像内容説明（台本に忠実） */
  imageDescription: string;

  /** その画像が動画内で何を表すか */
  visualPurpose: string;

  /** 視聴者に与える感情 */
  emotion: string;

  /** この Scene に登場する人物名 */
  characters: string[];         // 現在: charactersInScene

  /** この Scene 時点での主人公年齢 */
  sceneAge: string;

  /** Scene 分解時の簡易英語 Prompt */
  gptImagePrompt: string;

  /** Visual Director 出力（Scene 単位の cinematography Prompt） */
  visualPrompt: string | null;  // 現在: visualDirectorScenePrompt

  /** Master Director 完成後の最終画像 Prompt */
  finalImagePrompt: string | null;  // 現在: visualDirectorPrompt

  /** 採用中のメイン画像 */
  mainImage: GeneratedImage | null;  // 現在: imageUrl

  /** 4案バリエーション */
  variations: ImageVariation[];

  /** ユーザーからの追加指示（再生成用） */
  additionalInstruction: string;

  status: SceneStatus;
  error: string | null;

  // --- Director 中間データ（内部保持、UI 非表示） ---
  cameraDirector: CameraDirection | null;
  cameraDirectorPrompt: string | null;
  visualDirectorError: string | null;
};

/** 現在の lib/types.ts Scene とのマッピング */
export type LegacySceneFields = {
  charactersInScene: string[];  // → characters
  gptImagePrompt?: string;      // → gptImagePrompt（Ver2 で必須化）
  visualPurpose?: string;       // → visualPurpose（Ver2 で必須化）
  emotion?: string;             // → emotion（Ver2 で必須化）
  sceneSourceText?: string;       // → sceneSourceText（Ver2 で必須化）
};
```

---

## VisualDirection

```typescript
export type VisualDirection = {
  sceneNumber: string;
  cameraAngle: string;
  lens: string;
  shotSize: string;
  focus: string;
  cameraMovement: string;
  lighting: string;
  framingSignature: string;
  visualDirectorScenePrompt: string;  // 1200 文字以上の cinematography Prompt
};
```

**現在の対応:** `lib/visual-director.ts` の `SceneDirectionMeta` / `VisualDirectionScene`

---

## CameraDirection

```typescript
export type ShotType =
  | "Extreme Wide" | "Wide" | "Full" | "Medium" | "Medium Close"
  | "Close Up" | "Extreme Close Up" | "Over Shoulder" | "POV"
  | "Dutch" | "Top View" | "Low Angle" | "High Angle"
  | "Tracking" | "Symmetrical" | "Silhouette";

export type CameraDirection = {
  sceneNumber: string;
  shotType: ShotType | string;
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
  cameraDirectorPrompt: string;   // 組み立て済み Prompt 断片
};
```

**現在の対応:** `lib/camera-director.ts` の `CameraDirector`

---

## GeneratedImage

```typescript
export type GeneratedImage = {
  id: EntityId;
  sceneId: EntityId;
  imageUrl: string;           // base64 data URL または永続 URL
  promptUsed: string;         // 生成に使用した finalImagePrompt
  generatedAt: string;
  isAdopted: boolean;
  error: string | null;
};
```

**現在の対応:** `SceneWithImage.imageUrl`, `imageError`, `imageLoading`

---

## ImageVariation

```typescript
export type ImageVariation = {
  id: EntityId;
  label: string;              // "案 1" 等
  imageUrl: string | null;
  promptUsed: string;
  error: string | null;
  isAdopted: boolean;
};
```

**現在の対応:** `lib/types.ts` の `SceneVariant`

---

## UserInstruction

```typescript
export type UserInstruction = {
  id: EntityId;
  sceneId: EntityId;
  instruction: string;        // 日本語可
  appliedAt: string | null;
  integratedPrompt: string | null;  // integrate-instruction API の出力
};
```

**現在の対応:** `SceneWithImage.additionalInstruction` + `/api/integrate-instruction`

---

## Project（Ver2 新規・ルートエンティティ）

```typescript
export type ProjectPhase =
  | "input"           // 参考資料入力
  | "fact_pack"       // Fact Pack 生成
  | "script"          // 台本生成・編集
  | "scenes"          // Scene 分解・編集
  | "prompts"         // Director チェーン
  | "images"          // 画像生成
  | "complete";       // 完了

export type Project = {
  id: EntityId;
  name: string;               // 事件名
  phase: ProjectPhase;
  settings: ProjectSettings;

  /** Ver2: 参考資料 */
  sources: SourceReference[];

  /** Ver2: 事実パック */
  factPack: FactPack | null;

  /** 台本 */
  script: Script | null;

  /** Scene 一覧 */
  scenes: Scene[];

  /** 作品全体の Character Bible */
  characterBible: CharacterBible | null;

  /** Director 作品全体 Prompt */
  cinematicDirectorPrompt: string | null;
  masterDirectorPrompt: string | null;
  characterBiblePrompt: string | null;

  createdAt: string;
  updatedAt: string;
  version: "2.0";
};
```

---

## SceneWithImage（現在の UI 状態型 → Ver2 で Scene に統合）

現在 `lib/types.ts` の `SceneWithImage` は Scene + 画像生成状態 + Director 中間データの合成型です。Ver2 では上記 `Scene` 型に統合し、UI 専用の派生型は `SceneViewModel` として分離することを推奨します。

```typescript
/** UI 表示専用（Ver2 推奨） */
export type SceneViewModel = Scene & {
  imageLoading: boolean;
  variantsLoading: boolean;
  adoptedVariantIndex: number | null;
  variantError: string | null;
};
```

---

## 型移行マッピング（現状 → Ver2）

| 現在（lib/types.ts / page.tsx state） | Ver2 目標 |
|--------------------------------------|-----------|
| `eventName` | `Project.name` |
| `scriptTitle` | `Script.title` |
| `script` | `Script.content` |
| `editedScript` | `Script.editedContent` |
| `scriptCharCount` | `Script.characterCount` |
| `scriptStatus` | `Script.status` |
| `sceneCount` | `ProjectSettings.sceneCount` |
| `cinematicStyle` | `ProjectSettings.cinematicStyle` |
| `scenes: SceneWithImage[]` | `Project.scenes: Scene[]` |
| `loadingPhase` | `Project.phase` |
| `progress` | 各 Engine の進捗 state |
