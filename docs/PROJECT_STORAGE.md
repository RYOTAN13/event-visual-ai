# Project 保存・読み込み設計書

Ver2 Phase3 Sprint3 で導入した Project ローカル保存機能の仕様です。

---

## 概要

- 保存先: ブラウザの **localStorage**
- キー: `event-visual-project`
- API・サーバーは不使用（Supabase 等は将来対応）
- 実装: `lib/storage/project-storage.ts`
- UI: 画面上部の「保存」「読込」ボタン（`app/page.tsx`）

---

## 保存構造

型定義: `StoredProject`（`lib/storage/project-storage.ts`）

| フィールド | 型 | 内容 |
|-----------|-----|------|
| `version` | `number` | 保存フォーマットのバージョン（現在 `1`） |
| `savedAt` | `string` | 保存日時（ISO 8601） |
| `eventName` | `string` | 事件名 |
| `cinematicStyle` | `CinematicStylePreset` | 映像スタイル |
| `sceneCount` | `SceneCount` | Scene数（5 / 10 / 20） |
| `factPack` | `FactPack \| null` | Fact Pack |
| `scriptTitle` | `string` | 台本タイトル |
| `script` | `string` | 生成された台本 |
| `editedScript` | `string` | ユーザー編集後の台本 |
| `scriptCharCount` | `number` | 台本文字数 |
| `scenes` | `SceneWithImage[]` | Scene一覧（下記をすべて含む） |

`scenes` の各要素（`SceneWithImage`）には以下が含まれます。

- Scene 本体（ナレーション・画像説明・登場人物 等）
- Character Bible（`characterBible`, `characterBiblePrompt`）
- Visual Director（`visualDirectorPrompt`, `visualDirectorScenePrompt`）
- Cinematic / Camera / Master Director の各プロンプト
- 生成画像（`imageUrl` — data URL）
- 4案（`variants` — 各案の画像とラベル）
- 採用状態（`adoptedVariantIndex`）
- 追加指示（`additionalInstruction`）

※ `imageLoading` / `variantsLoading` は保存時に `false` へ正規化します（進行中状態は保存しない）。

---

## JSON例

```json
{
  "version": 1,
  "savedAt": "2026-07-12T00:00:00.000Z",
  "eventName": "袴田事件",
  "cinematicStyle": "Netflix Documentary",
  "sceneCount": 5,
  "factPack": {
    "title": "袴田事件",
    "summary": "1966年に静岡県で発生した...",
    "timeline": [{ "date": "1966-06-30", "event": "事件発生" }],
    "people": [{ "name": "袴田巌", "role": "元被告人" }],
    "locations": ["静岡県清水市"],
    "evidence": ["5点の衣類"],
    "investigation": "捜査の概要...",
    "trial": "裁判の概要...",
    "importantFacts": ["..."],
    "warnings": ["..."]
  },
  "scriptTitle": "静岡・一家4人殺害事件",
  "script": "1966年6月30日、深夜...",
  "editedScript": "",
  "scriptCharCount": 3800,
  "scenes": [
    {
      "sceneNumber": "Scene 1",
      "narration": "...",
      "imageDescription": "...",
      "charactersInScene": ["袴田巌"],
      "sceneAge": "30歳",
      "characterBible": { "name": "袴田巌", "gender": "男性", "...": "..." },
      "visualDirectorPrompt": "...",
      "additionalInstruction": "もっと暗く",
      "imageUrl": "data:image/png;base64,....",
      "variants": [
        { "label": "案1", "imageUrl": "data:image/png;base64,...", "error": null }
      ],
      "adoptedVariantIndex": 0,
      "imageLoading": false,
      "variantsLoading": false
    }
  ]
}
```

---

## 復元フロー

「読込」ボタン押下時の処理（`handleLoadProject` in `app/page.tsx`）:

1. `localStorage.getItem("event-visual-project")` で JSON を取得
2. パースし、最低限の構造（`eventName`, `scenes`）を検証
3. 以下の state を一括復元
   - `eventName` / `cinematicStyle` / `sceneCount`
   - `factPack`（画面非表示、state のみ）
   - `scriptTitle` / `script` / `editedScript` / `scriptCharCount`
   - `scenes`（画像・4案・採用状態・追加指示を含む）
4. `scriptStatus` は台本の有無から導出（`script` があれば `"ready"`）
5. ローディング系 state（`loadingPhase`, `regeneratingScenes` 等）はリセット
6. 右下に「読込完了」トーストを表示

保存時は逆に、現在の state を `StoredProject` へまとめて `JSON.stringify` し保存 → 「保存しました」トーストを表示します。

### 容量制限について

localStorage の上限は一般に約 5MB です。画像は data URL（base64）として保存されるため、Scene数・4案が多いと上限を超える場合があります。超過時は `QuotaExceededError` を捕捉し、エラートーストで通知します。

---

## 将来 Supabase へ置き換える方法

### 置き換えポイント

保存・読込のすべては `lib/storage/project-storage.ts` の 2 関数を経由します。

```typescript
saveProject(project: StoredProject): SaveResult
loadProject(): LoadResult
```

Supabase 移行時はこの 2 関数の内部実装のみを差し替え、呼び出し側（`app/page.tsx`）は変更しません（非同期化に伴う `async` 化のみ必要）。

### 推奨手順

1. **関数を async 化**

   ```typescript
   export async function saveProject(project: StoredProject): Promise<SaveResult>
   export async function loadProject(id?: string): Promise<LoadResult>
   ```

2. **画像の外部化**
   - data URL を Supabase Storage へアップロードし、`imageUrl` を Storage の公開 URL に置き換える
   - JSON 本体は `projects` テーブルへ（`jsonb` カラム）

3. **テーブル設計（例）**

   ```sql
   create table projects (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     data jsonb not null,          -- StoredProject（画像URL参照版）
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );
   ```

4. **複数 Project 対応**
   - 現在は単一キー（`event-visual-project`）で 1 Project のみ
   - Supabase 移行時に Project 一覧・選択 UI を追加し、`loadProject(id)` で個別読込

5. **マイグレーション**
   - `StoredProject.version` を利用し、旧フォーマットの読込時に変換処理を挟む

### 設計原則

- **単一入口:** 保存・読込は必ず `project-storage.ts` 経由
- **フォーマット共通:** ローカルも Supabase も `StoredProject` を保存単位とする
- **UI 非依存:** ストレージ層は React state を知らない（`app/page.tsx` が組み立て・復元を担当）

---

## 今回のスコープ外

- Supabase 等のリモート保存
- 複数 Project の管理・一覧 UI
- 自動保存
- エクスポート / インポート（ファイル）

---

## 関連ドキュメント

- `docs/DATA_MODELS.md` — Ver2 データモデル
- `docs/FACT_ENGINE.md` — Fact Pack 仕様
- `docs/VER2_ROADMAP.md` — ロードマップ
