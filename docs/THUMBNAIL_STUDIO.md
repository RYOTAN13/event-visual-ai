# Thumbnail Studio

## 概要

Thumbnail Studio は、事件系YouTube動画専用のサムネイル制作機能です。
本編の Fact Pack・台本・Scene・通常画像とは独立した状態で動作します。

画面上部のタブから切り替えます。

- 本編制作（初期表示）
- Thumbnail Studio

## 操作フロー

```
入力
↓
「サムネイルを4枚生成」
↓
4枚の完成サムネイルを2×2表示
```

文章案（サムネ案）の確認工程はありません。ボタン1回で
GPT Image を4回並列に呼び出し、4方向のデザインを直接生成します。

## 入力

- 事件名（Projectの事件名を初期値に補完）
- 動画タイトル（空なら台本タイトルまたは事件名を初期値に補完）
- サムネ文字
- 人物
- 背景
- 雰囲気（複数選択）
- 追加指示

## 4枚の固定バリエーション

| ID | 名称 | 方針 |
|----|------|------|
| A | 王道 | 人物アップ、赤・黒・白の高コントラスト、大きな文字余白 |
| B | ドキュメンタリー | Netflix/BBC/NHK風の重厚な映画ポスター構図、暗い背景、抑制された色調 |
| C | 捜査・衝撃 | 事件現場・警察線・資料・証拠品中心、黒＋黄＋赤、過激表現なし |
| D | ミステリー | シルエット・深い影・霧・暗い青、不穏で謎めいた構図 |

## 画像生成

`POST /api/generate-thumbnail-image`

リクエスト: `variation`（A〜D）、入力内容、Fact Pack、台本。
Prompt はサーバー側で構築し、常に以下を含めます。

- YouTube thumbnail
- 16:9 composition
- high contrast
- clear focal point
- strong emotional impact
- large negative space for headline text
- cinematic crime documentary
- no readable text
- no logo
- no watermark
- no gore
- no corpse
- no graphic violence

### 事実性ルール

- Fact Packまたは台本にない人物・証拠・現場を追加しない
- 外見を検証できない実在人物は、本人の完全再現ではなく匿名の再現人物にする

GPT Imageの横長出力（1536×1024）を使い、UIとExportで中央を16:9に
クロップします。通常Scene画像の設定は変更しません。

## 4枚表示

2列×2行で表示し、各カードに以下を配置します。

- ラベル（A 王道／B ドキュメンタリー／C 捜査・衝撃／D ミステリー）
- この画像だけ再生成（同じVariation方針で1枚のみ再生成）
- PNG/JPGダウンロード
- 採用（採用中はバッジと赤枠を表示）

1枚だけ失敗した場合も成功した3枚はそのまま表示し、
失敗カードにはエラーと再生成ボタンだけを表示します。

## サムネ文字

画像生成AIには文字を描画させません。
HTML/CSSオーバーレイとして4枚すべてに同じサムネ文字を重ねます。

- 文字内容
- 文字サイズ
- 文字色
- 縁取り色
- 縁取り太さ
- 影
- 横位置（左・中央・右）
- 縦位置（上・中央・下）

## 保存と読込

`StoredProject.thumbnail` に以下を保存します。

- 入力内容・追加指示・雰囲気
- 4枚の画像とVariation種別
- 採用中のVariation
- サムネ文字と文字装飾

以前の保存データに `thumbnail` がない場合はデフォルト状態で復元します。

## ダウンロード

Canvasで背景画像とテキストを1280×720に合成し、PNGまたはJPGで
ダウンロードします。ブラウザ表示中は文字を画像へ焼き込みません。

## 対象外

- SNS分析
- 競合分析
- CTR予測API
- YouTube API
- YouTubeコメント
- X / Reddit連携
