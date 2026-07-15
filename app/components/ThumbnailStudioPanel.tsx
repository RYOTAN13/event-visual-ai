"use client";

import {
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FactPack } from "@/lib/types";
import {
  THUMBNAIL_COMPOSITION_STYLES,
  THUMBNAIL_MOODS,
  type ThumbnailConcept,
  type ThumbnailHorizontalAlign,
  type ThumbnailMood,
  type ThumbnailStudioState,
  type ThumbnailVerticalAlign,
} from "@/lib/types/thumbnail-studio";
import { downloadThumbnail } from "@/lib/thumbnail-studio/export-thumbnail";
import styles from "./ThumbnailStudioPanel.module.css";

type Props = {
  value: ThumbnailStudioState;
  factPack: FactPack | null;
  script: string;
  onChange: Dispatch<SetStateAction<ThumbnailStudioState>>;
};

function ThumbnailCanvas({
  concept,
  state,
  compact = false,
}: {
  concept: ThumbnailConcept;
  state: ThumbnailStudioState;
  compact?: boolean;
}) {
  const textStyle = {
    "--thumbnail-color": state.textStyle.color,
    "--thumbnail-outline": state.textStyle.outlineColor,
    "--thumbnail-outline-width": `${Math.max(
      0,
      state.textStyle.outlineWidth / 4
    )}px`,
    "--thumbnail-font-size": `${state.textStyle.fontSize / 12}cqw`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.thumbnailCanvas} ${
        compact ? styles.thumbnailCanvasCompact : ""
      }`}
      style={textStyle}
    >
      {concept.imageUrl ? (
        <img
          className={styles.thumbnailImage}
          src={concept.imageUrl}
          alt=""
          draggable={false}
        />
      ) : (
        <div className={styles.thumbnailPlaceholder}>16:9</div>
      )}
      <span
        className={[
          styles.thumbnailText,
          styles[`horizontal_${state.textStyle.horizontalAlign}`],
          styles[`vertical_${state.textStyle.verticalAlign}`],
          state.textStyle.shadow ? styles.thumbnailTextShadow : "",
        ].join(" ")}
      >
        {state.thumbnailText}
      </span>
    </div>
  );
}

export function ThumbnailStudioPanel({
  value,
  factPack,
  script,
  onChange,
}: Props) {
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [conceptsError, setConceptsError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const selectedConcept =
    value.concepts.find(
      (concept) => concept.id === value.selectedConceptId
    ) ?? null;

  function updateState(patch: Partial<ThumbnailStudioState>) {
    onChange((current) => ({ ...current, ...patch }));
  }

  function updateConcept(id: string, patch: Partial<ThumbnailConcept>) {
    onChange((current) => ({
      ...current,
      concepts: current.concepts.map((concept) =>
        concept.id === id ? { ...concept, ...patch } : concept
      ),
    }));
  }

  function toggleMood(mood: ThumbnailMood) {
    updateState({
      moods: value.moods.includes(mood)
        ? value.moods.filter((item) => item !== mood)
        : [...value.moods, mood],
    });
  }

  async function handleGenerateConcepts() {
    if (
      !value.caseName.trim() ||
      !value.videoTitle.trim() ||
      !value.thumbnailText.trim()
    ) {
      setConceptsError(
        "事件名・動画タイトル・サムネ文字を入力してください。"
      );
      return;
    }

    setConceptsLoading(true);
    setConceptsError("");

    try {
      const response = await fetch("/api/generate-thumbnail-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseName: value.caseName,
          videoTitle: value.videoTitle,
          thumbnailText: value.thumbnailText,
          person: value.person,
          background: value.background,
          compositionStyle: value.compositionStyle,
          moods: value.moods,
          additionalInstruction: value.additionalInstruction,
          factPack,
          script,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "サムネ案の生成に失敗しました。");
      }

      const concepts: ThumbnailConcept[] = data.concepts.map(
        (concept: Omit<
          ThumbnailConcept,
          "imageUrl" | "imageLoading" | "imageError"
        >) => ({
          ...concept,
          imageUrl: null,
          imageLoading: false,
          imageError: null,
        })
      );

      updateState({
        concepts,
        selectedConceptId: concepts[0]?.id ?? null,
      });
    } catch (error) {
      setConceptsError(
        error instanceof Error ? error.message : "サムネ案の生成に失敗しました。"
      );
    } finally {
      setConceptsLoading(false);
    }
  }

  async function handleGenerateBackground(concept: ThumbnailConcept) {
    updateConcept(concept.id, { imageLoading: true, imageError: null });

    try {
      const response = await fetch("/api/generate-thumbnail-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: concept.imagePrompt,
          additionalInstruction: value.additionalInstruction,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "背景画像の生成に失敗しました。");
      }

      onChange((current) => ({
        ...current,
        selectedConceptId: concept.id,
        concepts: current.concepts.map((item) =>
          item.id === concept.id
            ? {
                ...item,
                imageUrl: data.imageUrl,
                imageLoading: false,
                imageError: null,
              }
            : item
        ),
      }));
    } catch (error) {
      updateConcept(concept.id, {
        imageLoading: false,
        imageError:
          error instanceof Error
            ? error.message
            : "背景画像の生成に失敗しました。",
      });
    }
  }

  async function handleDownload(format: "png" | "jpg") {
    if (!selectedConcept?.imageUrl) return;
    setDownloadError("");

    try {
      const safeName =
        value.caseName
          .trim()
          .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]+/g, "-")
          .replace(/^-+|-+$/g, "") || "thumbnail";
      await downloadThumbnail(
        selectedConcept.imageUrl,
        value.thumbnailText,
        value.textStyle,
        format,
        `${safeName}-thumbnail`
      );
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "ダウンロードに失敗しました。"
      );
    }
  }

  return (
    <section className={styles.studio}>
      <div className={styles.hero}>
        <span className={styles.version}>VER 2.2 · SPRINT 1</span>
        <h2>Thumbnail Studio</h2>
        <p>事件系YouTube動画専用。事実性を維持した4つのサムネ案を設計します。</p>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>事件名 *</span>
            <input
              value={value.caseName}
              onChange={(event) =>
                updateState({ caseName: event.target.value })
              }
              placeholder="例：袴田事件"
            />
          </label>
          <label className={styles.field}>
            <span>動画タイトル *</span>
            <input
              value={value.videoTitle}
              onChange={(event) =>
                updateState({ videoTitle: event.target.value })
              }
              placeholder="台本タイトルまたは動画タイトル"
            />
          </label>
          <label className={styles.field}>
            <span>サムネ文字 *</span>
            <input
              value={value.thumbnailText}
              onChange={(event) =>
                updateState({ thumbnailText: event.target.value })
              }
              placeholder="例：58年後の無罪"
            />
            <small>
              例：警察は何をした／人生を奪われた男／証拠は捏造だった
            </small>
          </label>
          <label className={styles.field}>
            <span>人物</span>
            <input
              value={value.person}
              onChange={(event) => updateState({ person: event.target.value })}
              placeholder="例：匿名の再現人物、弁護士"
            />
          </label>
          <label className={styles.field}>
            <span>背景</span>
            <input
              value={value.background}
              onChange={(event) =>
                updateState({ background: event.target.value })
              }
              placeholder="例：事件当時の街並み、法廷"
            />
          </label>
          <label className={styles.field}>
            <span>構図スタイル</span>
            <select
              value={value.compositionStyle}
              onChange={(event) =>
                updateState({
                  compositionStyle: event.target
                    .value as ThumbnailStudioState["compositionStyle"],
                })
              }
            >
              {THUMBNAIL_COMPOSITION_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.moodField}>
          <legend>雰囲気（複数選択）</legend>
          <div className={styles.moodGrid}>
            {THUMBNAIL_MOODS.map((mood) => (
              <label
                key={mood}
                className={`${styles.moodChip} ${
                  value.moods.includes(mood) ? styles.moodChipActive : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={value.moods.includes(mood)}
                  onChange={() => toggleMood(mood)}
                />
                {mood}
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.field}>
          <span>追加指示</span>
          <textarea
            value={value.additionalInstruction}
            onChange={(event) =>
              updateState({ additionalInstruction: event.target.value })
            }
            placeholder="例：赤を強く、人物の表情は抑制的に、法廷を暗く..."
            rows={3}
          />
        </label>

        <button
          type="button"
          className={styles.conceptButton}
          onClick={handleGenerateConcepts}
          disabled={conceptsLoading}
        >
          {conceptsLoading ? "4案を設計中..." : "サムネ案を4案生成"}
        </button>
        {conceptsError && <p className={styles.error}>{conceptsError}</p>}
      </div>

      {value.concepts.length > 0 && (
        <div className={styles.concepts}>
          <h3>サムネ案</h3>
          <div className={styles.conceptGrid}>
            {value.concepts.map((concept, index) => (
              <article
                key={concept.id}
                className={`${styles.conceptCard} ${
                  value.selectedConceptId === concept.id
                    ? styles.conceptCardSelected
                    : ""
                }`}
              >
                <div className={styles.conceptHeader}>
                  <span>案 {index + 1}</span>
                  {value.selectedConceptId === concept.id && (
                    <b>選択中</b>
                  )}
                </div>

                {concept.imageUrl && (
                  <button
                    type="button"
                    className={styles.cardImageButton}
                    onClick={() =>
                      updateState({ selectedConceptId: concept.id })
                    }
                    aria-label={`案 ${index + 1} を選択`}
                  >
                    <ThumbnailCanvas concept={concept} state={value} compact />
                  </button>
                )}

                <h4>{concept.catchCopy}</h4>
                <dl className={styles.conceptDetails}>
                  <div>
                    <dt>構図</dt>
                    <dd>{concept.composition}</dd>
                  </div>
                  <div>
                    <dt>人物</dt>
                    <dd>{concept.subjectDescription}</dd>
                  </div>
                  <div>
                    <dt>背景</dt>
                    <dd>{concept.backgroundDescription}</dd>
                  </div>
                  <div>
                    <dt>色</dt>
                    <dd>{concept.colorDirection}</dd>
                  </div>
                  <div>
                    <dt>感情</dt>
                    <dd>{concept.emotion}</dd>
                  </div>
                  <div>
                    <dt>CTRを狙う理由</dt>
                    <dd>{concept.ctrReason}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className={styles.backgroundButton}
                  onClick={() => handleGenerateBackground(concept)}
                  disabled={concept.imageLoading}
                >
                  {concept.imageLoading
                    ? "背景画像を生成中..."
                    : concept.imageUrl
                      ? "この案で背景画像を再生成"
                      : "この案で背景画像を生成"}
                </button>

                {concept.imageError && (
                  <div className={styles.cardError}>
                    <p>{concept.imageError}</p>
                    <button
                      type="button"
                      onClick={() => handleGenerateBackground(concept)}
                    >
                      もう一度生成
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedConcept?.imageUrl && (
        <div className={styles.editor}>
          <div className={styles.editorHeader}>
            <div>
              <span>SELECTED CONCEPT</span>
              <h3>サムネ文字・レイアウト編集</h3>
            </div>
          </div>

          <div className={styles.largePreview}>
            <ThumbnailCanvas concept={selectedConcept} state={value} />
          </div>

          <div className={styles.textControls}>
            <label className={styles.field}>
              <span>文字内容</span>
              <input
                value={value.thumbnailText}
                onChange={(event) =>
                  updateState({ thumbnailText: event.target.value })
                }
              />
            </label>

            <label className={styles.rangeField}>
              <span>文字サイズ：{value.textStyle.fontSize}px</span>
              <input
                type="range"
                min="48"
                max="160"
                step="2"
                value={value.textStyle.fontSize}
                onChange={(event) =>
                  updateState({
                    textStyle: {
                      ...value.textStyle,
                      fontSize: Number(event.target.value),
                    },
                  })
                }
              />
            </label>

            <label className={styles.colorField}>
              <span>文字色</span>
              <input
                type="color"
                value={value.textStyle.color}
                onChange={(event) =>
                  updateState({
                    textStyle: {
                      ...value.textStyle,
                      color: event.target.value,
                    },
                  })
                }
              />
            </label>

            <label className={styles.colorField}>
              <span>縁取り色</span>
              <input
                type="color"
                value={value.textStyle.outlineColor}
                onChange={(event) =>
                  updateState({
                    textStyle: {
                      ...value.textStyle,
                      outlineColor: event.target.value,
                    },
                  })
                }
              />
            </label>

            <label className={styles.rangeField}>
              <span>縁取り太さ：{value.textStyle.outlineWidth}px</span>
              <input
                type="range"
                min="0"
                max="24"
                value={value.textStyle.outlineWidth}
                onChange={(event) =>
                  updateState({
                    textStyle: {
                      ...value.textStyle,
                      outlineWidth: Number(event.target.value),
                    },
                  })
                }
              />
            </label>

            <label className={styles.checkField}>
              <input
                type="checkbox"
                checked={value.textStyle.shadow}
                onChange={(event) =>
                  updateState({
                    textStyle: {
                      ...value.textStyle,
                      shadow: event.target.checked,
                    },
                  })
                }
              />
              影を付ける
            </label>
          </div>

          <div className={styles.positionControls}>
            <div>
              <span>横位置</span>
              {(["left", "center", "right"] as ThumbnailHorizontalAlign[]).map(
                (align) => (
                  <button
                    key={align}
                    type="button"
                    className={
                      value.textStyle.horizontalAlign === align
                        ? styles.positionActive
                        : ""
                    }
                    onClick={() =>
                      updateState({
                        textStyle: {
                          ...value.textStyle,
                          horizontalAlign: align,
                        },
                      })
                    }
                  >
                    {align === "left"
                      ? "左寄せ"
                      : align === "center"
                        ? "中央"
                        : "右寄せ"}
                  </button>
                )
              )}
            </div>
            <div>
              <span>縦位置</span>
              {(["top", "center", "bottom"] as ThumbnailVerticalAlign[]).map(
                (align) => (
                  <button
                    key={align}
                    type="button"
                    className={
                      value.textStyle.verticalAlign === align
                        ? styles.positionActive
                        : ""
                    }
                    onClick={() =>
                      updateState({
                        textStyle: {
                          ...value.textStyle,
                          verticalAlign: align,
                        },
                      })
                    }
                  >
                    {align === "top"
                      ? "上"
                      : align === "center"
                        ? "中央"
                        : "下"}
                  </button>
                )
              )}
            </div>
          </div>

          <div className={styles.previewSection}>
            <h3>プレビュー</h3>
            <div className={styles.previewGrid}>
              <div>
                <span>1280 × 720</span>
                <ThumbnailCanvas concept={selectedConcept} state={value} />
              </div>
              <div>
                <span>YouTube一覧縮小表示</span>
                <ThumbnailCanvas
                  concept={selectedConcept}
                  state={value}
                  compact
                />
              </div>
            </div>
          </div>

          <div className={styles.downloadActions}>
            <button type="button" onClick={() => handleDownload("png")}>
              PNGダウンロード
            </button>
            <button type="button" onClick={() => handleDownload("jpg")}>
              JPGダウンロード
            </button>
          </div>
          {downloadError && <p className={styles.error}>{downloadError}</p>}
        </div>
      )}
    </section>
  );
}
