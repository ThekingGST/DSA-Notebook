import React from "react";
import { DSAArray } from "../engine/types";
import "./ArrayEndControls.css";

export interface ArrayEndControlsProps {
  arrays: DSAArray[];
  scrollX?: number;
  scrollY?: number;
  zoom?: number;
  onAppendCell: (arrayId: string) => void;
  onRemoveCell: (arrayId: string) => void;
}

export const ArrayEndControls: React.FC<ArrayEndControlsProps> = ({
  arrays,
  scrollX = 0,
  scrollY = 0,
  zoom = 1,
  onAppendCell,
  onRemoveCell,
}) => {
  return (
    <div className="array-end-controls-layer" aria-hidden="false">
      {arrays.map((arr) => {
        const cellW = arr.cellWidth || 70;
        const cellH = arr.cellHeight || 56;
        const rawRightX = arr.position.x + arr.elements.length * cellW + 10;
        const rawCenterY = arr.position.y + (cellH - 32) / 2;

        const screenX = (rawRightX + scrollX) * zoom;
        const screenY = (rawCenterY + scrollY) * zoom;

        const canRemove = arr.elements.length > 1;

        return (
          <div
            key={arr.id}
            className="array-end-pill"
            style={{
              transform: `translate(${screenX}px, ${screenY}px) scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <button
              type="button"
              className="end-btn append-btn"
              onClick={() => onAppendCell(arr.id)}
              aria-label={`Append cell to ${arr.name}`}
              title="Append cell ([+])"
            >
              +
            </button>
            <button
              type="button"
              className="end-btn remove-btn"
              onClick={() => onRemoveCell(arr.id)}
              disabled={!canRemove}
              aria-label={`Remove cell from ${arr.name}`}
              title="Remove cell ([−])"
            >
              −
            </button>
          </div>
        );
      })}
    </div>
  );
};
