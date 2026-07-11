# Event Visual AI Ver2 開発ロードマップ

## 全体方針

Ver1 で確立した「台本 → Scene → Director チェーン → 画像生成」のコアパイプラインを **壊さずに**、  
Fact Pack・編集 UI・プロジェクト永続化・一括出力を段階的に追加する。

各 Phase は **独立して完成条件を満たしてから** 次 Phase に進む。

---

## Phase 1: 現在のコード整理と型定義

### 目的

Ver2 開発の土台として、型定義を統一し、重複コードを整理する。  
機能追加は行わず、既存動作を維持したままリファクタリングする。

### 実装内容

- [ ] `docs/DATA_MODELS.md` の型を `lib/types/` に段階的に反映
- [ ] `CHARACTER_BIBLE_SCHEMA` を `lib/shared/schemas/` に共通化
- [ ] `lib/protagonist.ts` の deprecated 参照を整理（削除は Phase 5 以降）
- [ ] `/api/generate-visual-prompt` を deprecated として明記（削除しない）
- [ ] TypeScript エラー修正（`generate-image` / `generate-variants` の `response.data`）
- [ ] `app/page.tsx` から型 import を `lib/types` に統一

### 完成条件

- `npx tsc --noEmit` がエラー 0（既知 2 件を修正）
- 既存 UI フロー（台本 → Scene → 画像）が変わらず動作
- 設計書（本ドキュメント群）が最新状態

### 壊してはいけない既存機能

- 台本生成・編集・再生成
- Scene 分解（台本経由）
- 全 Director チェーン
- 画像生成・再生成・4案・採用・ZIP

---

## Phase 2: Fact Pack 機能

### 目的

参考資料から構造化された Fact Pack を生成し、台本・Scene の **事実根拠** を明確にする。

### 実装内容

- [ ] `POST /api/generate-fact-pack` 新規作成
- [ ] `lib/engines/fact-engine/` 作成（Prompt・型・バリデーション）
- [ ] UI: 参考資料入力フォーム（URL / テキスト / メモ）
- [ ] UI: Fact Pack 確認画面（年表・人物・論点表示）
- [ ] `/api/generate-script` を Fact Pack 入力対応に拡張
- [ ] `Project.sources` / `Project.factPack` state 追加

### 完成条件

- 参考資料を入力 → Fact Pack 生成 → 内容確認 → 台本生成、が一連で動作
- Fact Pack なしでも従来通り事件名のみで台本生成可能（後方互換）
- Fact Pack の `uncertainties`（不確実情報）が台本に反映される

### 壊してはいけない既存機能

- 事件名のみでの台本生成（Fact Pack なしパス）
- 台本確認・編集 UI
- Scene 分解以降の全フロー

---

## Phase 3: 台本・Scene 編集機能の安定化

### 目的

生成後の台本・Scene をユーザーが確認・編集してから次工程へ進める UI を完成させる。

### 実装内容

- [ ] Scene 確認・編集 UI（`SceneListPanel` / `SceneCard` コンポーネント分割）
- [ ] Scene フィールド表示: `visualPurpose`, `emotion`, `sceneSourceText`, `gptImagePrompt`
- [ ] Scene 各フィールドの textarea 編集
- [ ] 「Scene を確定して画像生成へ進む」ボタン（Director チェーン開始）
- [ ] 台本編集後の Scene 再分解オプション
- [ ] `app/page.tsx` を hooks + components に分割

### 完成条件

- Scene 分解後、一覧表示 → 各 Scene 編集 → 確定 → 画像生成、が動作
- 編集した Scene の `narration` / `imageDescription` が Director チェーンに反映
- 20 Scene でも UI が破綻しない（スクロール・進捗表示）

### 壊してはいけない既存機能

- 台本確認・編集（STEP19）
- Director チェーン（Cinematic / Camera / Visual / Master）
- Scene ごとのエラー表示（1 Scene 失敗でも他は続行）
- 画像再生成・4案・採用

---

## Phase 4: プロジェクト保存・再開機能

### 目的

作業状態を保存・読み込みし、ブラウザを閉じても作業を再開できるようにする。

### 実装内容

- [ ] `Project` 型に基づくシリアライズ / デシリアライズ（`lib/engines/project-engine/`）
- [ ] `POST /api/save-project` — JSON ファイルとしてダウンロード
- [ ] `POST /api/load-project` — JSON ファイルアップロードで復元
- [ ] UI: 「プロジェクトを保存」「プロジェクトを読み込み」ボタン
- [ ] LocalStorage への自動保存（オプション）
- [ ] base64 画像を含む Project JSON のサイズ対策（画像 URL のみ保存オプション）

### 完成条件

- 台本生成途中 → 保存 → ブラウザ再起動 → 読み込み → 同じ状態から再開
- 画像生成完了後も Project 保存・読み込みが動作
- 保存ファイルに API キー等の秘密情報が含まれない

### 壊してはいけない既存機能

- 全生成フロー
- 画像の base64 表示・ダウンロード
- ZIP ダウンロード

---

## Phase 5: 画像生成と再生成処理の整理

### 目的

画像生成・再生成・4案生成の API と UI ロジックを整理し、保守性を向上させる。

### 実装内容

- [ ] `POST /api/regenerate-image` 新規（通常 / 追加指示を統合）
- [ ] `lib/engines/image-engine/` に画像関連ロジック集約
- [ ] `useScenePipeline` hook で Director + 画像生成ループを分離
- [ ] `/api/generate-variants` → `/api/generate-variations` エイリアス検討
- [ ] Prompt 組み立てを `lib/engines/visual-engine/prompt-assembler.ts` に統一
- [ ] `lib/image-prompt.ts` と `lib/visual-director.ts` の重複解消

### 完成条件

- 通常再生成・追加指示付き再生成・4案生成が Phase 5 後も同じ UX で動作
- `app/page.tsx` が 500 行以下に縮小（components + hooks へ移行）
- 画像生成エラーが Scene カード内に個別表示される（現状維持）

### 壊してはいけない既存機能

- Character Lock（再生成時も同一人物維持）
- 追加指示の cinematography のみ変更ルール
- 4案の採用・メイン画像への反映
- 個別ダウンロード

---

## Phase 6: 素材一括出力

### 目的

制作に必要なすべての素材（画像・台本・Scene 一覧・Prompt）を ZIP で一括出力する。

### 実装内容

- [ ] `POST /api/export-project` 新規
- [ ] `lib/engines/export-engine/` 作成
- [ ] ZIP 内容:
  - `images/scene-001.png` 〜（採用画像）
  - `script.txt`（最終台本）
  - `scenes.json`（Scene 一覧）
  - `prompts/scene-001.txt` 〜（finalImagePrompt）
  - `project.json`（Project メタデータ）
- [ ] UI: 「素材を一括出力」ボタン（既存 ZIP ボタンを拡張）

### 完成条件

- 1 クリックで上記 ZIP がダウンロードされる
- 画像なし Scene はスキップ（現 `download-scenes-zip.ts` と同様）
- 台本・Scene データが UTF-8 で正しく出力される

### 壊してはいけない既存機能

- 既存「全画像を ZIP でダウンロード」ボタン（後方互換または統合）
- 個別画像ダウンロード

---

## Phase 7: 動画 Prompt・字幕・音声（将来拡張）

### 目的

静止画素材から動画制作へ橋渡しする機能群。Ver2 MVP には含めない。

### 実装内容（将来）

- [ ] 各 Scene の Ken Burns / パン / ズーム指示 Prompt 生成
- [ ] narration から SRT / VTT 字幕ファイル生成
- [ ] TTS 音声ナレーション生成
- [ ] DaVinci Resolve / Premiere Pro 向け EDL / XML 出力
- [ ] YouTube 章タイムスタンプ自動生成

### 完成条件

- Phase 7 は個別機能ごとに独立した完成条件を設定（本 Phase は計画段階）

### 壊してはいけない既存機能

- Phase 1〜6 で完成した全機能

---

## Phase 間の依存関係

```
Phase 1（型整理）
  ↓
Phase 2（Fact Pack）──→ Phase 3（編集 UI）
                          ↓
                       Phase 4（保存・再開）
                          ↓
                       Phase 5（画像整理）
                          ↓
                       Phase 6（一括出力）
                          ↓
                       Phase 7（将来）
```

Phase 2 と Phase 3 は Phase 1 完了後に **並行可能** だが、Phase 4 以降は Phase 3 の Scene 編集 UI 完成が前提。

---

## 推奨着手順（次のアクション）

1. **Phase 1** — TypeScript エラー修正 + CHARACTER_BIBLE_SCHEMA 共通化
2. **Phase 2** — `/api/generate-fact-pack` + 参考資料入力 UI
3. **Phase 3** — Scene 編集 UI + `app/page.tsx` 分割
