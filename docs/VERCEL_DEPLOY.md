# Vercel デプロイ手順

Event Visual AI を Vercel に公開するための手順書です。  
**GitHub 連携**と **Vercel CLI** の2通りを説明します。

---

## 事前準備

### 必要なもの

| 項目 | 説明 |
|------|------|
| [GitHub](https://github.com) アカウント | コードを置く場所（GitHub 連携の場合） |
| [Vercel](https://vercel.com) アカウント | ホスティング（GitHub でサインアップ可能） |
| [OpenAI](https://platform.openai.com) API キー | 台本・画像生成に必須 |

### ローカルでビルド確認

デプロイ前に、手元でビルドが通ることを確認してください。

```bash
cd event-visual-ai
npm install
npm run build
```

`✓ Compiled successfully` と表示されれば OK です。

### 環境変数ファイル（ローカル開発用）

```bash
cp .env.example .env
```

`.env` を開き、自分の OpenAI API キーを設定します。

```
OPENAI_API_KEY=sk-xxxxxxxx
```

**重要:** `.env` は Git にコミットしないでください（`.gitignore` に含まれています）。

---

## Vercel で必要な環境変数

Vercel の **Project Settings → Environment Variables** に以下を設定します。

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `OPENAI_API_KEY` | **必須** | OpenAI API キー | `sk-proj-...` |

### 設定する環境（Environment）

| 環境 | 用途 |
|------|------|
| Production | 本番 URL（`xxx.vercel.app`） |
| Preview | プルリクエストごとのプレビュー |
| Development | `vercel dev` ローカル連携 |

通常は **Production** と **Preview** の両方に同じキーを設定してください。

### 秘密情報の扱い

- API キーは **Vercel の環境変数画面** または **CLI** でのみ設定
- コード・GitHub・`.env.example` には **実際のキーを書かない**
- `.env.example` はプレースホルダーのみ（テンプレート用）

---

## プランについて（重要）

このアプリは OpenAI への API 呼び出しに **数十秒〜数分** かかることがあります。

| Vercel プラン | Serverless 関数の最大実行時間 |
|---------------|------------------------------|
| Hobby（無料） | **10 秒** |
| Pro | **最大 300 秒**（本アプリは 300 秒に設定） |

**Hobby プランではタイムアウトで失敗する可能性が高いです。**  
本番運用には **Vercel Pro** を推奨します。

---

## 方法 A: GitHub 連携（おすすめ・初心者向け）

### ステップ 1: GitHub にリポジトリを作る

1. [GitHub](https://github.com/new) で **New repository** をクリック
2. Repository name: 例 `event-visual-ai`
3. **Public** または **Private** を選択
4. **Create repository** をクリック

### ステップ 2: コードを GitHub に push する

プロジェクトフォルダで以下を実行（初回のみ `git init`）。

```bash
cd event-visual-ai
git init
git add .
git commit -m "Initial commit: Event Visual AI"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/event-visual-ai.git
git push -u origin main
```

`.env` がコミットされていないことを確認してください。

```bash
git status
# .env が表示されなければ OK
```

### ステップ 3: Vercel でプロジェクトをインポート

1. [Vercel Dashboard](https://vercel.com/dashboard) を開く
2. **Add New… → Project** をクリック
3. **Import Git Repository** から GitHub リポジトリを選択
4. **Import** をクリック

### ステップ 4: ビルド設定を確認

Vercel が Next.js を自動検出します。以下がそのままで問題ありません。

| 項目 | 値 |
|------|-----|
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Output Directory | （空欄・自動） |
| Install Command | `npm install` |

`vercel.json` も同じ設定を含んでいます。

### ステップ 5: 環境変数を設定

**Environment Variables** セクションで追加:

- **Name:** `OPENAI_API_KEY`
- **Value:** あなたの OpenAI API キー
- **Environment:** Production, Preview にチェック

### ステップ 6: Deploy

**Deploy** をクリックします。  
数分後、`https://event-visual-ai-xxx.vercel.app` のような URL が発行されます。

### ステップ 7: 動作確認

1. 発行された URL をブラウザで開く
2. 事件名を入力して「生成する」を試す
3. エラーが出る場合は Vercel の **Deployments → Functions ログ** を確認

### 以降の更新

```bash
git add .
git commit -m "更新内容の説明"
git push
```

push するたびに Vercel が自動で再デプロイします。

---

## 方法 B: Vercel CLI

ターミナルから直接デプロイする方法です。

### ステップ 1: Vercel CLI をインストール

```bash
npm install -g vercel
```

### ステップ 2: ログイン

```bash
vercel login
```

表示される URL をブラウザで開き、認証します。

### ステップ 3: プロジェクトフォルダへ移動

```bash
cd event-visual-ai
```

### ステップ 4: 初回デプロイ（プレビュー）

```bash
vercel
```

対話形式で質問されます。

| 質問 | おすすめ回答 |
|------|-------------|
| Set up and deploy? | **Y** |
| Which scope? | 自分のアカウント |
| Link to existing project? | **N**（初回） |
| Project name? | `event-visual-ai` |
| Directory? | **./**（Enter） |
| Override settings? | **N** |

### ステップ 5: 環境変数を設定

```bash
vercel env add OPENAI_API_KEY
```

- **Value:** API キーを入力
- **Environment:** Production, Preview, Development を選択

確認:

```bash
vercel env ls
```

### ステップ 6: 本番デプロイ

```bash
vercel --prod
```

本番 URL が表示されます。

### ローカルで Vercel 環境を再現（任意）

```bash
vercel dev
```

Vercel 側の環境変数を読み込んで `localhost:3000` で起動します。

---

## プロジェクト構成（Vercel 関連）

```
event-visual-ai/
├── .env.example          # 環境変数テンプレート（Git 管理 OK）
├── .env                  # ローカル専用（Git 管理 NG）
├── vercel.json           # Vercel 設定（リージョン: 東京 hnd1）
├── next.config.ts        # Next.js 設定
└── lib/vercel/
    └── api-route-config.ts  # API タイムアウト 300 秒
```

---

## トラブルシューティング

### ビルドが失敗する

```bash
rm -rf .next node_modules/.cache
npm install
npm run build
```

ローカルで成功してから再度 push / `vercel --prod` してください。

### `OPENAI_API_KEY is not configured` と表示される

- Vercel の Environment Variables に `OPENAI_API_KEY` が設定されているか確認
- 設定後は **Redeploy**（再デプロイ）が必要

### API が 504 / タイムアウトする

- Hobby プラン（10 秒制限）の可能性 → **Pro プラン**を検討
- OpenAI 側の混雑・レート制限も確認

### 親ディレクトリの lockfile 警告

`next.config.ts` の `outputFileTracingRoot` で対応済みです。  
プロジェクト直下（`event-visual-ai/`）からデプロイしてください。

---

## チェックリスト

デプロイ前の最終確認:

- [ ] `npm run build` がローカルで成功する
- [ ] `.env` を Git にコミットしていない
- [ ] Vercel に `OPENAI_API_KEY` を設定した
- [ ] Production / Preview 両方に環境変数を付けた（GitHub 連携時）
- [ ] 長時間処理のため Vercel Pro を検討した

---

## 参考リンク

- [Vercel – Next.js ドキュメント](https://vercel.com/docs/frameworks/nextjs)
- [Vercel – 環境変数](https://vercel.com/docs/projects/environment-variables)
- [OpenAI API キー](https://platform.openai.com/api-keys)
