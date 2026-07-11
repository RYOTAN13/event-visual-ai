"use client";

import styles from "./SceneEditableField.module.css";

type SceneEditableFieldProps = {
  label: string;
  fieldId: string;
  value: string;
  placeholder?: string;
  isEditing: boolean;
  draft: string;
  disabled?: boolean;
  rows?: number;
  onStartEdit: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
};

export function SceneEditableField({
  label,
  fieldId,
  value,
  placeholder = "",
  isEditing,
  draft,
  disabled = false,
  rows = 4,
  onStartEdit,
  onDraftChange,
  onSave,
}: SceneEditableFieldProps) {
  const displayValue = value.trim() || "—";

  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <label className={styles.fieldLabel} htmlFor={fieldId}>
          {label}
        </label>
        {!isEditing && (
          <button
            type="button"
            className={styles.editButton}
            onClick={onStartEdit}
            disabled={disabled}
          >
            編集
          </button>
        )}
      </div>

      {isEditing ? (
        <div className={styles.editArea}>
          <textarea
            id={fieldId}
            className={styles.textarea}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
          />
          <button
            type="button"
            className={styles.saveButton}
            onClick={onSave}
            disabled={disabled}
          >
            保存
          </button>
        </div>
      ) : (
        <p className={styles.fieldValue}>{displayValue}</p>
      )}
    </div>
  );
}
