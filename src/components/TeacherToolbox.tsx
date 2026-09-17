import React, { useState, useEffect } from "react";
import { DSAArray } from "../engine/types";
import "./TeacherToolbox.css";

export interface TeacherToolboxProps {
  arrays: DSAArray[];
  onAddArray: (name: string, elements: (number | string)[]) => void;
  onAddPointer: (arrayId: string, name: string, color?: string) => void;
  onReset?: () => void;
}

const PRESETS = [
  { label: "[10, 25, 7, 42, 18]", elements: [10, 25, 7, 42, 18] },
  { label: "[1, 2, 3, 4, 5]", elements: [1, 2, 3, 4, 5] },
  { label: "[5, 4, 3, 2, 1]", elements: [5, 4, 3, 2, 1] },
  { label: "[4, 1, 3, 9, 7]", elements: [4, 1, 3, 9, 7] },
];

const POINTER_PRESETS = [
  { name: "i", color: "#a78bfa" },
  { name: "j", color: "#38bdf8" },
  { name: "left", color: "#34d399" },
  { name: "right", color: "#f87171" },
  { name: "mid", color: "#fbbf24" },
  { name: "max", color: "#10b981" },
];

export const TeacherToolbox: React.FC<TeacherToolboxProps> = ({
  arrays,
  onAddArray,
  onAddPointer,
  onReset,
}) => {
  const [arrayPopoverOpen, setArrayPopoverOpen] = useState(false);
  const [pointerPopoverOpen, setPointerPopoverOpen] = useState(false);

  // Array form state
  const [arrayName, setArrayName] = useState("nums");
  const [customInput, setCustomInput] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<(number | string)[] | null>(
    PRESETS[0].elements
  );

  // Pointer form state
  const [selectedArrayId, setSelectedArrayId] = useState<string>(
    arrays[0]?.id || ""
  );

  // Sync selectedArrayId when arrays change so the newest or valid array is targeted
  useEffect(() => {
    if (arrays.length > 0) {
      const exists = arrays.some((a) => a.id === selectedArrayId);
      if (!exists || selectedArrayId === "") {
        setSelectedArrayId(arrays[arrays.length - 1].id);
      }
    }
  }, [arrays, selectedArrayId]);

  const handleToggleArrayPopover = () => {
    setArrayPopoverOpen((prev) => !prev);
    if (pointerPopoverOpen) setPointerPopoverOpen(false);
  };

  const handleTogglePointerPopover = () => {
    setPointerPopoverOpen((prev) => !prev);
    if (arrayPopoverOpen) setArrayPopoverOpen(false);
  };

  const handleSelectPreset = (elements: (number | string)[]) => {
    setSelectedPreset(elements);
    setCustomInput("");
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomInput(e.target.value);
    setSelectedPreset(null);
  };

  const handleInsertArray = () => {
    let elements: (number | string)[] = [];
    if (customInput.trim()) {
      elements = customInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => (isNaN(Number(s)) ? s : Number(s)));
    } else if (selectedPreset) {
      elements = [...selectedPreset];
    }

    if (elements.length === 0) {
      elements = [10, 20, 30];
    }

    onAddArray(arrayName.trim() || "nums", elements);
    setArrayPopoverOpen(false);
    setCustomInput("");
    setSelectedPreset(PRESETS[0].elements);
  };

  const handleAttachPointer = (name: string, color: string) => {
    const targetId =
      arrays.find((a) => a.id === selectedArrayId)?.id ||
      arrays[arrays.length - 1]?.id ||
      arrays[0]?.id;
    if (!targetId) return;
    onAddPointer(targetId, name, color);
    setPointerPopoverOpen(false);
  };

  return (
    <div className="teacher-toolbox-container">
      <div className="teacher-toolbox-dock" role="toolbar" aria-label="DSA Teacher Toolbox">
        <span className="toolbox-badge">Teacher Authoring</span>

        <button
          type="button"
          className={`toolbox-btn ${arrayPopoverOpen ? "active" : ""}`}
          onClick={handleToggleArrayPopover}
          aria-expanded={arrayPopoverOpen}
        >
          <span className="toolbox-icon">➕</span> + Array
        </button>

        <button
          type="button"
          className={`toolbox-btn ${pointerPopoverOpen ? "active" : ""}`}
          onClick={handleTogglePointerPopover}
          aria-expanded={pointerPopoverOpen}
          disabled={arrays.length === 0}
        >
          <span className="toolbox-icon">📍</span> + Pointer
        </button>

        {onReset && (
          <button
            type="button"
            className="toolbox-btn reset-btn"
            onClick={onReset}
            title="Reset to default array"
          >
            ⏮ Reset
          </button>
        )}
      </div>

      {/* Array Creation Popover */}
      {arrayPopoverOpen && (
        <div className="toolbox-popover array-popover" role="dialog" aria-label="Create 1D Array">
          <div className="popover-header">
            <h4>Create 1D Array</h4>
            <button
              type="button"
              className="popover-close"
              onClick={() => setArrayPopoverOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="popover-body">
            <div className="popover-field">
              <label htmlFor="array-name-input">Array Identifier</label>
              <input
                id="array-name-input"
                type="text"
                className="toolbox-input"
                value={arrayName}
                onChange={(e) => setArrayName(e.target.value)}
                placeholder="e.g. nums"
              />
            </div>

            <div className="popover-field">
              <label>Preset Arrays</label>
              <div className="preset-grid">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`preset-pill ${
                      selectedPreset === preset.elements ? "selected" : ""
                    }`}
                    onClick={() => handleSelectPreset(preset.elements)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="popover-field">
              <label htmlFor="array-custom-input">Or Custom Comma-Separated Values</label>
              <input
                id="array-custom-input"
                type="text"
                className="toolbox-input"
                value={customInput}
                onChange={handleCustomInputChange}
                placeholder="e.g. 10, 25, 7, 42, 18"
              />
            </div>

            <button
              type="button"
              className="toolbox-primary-btn"
              onClick={handleInsertArray}
            >
              Insert Array
            </button>
          </div>
        </div>
      )}

      {/* Pointer Attachment Popover */}
      {pointerPopoverOpen && (
        <div className="toolbox-popover pointer-popover" role="dialog" aria-label="Attach Pointer">
          <div className="popover-header">
            <h4>Attach Pointer</h4>
            <button
              type="button"
              className="popover-close"
              onClick={() => setPointerPopoverOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="popover-body">
            {arrays.length > 1 && (
              <div className="popover-field">
                <label htmlFor="target-array-select">Target Array</label>
                <select
                  id="target-array-select"
                  className="toolbox-select"
                  value={selectedArrayId}
                  onChange={(e) => setSelectedArrayId(e.target.value)}
                >
                  {arrays.map((arr) => (
                    <option key={arr.id} value={arr.id}>
                      {arr.name} ({arr.elements.length} cells)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="popover-field">
              <label>Choose Pointer</label>
              <div className="pointer-grid">
                {POINTER_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="pointer-pill"
                    aria-label={p.name}
                    style={{ borderColor: p.color, color: p.color }}
                    onClick={() => handleAttachPointer(p.name, p.color)}
                  >
                    <span className="pointer-arrow" aria-hidden="true">↓</span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
