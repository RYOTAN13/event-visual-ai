# Cursor 開発ルール（Event Visual AI）

本ドキュメントは、Cursor AI が Event Visual AI プロジェクトを編集する際に **必ず守るルール** を定義します。  
`.cursor/rules/` にルールとして登録することを推奨します。

---

## 1. 編集前の確認

- **既存機能を確認してから編集する**
  - 変更対象ファイルと関連ファイル（型・API・UI）を Read してから着手する
  - `docs/CURRENT_STATUS.md` と `docs/API_SPEC.md` を参照する
- **変更前に対象ファイルを確認する**
  - 推測で実装せず、実際のコード・型・import を確認する

---

## 2. 変更の粒度

- **全面書き換えを避ける**
  - `app/page.tsx` の全置換は禁止。必要な関数・state・JSX だけを変更する
- **一度に大規模変更を行わない**
  - 1 回の変更は 1 機能 / 1 Phase の範囲に収める
- **新機能は小さく実装して動作確認する**
  - API 追加 → 型追加 → UI 接続 → TypeScript チェック、の順で進める

---

## 3. 重複・再利用

- **同じ機能を重複実装しない**
  - 新 API を作る前に `app/api/` 一覧を確認する
  - 新 lib を作る前に `lib/` 一覧を確認する
- **既存の型と API を再利用する**
  - `lib/types.ts` / `lib/character-bible.ts` / `lib/scene-count.ts` を優先利用
  - `CHARACTER_BIBLE_SCHEMA` 等の重複を増やさない（共通化を優先）

---

## 4. STEP 番号について

- **STEP 番号だけを根拠に実装しない**
  - ユーザーの STEP 指示は要件の参考。実際のコード状態を確認してから実装する
  - 過去の STEP で実装済みの機能を再実装しない

---

## 5. 既存機能の保護

以下の機能は **いかなる変更でも壊さない**:

| 機能 | 関連ファイル |
|------|------------|
| 台本生成・編集・再生成 | `/api/generate-script`, `app/page.tsx` |
| 台本 → Scene 分解 | `/api/generate-scenes-from-script` |
| Cinematic Director | `/api/generate-cinematic-direction`, `lib/cinematic-director.ts` |
| Camera Director | `/api/generate-camera-direction`, `lib/camera-director.ts` |
| Visual Director | `/api/generate-visual-direction`, `lib/visual-director.ts` |
| Master Director | `/api/generate-master-direction`, `lib/master-director.ts` |
| Character Bible / Lock | `lib/character-bible.ts` |
| 画像生成 | `/api/generate-image` |
| 通常再生成 | `app/page.tsx` → `handleRegenerateImage` |
| 追加指示付き再生成 | `/api/integrate-instruction` |
| 4案生成・採用 | `/api/generate-variants` |
| 個別ダウンロード | `handleDownloadImage` |
| ZIP ダウンロード | `lib/download-scenes-zip.ts` |
| シーン数 5 / 10 / 20 | `lib/scene-count.ts` |
| Scene ごとのエラー表示 | `app/page.tsx` の per-scene error |

---

## 6. セキュリティ

- **API キーをコードへ直接書かない**
  - `process.env.OPENAI_API_KEY` のみ使用
  - `.env` ファイルを git にコミットしない
- **秘密情報をログ表示しない**
  - `console.log(apiKey)` 等は禁止
  - エラーメッセージに API キーを含めない

---

## 7. 品質チェック

- **変更後に TypeScript エラーを確認する**
  ```bash
  npx tsc --noEmit
  ```
- **新規ファイル追加時は import パスを `@/` エイリアスで統一**
- **既存の命名規則に従う**
  - Scene 番号: `"Scene 001"` 形式（`lib/scene-count.ts`）
  - API Route: `app/api/{kebab-case}/route.ts`
  - lib ファイル: `lib/{kebab-case}.ts`

---

## 8. UI / UX

- **Netflix 風ダークテーマを維持する**
  - 新 UI は `app/page.module.css` の既存クラスを再利用
- **進捗表示を壊さない**
  - 3 ステップインジケーター（台本 → Scene → 画像）を維持
  - `loadingPhase` の追加時は progressLabel / progressPercent も更新
- **20 Scene でも UI が使えること**
  - 1 Scene ずつ処理するループ構造を維持

---

## 9. ドキュメント

- **大きな機能追加後は docs/ を更新する**
  - 新 API → `docs/API_SPEC.md`
  - 新型 → `docs/DATA_MODELS.md`
  - 完成状況 → `docs/CURRENT_STATUS.md`
- **設計書のみの変更依頼ではアプリコードを変更しない**

---

## 10. Git / コミット

- **コミットはユーザーが明示的に依頼した場合のみ**
- **破壊的 git 操作（force push, hard reset）は禁止**
- **コミットメッセージは変更の「why」を簡潔に**

---

## 11. 説明の仕方

- **初心者でも理解できる言葉で変更内容を説明する**
  - 内部識別子の羅列より、何が変わってユーザーに何が起きるかを書く
- **コード引用は ```startLine:endLine:filepath 形式を使う**

---

## 12. Ver2 開発時の追加ルール

- **Ver2 の型（`docs/DATA_MODELS.md`）に段階的に移行する**
  - 一度に全型を置き換えない
- **Engine 分割は Phase 1〜5 に従って進める**
  - いきなり `lib/engines/` 全体を作らない
- **Fact Pack 実装時は台本なしパス（事件名のみ）を残す**
- **Project 保存時に base64 画像はオプション扱い**（ファイルサイズ対策）

---

## クイックチェックリスト（変更完了前）

```
□ 変更対象ファイルを Read した
□ 既存 API / 型との重複がない
□ 既存の画像生成フローが動く
□ npx tsc --noEmit を実行した
□ 秘密情報をコードに書いていない
□ app/page.tsx を不必要に大きくしていない
□ docs/ の更新が必要なら更新した
```
