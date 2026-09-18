import React, { useState, useEffect, useRef } from "react";
import "./CellInlineEditor.css";

export interface ActiveCellEdit {
  arrayId: string;
  index: number;
  initialValue: number | string;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}

export interface CellInlineEditorProps {
  activeEdit: ActiveCellEdit | null;
  onCommit: (arrayId: string, index: number, value: number | string) => void;
  onCancel: () => void;
}

export const CellInlineEditor: React.FC<CellInlineEditorProps> = ({
  activeEdit,
  onCommit,
  onCancel,
}) => {
  const [value, setValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isCommittedRef = useRef(false);

  useEffect(() => {
    if (activeEdit) {
      setValue(String(activeEdit.initialValue));
      isCommittedRef.current = false;
      // Focus and select all on next tick
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 10);
    }
  }, [activeEdit]);

  if (!activeEdit) return null;

  const handleFinish = (commit: boolean) => {
    if (isCommittedRef.current) return;
    isCommittedRef.current = true;

    if (!commit) {
      onCancel();
      return;
    }

    const trimmed = value.trim();
    let parsed: number | string = trimmed;
    if (trimmed !== "" && !isNaN(Number(trimmed))) {
      parsed = Number(trimmed);
    }
    onCommit(activeEdit.arrayId, activeEdit.index, parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFinish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleFinish(false);
    }
  };

  return (
    <div className="cell-inline-editor-overlay">
      <input
        ref={inputRef}
        type="text"
        className="cell-inline-input"
        style={{
          left: `${activeEdit.screenX}px`,
          top: `${activeEdit.screenY}px`,
          width: `${activeEdit.width}px`,
          height: `${activeEdit.height}px`,
        }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => handleFinish(true)}
      />
    </div>
  );
};
