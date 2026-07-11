"use client";

import type { ProjectProtagonist } from "@/lib/types/character-studio";
import styles from "./CharacterStudioPanel.module.css";

type CharacterStudioPanelProps = {
  protagonist: ProjectProtagonist;
  disabled?: boolean;
  onChange: (protagonist: ProjectProtagonist) => void;
};

const FIELDS: {
  key: keyof ProjectProtagonist;
  label: string;
  placeholder: string;
}[] = [
  { key: "name", label: "名前", placeholder: "例：袴田巌" },
  { key: "age", label: "年齢（基準）", placeholder: "例：22" },
  { key: "gender", label: "性別", placeholder: "例：男性" },
  { key: "hairStyle", label: "髪型", placeholder: "例：短髪、七三分け" },
  { key: "hairColor", label: "髪色", placeholder: "例：黒" },
  { key: "clothing", label: "服装", placeholder: "例：紺の作業着" },
  { key: "physique", label: "体格", placeholder: "例：中肉中背" },
  {
    key: "facialFeatures",
    label: "顔の特徴",
    placeholder: "例：細い目、えくぼ",
  },
  { key: "occupation", label: "職業", placeholder: "例：洋菓子店勤務" },
  {
    key: "expressionTendency",
    label: "表情の傾向",
    placeholder: "例：穏やか、内に強い意志",
  },
];

export function CharacterStudioPanel({
  protagonist,
  disabled = false,
  onChange,
}: CharacterStudioPanelProps) {
  function handleFieldChange(
    key: keyof ProjectProtagonist,
    value: string
  ) {
    onChange({ ...protagonist, [key]: value });
  }

  return (
    <section className={styles.panel} aria-label="Character Studio">
      <div className={styles.header}>
        <h2 className={styles.title}>Character Studio</h2>
        <p className={styles.subtitle}>
          主人公をプロジェクト単位で設定。全 Scene で一貫した人物として利用されます。
        </p>
      </div>

      <div className={styles.grid}>
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className={styles.field}>
            <label className={styles.label} htmlFor={`protagonist-${key}`}>
              {label}
            </label>
            <input
              id={`protagonist-${key}`}
              type="text"
              className={styles.input}
              value={protagonist[key]}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {protagonist.name.trim() && (
        <p className={styles.activeHint}>
          Project Character が有効です（Character Bible より優先）
        </p>
      )}
    </section>
  );
}
