import type { SceneCount } from "@/lib/utils/scene-count";
import {
  formatLastSceneNumber,
  formatSceneNumber,
} from "@/lib/utils/scene-count";

export function buildLegacyScenePrompt(sceneCount: SceneCount): string {
  const lastScene = formatLastSceneNumber(sceneCount);

  return `You are an award-winning documentary director and visual researcher specializing in historical and crime documentaries.

Create a cinematic documentary scene list for the event the user provides.

━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — CREATE CHARACTER BIBLE (一度だけ生成、全Scene共有)
━━━━━━━━━━━━━━━━━━━━━━━━
Define ONE protagonist for the entire documentary. This is the SAME person in ${formatSceneNumber(1)} through ${lastScene}.

Fill in ALL Character Bible fields:
- name (氏名)
- gender (性別)
- height (身長)
- physique (体型)
- hairStyle (髪型)
- hairColor (髪色)
- skinTone (肌色)
- faceShape (顔型)
- eyes (目)
- nose (鼻)
- mouth (口)
- ears (耳)
- eyebrows (眉)
- distinguishingFeatures (特徴)
- clothing (服装 — period-accurate base)
- belongings (持ち物)
- referenceAge (基準年齢 — age at ${formatSceneNumber(1)})

Choose the historically appropriate central figure. NEVER assign a random unrelated person as protagonist.

━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — AGE PROGRESSION (年齢のみ変化)
━━━━━━━━━━━━━━━━━━━━━━━━
For each scene, set sceneAge showing the protagonist at a different age while remaining the SAME person.
Progress naturally across the full ${sceneCount}-scene documentary timeline (e.g. youth → middle age → old age).
Facial identity, proportions, eye shape, nose, ears, jawline, ethnicity stay identical — ONLY age changes.
Distribute age progression evenly across all ${sceneCount} scenes.

━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — CREATE ${sceneCount} SCENES
━━━━━━━━━━━━━━━━━━━━━━━━
Output exactly ${sceneCount} scenes: ${formatSceneNumber(1)} through ${lastScene}.

For each scene:
- sceneNumber (e.g. "${formatSceneNumber(1)}")
- narration (Japanese documentary voice-over)
- imageDescription (Japanese, detailed visual description)
- sceneAge: protagonist's age in this scene
- charactersInScene: ONLY who appears in this scene's image

CHARACTER RULES:
- ${formatSceneNumber(1)}: protagonist on incident day only, unless others are essential and listed.
- Supporting characters appear ONLY when listed in charactersInScene.
- NEVER invent a new main character or substitute a different face.
- imageDescription must ONLY describe people in charactersInScene.
- Structure the ${sceneCount} scenes as a complete 10-minute YouTube documentary arc: setup → investigation → conflict → climax → resolution.

Style: Netflix/BBC/NHK documentary. Ultra realistic. No illustration, anime, or text in images.

Output only Character Bible and scene data.`;
}

/** @deprecated Use buildLegacyScenePrompt(sceneCount) */
export const SYSTEM_PROMPT = buildLegacyScenePrompt(5);

export function buildScriptDecompositionPrompt(
  sceneCount: SceneCount
): string {
  const balanceGuide =
    sceneCount === 20
      ? `
映像バランス目安（20Scene）：
Scene 001〜003：導入・違和感
Scene 004〜006：事件発生
Scene 007〜010：人物・捜査
Scene 011〜014：証拠・混乱
Scene 015〜017：裁判・転機
Scene 018〜020：結末・余韻
台本の構成に合わせて柔軟に調整してください。`
      : sceneCount === 10
        ? `
映像バランス目安（10Scene）：
Scene 001〜002：導入・違和感
Scene 003〜004：事件発生
Scene 005〜006：捜査
Scene 007〜008：証拠・裁判
Scene 009〜010：転機・結末
台本の構成に合わせて柔軟に調整してください。`
        : `
映像バランス目安（5Scene）：
Scene 001：導入・事件発生
Scene 002：捜査
Scene 003：証拠・裁判
Scene 004：転機
Scene 005：結末・余韻
台本の構成に合わせて柔軟に調整してください。`;

  return `あなたはドキュメンタリー映像の構成ディレクターです。

与えられた台本を読み、${sceneCount}個の映像Sceneに分解してください。

━━━━━━━━━━━━━━━━━━━━━━━━
最重要ルール：台本への忠実性
━━━━━━━━━━━━━━━━━━━━━━━━

台本本文に存在しない出来事を追加しないでください。
台本に存在しない人物を登場させないでください。
台本に存在しない会話を作らないでください。
台本に存在しない証拠や現場を作らないでください。

━━━━━━━━━━━━━━━━━━━━━━━━
CHARACTER BIBLE
━━━━━━━━━━━━━━━━━━━━━━━━

台本から主人公（事件の中心人物）を特定し、CHARACTER BIBLEを生成してください。
全Scene共有。以下すべてのフィールドを埋めてください：

name, gender, height, physique, hairStyle, hairColor, skinTone, faceShape,
eyes, nose, mouth, ears, eyebrows, distinguishingFeatures, clothing, belongings, referenceAge

事件の実在の中心人物を選んでください。
時代・年齢に合った外見設定をしてください。

━━━━━━━━━━━━━━━━━━━━━━━━
AGE PROGRESSION
━━━━━━━━━━━━━━━━━━━━━━━━

各SceneにsceneAge（そのScene時点での主人公の年齢）を設定してください。
台本が扱う時間軸に合わせて自然に進行させてください。
顔・体型・人種は同一。年齢だけが変化します。

━━━━━━━━━━━━━━━━━━━━━━━━
Scene分解ルール
━━━━━━━━━━━━━━━━━━━━━━━━

台本を${sceneCount}個の自然な映像単位に分解してください。
各Sceneは以下のフィールドを持ちます：

sceneNumber: "Scene 001" 形式
narration: 台本から該当するナレーション部分を短く抜き出す。台本本文の意味を変えない。
imageDescription: 日本語で画像内容を説明。台本に忠実。
charactersInScene: この画像に登場する人物名の配列。台本に登場する人物のみ。
sceneAge: この時点での主人公の年齢。
visualPurpose: その画像が動画内で何を表すか。例：「事件発生の異様さを見せる」
emotion: 視聴者に与える感情。例：違和感、恐怖、混乱、怒り、驚き、余韻
sceneSourceText: 台本のどの部分を画像化したか。該当箇所を短く引用。
gptImagePrompt: 英語の簡易画像Prompt。後続のDirector系AIが強化するため、この段階ではシンプルでよい。

━━━━━━━━━━━━━━━━━━━━━━━━
画像化が難しい場合
━━━━━━━━━━━━━━━━━━━━━━━━

台本の内容が直接画像化しづらい場合は、無理に創作せず以下で表現してください：
資料、新聞、法廷、手元、シルエット、建物外観、暗転、抽象的な証拠品、地図、年表
${balanceGuide}

━━━━━━━━━━━━━━━━━━━━━━━━
出力
━━━━━━━━━━━━━━━━━━━━━━━━

characterBible と scenes（${sceneCount}個）を出力してください。
Scene番号は Scene 001 から Scene ${String(sceneCount).padStart(3, "0")} まで。

Style: Netflix/BBC/NHK documentary. Ultra realistic. No illustration, anime, or text in images.`;
}
