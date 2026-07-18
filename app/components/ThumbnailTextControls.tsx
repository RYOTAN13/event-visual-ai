"use client";

import {
  COLOR_PRESETS,
  THUMBNAIL_FONT_OPTIONS,
  type ThumbnailTextSettings,
} from "@/lib/thumbnail-studio/text-settings";
import styles from "./ThumbnailTextControls.module.css";

type Props = {
  value: ThumbnailTextSettings;
  onChange: (next: ThumbnailTextSettings) => void;
};

export function ThumbnailTextControls({ value, onChange }: Props) {
  function patch(partial: Partial<ThumbnailTextSettings>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className={styles.controls}>
      <label className={styles.field}>
        <span>文字内容</span>
        <textarea
          value={value.text}
          rows={4}
          onChange={(event) => patch({ text: event.target.value })}
          placeholder="サムネ文字を入力（空でも可）"
        />
      </label>

      <label className={styles.field}>
        <span>フォント</span>
        <select
          value={value.fontFamily}
          onChange={(event) =>
            patch({
              fontFamily: event.target
                .value as ThumbnailTextSettings["fontFamily"],
            })
          }
        >
          {THUMBNAIL_FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.inlinePair}>
        <label className={styles.rangeField}>
          <span>文字サイズ：{value.fontSize}px</span>
          <input
            type="range"
            min={24}
            max={160}
            value={value.fontSize}
            onChange={(event) =>
              patch({ fontSize: Number(event.target.value) })
            }
          />
        </label>
        <label className={styles.numberField}>
          <span>数値</span>
          <input
            type="number"
            min={24}
            max={160}
            value={value.fontSize}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              patch({ fontSize: Math.min(160, Math.max(24, next)) });
            }}
          />
        </label>
      </div>

      <div className={styles.colorBlock}>
        <label className={styles.colorField}>
          <span>文字色</span>
          <input
            type="color"
            value={value.color}
            onChange={(event) => patch({ color: event.target.value })}
          />
        </label>
        <div className={styles.presets}>
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={styles.preset}
              style={{ background: preset.value }}
              title={preset.label}
              aria-label={preset.label}
              onClick={() => patch({ color: preset.value })}
            />
          ))}
        </div>
      </div>

      <div className={styles.inlinePair}>
        <label className={styles.colorField}>
          <span>縁取り色</span>
          <input
            type="color"
            value={value.strokeColor}
            onChange={(event) => patch({ strokeColor: event.target.value })}
          />
        </label>
        <label className={styles.rangeField}>
          <span>縁取り幅：{value.strokeWidth}px</span>
          <input
            type="range"
            min={0}
            max={16}
            value={value.strokeWidth}
            onChange={(event) =>
              patch({ strokeWidth: Number(event.target.value) })
            }
          />
        </label>
      </div>

      <label className={styles.checkField}>
        <input
          type="checkbox"
          checked={value.shadowEnabled}
          onChange={(event) =>
            patch({ shadowEnabled: event.target.checked })
          }
        />
        影を付ける
      </label>

      <label className={styles.rangeField}>
        <span>影の強さ：{value.shadowStrength}</span>
        <input
          type="range"
          min={0}
          max={30}
          value={value.shadowStrength}
          disabled={!value.shadowEnabled}
          onChange={(event) =>
            patch({ shadowStrength: Number(event.target.value) })
          }
        />
      </label>

      <div className={styles.inlinePair}>
        <label className={styles.rangeField}>
          <span>横位置：{Math.round(value.xPercent)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={value.xPercent}
            onChange={(event) =>
              patch({ xPercent: Number(event.target.value) })
            }
          />
        </label>
        <label className={styles.rangeField}>
          <span>縦位置：{Math.round(value.yPercent)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={value.yPercent}
            onChange={(event) =>
              patch({ yPercent: Number(event.target.value) })
            }
          />
        </label>
      </div>

      <div className={styles.alignRow}>
        <span>文字揃え</span>
        {(["left", "center", "right"] as const).map((align) => (
          <button
            key={align}
            type="button"
            className={
              value.textAlign === align ? styles.alignActive : styles.alignButton
            }
            onClick={() => patch({ textAlign: align })}
          >
            {align === "left" ? "左" : align === "center" ? "中央" : "右"}
          </button>
        ))}
      </div>

      <label className={styles.rangeField}>
        <span>行間：{value.lineHeight.toFixed(2)}</span>
        <input
          type="range"
          min={0.7}
          max={1.8}
          step={0.05}
          value={value.lineHeight}
          onChange={(event) =>
            patch({ lineHeight: Number(event.target.value) })
          }
        />
      </label>

      <label className={styles.checkField}>
        <input
          type="checkbox"
          checked={value.fontWeight >= 700}
          onChange={(event) =>
            patch({ fontWeight: event.target.checked ? 900 : 400 })
          }
        />
        太字
      </label>

      <label className={styles.rangeField}>
        <span>最大文字幅：{Math.round(value.maxWidthPercent)}%</span>
        <input
          type="range"
          min={20}
          max={90}
          value={value.maxWidthPercent}
          onChange={(event) =>
            patch({ maxWidthPercent: Number(event.target.value) })
          }
        />
      </label>
    </div>
  );
}
