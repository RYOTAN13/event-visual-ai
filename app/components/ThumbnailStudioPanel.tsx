"use client";

import {
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FactPack } from "@/lib/types";
import type { ThumbnailDirectorResult } from "@/lib/thumbnail-studio/types";
import {
  createDefaultTextSettings,
  type ThumbnailTextSettings,
} from "@/lib/thumbnail-studio/text-settings";
import {
  downloadRenderedThumbnail,
  sanitizeThumbnailFilename,
} from "@/lib/thumbnail-studio/thumbnail-renderer";
import {
  THUMBNAIL_VARIATION_IDS,
  type ThumbnailImage,
  type ThumbnailStudioState,
  type ThumbnailVariationId,
} from "@/lib/types/thumbnail-studio";
import { ThumbnailEditorModal } from "@/app/components/ThumbnailEditorModal";
import { ThumbnailTextOverlay } from "@/app/components/ThumbnailTextOverlay";
import styles from "./ThumbnailStudioPanel.module.css";

type InternalPipelineBundle = {
  result: ThumbnailDirectorResult | null;
};

type Props = {
  value: ThumbnailStudioState;
  factPack: FactPack | null;
  script: string;
  onChange: Dispatch<SetStateAction<ThumbnailStudioState>>;
};

export function ThumbnailStudioPanel({
  value,
  factPack,
  script,
  onChange,
}: Props) {
  const [formError, setFormError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [editingVariation, setEditingVariation] =
    useState<ThumbnailVariationId | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchCompleted, setBatchCompleted] = useState(0);
  const pipelineRef = useRef<{
    key: string;
    promise: Promise<InternalPipelineBundle>;
  } | null>(null);

  const isGenerating = value.images.some((image) => image.loading);
  const editingImage =
    value.images.find(
      (image) => image.variation === editingVariation && image.imageUrl
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

  function updateTextSettings(
    variation: ThumbnailVariationId,
    textSettings: ThumbnailTextSettings
  ) {
    updateImage(variation, { textSettings });
  }

  function applyTextSettingsToAll(textSettings: ThumbnailTextSettings) {
    onChange((current) => ({
      ...current,
      images: current.images.map((image) => ({
        ...image,
        textSettings: { ...textSettings },
      })),
    }));
  }

  function ensurePipeline(
    forceRefresh = false
  ): Promise<InternalPipelineBundle> {
    const caseName = value.caseName.trim();
    const thumbnailText = value.thumbnailText.trim();
    const key = `${caseName}\u0000${thumbnailText}`;
    if (!forceRefresh && pipelineRef.current?.key === key) {
      return pipelineRef.current.promise;
    }

    const promise = (async (): Promise<InternalPipelineBundle> => {
      try {
        const response = await fetch("/api/generate-thumbnail-pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseName,
            thumbnailText,
            factPack,
            script,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "pipeline failed");
        }

        const result = data as ThumbnailDirectorResult;
        if (!thumbnailText && result.scoredHook.adoptedCopy) {
          const adoptedCopy = result.scoredHook.adoptedCopy;
          onChange((current) => ({
            ...current,
            thumbnailText: current.thumbnailText || adoptedCopy,
            images: current.images.map((image) => ({
              ...image,
              textSettings: {
                ...image.textSettings,
                text: image.textSettings.text || adoptedCopy,
              },
            })),
          }));
          pipelineRef.current = {
            key: `${caseName}\u0000${adoptedCopy}`,
            promise: Promise.resolve({ result }),
          };
        }

        return { result };
      } catch (error) {
        console.error("[ThumbnailStudio] pipeline failed:", error);
        return { result: null };
      }
    })();

    pipelineRef.current = { key, promise };
    return promise;
  }

  async function generateVariation(
    variation: ThumbnailVariationId,
    markLoading = true
  ) {
    if (markLoading) {
      updateImage(variation, { loading: true, error: null });
    }

    try {
      const pipeline = await ensurePipeline();
      const response = await fetch("/api/generate-thumbnail-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variation,
          caseName: value.caseName,
          factPack,
          script,
          imagePrompt: pipeline.result?.thumbnail.prompts[variation],
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "画像生成に失敗しました");
      }

      // 背景だけ更新。文字設定は保持する。
      updateImage(variation, {
        imageUrl: data.imageUrl,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error(`[ThumbnailStudio] ${variation} generation failed:`, error);
      const raw = error instanceof Error ? error.message : "";
      const isUserFacing = /[\u3040-\u30ff\u4e00-\u9faf]/.test(raw);
      updateImage(variation, {
        loading: false,
        error: isUserFacing
          ? raw
          : "画像生成に失敗しました。再生成をお試しください。",
      });
    }
  }

  async function handleGenerateAll() {
    if (batchGenerating || isGenerating) return;
    if (!value.caseName.trim()) {
      setFormError("事件名を入力してください。");
      return;
    }

    setFormError("");
    setBatchGenerating(true);
    setBatchCompleted(0);
    void ensurePipeline(true);
    onChange((current) => ({
      ...current,
      adoptedVariation: null,
      images: current.images.map((image) => ({
        ...image,
        imageUrl: null,
        loading: true,
        error: null,
        textSettings: {
          ...(image.textSettings ?? createDefaultTextSettings()),
          text: current.thumbnailText,
        },
      })),
    }));
    await Promise.allSettled(
      THUMBNAIL_VARIATION_IDS.map(async (variation) => {
        await generateVariation(variation, false);
        setBatchCompleted((count) => count + 1);
      })
    );
    setBatchGenerating(false);
  }

  async function handleDownload(image: ThumbnailImage) {
    if (!image.imageUrl) return;
    setDownloadError("");
    try {
      await downloadRenderedThumbnail(
        image.imageUrl,
        image.textSettings,
        `thumbnail-${sanitizeThumbnailFilename(value.caseName)}-${image.variation}`
      );
    } catch (error) {
      console.error("[ThumbnailStudio] download failed:", error);
      setDownloadError("画像のダウンロードに失敗しました。");
    }
  }

  return (
    <section className={styles.studio}>
      <div className={styles.quickStart}>
        <label className={styles.field}>
          <span>事件名 *</span>
          <input
            value={value.caseName}
            onChange={(event) => updateState({ caseName: event.target.value })}
            placeholder="例：袴田事件"
          />
        </label>
        <label className={styles.field}>
          <span>サムネ文字（任意）</span>
          <input
            value={value.thumbnailText}
            onChange={(event) =>
              updateState({ thumbnailText: event.target.value })
            }
            placeholder="例：人生を奪われた男"
          />
        </label>
        <button
          type="button"
          className={styles.conceptButton}
          onClick={handleGenerateAll}
          disabled={isGenerating}
        >
          {batchGenerating ? "8枚を生成中..." : "Generate"}
        </button>
        {formError && <p className={styles.error}>{formError}</p>}
      </div>

      {batchGenerating && (
        <div className={styles.progressPanel} aria-live="polite">
          <div className={styles.progressHeader}>
            <span>8枚のサムネを生成中...</span>
            <b>
              {batchCompleted} / 8
            </b>
          </div>
          <progress value={batchCompleted} max={8} />
        </div>
      )}

      <div className={styles.thumbnailGrid}>
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
              {image.loading ? (
                <div className={styles.cardLoading}>生成中...</div>
              ) : image.imageUrl ? (
                <div className={styles.cardPreview}>
                  <ThumbnailTextOverlay
                    imageUrl={image.imageUrl}
                    settings={image.textSettings}
                  />
                </div>
              ) : image.error ? (
                <div className={styles.cardError}>
                  <p>画像生成に失敗しました</p>
                  <p className={styles.cardErrorDetail}>{image.error}</p>
                </div>
              ) : (
                <div className={styles.cardLoading} />
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
                  {image.imageUrl && (
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => setEditingVariation(image.variation)}
                    >
                      編集
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
                    <button
                      type="button"
                      className={styles.downloadButton}
                      onClick={() => handleDownload(image)}
                    >
                      ダウンロード
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      {downloadError && <p className={styles.error}>{downloadError}</p>}

      {editingImage?.imageUrl && (
        <ThumbnailEditorModal
          variation={editingImage.variation}
          imageUrl={editingImage.imageUrl}
          caseName={value.caseName}
          initialSettings={editingImage.textSettings}
          otherVariations={value.images
            .filter((image) => image.variation !== editingImage.variation)
            .map((image) => ({
              variation: image.variation,
              settings: image.textSettings,
            }))}
          onSave={(settings) => {
            updateTextSettings(editingImage.variation, settings);
            setEditingVariation(null);
          }}
          onApplyToAll={applyTextSettingsToAll}
          onCancel={() => setEditingVariation(null)}
        />
      )}
    </section>
  );
}
