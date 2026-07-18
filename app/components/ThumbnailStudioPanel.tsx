"use client";

import {
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FactPack } from "@/lib/types";
import {
  THUMBNAIL_MOODS,
  THUMBNAIL_VARIATION_IDS,
  THUMBNAIL_VARIATION_LABELS,
  type ThumbnailHorizontalAlign,
  type ThumbnailImage,
  type ThumbnailMood,
  type ThumbnailStudioState,
  type ThumbnailVariationId,
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
  imageUrl,
  state,
}: {
  imageUrl: string | null;
  state: ThumbnailStudioState;
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
    <div className={styles.thumbnailCanvas} style={textStyle}>
      {imageUrl ? (
        <img
          className={styles.thumbnailImage}
          src={imageUrl}
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
  const [formError, setFormError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const hasAnyImage = value.images.some((image) => image.imageUrl);
  const isGenerating = value.images.some((image) => image.loading);
  const adoptedImage =
    value.images.find(
      (image) =>
        image.variation === value.adoptedVariation && image.imageUrl
    ) ?? null;

  function updateState(patch: Partial<ThumbnailStudioState>) {
    onChange((current) => ({ ...current, ...patch }));
  }

  function updateImage(
    variation: ThumbnailVariationId,
    patch: Partial<ThumbnailImage>
  ) {
    onChange((current) => ({
      ...current,
      images: current.images.map((image) =>
        image.variation === variation ? { ...image, ...patch } : image
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

  async function generateVariation(variation: ThumbnailVariationId) {
    updateImage(variation, { loading: true, error: null });

    try {
      const response = await fetch("/api/generate-thumbnail-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variation,
          caseName: value.caseName,
          videoTitle: value.videoTitle,
          person: value.person,
          background: value.background,
          moods: value.moods,
          additionalInstruction: value.additionalInstruction,
          factPack,
          script,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "画像生成に失敗しました");
      }

      updateImage(variation, {
        imageUrl: data.imageUrl,
        loading: false,
        error: null,
      });
    } catch (error) {
      updateImage(variation, {
        loading: false,
        error:
          error instanceof Error ? error.message : "画像生成に失敗しました",
      });
    }
  }

  async function handleGenerateAll() {
    if (
      !value.caseName.trim() ||
      !value.videoTitle.trim() ||
      !value.thumbnailText.trim()
    ) {
      setFormError("事件名・動画タイトル・サムネ文字を入力してください。");
      return;
    }

    setFormError("");
    // 4枚は独立して生成・失敗する。1枚失敗しても残り3枚はそのまま表示する。
    await Promise.allSettled(
      THUMBNAIL_VARIATION_IDS.map((variation) => generateVariation(variation))
    );
  }

  async function handleDownload(
    image: ThumbnailImage,
    format: "png" | "jpg"
  ) {
    if (!image.imageUrl) return;
    setDownloadError("");

    try {
      const safeName =
        value.caseName
          .trim()
          .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]+/g, "-")
          .replace(/^-+|-+$/g, "") || "thumbnail";
      await downloadThumbnail(
        image.imageUrl,
        value.thumbnailText,
        value.textStyle,
        format,
        `${safeName}-${image.variation}`
      );
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "ダウンロードに失敗しました。"
      );
    }
  }

  return (
    <section className={styles.studio}>
      <div className={styles.generateBar}>
        <button
          type="button"
          className={styles.conceptButton}
          onClick={handleGenerateAll}
          disabled={isGenerating}
        >
          {isGenerating ? "4枚を生成中..." : "サムネイルを4枚生成"}
        </button>
        {formError && <p className={styles.error}>{formError}</p>}
      </div>

      <div className={styles.conceptGrid}>
        {value.images.map((image) => {
          const isAdopted =
            value.adoptedVariation === image.variation &&
            Boolean(image.imageUrl);
          return (
            <article
              key={image.variation}
              className={`${styles.conceptCard} ${
                isAdopted ? styles.conceptCardSelected : ""
              }`}
            >
              <div className={styles.conceptHeader}>
                <span>{THUMBNAIL_VARIATION_LABELS[image.variation]}</span>
                {isAdopted && <b className={styles.adoptedBadge}>採用中</b>}
              </div>

              {image.loading ? (
                <div className={styles.cardLoading}>生成中...</div>
              ) : image.imageUrl ? (
                <ThumbnailCanvas imageUrl={image.imageUrl} state={value} />
              ) : image.error ? (
                <div className={styles.cardError}>
                  <p>画像生成に失敗しました</p>
                  <p className={styles.cardErrorDetail}>{image.error}</p>
                </div>
              ) : (
                <div className={styles.cardLoading}>16:9</div>
              )}

              {!image.loading && (image.imageUrl || image.error) && (
                <div className={styles.cardActions}>
                  {image.imageUrl && (
                    <button
                      type="button"
                      className={`${styles.adoptButton} ${
                        isAdopted ? styles.adoptButtonActive : ""
                      }`}
                      onClick={() =>
                        updateState({ adoptedVariation: image.variation })
                      }
                      disabled={isAdopted}
                    >
                      {isAdopted ? "採用中" : "採用"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.backgroundButton}
                    onClick={() => generateVariation(image.variation)}
                  >
                    再生成
                  </button>
                  {image.imageUrl && (
                    <div className={styles.cardDownloadRow}>
                      <button
                        type="button"
                        onClick={() => handleDownload(image, "png")}
                      >
                        PNGダウンロード
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(image, "jpg")}
                      >
                        JPGダウンロード
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {downloadError && <p className={styles.error}>{downloadError}</p>}

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

      </div>

      {hasAnyImage && (
        <div className={styles.editor}>
          <div className={styles.editorHeader}>
            <div>
              <span>TEXT OVERLAY</span>
              <h3>サムネ文字・レイアウト編集</h3>
            </div>
          </div>

          {adoptedImage && (
            <div className={styles.largePreview}>
              <ThumbnailCanvas
                imageUrl={adoptedImage.imageUrl}
                state={value}
              />
            </div>
          )}

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
        </div>
      )}
    </section>
  );
}
