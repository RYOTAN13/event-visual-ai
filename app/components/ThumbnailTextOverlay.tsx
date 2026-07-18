"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clampTextPosition,
  getFontStack,
  type ThumbnailTextSettings,
} from "@/lib/thumbnail-studio/text-settings";
import styles from "./ThumbnailTextOverlay.module.css";

type DragPosition = { xPercent: number; yPercent: number };

type Props = {
  imageUrl: string | null;
  settings: ThumbnailTextSettings;
  editable?: boolean;
  onChangeSettings?: (next: ThumbnailTextSettings) => void;
  onDragStart?: () => void;
  onDragMove?: (position: DragPosition) => void;
  onDragEnd?: (settings: ThumbnailTextSettings) => void;
  className?: string;
};

const GUIDE_SNAP = 1.2;

export function ThumbnailTextOverlay({
  imageUrl,
  settings,
  editable = false,
  onChangeSettings,
  onDragStart,
  onDragMove,
  onDragEnd,
  className,
}: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef(settings);
  const onChangeRef = useRef(onChangeSettings);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const draggingRef = useRef<{
    pointerId: number;
    offsetXPercent: number;
    offsetYPercent: number;
  } | null>(null);
  const pendingRef = useRef<DragPosition | null>(null);
  const rafRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [livePosition, setLivePosition] = useState<DragPosition | null>(null);

  settingsRef.current = settings;
  onChangeRef.current = onChangeSettings;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cssVars = {
    "--thumb-color": settings.color,
    "--thumb-stroke": settings.strokeColor,
    "--thumb-stroke-width": `${settings.strokeWidth}px`,
    "--thumb-font-size": `${settings.fontSize / 12}cqw`,
    "--thumb-font-family": getFontStack(settings.fontFamily),
    "--thumb-font-weight": String(settings.fontWeight),
    "--thumb-line-height": String(settings.lineHeight),
    "--thumb-max-width": `${settings.maxWidthPercent}%`,
    "--thumb-x": `${settings.xPercent}%`,
    "--thumb-y": `${settings.yPercent}%`,
    "--thumb-align": settings.textAlign,
    "--thumb-shadow": settings.shadowEnabled
      ? `0 ${settings.shadowStrength * 0.35}px ${settings.shadowStrength * 1.1}px rgba(0,0,0,0.9)`
      : "none",
  } as CSSProperties;

  function flushPending() {
    rafRef.current = 0;
    const pending = pendingRef.current;
    if (!pending) return;
    const next = {
      ...settingsRef.current,
      xPercent: pending.xPercent,
      yPercent: pending.yPercent,
    };
    settingsRef.current = next;
    setLivePosition(pending);
    onChangeRef.current?.(next);
    onDragMoveRef.current?.(pending);
  }

  function applyPosition(next: DragPosition) {
    if (layerRef.current) {
      layerRef.current.style.left = `${next.xPercent}%`;
      layerRef.current.style.top = `${next.yPercent}%`;
    }
    pendingRef.current = next;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(flushPending);
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || !onChangeSettings) return;
    const frame = frameRef.current;
    if (!frame) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    draggingRef.current = {
      pointerId: event.pointerId,
      offsetXPercent: pointerX - settingsRef.current.xPercent,
      offsetYPercent: pointerY - settingsRef.current.yPercent,
    };
    setDragging(true);
    setLivePosition({
      xPercent: settingsRef.current.xPercent,
      yPercent: settingsRef.current.yPercent,
    });
    onDragStart?.();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    let xPercent =
      ((event.clientX - rect.left) / rect.width) * 100 - drag.offsetXPercent;
    let yPercent =
      ((event.clientY - rect.top) / rect.height) * 100 - drag.offsetYPercent;

    // 中央付近は軽くスナップして揃えやすくする
    if (Math.abs(xPercent - 50) <= GUIDE_SNAP) xPercent = 50;
    if (Math.abs(yPercent - 50) <= GUIDE_SNAP) yPercent = 50;

    applyPosition(clampTextPosition(xPercent, yPercent));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      flushPending();
    }
    draggingRef.current = null;
    setDragging(false);
    setLivePosition(null);
    if (layerRef.current) {
      layerRef.current.style.left = "";
      layerRef.current.style.top = "";
    }
    onDragEndRef.current?.(settingsRef.current);
  }

  const guideX = livePosition?.xPercent ?? settings.xPercent;
  const guideY = livePosition?.yPercent ?? settings.yPercent;
  const nearCenterX = Math.abs(guideX - 50) <= GUIDE_SNAP;
  const nearCenterY = Math.abs(guideY - 50) <= GUIDE_SNAP;

  return (
    <div
      ref={frameRef}
      className={`${styles.canvas} ${className ?? ""}`.trim()}
      style={cssVars}
    >
      {imageUrl ? (
        <img className={styles.image} src={imageUrl} alt="" draggable={false} />
      ) : (
        <div className={styles.placeholder}>16:9</div>
      )}

      {editable && dragging && (
        <div className={styles.guides} aria-hidden>
          <span className={`${styles.guideV} ${styles.guideEdge}`} />
          <span
            className={`${styles.guideV} ${styles.guideCenter} ${
              nearCenterX ? styles.guideActive : ""
            }`}
          />
          <span className={`${styles.guideV} ${styles.guideEdgeRight}`} />
          <span className={`${styles.guideH} ${styles.guideEdge}`} />
          <span
            className={`${styles.guideH} ${styles.guideCenter} ${
              nearCenterY ? styles.guideActive : ""
            }`}
          />
          <span className={`${styles.guideH} ${styles.guideEdgeBottom}`} />
        </div>
      )}

      {settings.text ? (
        <div
          ref={layerRef}
          className={`${styles.textLayer} ${editable ? styles.draggable : ""} ${
            dragging ? styles.dragging : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span className={styles.text}>{settings.text}</span>
        </div>
      ) : null}
    </div>
  );
}
