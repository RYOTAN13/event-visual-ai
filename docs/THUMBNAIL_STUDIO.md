# Thumbnail Studio Sprint 1

## 概要

Thumbnail Studio は、事件系YouTube動画専用のサムネイル制作機能です。
本編の Fact Pack・台本・Scene・通常画像とは独立した状態で動作します。

画面上部のタブから切り替えます。

- 本編制作（初期表示）
- Thumbnail Studio

## 入力

- 事件名
- 動画タイトル
- サムネ文字
- 人物
- 背景
- 追加指示
- 事件系構図スタイル
- 雰囲気（複数選択）

Thumbnail Studio を初めて開いたとき、事件名はProjectの事件名、動画タイトルは
台本タイトル（なければ事件名）から補完されます。

## サムネ案生成

`POST /api/generate-thumbnail-concepts`

Fact Pack と台本を参照し、次の情報を持つ4案をJSONで生成します。

- キャッチコピー
- 構図
- 人物説明
- 背景説明
- 色方向
- 感情
- CTRを狙う理由
- 背景画像Prompt

### 事実性ルール

- Fact Packまたは台本にない人物・証拠・現場を追加しない
- 外見を検証できない実在人物は、本人の完全再現ではなく匿名の再現人物にする
- 遺体、流血、過度な暴力表現を避ける

## 背景画像生成

`POST /api/generate-thumbnail-image`

各案単位でGPT Imageを呼び出します。他の案には影響しません。
GPT Imageの横長出力（1536×1024）を使い、UIとExportで中央を16:9に
クロップします。通常Scene画像の1024×1024設定は変更しません。

背景画像には文字を描画しません。Promptには以下を常に追加します。

- YouTube thumbnail background
- cinematic documentary
- high contrast
- clear focal point
- large negative space for text
- no readable text
- no logo
- no watermark
- no gore
- no graphic violence

## テキスト編集・プレビュー

サムネ文字はHTML/CSSオーバーレイとして表示します。

- 文字内容
- 文字サイズ
- 文字色
- 縁取り色
- 縁取り太さ
- 影
- 横位置（左・中央・右）
- 縦位置（上・中央・下）

1280×720とYouTube一覧縮小表示を確認できます。

## 保存と読込

`StoredProject.thumbnail` に以下を保存します。

- 入力内容
- 4案
- 生成済み背景画像
- 選択中の案
- サムネ文字
- 文字装飾と位置

以前の保存データに `thumbnail` がない場合はデフォルト状態で復元します。

## ダウンロード

Canvasで背景画像とテキストを1280×720に合成し、PNGまたはJPGで
ダウンロードします。ブラウザ表示中は文字を画像へ焼き込みません。

## Sprint 1 対象外

- SNS分析
- 競合分析
- CTR予測API
- YouTube API
- YouTubeコメント
- X / Reddit連携
- アニメ向けサムネイル
