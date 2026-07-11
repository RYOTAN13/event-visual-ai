# Timeline Editor 設計書

Ver2 Phase5 Sprint5 で導入した Timeline Editor の仕様です。

---

## 概要

ユーザーが Scene の順番を変更・複製・削除・追加できる機能です。ドラッグ＆ドロップは未対応（↑↓ ボタンのみ）。

```
Scene 001 → Scene 002 → Scene 003 → ...
     ↑↓      複製      削除      新規Scene追加
```

---

## Scene 番号の自動採番

- 形式: `001`, `002`, `003`, ...（3桁ゼロ埋め）
- 表示: `Scene 001`
- 順番変更・複製・削除・追加のたびに `renumberScenes()` で全体を再採番
- Scene 生成パイプライン完了時・Project 読込時も `normalizeScenes()` で統一

実装: `lib/utils/timeline-editor.ts`

| 関数 | 用途 |
|------|------|
| `formatSceneNumber(index)` | インデックス → `"001"` 形式 |
| `renumberScenes(scenes)` | 配列順に番号を振り直し |
| `normalizeScenes(scenes)` | `timelineId` 補完 + 再採番 |

---

## 順番変更

各 Scene カードの **↑** **↓** ボタンで配列内の位置を入れ替えます。

- ↑ — 1つ上へ（先頭 Scene では無効）
- ↓ — 1つ下へ（末尾 Scene では無効）
- 操作後: 全 Scene を `001` から再採番

```typescript
moveSceneUp(scenes, index)
moveSceneDown(scenes, index)
```

---

## 複製

**複製** ボタンで現在の Scene を直下にコピーします。

コピー対象:

- ナレーション・画像説明・Visual Purpose・Emotion・Characters・追加指示
- Character Bible / Visual Director 各プロンプト
- **生成画像**（`imageUrl`）
- **4案**（`variants`）と **採用状態**（`adoptedVariantIndex`）
- `originalSnapshot`（Scene Editor 用）

新規 `timelineId` を付与し、番号は再採番で決定します。

---

## 削除

**削除** ボタンで Scene を配列から除去します。

- 確認ダイアログ: `Scene 001 を削除しますか？この操作は取り消せません。`
- 削除後: 残り Scene を再採番
- 編集中 state（`fieldEdit`）と再生成中 state はリセット

```typescript
removeSceneAt(scenes, index)
```

---

## Scene 追加

**新規Scene追加** ボタンで、当該 Scene の直下に空 Scene を挿入します。

初期値:

| フィールド | 値 |
|-----------|-----|
| ナレーション | 空 |
| 画像説明 | 空 |
| Visual Purpose | 未設定 |
| Emotion | 未設定 |
| Characters | 空配列 |
| 追加指示 | 空 |
| 画像 / 4案 | なし |

テンプレート Scene から継承:

- `characterBible`, `cinematicDirectorPrompt`, `cameraDirectorPrompt` 等の Director 設定
- `cinematicStyle`, `sceneAge`

```typescript
createEmptySceneFromTemplate(template)
```

---

## 安定 ID（timelineId）

`SceneWithImage.timelineId` — Timeline 操作で `sceneNumber` が変わっても React key を安定させるための UUID 風 ID。

- 新規生成・複製・空 Scene 追加時に付与
- Project 保存・復元対象
- 旧データ（`timelineId` なし）読込時は `ensureTimelineId()` で補完

---

## Project 保存との関係

Project 保存（`StoredProject.scenes`）は `SceneWithImage[]` をそのまま JSON 化します。

Timeline Editor 関連で保存される項目:

- Scene 配列の **順序**
- 各 Scene の **番号**（`sceneNumber`）
- **timelineId**
- 複製された画像・4案
- 空 Scene 追加後の編集内容

読込時は `normalizeScenes()` で番号と `timelineId` を整合します。

---

## 既存機能との関係

| 機能 | 影響 |
|------|------|
| Fact Engine | 変更なし |
| Character Bible | 空 Scene / 複製 Scene で継承 |
| Visual Director | 空 Scene はプロンプト未生成（再生成時に構築） |
| Scene Editor | 変更なし（編集 UI は従来通り） |
| 4案 / 採用 / ZIP | 複製 Scene も含めて動作 |
| Project 保存 | 順序・複製・追加 Scene も保存 |

Timeline 操作時は `fieldEdit` と `regeneratingScenes` をリセットし、Scene Editor / 画像再生成との競合を防ぎます。

---

## ファイル構成

```
lib/utils/timeline-editor.ts   # 順序・複製・削除・追加・採番
app/page.tsx                   # Timeline 操作ハンドラ・UI
lib/types/scene.ts             # timelineId 型
```

---

## 今回のスコープ外

- ドラッグ＆ドロップ
- 複数 Scene の一括操作
- Undo / Redo

---

## 関連ドキュメント

- `docs/SCENE_EDITOR.md` — Scene テキスト編集
- `docs/PROJECT_STORAGE.md` — Project 保存
