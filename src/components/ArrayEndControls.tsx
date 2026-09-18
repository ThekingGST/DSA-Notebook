import React from "react";
import { DSAArray, DSAPointer } from "../engine/types";
import "./ArrayEndControls.css";

export interface ArrayEndControlsProps {
  arrays: DSAArray[];
  pointers?: DSAPointer[];
  activePointerId?: string | null;
  activePointersByArray?: Record<string, string>;
  scrollX?: number;
  scrollY?: number;
  zoom?: number;
  isEditing?: boolean;
  onAppendCell: (arrayId: string, value?: number | string, atIndex?: number) => void;
  onRemoveCell: (arrayId: string, atIndex?: number) => void;
  onNavigatePointer?: (pointerId: string, targetIndex: number) => void;
}

export const ArrayEndControls: React.FC<ArrayEndControlsProps> = ({
  arrays,
  pointers = [],
  activePointerId,
  activePointersByArray,
  scrollX = 0,
  scrollY = 0,
  zoom = 1,
  isEditing = false,
  onAppendCell,
  onRemoveCell,
  onNavigatePointer,
}) => {
  if (isEditing) return null;

  return (
    <div className="array-end-controls-layer" aria-hidden="false">
      {arrays.map((arr) => {
        const cellW = arr.cellWidth || 70;
        const cellH = arr.cellHeight || 56;

        const arrPointers = pointers.filter((p) => p.targetArrayId === arr.id);
        const hasPointers = arrPointers.length > 0;
        const activePtrId =
          (activePointersByArray && activePointersByArray[arr.id]) || activePointerId;
        const activePtr =
          arrPointers.find((p) => p.id === activePtrId) || arrPointers[0];

        // Arrow nav buttons are visible ONLY when the globally active pointer belongs
        // to THIS specific array.  Using activePointersByArray as fallback caused every
        // array with pointers to satisfy the condition simultaneously.
        const activePtrIsForThisArray =
          Boolean(activePointerId) && arrPointers.some((p) => p.id === activePointerId);
        const showNavButtons =
          activePtrIsForThisArray && Boolean(onNavigatePointer) && Boolean(activePtr);

        let screenX: number;
        let screenY: number;
        let targetIndex = arr.elements.length - 1;

        if (hasPointers && activePtr) {
          targetIndex = Math.max(-1, Math.min(arr.elements.length, activePtr.index));
          let cellCenterX: number;
          if (targetIndex === -1) {
            cellCenterX = arr.position.x - cellW / 2;
          } else if (targetIndex >= arr.elements.length) {
            cellCenterX = arr.position.x + arr.elements.length * cellW + cellW / 2;
          } else {
            cellCenterX = arr.position.x + targetIndex * cellW + cellW / 2;
          }
          // Position adjacent to active cell: directly below index label
          const actionY = arr.position.y + cellH + 34;
          screenX = (cellCenterX + scrollX) * zoom;
          screenY = (actionY + scrollY) * zoom;
        } else {
          const rawRightX = arr.position.x + arr.elements.length * cellW + 10;
          const rawCenterY = arr.position.y + (cellH - 32) / 2;
          screenX = (rawRightX + scrollX) * zoom;
          screenY = (rawCenterY + scrollY) * zoom;
        }

        const canRemove = arr.elements.length > 1;

        // Hide the entire pill — including + and − — when no pointer for this array
        // is actively selected. All four buttons follow the same selection-based rule.
        if (!activePtrIsForThisArray) return null;

        return (
          <div
            key={arr.id}
            className="array-end-pill contextual-active-pill"
            style={{
              transform: `translate(calc(${screenX}px - 50%), ${screenY}px) scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            {showNavButtons && activePtr && (
              <button
                type="button"
                className="end-btn step-btn"
                onClick={() => onNavigatePointer!(activePtr.id, targetIndex - 1)}
                disabled={targetIndex <= -1}
                aria-label={`Move pointer ${activePtr.name} left`}
                title="Move pointer left (◀)"
              >
                ◀
              </button>
            )}
            <button
              type="button"
              className="end-btn append-btn"
              onClick={() => {
                const safeIndex = Math.max(0, Math.min(arr.elements.length - 1, targetIndex));
                return onAppendCell(arr.id, undefined, safeIndex);
              }}
              aria-label={`Append cell to ${arr.name}`}
              title="Add cell (+)"
            >
              +
            </button>
            <button
              type="button"
              className="end-btn remove-btn"
              onClick={() => {
                const safeIndex = Math.max(0, Math.min(arr.elements.length - 1, targetIndex));
                return onRemoveCell(arr.id, safeIndex);
              }}
              disabled={!canRemove}
              aria-label={`Remove cell from ${arr.name}`}
              title="Remove cell (–)"
            >
              −
            </button>

            {showNavButtons && activePtr && (
              <button
                type="button"
                className="end-btn step-btn"
                onClick={() => onNavigatePointer!(activePtr.id, targetIndex + 1)}
                disabled={targetIndex >= arr.elements.length}
                aria-label={`Move pointer ${activePtr.name} right`}
                title="Move pointer right (▶)"
              >
                ▶
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

