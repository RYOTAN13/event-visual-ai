# Scene Editor 設計書

Ver2 Phase4 Sprint4 で導入した Scene Editor の仕様です。

---

## 概要

AI が生成した各 Scene カードのテキスト項目をユーザーが編集し、編集後の内容を元にその Scene だけ画像を再生成できる機能です。

```
表示 → 「編集」 → textarea → 「保存」 → state 更新
                                    ↓
                            画像再生成（編集後データ使用）
```

---

## 編集対象

| フィールド | state キー | 備考 |
|-----------|-----------|------|
| ナレーション | `narration` | |
| 画像説明 | `imageDescription` | |
| Visual Purpose | `visualPurpose` | 任意。空の場合は `undefined` |
| Emotion | `emotion` | 任意。空の場合は `undefined` |
| Characters | `charactersInScene` | カンマ区切りで編集 → 配列に変換 |
| 追加指示 | `additionalInstruction` | 画像再生成時の追加指示にも使用 |

---

## UI フロー

各項目は `SceneEditableField` コンポーネント（`app/components/SceneEditableField.tsx`）で統一:

1. **表示モード** — 現在の値を表示。「編集」ボタンで編集モードへ
2. **編集モード** — textarea に draft を入力。「保存」で state へ反映

Scene カードヘッダー:

- 編集中（未保存 draft あり）→ **未保存** バッジ（赤系）
- 保存済みで生成直後と差分あり → **編集済み** バッジ（黄系）
- 編集済み Scene → **元に戻す** ボタン（`originalSnapshot` へ復元）

---

## state 更新方法

### 編集 state

```typescript
type SceneFieldEdit = {
  sceneNumber: string;
  field: SceneEditableFieldKey;
  draft: string;
};
```

- `fieldEdit` — 現在編集中のフィールド（1 Scene × 1 フィールド）
- 保存時: `parseSceneFieldValue()` で draft を型に合わせて変換 → `updateScene()` で `scenes` 配列を更新

### 生成直後スナップショット

```typescript
type SceneEditableSnapshot = {
  narration: string;
  imageDescription: string;
  visualPurpose: string;
  emotion: string;
  charactersInScene: string[];
  additionalInstruction: string;
};
```

- `SceneWithImage.originalSnapshot` — Scene 生成直後の編集可能フィールド
- `toSceneWithImage()` 作成時に `ensureOriginalSnapshot()` で設定
- 「元に戻す」で `applySceneSnapshot()` により復元

### ユーティリティ

`lib/utils/scene-editor.ts`:

| 関数 | 用途 |
|------|------|
| `createSceneSnapshot()` | 現在値からスナップショット作成 |
| `ensureOriginalSnapshot()` | スナップショット未設定時に補完 |
| `isSceneEdited()` | 編集済み判定 |
| `getSceneFieldDisplayValue()` | 表示用文字列取得 |
| `parseSceneFieldValue()` | 保存時の型変換 |
| `buildEnrichedSceneForPrompt()` | Visual Director 向け Scene データ構築 |
| `applySceneSnapshot()` | 元に戻す |

---

## 画像再生成との関係

画像再生成・追加指示付き再生成・4案生成の前に、**編集後の Scene データ** で Visual Director / Master Director プロンプトを再生成します。

```
編集後 Scene
  ↓
buildEnrichedSceneForPrompt()  ← visualPurpose / emotion を imageDescription に付加
  ↓
POST /api/generate-visual-direction（1 Scene）
  ↓
POST /api/generate-master-direction（1 Scene）
  ↓
visualDirectorPrompt 更新
  ↓
POST /api/generate-image（または generate-variants）
```

`prepareSceneForImageGeneration()` が上記を実行し、更新された `visualDirectorPrompt` で画像生成します。

**重要:** 初回生成時のプロンプトは使わず、常に **現在の Scene state** を入力とします。

---

## Project 保存との関係

Project 保存（`lib/storage/project-storage.ts`）は `scenes: SceneWithImage[]` をそのまま JSON 化します。

Scene Editor 関連で保存される項目:

- 編集後の各フィールド（`narration`, `imageDescription` 等）
- `originalSnapshot`（元に戻す用）
- 画像・4案・採用状態・Visual Director プロンプト（従来通り）

読込時は `ensureOriginalSnapshot()` で旧データ（`originalSnapshot` なし）にも対応します。

---

## ファイル構成

```
app/
├── components/
│   ├── SceneEditableField.tsx
│   └── SceneEditableField.module.css
└── page.tsx                    # 編集 state・再生成フロー

lib/
├── types/scene.ts              # SceneEditableSnapshot, originalSnapshot
└── utils/scene-editor.ts       # 編集ユーティリティ
```

---

## 既存機能との関係

| 機能 | 影響 |
|------|------|
| Fact Engine | 変更なし |
| Character Bible | 変更なし（Scene 内 `characterBible` は維持） |
| Visual Director | 再生成時のみ編集後 Scene でプロンプト再構築 |
| 4案生成 | 再生成前にプロンプト更新 |
| 採用 / ZIP / Project 保存 | 変更なし（編集内容も保存対象） |

---

## 関連ドキュメント

- `docs/PROJECT_STORAGE.md` — Project 保存仕様
- `docs/DATA_MODELS.md` — Scene データモデル
