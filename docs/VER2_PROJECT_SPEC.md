# Event Visual AI Ver2 プロジェクト仕様書

## プロジェクトの目的

Event Visual AI は、事件・未解決事件・冤罪事件などを題材とした **YouTube 10分弱のドキュメンタリー動画** 向けに、映像素材（静止画）を自動生成する Web アプリケーションです。

Ver1（現在）では「事件名 → 台本 → Scene → 画像」までの一気通貫生成を実現しています。

Ver2 では以下を目指します。

- **事実性の強化**: 参考資料から Fact Pack を生成し、台本・Scene の根拠を明確化する
- **編集可能性の向上**: 台本・Scene をユーザーが確認・編集してから画像生成へ進める
- **プロジェクト永続化**: 作業の保存・再開・一括出力
- **制作フローの完成**: 参考資料入力から素材 ZIP 出力までを一つのワークフローとして提供する

---

## 現在完成している機能（Ver1 / STEP19〜20 時点）

| カテゴリ | 機能 | 状態 |
|---------|------|------|
| 入力 | 事件名入力 | ✅ 完成 |
| 台本 | 3500〜4000文字のドキュメンタリー台本生成 | ✅ 完成 |
| 台本 | 台本確認・編集・再生成 | ✅ 完成 |
| Scene | 台本から 5 / 10 / 20 Scene への分解 | ✅ 完成 |
| Scene | Scene ごとの narration / imageDescription / visualPurpose / emotion / sceneSourceText / gptImagePrompt | ✅ API 出力済（UI 未表示） |
| キャラ | Character Bible 生成・Character Lock | ✅ 完成 |
| 演出 | Cinematic Director（作品全体の映像言語） | ✅ 完成 |
| 演出 | Camera Director（Scene ごとのカット割り） | ✅ 完成 |
| 演出 | Visual Director（Scene ごとの構図・照明 Prompt） | ✅ 完成 |
| 演出 | Master Director（作品全体レビュー・自己修正） | ✅ 完成 |
| 設定 | 映像スタイル選択（10 プリセット） | ✅ 完成 |
| 設定 | シーン数選択（5 / 10 / 20） | ✅ 完成 |
| 画像 | GPT Image による画像生成（1024×1024） | ✅ 完成 |
| 画像 | 通常再生成 | ✅ 完成 |
| 画像 | 追加指示付き再生成 | ✅ 完成 |
| 画像 | 4案生成・比較・採用 | ✅ 完成 |
| 出力 | 個別画像ダウンロード | ✅ 完成 |
| 出力 | 全画像 ZIP ダウンロード | ✅ 完成 |
| UI | 3 ステップ進捗表示（台本 → Scene → 画像） | ✅ 完成 |
| UI | Scene ごとのエラー表示（他 Scene は続行） | ✅ 完成 |

---

## Ver2 で実装する機能

### MVP（Ver2 必須）

| 優先度 | 機能 | 説明 |
|--------|------|------|
| P0 | 参考資料入力 | URL・テキスト・メモを入力し Fact Pack 生成の材料にする |
| P0 | Fact Pack 生成 | 事件の事実・年表・人物・論点を構造化して保持 |
| P0 | Fact Pack ベース台本生成 | 事件名だけでなく Fact Pack を根拠に台本を生成 |
| P1 | Scene 確認・編集 UI | 分解後の Scene を一覧表示し、各フィールドを編集可能にする |
| P1 | プロジェクト保存・読み込み | 作業状態を JSON / ファイルとして保存・再開 |
| P1 | 素材一括出力 | 画像・台本・Scene 一覧・Prompt を ZIP で出力 |
| P2 | 型定義・モジュール整理 | `lib/` を Engine 単位に分割し型を統一 |

### 将来機能（Ver2 以降）

| 機能 | 説明 |
|------|------|
| 動画 Prompt 生成 | 各 Scene の Ken Burns / パン等の動画指示 |
| 字幕生成 | narration から SRT / VTT を出力 |
| 音声ナレーション | TTS による読み上げ生成 |
| 複数プロジェクト管理 | プロジェクト一覧・検索 |
| クラウドストレージ連携 | 画像の永続 URL 化 |
| 参考資料の PDF / Web スクレイピング | Fact Pack 入力の自動化 |

---

## ユーザーの操作フロー

### 現在のフロー（Ver1）

```
事件名入力
  ↓
台本生成（/api/generate-script）
  ↓
台本確認・編集
  ↓
Scene分解（/api/generate-scenes-from-script）
  ↓
Cinematic → Camera → Visual → Master Director
  ↓
画像生成（/api/generate-image）
  ↓
再生成・4案比較・採用・ダウンロード
```

### Ver2 目標フロー

```
参考資料入力
  ↓
Fact Pack 生成（/api/generate-fact-pack）        ← 新規
  ↓
台本生成（/api/generate-script + Fact Pack）     ← 拡張
  ↓
台本確認・編集
  ↓
Scene 分解（/api/generate-scenes-from-script）
  ↓
Scene 確認・編集                                  ← 新規 UI
  ↓
画像 Prompt 生成（Director チェーン）             ← 既存活用
  ↓
画像生成
  ↓
再生成・4案比較・採用
  ↓
素材一括出力（/api/export-project）              ← 新規
```

---

## 機能の優先順位

| 順位 | Phase | 機能 |
|------|-------|------|
| 1 | Phase 1 | 型定義統一・コード整理 |
| 2 | Phase 2 | Fact Pack 機能 |
| 3 | Phase 3 | 台本・Scene 編集 UI の安定化 |
| 4 | Phase 4 | プロジェクト保存・再開 |
| 5 | Phase 5 | 画像生成・再生成処理の整理 |
| 6 | Phase 6 | 素材一括出力 |
| 7 | Phase 7 | 動画・字幕・音声（将来） |

---

## MVP と将来機能の区別

| 区分 | 内容 |
|------|------|
| **MVP** | Fact Pack → 台本 → Scene 編集 → 画像生成 → ZIP 出力 → プロジェクト保存 |
| **将来** | 動画 Prompt、字幕、音声、PDF 取込、クラウド保存、複数ユーザー |

MVP 完成の判断基準: ユーザーが参考資料を入力し、Fact Pack 経由で台本を生成し、Scene を編集したうえで画像を生成し、作業を保存・再開でき、最終素材を ZIP で取得できること。

---

## 機能同士の依存関係

```
SourceReference（参考資料）
  └─→ FactPack
        └─→ Script（台本）
              └─→ Scene[]（Scene 分解）
                    ├─→ CharacterBible
                    ├─→ CinematicDirectorPrompt
                    ├─→ CameraDirection[]（Scene ごと）
                    ├─→ VisualDirection[]（Scene ごと）
                    ├─→ MasterDirectorPrompt
                    └─→ GeneratedImage[]（Scene ごと）
                          └─→ ImageVariation[]（4案）
                                └─→ Export（ZIP / プロジェクトファイル）
```

**重要な依存ルール:**

- Scene 分解は **Script が存在すること** が前提
- Director チェーンは **Scene + CharacterBible** が前提
- 画像生成は **visualDirectorPrompt（Master Director 完了後）** が前提
- 4案生成は **visualDirectorPrompt** が前提
- Fact Pack は Script 生成の **入力** になる（Ver2 新規）

---

## 開発時に守るルール

1. **既存機能を壊さない** — 画像生成・Director チェーン・再生成・4案・ZIP は常に動作すること
2. **小さく実装する** — 1 Phase ずつ完成条件を満たしてから次へ
3. **型を先に定義する** — `docs/DATA_MODELS.md` を参照し、API と UI で同じ型を使う
4. **重複を作らない** — 既存 API / lib を確認してから新規作成する
5. **後方互換を維持する** — 旧 `/api/generate` は内部に残してよいが、UI のメイン導線は台本経由のみ
6. **秘密情報を守る** — API キーは `.env` のみ、ログに出力しない
7. **設計書を更新する** — 大きな変更後は `docs/` を更新する
