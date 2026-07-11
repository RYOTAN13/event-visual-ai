# Event Visual AI API 仕様書

## 概要

すべての API は Next.js App Router の Route Handler（`app/api/*/route.ts`）として実装。  
認証は未実装。OpenAI API キーはサーバー側の `process.env.OPENAI_API_KEY` のみ使用。

---

## 現在存在する API

### POST /api/generate-script

| 項目 | 内容 |
|------|------|
| **目的** | 事件名から 3500〜4000 文字のドキュメンタリー台本を生成 |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | `app/page.tsx` → `handleGenerateScript()` |

**入力:**
```json
{
  "caseName": "袴田事件"
}
```

**出力:**
```json
{
  "title": "袴田事件",
  "script": "3500〜4000文字の完成台本",
  "characterCount": 3800
}
```

**エラー:**
| HTTP | 条件 |
|------|------|
| 400 | `caseName` が空 |
| 500 | API キー未設定 / OpenAI エラー |
| 502 | OpenAI 応答なし |

**改善点（Ver2）:**
- Fact Pack を入力として受け取る
- `scriptId` を返し Project に紐付け
- 文字数範囲外の場合の警告フィールド追加

---

### POST /api/generate-scenes-from-script

| 項目 | 内容 |
|------|------|
| **目的** | 台本を忠実に 5 / 10 / 20 Scene に分解。Character Bible も同時生成 |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | `app/page.tsx` → `handleProceedToScenes()` |

**入力:**
```json
{
  "caseName": "袴田事件",
  "script": "編集済み台本文",
  "sceneCount": 20
}
```

**出力:**
```json
{
  "characterBible": { "name": "...", "gender": "...", "...": "..." },
  "sceneCount": 20,
  "scenes": [
    {
      "sceneNumber": "Scene 001",
      "narration": "...",
      "imageDescription": "...",
      "charactersInScene": ["..."],
      "sceneAge": "31歳",
      "visualPurpose": "事件発生の異様さを見せる",
      "emotion": "違和感",
      "sceneSourceText": "台本引用...",
      "gptImagePrompt": "English simple prompt..."
    }
  ]
}
```

**エラー:**
| HTTP | 条件 |
|------|------|
| 400 | `caseName` 空 / `script` 空 |
| 500 | API キー未設定 / OpenAI エラー |
| 502 | OpenAI 応答なし |

**改善点（Ver2）:**
- Scene 編集後の再分解 API（差分更新）
- Fact Pack との整合性チェック

---

### POST /api/generate（レガシー）

| 項目 | 内容 |
|------|------|
| **目的** | 事件名から直接 Character Bible + Scene を生成（台本なし） |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | **UI からは未使用**（内部保持のみ） |

**入力:**
```json
{
  "eventName": "袴田事件",
  "sceneCount": 5
}
```

**出力:** `GenerateScenesResponse` — `{ characterBible, scenes, sceneCount }`

**改善点:** Ver2 では deprecated 扱い。削除せず内部参照用に保持。

---

### POST /api/generate-cinematic-direction

| 項目 | 内容 |
|------|------|
| **目的** | 作品全体の映像言語（色調・照明・フィルムストック等）を設計 |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | `app/page.tsx` → `generateCinematicDirection()` |

**入力:**
```json
{
  "eventName": "袴田事件",
  "cinematicStyle": "Netflix Documentary",
  "characterBible": { "...": "..." },
  "sceneCount": 20,
  "scenes": [{ "sceneNumber": "...", "narration": "...", "...": "..." }]
}
```

**出力:**
```json
{
  "cinematicDirectorPrompt": "CINEMATIC DIRECTOR — ...",
  "cinematicStyle": "Netflix Documentary"
}
```

**エラー:** 400（eventName / characterBible 不足）、500、502

---

### POST /api/generate-camera-direction

| 項目 | 内容 |
|------|------|
| **目的** | 各 Scene のカット割り（Shot Type / Lens / Composition 等）を設計 |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | `app/page.tsx` → `generateCameraDirection()` |

**入力:**
```json
{
  "eventName": "袴田事件",
  "characterBible": { "...": "..." },
  "sceneCount": 20,
  "cinematicDirectorPrompt": "...",
  "scenes": [...]
}
```

**出力:**
```json
{
  "scenes": [
    {
      "sceneNumber": "Scene 001",
      "shotType": "Wide",
      "lens": "35mm",
      "cameraDirectorPrompt": "...",
      "...": "..."
    }
  ]
}
```

**バリデーション:** `validateSceneBatch()` — Scene 数一致チェック。20 Scene 時は Shot Type 重複チェックを緩和。

---

### POST /api/generate-visual-direction

| 項目 | 内容 |
|------|------|
| **目的** | Scene ごとの Visual Director Prompt（1200 文字以上）を生成 |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | `app/page.tsx` → `generateVisualDirection()`（**1 Scene ずつループ**） |

**入力:**
```json
{
  "eventName": "袴田事件",
  "characterBible": { "...": "..." },
  "cinematicDirectorPrompt": "...",
  "scenes": [
    {
      "sceneNumber": "Scene 001",
      "narration": "...",
      "imageDescription": "...",
      "sceneAge": "...",
      "charactersInScene": ["..."],
      "cameraDirectorPrompt": "..."
    }
  ]
}
```

**出力:**
```json
{
  "characterBiblePrompt": "CHARACTER BIBLE — ...",
  "scenes": [
    {
      "sceneNumber": "Scene 001",
      "visualDirectorScenePrompt": "...",
      "cameraAngle": "...",
      "lens": "...",
      "...": "..."
    }
  ]
}
```

**改善点:** バッチ API として全 Scene 一括処理のオプション追加（現在は UI 側ループ）

---

### POST /api/generate-master-direction

| 項目 | 内容 |
|------|------|
| **目的** | 作品全体をレビューし、品質チェックリストに基づき Prompt を自己修正。最終 `visualDirectorPrompt` を組み立て |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | `app/page.tsx` → `generateMasterDirection()` |

**入力:**
```json
{
  "eventName": "袴田事件",
  "characterBible": { "...": "..." },
  "cinematicDirectorPrompt": "...",
  "scenes": [
    {
      "sceneNumber": "Scene 001",
      "cameraDirectorPrompt": "...",
      "visualDirectorScenePrompt": "...",
      "...": "..."
    }
  ]
}
```

**出力:**
```json
{
  "masterDirectorPrompt": "...",
  "characterBiblePrompt": "...",
  "scenes": [
    {
      "sceneNumber": "Scene 001",
      "visualDirectorScenePrompt": "...（修正後）",
      "visualDirectorPrompt": "...（完成 Prompt）"
    }
  ]
}
```

---

### POST /api/generate-image

| 項目 | 内容 |
|------|------|
| **目的** | 完成 Prompt から画像を 1 枚生成 |
| **モデル** | `gpt-image-1` |
| **呼び出し元** | `app/page.tsx` → `generateImageForScene()` |

**入力:**
```json
{
  "prompt": "完成 Visual Director Prompt（英語）",
  "characterBiblePrompt": "CHARACTER BIBLE — ..."
}
```

**出力:**
```json
{
  "imageUrl": "data:image/png;base64,..."
}
```

**エラー:** 400（prompt 空）、500、502（b64 取得失敗）

**既知の TypeScript 警告:** `response.data` が possibly undefined（要修正）

---

### POST /api/generate-variants

| 項目 | 内容 |
|------|------|
| **目的** | 同一 Scene の 4 つの cinematography バリエーション Prompt + 画像を生成 |
| **モデル** | `gpt-5.5`（Prompt）+ `gpt-image-1`（画像 ×4） |
| **呼び出し元** | `app/page.tsx` → `handleGenerateVariants()` |

**入力:**
```json
{
  "visualDirectorPrompt": "...",
  "characterBiblePrompt": "..."
}
```

**出力:**
```json
{
  "variants": [
    { "label": "...", "imageUrl": "data:image/png;base64,...", "error": null }
  ]
}
```

**エラー:** 400（prompt 空）、502（4案すべて失敗）

**既知の TypeScript 警告:** `response.data` が possibly undefined（要修正）

---

### POST /api/integrate-instruction

| 項目 | 内容 |
|------|------|
| **目的** | ユーザーの追加指示（日本語可）を既存 Prompt に統合。Character Lock を維持 |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | `app/page.tsx` → `generateImageForScene(withAdditionalInstruction=true)` |

**入力:**
```json
{
  "visualDirectorPrompt": "...",
  "characterBiblePrompt": "...",
  "additionalInstruction": "もっと暗く、雨を強く"
}
```

**出力:**
```json
{
  "integratedPrompt": "...（統合後の英語 Prompt）"
}
```

---

### POST /api/generate-visual-prompt（非推奨）

| 項目 | 内容 |
|------|------|
| **目的** | 旧 Visual Prompt 生成（Director チェーンなし・プレースホルダー使用） |
| **モデル** | `gpt-5.5` |
| **呼び出し元** | **UI から未使用** |
| **備考** | `@deprecated Use /api/generate-visual-direction` |

**改善点:** Ver2 で削除または `/api/generate-visual-prompt` を Visual Engine の内部関数に統合。

---

## Ver2 で追加予定の API

### POST /api/generate-fact-pack（新規）

| 項目 | 内容 |
|------|------|
| **目的** | 参考資料から Fact Pack を生成 |
| **モデル** | `gpt-5.5`（想定） |
| **入力** | `{ caseName, sources: SourceReference[] }` |
| **出力** | `FactPack` |
| **状態** | 未実装 |

---

### POST /api/generate-script（拡張）

| 項目 | 内容 |
|------|------|
| **変更** | Fact Pack を入力として受け取る |
| **入力（拡張）** | `{ caseName, factPackId?, factPack? }` |
| **状態** | 基本実装済、Fact Pack 連携は未実装 |

---

### POST /api/generate-scenes-from-script（拡張）

| 項目 | 内容 |
|------|------|
| **変更** | 編集済み Scene の部分再生成 |
| **状態** | 基本実装済 |

---

### POST /api/generate-visual-prompt（整理）

| 項目 | 内容 |
|------|------|
| **変更** | Visual Engine 内部 API として再定義、または `/api/generate-visual-direction` に統合 |
| **状態** | レガシー存在 |

---

### POST /api/generate-image（現状維持 + 拡張）

| 項目 | 内容 |
|------|------|
| **変更** | `sceneId` / `projectId` を受け取り生成履歴を記録 |
| **状態** | 実装済 |

---

### POST /api/regenerate-image（新規）

| 項目 | 内容 |
|------|------|
| **目的** | 単一 Scene の画像再生成（通常 / 追加指示付き）を API として独立 |
| **入力** | `{ sceneId, prompt, characterBiblePrompt, additionalInstruction? }` |
| **出力** | `{ imageUrl }` |
| **状態** | 未実装（現在は UI 側で `/api/generate-image` を直接呼び出し） |

---

### POST /api/generate-variations（新規・名称整理）

| 項目 | 内容 |
|------|------|
| **目的** | 現 `/api/generate-variants` の Ver2 名称 |
| **状態** | `/api/generate-variants` として実装済。エイリアスまたはリネームを検討 |

---

### POST /api/save-project（新規）

| 項目 | 内容 |
|------|------|
| **目的** | Project 全体を JSON として保存 |
| **入力** | `Project` |
| **出力** | `{ projectId, savedAt }` |
| **状態** | 未実装 |

---

### POST /api/load-project（新規）

| 項目 | 内容 |
|------|------|
| **目的** | 保存済み Project を読み込み |
| **入力** | `{ projectId }` または JSON ファイルアップロード |
| **出力** | `Project` |
| **状態** | 未実装 |

---

### POST /api/export-project（新規）

| 項目 | 内容 |
|------|------|
| **目的** | 台本・Scene 一覧・画像・Prompt を ZIP で一括出力 |
| **入力** | `Project` |
| **出力** | ZIP ファイル（binary） |
| **状態** | 未実装（画像 ZIP のみ `lib/download-scenes-zip.ts` でクライアント側実装済） |

---

## API 呼び出し順序（現在のメインフロー）

```
1. POST /api/generate-script
2. POST /api/generate-scenes-from-script
3. POST /api/generate-cinematic-direction
4. POST /api/generate-camera-direction
5. POST /api/generate-visual-direction  × Scene 数（ループ）
6. POST /api/generate-master-direction
7. POST /api/generate-image              × Scene 数（ループ）

[任意]
8. POST /api/integrate-instruction        → POST /api/generate-image
9. POST /api/generate-variants
```

---

## 共通エラーパターン

| パターン | HTTP | メッセージ例 |
|---------|------|------------|
| API キー未設定 | 500 | `OPENAI_API_KEY is not configured.` |
| 必須パラメータ不足 | 400 | 各 API 固有 |
| OpenAI 応答なし | 502 | `OpenAIからの応答がありませんでした。` |
| OpenAI 例外 | 500 | エラーメッセージをそのまま返却 |
| バリデーション失敗 | 400 | `validateSceneBatch` 等のメッセージ |

---

## 使用モデル一覧

| モデル | 用途 |
|--------|------|
| `gpt-5.5` | 台本・Scene・全 Director・追加指示統合・4案 Prompt |
| `gpt-image-1` | メイン画像・4案画像（1024×1024, high quality） |
