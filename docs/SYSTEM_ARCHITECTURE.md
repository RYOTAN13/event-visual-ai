# Event Visual AI システムアーキテクチャ

## 概要

Next.js 15（App Router）+ React 19 + TypeScript による **シングルページ構成** の Web アプリケーション。バックエンドは Next.js API Routes、AI 処理は OpenAI API（サーバーサイド）経由。データベースは未使用（すべてクライアント state）。

---

## フロントエンド構成

| ファイル | 役割 |
|---------|------|
| `app/page.tsx` | **メイン UI + 全オーケストレーション**（約 1,280 行）。状態管理・API 呼び出し・進捗表示・Scene カード UI をすべて担当 |
| `app/page.module.css` | Netflix 風ダークテーマのスタイル |
| `app/layout.tsx` | ルートレイアウト・メタデータ |
| `app/globals.css` | グローバル CSS |

**現状の課題:** `app/page.tsx` に UI・状態・API 連携が集中しており、Ver2 ではコンポーネント分割とカスタムフック化が必要。

---

## API Route 一覧

| パス | モデル | UI から呼び出し | 備考 |
|------|--------|----------------|------|
| `POST /api/generate-script` | gpt-5.5 | ✅ | 台本生成 |
| `POST /api/generate-scenes-from-script` | gpt-5.5 | ✅ | 台本 → Scene 分解（メイン導線） |
| `POST /api/generate-cinematic-direction` | gpt-5.5 | ✅ | 作品全体の映像言語 |
| `POST /api/generate-camera-direction` | gpt-5.5 | ✅ | Scene ごとのカット割り |
| `POST /api/generate-visual-direction` | gpt-5.5 | ✅ | Scene ごとの Visual Prompt |
| `POST /api/generate-master-direction` | gpt-5.5 | ✅ | 作品全体レビュー・Prompt 完成 |
| `POST /api/generate-image` | gpt-image-1 | ✅ | 画像生成 |
| `POST /api/generate-variants` | gpt-5.5 + gpt-image-1 | ✅ | 4案生成 |
| `POST /api/integrate-instruction` | gpt-5.5 | ✅ | 追加指示の Prompt 統合 |
| `POST /api/generate` | gpt-5.5 | ❌ | 旧：事件名から直接 Scene 生成 |
| `POST /api/generate-visual-prompt` | gpt-5.5 | ❌ | **非推奨**。旧 Visual Prompt 生成 |

---

## OpenAI API との接続箇所

### テキスト生成（`gpt-5.5`）

すべて `openai.chat.completions.create()` + `response_format: json_schema`（構造化出力）を使用。

| 用途 | ファイル |
|------|---------|
| 台本生成 | `app/api/generate-script/route.ts` |
| Scene 分解 | `app/api/generate-scenes-from-script/route.ts` |
| 旧 Scene 生成 | `app/api/generate/route.ts` |
| Cinematic Director | `app/api/generate-cinematic-direction/route.ts` |
| Camera Director | `app/api/generate-camera-direction/route.ts` |
| Visual Director | `app/api/generate-visual-direction/route.ts` |
| Master Director | `app/api/generate-master-direction/route.ts` |
| 追加指示統合 | `app/api/integrate-instruction/route.ts` |
| 4案 Prompt 生成 | `app/api/generate-variants/route.ts`（テキスト部分） |
| 旧 Visual Prompt | `app/api/generate-visual-prompt/route.ts` |

### 画像生成（`gpt-image-1`）

`openai.images.generate()` — size: 1024×1024, quality: high, 結果は base64 data URL。

| 用途 | ファイル |
|------|---------|
| メイン画像 | `app/api/generate-image/route.ts` |
| 4案画像 | `app/api/generate-variants/route.ts`（画像部分） |

### 認証

すべての API Route で `process.env.OPENAI_API_KEY` を参照。未設定時は HTTP 500 を返す。

---

## データ処理フロー

```
[ユーザー入力: 事件名]
        │
        ▼
/api/generate-script ──→ Script { title, script, characterCount }
        │
        ▼
[台本確認・編集 UI] ──→ editedScript（任意）
        │
        ▼
/api/generate-scenes-from-script ──→ { characterBible, scenes[] }
        │
        ▼
/api/generate-cinematic-direction ──→ cinematicDirectorPrompt（作品全体 1 本）
        │
        ▼
/api/generate-camera-direction ──→ cameraDirector + cameraDirectorPrompt（Scene ごと）
        │
        ▼
/api/generate-visual-direction ──→ visualDirectorScenePrompt（Scene ごと、1 件ずつループ）
        │
        ▼
/api/generate-master-direction ──→ masterDirectorPrompt + visualDirectorPrompt（Scene ごと）
        │
        ▼
/api/generate-image ──→ imageUrl（base64 data URL、Scene ごと 1 件ずつループ）
        │
        ▼
[再生成 / 追加指示 / 4案 / 採用 / ダウンロード / ZIP]
```

**Prompt 組み立て順（Master Director 完了後の finalImagePrompt）:**

```
Master Director
  ↓
Cinematic Director
  ↓
Camera Director
  ↓
Character Bible + Character Lock
  ↓
Visual Director（Scene Cinematography）
  ↓
Scene Content
  ↓
Negative Prompt
```

---

## 各 Director AI の役割

| Director | ファイル | スコープ | 決定内容 |
|----------|---------|---------|---------|
| **Cinematic Director** | `lib/cinematic-director.ts` | 作品全体 | 色調・照明・フィルムストック・カメラ言語・ムード・コントラスト等 |
| **Camera Director** | `lib/camera-director.ts` | Scene ごと | Shot Type・Lens・Composition・Focus・Depth of Field 等 |
| **Visual Director** | `lib/visual-director.ts` | Scene ごと | 構図・照明・カメラアングルの詳細 Prompt（1200 文字以上） |
| **Master Director** | `lib/master-director.ts` | 作品全体 + Scene | 品質チェックリスト（11 項目）・自己修正・Prompt 統一 |

**Character Engine（Director ではないが同等に重要）:**

| モジュール | ファイル | 役割 |
|-----------|---------|------|
| Character Bible | `lib/character-bible.ts` | 主人公の外見定義（17 フィールド） |
| Character Lock | `lib/character-bible.ts` | 全 Scene で同一人物を維持する Prompt 断片 |

---

## 既存コードで重複している可能性がある処理

| 重複 | 場所 | 内容 |
|------|------|------|
| Scene 生成 API | `/api/generate` vs `/api/generate-scenes-from-script` | 両方 Character Bible + Scene を生成。後者がメイン導線 |
| CHARACTER_BIBLE_SCHEMA | `generate/route.ts` と `generate-scenes-from-script/route.ts` | 同一 JSON Schema がコピーされている |
| Visual Prompt 生成 | `/api/generate-visual-prompt` vs `/api/generate-visual-direction` | 前者は非推奨・UI 未使用 |
| Prompt 組み立て | `lib/image-prompt.ts` vs `lib/visual-director.ts` | `buildFullImagePrompt` vs `buildSceneImagePrompt` / `buildFinalImagePrompt` |
| 主人公型 | `lib/protagonist.ts` vs `lib/character-bible.ts` | protagonist.ts は deprecated 再エクスポート |
| Negative Prompt | `lib/master-director.ts` vs `lib/cinematic-director.ts` | `NEGATIVE_PROMPT` vs `IMAGE_PROHIBITIONS`（内容が類似） |
| System Prompt 構築 | `lib/prompts.ts` vs 各 API Route 内 | Scene 生成 Prompt が分散 |

---

## 今後分割すべきモジュール（Ver2 推奨 Engine 構成）

```
lib/
├── engines/
│   ├── script-engine/          # Script Engine
│   │   ├── prompts.ts          # 台本生成 System Prompt
│   │   └── types.ts
│   ├── fact-engine/            # Fact Engine（Ver2 新規）
│   │   ├── prompts.ts
│   │   └── types.ts
│   ├── scene-engine/           # Scene Engine
│   │   ├── decompose-prompt.ts # 台本 → Scene 分解 Prompt
│   │   ├── legacy-prompt.ts    # 旧 generate Prompt
│   │   └── validation.ts       # validateSceneBatch 等
│   ├── character-engine/       # Character Engine
│   │   ├── bible.ts            # CharacterBible 型・Prompt 構築
│   │   └── lock.ts             # CHARACTER_LOCK
│   ├── visual-engine/          # Visual Engine
│   │   ├── cinematic-director.ts
│   │   ├── camera-director.ts
│   │   ├── visual-director.ts
│   │   ├── master-director.ts
│   │   └── prompt-assembler.ts # Prompt 組み立て統一
│   ├── image-engine/           # Image Engine
│   │   ├── generate.ts
│   │   ├── variants.ts
│   │   └── instruction.ts
│   ├── project-engine/         # Project Engine（Ver2 新規）
│   │   ├── save.ts
│   │   ├── load.ts
│   │   └── serialize.ts
│   └── export-engine/          # Export Engine（Ver2 新規）
│       ├── zip.ts              # download-scenes-zip.ts 移行
│       └── project-export.ts
├── shared/
│   ├── scene-count.ts
│   ├── openai-client.ts        # OpenAI クライアント共通化
│   └── schemas/
│       └── character-bible.schema.ts  # Schema 共通化
└── types/
    └── index.ts                # 全型定義の単一入口
```

---

## 推奨フォルダ構成（Ver2 全体）

```
event-visual-ai/
├── app/
│   ├── page.tsx                    # → 分割: components/ + hooks/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.module.css
│   └── api/
│       ├── generate-fact-pack/     # Ver2 新規
│       ├── generate-script/
│       ├── generate-scenes-from-script/
│       ├── generate-cinematic-direction/
│       ├── generate-camera-direction/
│       ├── generate-visual-direction/
│       ├── generate-master-direction/
│       ├── generate-image/
│       ├── generate-variants/
│       ├── integrate-instruction/
│       ├── save-project/           # Ver2 新規
│       ├── load-project/           # Ver2 新規
│       ├── export-project/         # Ver2 新規
│       └── generate/               # レガシー（内部保持）
├── components/                     # Ver2 新規
│   ├── ScriptReviewPanel.tsx
│   ├── SceneListPanel.tsx
│   ├── SceneCard.tsx
│   ├── StepIndicator.tsx
│   ├── ProgressBar.tsx
│   └── FactPackPanel.tsx
├── hooks/                          # Ver2 新規
│   ├── useProject.ts
│   ├── useScriptGeneration.ts
│   └── useScenePipeline.ts
├── lib/                            # 上記 engines/ 構成
└── docs/                           # 設計書
```

---

## 技術スタック

| 項目 | 値 |
|------|-----|
| フレームワーク | Next.js 15.1 |
| UI | React 19 |
| 言語 | TypeScript 5 |
| AI SDK | openai 6.45 |
| ZIP | jszip 3.10 |
| 画像 | OpenAI gpt-image-1（base64 返却） |
| 状態管理 | React useState（外部ストアなし） |
| 永続化 | なし（Ver2 で追加予定） |
