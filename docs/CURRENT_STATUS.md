# Event Visual AI 現状調査レポート

> 調査日: 2026-07-11  
> 調査方法: 実際のソースコード・設定ファイルを Read / Grep して確認

---

## 現在のフォルダ構成

```
event-visual-ai/
├── app/
│   ├── api/
│   │   ├── generate/                      # レガシー: 事件名→直接Scene
│   │   ├── generate-script/               # 台本生成
│   │   ├── generate-scenes-from-script/   # 台本→Scene分解
│   │   ├── generate-cinematic-direction/
│   │   ├── generate-camera-direction/
│   │   ├── generate-visual-direction/
│   │   ├── generate-master-direction/
│   │   ├── generate-visual-prompt/        # 非推奨・UI未使用
│   │   ├── generate-image/
│   │   ├── generate-variants/
│   │   └── integrate-instruction/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.module.css
│   └── page.tsx                           # メインUI（約1,280行）
├── lib/
│   ├── api-scenes.ts                      # Scene バッチバリデーション
│   ├── camera-director.ts
│   ├── character-bible.ts
│   ├── cinematic-director.ts
│   ├── download-scenes-zip.ts             # ZIP ダウンロード（クライアント）
│   ├── image-prompt.ts                      # Prompt 組み立て（一部重複）
│   ├── master-director.ts
│   ├── prompts.ts                         # 旧 Scene 生成 System Prompt
│   ├── protagonist.ts                     # deprecated 再エクスポート
│   ├── scene-count.ts                     # 5/10/20 Scene ユーティリティ
│   ├── types.ts                           # 共有型定義
│   ├── variant-prompts.ts
│   └── visual-director.ts
├── docs/                                  # Ver2 設計書（本調査で作成）
├── .env                                   # OPENAI_API_KEY（gitignore 推奨）
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
└── tsconfig.json
```

**未存在:** `components/`, `hooks/`, `lib/engines/`, データベース, テストディレクトリ, README

---

## 完成している機能

| # | 機能 | 実装場所 | 備考 |
|---|------|---------|------|
| 1 | 事件名入力 | `app/page.tsx` | |
| 2 | OpenAI API 接続 | 全 API Route | `OPENAI_API_KEY` |
| 3 | 台本生成（3500〜4000文字） | `/api/generate-script` | Script Master Prompt 組込済 |
| 4 | 台本確認・編集・再生成 | `app/page.tsx` | textarea + 編集済みバッジ |
| 5 | 台本→Scene分解（5/10/20） | `/api/generate-scenes-from-script` | メイン導線 |
| 6 | Scene フィールド（API 出力） | 同上 | visualPurpose 等は API のみ、UI 未表示 |
| 7 | Character Bible 生成 | Scene 分解 API 内 | |
| 8 | Character Lock | `lib/character-bible.ts` | 全 Prompt に付与 |
| 9 | Cinematic Director | `/api/generate-cinematic-direction` | 10 スタイルプリセット |
| 10 | Camera Director | `/api/generate-camera-direction` | |
| 11 | Visual Director | `/api/generate-visual-direction` | 1 Scene ずつループ |
| 12 | Master Director | `/api/generate-master-direction` | 品質チェック 11 項目 |
| 13 | 画像生成 | `/api/generate-image` | gpt-image-1, 1024×1024 |
| 14 | 通常再生成 | `app/page.tsx` | |
| 15 | 追加指示付き再生成 | `/api/integrate-instruction` | |
| 16 | 4案生成・比較・採用 | `/api/generate-variants` | |
| 17 | 個別画像ダウンロード | `app/page.tsx` | |
| 18 | 全画像 ZIP ダウンロード | `lib/download-scenes-zip.ts` | scene-001.png 形式 |
| 19 | 3 ステップ進捗表示 | `app/page.tsx` | 台本→Scene→画像 |
| 20 | Scene ごとエラー処理 | `app/page.tsx` | 1 Scene 失敗でも他続行 |

---

## 未完成または不安定な機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| Scene 編集 UI | ❌ 未実装 | API は Scene 分解まで。分解後の編集 UI なし |
| Scene 新フィールドの UI 表示 | ❌ 未表示 | visualPurpose, emotion, sceneSourceText, gptImagePrompt |
| Fact Pack | ❌ 未実装 | Ver2 Phase 2 |
| 参考資料入力 | ❌ 未実装 | Ver2 Phase 2 |
| プロジェクト保存・再開 | ❌ 未実装 | 状態は React state のみ、リロードで消失 |
| 素材一括出力（台本+Prompt 含む） | ❌ 未実装 | 画像 ZIP のみ |
| `/api/generate-visual-prompt` | ⚠️ 非推奨 | UI 未使用、プレースホルダー Director 使用 |
| `/api/generate`（旧 Scene 生成） | ⚠️ レガシー | UI から未呼び出し、内部保持 |
| TypeScript エラー | ⚠️ 2 件 | `generate-image` / `generate-variants` の `response.data` |
| 画像永続化 | ❌ 未実装 | base64 data URL のみ、ページリロードで消失 |
| テスト | ❌ 未実装 | 単体・E2E テストなし |

---

## 重複実装の可能性

| 重複 | ファイル | リスク |
|------|---------|--------|
| Scene 生成（2 API） | `generate/route.ts` vs `generate-scenes-from-script/route.ts` | 低（UI は後者のみ） |
| CHARACTER_BIBLE_SCHEMA | 上記 2 ファイルに同一 Schema コピー | 中（片方更新漏れ） |
| Visual Prompt 生成 | `generate-visual-prompt` vs `generate-visual-direction` | 低（前者は deprecated） |
| Prompt 組み立て | `image-prompt.ts` vs `visual-director.ts` | 中（どちらを使うか不明確） |
| 主人公型 | `protagonist.ts` vs `character-bible.ts` | 低（前者は re-export） |
| Negative Prompt | `master-director.ts` vs `cinematic-director.ts` | 低（用途が異なる） |

---

## 今後バグになりそうな箇所

| 箇所 | 理由 |
|------|------|
| `app/page.tsx`（1,280 行） | 全ロジック集中。1 箇所の変更が全体に影響 |
| base64 画像のメモリ | 20 Scene × 高品質 PNG でブラウザメモリ圧迫 |
| `loadingPhase` 状態管理 | Phase 追加時に progressLabel / buttonText 更新漏れ |
| `editedScript` vs `script` 優先 | `activeScript = editedScript \|\| script` — 空文字列時の挙動 |
| Visual Director 1 件ずつループ | 20 Scene で API 20 回。途中失敗時の部分完了状態 |
| `response.data[0]` 非 null チェック | TS エラー 2 件。実行時 undefined で 502 |
| ZIP ファイル名 | `sceneNumber.match(/\d+/)` — 番号形式変更で破綻 |
| プロジェクト未保存 | ブラウザリロード・タブ閉じで全作業消失 |

---

## 使用している OpenAI モデル

| モデル | 用途 | ファイル |
|--------|------|---------|
| `gpt-5.5` | 台本・Scene・全 Director・追加指示・4案 Prompt | 9 API Route |
| `gpt-image-1` | メイン画像・4案画像 | `generate-image`, `generate-variants` |

---

## 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `OPENAI_API_KEY` | OpenAI API 認証 | ✅ 必須 |

`.env` ファイルがプロジェクトルートに存在（内容は git 管理外推奨）。  
`.env.example` は **未作成**。

---

## 現在の起動方法

```bash
# 依存関係インストール
npm install

# .env に OPENAI_API_KEY を設定
echo "OPENAI_API_KEY=sk-..." > .env

# 開発サーバー起動
npm run dev
# → http://localhost:3000

# 本番ビルド
npm run build
npm start

# TypeScript チェック
npx tsc --noEmit

# Lint
npm run lint
```

**依存ライブラリ:** next 15.1, react 19, openai 6.45, jszip 3.10, typescript 5

---

## 現在のメインユーザーフロー（コード確認済）

```
1. 事件名入力 + シーン数(5/10/20) + 映像スタイル選択
2. 「生成する」→ POST /api/generate-script
3. 台本確認・編集（textarea）
4. 「この台本でScene生成へ進む」→ POST /api/generate-scenes-from-script
5. POST /api/generate-cinematic-direction
6. POST /api/generate-camera-direction
7. POST /api/generate-visual-direction（× Scene 数、1件ずつ）
8. POST /api/generate-master-direction
9. POST /api/generate-image（× Scene 数、1件ずつ）
10. 再生成 / 追加指示 / 4案 / 採用 / ダウンロード / ZIP
```

---

## 次に着手すべき作業

Ver2 ロードマップ（`docs/VER2_ROADMAP.md`）に基づく推奨順:

| 優先 | 作業 | Phase |
|------|------|-------|
| 1 | TypeScript エラー 2 件修正 | Phase 1 |
| 2 | `CHARACTER_BIBLE_SCHEMA` 共通化 | Phase 1 |
| 3 | `.env.example` 作成 | Phase 1 |
| 4 | `/api/generate-fact-pack` 実装 | Phase 2 |
| 5 | 参考資料入力 UI | Phase 2 |
| 6 | Scene 編集 UI + 新フィールド表示 | Phase 3 |
| 7 | `app/page.tsx` を components/hooks に分割 | Phase 3 |

**最優先:** Phase 1（型整理 + TS エラー修正）— 機能を壊さずに Ver2 開発の土台を作る。
