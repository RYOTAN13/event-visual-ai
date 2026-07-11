# Fact Engine 設計書

Ver2 Phase2 Sprint2 で導入した Fact Engine の仕様です。

---

## 概要

Fact Engine は、事件名から **Fact Pack（構造化された事実データ）** を生成し、台本生成の根拠データとして利用するモジュールです。

```
事件名
  ↓
Fact Pack 生成（/api/generate-fact-pack）
  ↓
台本生成（/api/generate-script + Fact Pack）
  ↓
台本レビュー・編集
  ↓
Scene 分解
  ↓
画像生成
```

---

## Fact Pack 構造

型定義: `lib/types/fact-pack.ts`（再エクスポート: `types/FactPack.ts`）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `title` | `string` | 事件の正式名称または一般的呼称 |
| `summary` | `string` | 事件概要（200〜400文字） |
| `timeline` | `{ date, event }[]` | 主要な時系列 |
| `people` | `{ name, role }[]` | 関係者と立場 |
| `locations` | `string[]` | 関連する場所 |
| `evidence` | `string[]` | 主要な証拠・資料 |
| `investigation` | `string` | 捜査の概要と経緯 |
| `trial` | `string` | 裁判・判決の概要 |
| `importantFacts` | `string[]` | 台本で押さえるべき重要事実 |
| `warnings` | `string[]` | 不確実な情報・論争点 |

---

## 生成フロー

### 1. Fact Pack 生成

- **API:** `POST /api/generate-fact-pack`
- **入力:** `{ "incidentName": "事件名" }`
- **出力:** `FactPack` JSON
- **実装:** `lib/fact-engine/generate-fact-pack.ts`
- **プロンプト:** `lib/prompts/fact-pack-prompt.ts`
- **モデル:** `gpt-5.5`（`TEXT_MODEL`）

### 2. 台本生成

- **API:** `POST /api/generate-script`
- **入力:** `{ "factPack": FactPack }`（事件名は渡さない）
- **プロンプト:** Fact Pack を JSON として user メッセージに含める
- **関数:** `buildScriptUserPromptFromFactPack()` in `lib/prompts/script-prompt.ts`

### 3. フロントエンド

- `app/page.tsx` が Fact Pack 生成 → 台本生成を順次呼び出す
- Fact Pack は `factPack` state に保持（画面には表示しない）
- 進捗表示: Fact Pack生成中 → 台本生成中 → Scene生成中 → 画像生成中

---

## モジュール構成

```
lib/
├── fact-engine/
│   └── generate-fact-pack.ts   # 生成ロジック（差し替え境界）
├── prompts/
│   ├── fact-pack-prompt.ts     # Fact Pack 用プロンプト
│   └── script-prompt.ts        # 台本用プロンプト（Fact Pack 入力）
└── types/
    └── fact-pack.ts            # 型 + JSON Schema

app/api/
├── generate-fact-pack/route.ts # Fact Pack API
└── generate-script/route.ts    # 台本 API（Fact Pack 必須）
```

---

## 今後 Wikipedia へ置き換える箇所

**差し替えポイント:** `lib/fact-engine/generate-fact-pack.ts`

現在は OpenAI のみで Fact Pack を生成しています。外部ソース導入時は、この関数の内部を以下のように拡張します。

```typescript
// 将来のイメージ
export async function generateFactPack(
  openai: OpenAI,
  incidentName: string,
  options?: { sources?: ExternalSource[] }
): Promise<FactPack> {
  // 1. 外部ソースから生データ取得（Wikipedia API 等）
  const rawSources = await fetchExternalSources(incidentName, options?.sources);

  // 2. 生データ + OpenAI で Fact Pack に構造化
  return structureFactPack(openai, incidentName, rawSources);
}
```

**API ルート** (`app/api/generate-fact-pack/route.ts`) は `generateFactPack()` を呼ぶだけに保ち、外部取得の詳細は Fact Engine 内に閉じ込めます。

---

## 外部ソース対応方法

### 推奨アーキテクチャ

1. **`lib/fact-engine/sources/`** — 外部ソースアダプター
   - `wikipedia.ts` — Wikipedia API クライアント
   - `url-fetcher.ts` — 任意 URL の本文取得
   - `types.ts` — `ExternalSource`, `RawSourceDocument` 等

2. **`lib/fact-engine/merge-sources.ts`** — 複数ソースの統合・重複排除

3. **`lib/fact-engine/structure-fact-pack.ts`** — 生データ → Fact Pack への LLM 構造化

4. **入力拡張（将来）**
   ```json
   {
     "incidentName": "袴田事件",
     "sources": [
       { "type": "url", "content": "https://..." },
       { "type": "text", "content": "参考テキスト..." }
     ]
   }
   ```

### 設計原則

- **単一入口:** すべての Fact Pack 生成は `generateFactPack()` 経由
- **ソース非依存の出力:** 外部ソースの有無に関わらず `FactPack` 型は同一
- **warnings の活用:** 外部ソース間の矛盾・不確実性は `warnings` に記録
- **台本側は変更不要:** Script 生成は引き続き `FactPack` のみを入力とする

---

## 今回のスコープ外

- Wikipedia API 等の外部データ取得
- Fact Pack の画面表示・編集 UI
- 参考資料入力 UI
- Scene / 画像生成パイプラインの変更

---

## 関連ドキュメント

- `docs/DATA_MODELS.md` — Ver2 全体のデータモデル（FactPack の拡張版定義含む）
- `docs/API_SPEC.md` — API 一覧
- `docs/VER2_ROADMAP.md` — Phase2 ロードマップ
