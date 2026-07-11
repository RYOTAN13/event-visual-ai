# Ver2 Phase1 Sprint1 リファクタリングレポート

> 実施日: 2026-07-12  
> 対象: Event Visual AI  
> 方針: 新機能・UI変更なし。既存動作を維持した構造整理のみ。

## 実施概要

Ver2 開発の土台として、`lib/` 配下を責務別に整理し、全 API Route の
OpenAI Client を共通化しました。API パス、入出力、モデル、Prompt 内容、
UI、処理順は変更していません。

## 変更したファイル

### 新規作成

#### `lib/openai`

- `lib/openai/client.ts`
  - OpenAI Client の生成を一元化
  - `TEXT_MODEL`（`gpt-5.5`）と `IMAGE_MODEL`（`gpt-image-1`）を共通定義

#### `lib/prompts`

- `lib/prompts/script-prompt.ts`
  - Script Generator の System Prompt
- `lib/prompts/scene-prompt.ts`
  - 台本由来 Scene 分解 Prompt
  - 旧「事件名から直接 Scene 生成」Prompt
- `lib/prompts/cinematic-prompt.ts`
  - Cinematic Director Prompt と映像スタイル定義
- `lib/prompts/camera-prompt.ts`
  - Camera Director Prompt とカメラ選択肢
- `lib/prompts/visual-prompt.ts`
  - Visual Director Prompt と最終画像 Prompt 組み立て
- `lib/prompts/master-prompt.ts`
  - Master Director Prompt、品質チェック、Negative Prompt
- `lib/prompts/character-prompt.ts`
  - Character Bible / Character Lock Prompt
- `lib/prompts/variant-prompt.ts`
  - 4案生成 Prompt
- `lib/prompts/instruction-prompt.ts`
  - 追加指示統合 Prompt

#### `lib/types`

- `lib/types/index.ts`
  - 型の共通入口。既存の `@/lib/types` import を維持
- `lib/types/character.ts`
  - `CharacterBible`, `ProtagonistSettings`
- `lib/types/director.ts`
  - Camera / Cinematic / Visual / Master Director 関連型
- `lib/types/scene.ts`
  - `Scene`, `SceneVariant`, `SceneWithImage`
- `lib/types/api.ts`
  - API Response 型
- `lib/types/project.ts`
  - Ver2 用 `Project`, `ProjectSettings`, `GeneratedImage`
- `lib/types/schemas.ts`
  - 重複していた `CHARACTER_BIBLE_SCHEMA` を共通化

#### `lib/utils`

- `lib/utils/scene-count.ts`
  - 5 / 10 / 20 Scene の解析・整形・Schema 補助
- `lib/utils/api-scenes.ts`
  - Scene バッチのバリデーション
- `lib/utils/download-scenes-zip.ts`
  - 画像 ZIP 生成・ダウンロード

### 配置変更に伴い更新

- `app/page.tsx`
  - `scene-count` と ZIP utility の import 先のみ変更
  - JSX、state、イベント処理、UI は変更なし
- 全 11 API Route
  - `new OpenAI()` を `getOpenAIClient()` に変更
  - モデル名を共通定数へ変更
  - Prompt import を `lib/prompts/` へ変更
- `lib/camera-director.ts`
- `lib/cinematic-director.ts`
- `lib/visual-director.ts`
- `lib/master-director.ts`
- `lib/character-bible.ts`
  - 型・Prompt を新配置から再エクスポート
  - 既存 import との互換性を維持

### 移動により削除した旧配置

- `lib/types.ts` → `lib/types/`
- `lib/prompts.ts` → `lib/prompts/scene-prompt.ts`
- `lib/variant-prompts.ts` → `lib/prompts/variant-prompt.ts`
- `lib/image-prompt.ts` → `lib/prompts/visual-prompt.ts`
- `lib/scene-count.ts` → `lib/utils/scene-count.ts`
- `lib/api-scenes.ts` → `lib/utils/api-scenes.ts`
- `lib/download-scenes-zip.ts` → `lib/utils/download-scenes-zip.ts`

## 変更理由

1. Prompt が API Route と domain module に分散していた
2. OpenAI Client が全 API Route で個別生成されていた
3. 型が `lib/types.ts` と各 Director ファイルに分散していた
4. Utility が `lib/` 直下に混在していた
5. Character Bible の JSON Schema が 2 API に重複していた
6. Ver2 の Fact / Project Engine を追加する前に責務境界が必要だった

## 調査結果

### 重複 API

| API | 重複内容 | Sprint1 の扱い |
|-----|---------|----------------|
| `/api/generate` | 事件名から Character Bible + Scene を直接生成 | レガシー互換のため保持 |
| `/api/generate-scenes-from-script` | 台本から Character Bible + Scene を生成 | メイン導線として保持 |
| `/api/generate-visual-prompt` | 旧 Visual Prompt 生成 | deprecated のまま保持 |
| `/api/generate-visual-direction` | 現行 Visual Director | メイン導線として保持 |

API ではありませんが、`/api/generate-image` と
`/api/generate-variants` には同じ画像生成オプション
（`gpt-image-1`, 1024x1024, high）が残っています。画像生成処理自体の
共通関数化は Phase5 の対象とし、Sprint1 では OpenAI Client のみ共通化しました。

Scene 入力検証も `validateSceneBatch`、Visual Director の inline validator、
Master Director の inline validator に分かれています。入力条件が異なるため
今回は統合せず、今後 shared schema を導入する際の整理対象とします。

### 重複 Prompt

| 対象 | 旧状態 | Sprint1 後 |
|------|--------|-------------|
| Scene Prompt | Route と `lib/prompts.ts` に分散 | `lib/prompts/scene-prompt.ts` |
| Visual / Image Prompt | `visual-director.ts` と `image-prompt.ts` に分散 | `lib/prompts/visual-prompt.ts` |
| Character Lock | Character / Variant / Instruction で参照 | `lib/prompts/character-prompt.ts` を単一参照 |
| Negative Prompt 系 | Master と Cinematic に類似定義 | 用途が異なるため統合せず明示的に保持 |

### 重複 Type

| 対象 | 旧状態 | Sprint1 後 |
|------|--------|-------------|
| `CharacterBible` / `ProtagonistSettings` | `types.ts`, `character-bible.ts`, `protagonist.ts` | 正本を `types/character.ts` に統一 |
| Director 型 | 各 Director 実装ファイル | `types/director.ts` に統合し再エクスポート |
| API Response 型 | `types.ts` に混在 | `types/api.ts` |
| Character Bible Schema | 2 API Route にコピー | `types/schemas.ts` |

### 重複・派生 State

削除や統合は UI 動作に影響するため、Sprint1 では変更していません。

- `scriptCharCount` は `activeScript.length` から導出可能
- `scriptStatus` と `loadingPhase === "script"` は一部責務が重なる
- `imageLoading` と `regeneratingScenes` は一部状態が重なるが、
  通常再生成 / 追加指示再生成の表示区別に使われる
- `script` と `editedScript` は生成値と編集値を分離する意図的な二重保持

### 未使用ファイル / API

- `lib/protagonist.ts`
  - 現在の import 元から参照されていない deprecated 互換ファイル
  - 後方互換のため削除しない
- `app/api/generate/route.ts`
  - UI のメイン導線では未使用
  - 旧フロー互換のため削除しない
- `app/api/generate-visual-prompt/route.ts`
  - UI から未使用、deprecated
  - 互換性維持のため削除しない

### 未使用 Component

独立 Component は存在しません。React Component は `app/page.tsx` と
`app/layout.tsx` のみで、どちらも使用されています。

### 不要な import / 宣言

厳格な未使用チェックで以下を確認し、削除しました。

- `generate-visual-direction/route.ts` の未使用 `CharacterBible` type import
- `generate-variants/route.ts` の未使用 `characterBiblePrompt` ローカル変数
- 旧 `lib/types.ts` の未使用 `DEFAULT_CINEMATIC_STYLE` import はファイル移動で解消

## 改善点

- OpenAI Client とモデル指定の変更箇所が 1 ファイルになった
- Prompt の場所が用途別に明確になった
- Director 実装と Prompt 文字列を分離した
- Character Bible Schema の更新漏れリスクを解消した
- `@/lib/types` を維持したため UI / API の既存 import 互換性を保った
- 既知の TypeScript エラー 2 件
  (`response.data` が undefined の可能性) を安全な optional chaining で解消した

## 動作確認

| 確認 | 結果 |
|------|------|
| `npx tsc --noEmit` | 成功（エラー 0） |
| `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` | 成功（エラー 0） |
| `npm run build` | 成功 |
| Next.js 全 11 API Route のビルド | 成功 |
| IDE lint | エラー 0 |
| UI ファイル / CSS | UI変更なし |

OpenAI の実 API 呼び出しは費用が発生するため自動実行していません。
本番ビルドで、事件入力、台本、Scene、Director、画像、再生成、追加指示、
4案、採用、ダウンロード、ZIP の参照関係と型整合性を確認しています。

## 今後の課題

1. `app/page.tsx` の state / API orchestration 分割は Phase3 で実施
2. deprecated API の削除判断は利用状況確認後に行う
3. `scriptCharCount` 等の派生 state 整理は UI テスト追加後に行う
4. API Route 共通の「API キー未設定」Response helper は次 Sprint で検討
5. OpenAI API をモックした API Route テストを追加する
6. Next.js build の複数 lockfile 警告は別 Sprint で整理する
7. 画像生成オプションと Scene 入力検証の重複を Phase5 で共通化する
