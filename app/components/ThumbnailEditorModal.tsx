"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  THUMBNAIL_VARIATION_IDS,
  type ThumbnailVariationId,
} from "@/lib/types/thumbnail-studio";
import type { ThumbnailTextSettings } from "@/lib/thumbnail-studio/text-settings";
import {
  downloadRenderedThumbnail,
  sanitizeThumbnailFilename,
} from "@/lib/thumbnail-studio/thumbnail-renderer";
import { ThumbnailTextControls } from "@/app/components/ThumbnailTextControls";
import { ThumbnailTextOverlay } from "@/app/components/ThumbnailTextOverlay";
import styles from "./ThumbnailEditorModal.module.css";

type VariationOption = {
  variation: ThumbnailVariationId;
  settings: ThumbnailTextSettings;
};

type Props = {
  variation: ThumbnailVariationId;
  imageUrl: string;
  caseName: string;
  initialSettings: ThumbnailTextSettings;
  otherVariations: VariationOption[];
  onSave: (settings: ThumbnailTextSettings) => void;
  onApplyToAll: (settings: ThumbnailTextSettings) => void;
  onCancel: () => void;
};

function sameSettings(a: ThumbnailTextSettings, b: ThumbnailTextSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ThumbnailEditorModal({
  variation,
  imageUrl,
  caseName,
  initialSettings,
  otherVariations,
  onSave,
  onApplyToAll,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<ThumbnailTextSettings>(initialSettings);
  const [history, setHistory] = useState<ThumbnailTextSettings[]>([
    initialSettings,
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{
    xPercent: number;
    yPercent: number;
  } | null>(null);
  const [copyFrom, setCopyFrom] = useState<ThumbnailVariationId | "">(
    otherVariations[0]?.variation ?? ""
  );

  const draftRef = useRef(draft);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  draftRef.current = draft;
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  // 編集対象画像が変わったときだけ初期化（Apply to all で親が更新されてもリセットしない）
  useEffect(() => {
    setDraft(initialSettings);
    setHistory([initialSettings]);
    setHistoryIndex(0);
    historyRef.current = [initialSettings];
    historyIndexRef.current = 0;
    setError("");
    setNotice("");
    setDragging(false);
    setDragPosition(null);
    setCopyFrom(otherVariations[0]?.variation ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- variation/imageUrl 切替時のみ
  }, [variation, imageUrl]);

  useEffect(() => {
    if (!copyFrom && otherVariations[0]?.variation) {
      setCopyFrom(otherVariations[0].variation);
    }
  }, [copyFrom, otherVariations]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const pushHistory = useCallback((next: ThumbnailTextSettings) => {
    const index = historyIndexRef.current;
    const current = historyRef.current;
    const base = current.slice(0, index + 1);
    const last = base[base.length - 1];
    if (last && sameSettings(last, next)) return;
    const trimmed = [...base, next].slice(-50);
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistory(trimmed);
    setHistoryIndex(trimmed.length - 1);
  }, []);

  const updateDraft = useCallback(
    (next: ThumbnailTextSettings, recordHistory: boolean) => {
      draftRef.current = next;
      setDraft(next);
      if (recordHistory) pushHistory(next);
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    const nextIndex = Math.max(0, historyIndexRef.current - 1);
    if (nextIndex === historyIndexRef.current) return;
    const next = historyRef.current[nextIndex];
    historyIndexRef.current = nextIndex;
    draftRef.current = next;
    setHistoryIndex(nextIndex);
    setDraft(next);
  }, []);

  const redo = useCallback(() => {
    const nextIndex = Math.min(
      historyRef.current.length - 1,
      historyIndexRef.current + 1
    );
    if (nextIndex === historyIndexRef.current) return;
    const next = historyRef.current[nextIndex];
    historyIndexRef.current = nextIndex;
    draftRef.current = next;
    setHistoryIndex(nextIndex);
    setDraft(next);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (mod && key === "s") {
        event.preventDefault();
        onSave(draftRef.current);
        return;
      }

      if (mod && key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (mod && key === "z") {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, onSave, redo, undo]);

  const copyTargets = useMemo(
    () =>
      otherVariations.length > 0
        ? otherVariations
        : THUMBNAIL_VARIATION_IDS.filter((id) => id !== variation).map(
            (id) => ({
              variation: id,
              settings: initialSettings,
            })
          ),
    [initialSettings, otherVariations, variation]
  );

  async function handleDownload() {
    setError("");
    setDownloading(true);
    try {
      await downloadRenderedThumbnail(
        imageUrl,
        draft,
        `thumbnail-${sanitizeThumbnailFilename(caseName)}-${variation}`
      );
    } catch (downloadError) {
      console.error("[ThumbnailEditorModal] download failed:", downloadError);
      setError("完成画像のダウンロードに失敗しました。");
    } finally {
      setDownloading(false);
    }
  }

  function handleCopyFrom() {
    const source = copyTargets.find((item) => item.variation === copyFrom);
    if (!source) return;
    updateDraft({ ...source.settings }, true);
    setNotice(`Variation ${source.variation} の文字設定をコピーしました`);
  }

  function handleApplyToAll() {
    onApplyToAll(draft);
    setNotice(
      "この文字設定を全Variationへ適用しました（画像は再生成していません）"
    );
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`サムネイル ${variation} の文字編集`}
      >
        <header className={styles.header}>
          <div>
            <span>TEXT EDITOR</span>
            <h3>サムネ文字編集（{variation}）</h3>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.toolButton}
              onClick={undo}
              disabled={!canUndo}
            >
              Undo
            </button>
            <button
              type="button"
              className={styles.toolButton}
              onClick={redo}
              disabled={!canRedo}
            >
              Redo
            </button>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onCancel}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.previewPane}>
            <ThumbnailTextOverlay
              imageUrl={imageUrl}
              settings={draft}
              editable
              onChangeSettings={(next) => updateDraft(next, false)}
              onDragStart={() => {
                setDragging(true);
                setDragPosition({
                  xPercent: draft.xPercent,
                  yPercent: draft.yPercent,
                });
              }}
              onDragMove={(position) => setDragPosition(position)}
              onDragEnd={(next) => {
                setDragging(false);
                setDragPosition(null);
                updateDraft(next, true);
              }}
            />
            <div className={styles.previewMeta}>
              <p className={styles.hint}>
                文字をドラッグして位置を調整できます（中央にスナップ）
              </p>
              {dragging && dragPosition && (
                <p className={styles.coords} aria-live="polite">
                  X: {dragPosition.xPercent.toFixed(1)}% / Y:{" "}
                  {dragPosition.yPercent.toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          <div className={styles.controlsPane}>
            <div className={styles.utilityRow}>
              <button
                type="button"
                className={styles.utilityButton}
                onClick={handleApplyToAll}
              >
                この文字設定を全Variationへ適用
              </button>
              <div className={styles.copyRow}>
                <label className={styles.copyLabel}>
                  <span>他Variationからコピー</span>
                  <select
                    value={copyFrom}
                    onChange={(event) =>
                      setCopyFrom(
                        event.target.value as ThumbnailVariationId | ""
                      )
                    }
                  >
                    {copyTargets.map((item) => (
                      <option key={item.variation} value={item.variation}>
                        {item.variation}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.utilityButton}
                  onClick={handleCopyFrom}
                  disabled={!copyFrom}
                >
                  コピー
                </button>
              </div>
            </div>

            <ThumbnailTextControls
              value={draft}
              onChange={(next) => updateDraft(next, true)}
            />
            <p className={styles.shortcuts}>
              Escで閉じる / Ctrl+Sで保存 / Ctrl+Z・Ctrl+Shift+ZでUndo/Redo
            </p>
          </div>
        </div>

        {notice && <p className={styles.notice}>{notice}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <footer className={styles.footer}>
          <button type="button" className={styles.secondary} onClick={onCancel}>
            キャンセル
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? "書き出し中..." : "完成画像をダウンロード"}
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => onSave(draft)}
          >
            変更を保存
          </button>
        </footer>
      </div>
    </div>
  );
}
