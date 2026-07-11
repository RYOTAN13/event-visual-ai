# Character Studio 設計書

Ver2 Phase6 Sprint6 で導入した Character Studio の仕様です。

---

## 概要

主人公・重要人物を **プロジェクト単位** で管理し、全 Scene で一貫した人物として利用する機能です。

- **Character Studio（Project Character）** が最優先
- **Character Bible**（Scene 分解 API が生成）はフォールバックとして維持

---

## データ構造

型定義: `lib/types/character-studio.ts`

### ProjectProtagonist（主人公設定）

| フィールド | 説明 |
|-----------|------|
| `name` | 名前 |
| `age` | 基準年齢 |
| `gender` | 性別 |
| `hairStyle` | 髪型 |
| `hairColor` | 髪色 |
| `clothing` | 服装 |
| `physique` | 体格 |
| `facialFeatures` | 顔の特徴 |
| `occupation` | 職業 |
| `expressionTendency` | 表情の傾向 |

### CharacterStudio

```typescript
type CharacterStudio = {
  protagonist: ProjectProtagonist;
};
```

- `name` が入力されている場合、Project Character が有効
- 未設定時は Character Bible にフォールバック

---

## Project との関係

### 保存

`StoredProject.characterStudio` として localStorage に保存されます。

```typescript
{
  characterStudio: {
    protagonist: { name: "...", age: "...", ... }
  },
  scenes: [...]
}
```

### 読込

旧 Project（`characterStudio` なし）読込時は空の主人公設定で初期化します（`normalizeCharacterStudio()`）。

### UI

`CharacterStudioPanel`（`app/components/CharacterStudioPanel.tsx`）を映像スタイル設定の下に配置。Netflix 風のダークパネルで 10 項目を編集できます。

---

## Scene との関係

### 優先順位（Scene 生成・Director 処理）

```
Project Character（名前が設定されている）
  ↓ 未設定時
Character Bible（Scene 分解 API が生成）
```

実装: `resolveEffectiveCharacterBible()` in `lib/character-studio/index.ts`

Cinematic / Camera / Visual / Master Director への API 呼び出しは、すべて **effective Character Bible** を渡します。

### Scene ごとの年齢

主人公の **年齢のみ** Scene 単位で変更可能です。

- フィールド: `Scene.sceneAge`（既存）
- UI: 各 Scene カードの「主人公の年齢（このScene）」入力
- 例: Scene 001 → 22歳、Scene 010 → 35歳、Scene 020 → 58歳

Project Character の `age` は基準年齢、`sceneAge` はその Scene での年齢としてプロンプトに反映されます。

### Character Bible の保持

- Scene 分解 API は引き続き `characterBible` を生成
- 各 Scene の `scene.characterBible` に API 結果を保持（削除しない）
- Project Character が有効な場合のみ Director / 画像生成で上書き利用

---

## Visual Prompt への反映方法

### プロンプト生成

Project Character 有効時:

```
buildProjectProtagonistPrompt(protagonist, sceneAge)
```

Character Bible フォールバック時:

```
buildCharacterBiblePrompt(bible, sceneAge)
```

統合入口: `buildEffectiveCharacterPrompt()` in `lib/character-studio/index.ts`

### 画像生成

`POST /api/generate-image` 呼び出し時:

1. Visual Director Prompt（シーン映像描写）
2. **主人公設定プロンプト**（`characterBiblePrompt` として自動付与）
3. `buildFinalImagePrompt(characterPrompt, visualPrompt)` で結合

```typescript
// lib/prompts/visual-prompt.ts
export function buildFinalImagePrompt(
  characterBiblePrompt: string,
  scenePrompt: string
): string {
  return `${characterPart}\n\n${scenePart}`;
}
```

追加指示付き再生成・4案生成も同様に `getCharacterPromptForScene()` 経由で主人公設定を挿入します。

### Scene 再生成（Scene Editor 連携）

`refreshScenePrompts()` → Visual Director → Master Director → 画像生成の各段階で effective Character Bible / Project Character プロンプトを使用します。

---

## ファイル構成

```
lib/
├── types/character-studio.ts    # ProjectProtagonist, CharacterStudio
├── character-studio/index.ts    # 解決・プロンプト生成
└── prompts/visual-prompt.ts     # buildFinalImagePrompt（結合）

app/
├── components/CharacterStudioPanel.tsx
└── page.tsx                     # state・Director 連携・Scene 年齢 UI
```

---

## 既存機能との関係

| 機能 | 影響 |
|------|------|
| Character Bible | 維持。Studio 未設定時に使用 |
| Fact Engine | 変更なし |
| Scene Editor | 変更なし（年齢は専用 UI） |
| Timeline Editor | 複製 Scene も Project Character を継承 |
| Project 保存 | `characterStudio` 追加 |
| 4案 / ZIP | 変更なし |

---

## 関連ドキュメント

- `docs/PROJECT_STORAGE.md` — Project 保存
- `docs/SCENE_EDITOR.md` — Scene 編集
- `docs/DATA_MODELS.md` — データモデル
