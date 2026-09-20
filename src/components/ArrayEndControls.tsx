import React from "react";
import { DSAArray, DSAPointer } from "../engine/types";
import { ArrayLayout } from "../layout/arrayLayout";
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
        const arrPointers = pointers.filter((p) => p.targetArrayId === arr.id);
        const hasPointers = arrPointers.length > 0;
        const activePtrId =
          (activePointersByArray && activePointersByArray[arr.id]) || activePointerId;
        const activePtr =
          arrPointers.find((p) => p.id === activePtrId) || arrPointers[0];

        // Arrow nav buttons are visible ONLY when the globally active pointer belongs
        // to THIS specific array. Using activePointersByArray as fallback caused every
        // array with pointers to satisfy the condition simultaneously.
        const activePtrIsForThisArray =
          Boolean(activePointerId) && arrPointers.some((p) => p.id === activePointerId);
        const showNavButtons =
          activePtrIsForThisArray && Boolean(onNavigatePointer) && Boolean(activePtr);

        // Hide the entire pill — including + and − — when no pointer for this array
        // is actively selected. All four buttons follow the same selection-based rule.
        if (!activePtrIsForThisArray) return null;

        const { screenX, screenY, targetIndex } = ArrayLayout.getControlsPillScreenAnchor(
          arr,
          hasPointers && activePtr ? activePtr.index : null,
          { scrollX, scrollY, zoom }
        );

        const canRemove = arr.elements.length > 1;

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

