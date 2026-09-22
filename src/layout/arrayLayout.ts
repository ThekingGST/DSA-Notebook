import { DSAArray } from "../engine/types";

export interface Viewport {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface CellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ScreenBounds {
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}

export class ArrayLayout {
  static readonly DEFAULT_CELL_WIDTH = 70;
  static readonly DEFAULT_CELL_HEIGHT = 56;
  static readonly DEFAULT_POINTER_WIDTH = 70;
  static readonly DEFAULT_POINTER_OFFSET_Y = 75;
  static readonly DEFAULT_ARRAY_STACK_SPACING = 180;
  static readonly DEFAULT_BASE_ARRAY_Y = 290;

  /**
   * Computes a deterministic vertical Y offset for vertically stacked arrays.
   */
  static getStackedArrayY(
    arrayIndex: number,
    baseY = ArrayLayout.DEFAULT_BASE_ARRAY_Y,
    spacingY = ArrayLayout.DEFAULT_ARRAY_STACK_SPACING
  ): number {
    return baseY + arrayIndex * spacingY;
  }

  /**
   * Resolves the cell dimensions for an array, falling back to defaults.
   */
  static getCellDimensions(arr: { cellWidth?: number; cellHeight?: number }): {
    width: number;
    height: number;
  } {
    return {
      width: arr.cellWidth || ArrayLayout.DEFAULT_CELL_WIDTH,
      height: arr.cellHeight || ArrayLayout.DEFAULT_CELL_HEIGHT,
    };
  }

  /**
   * Calculates the canvas-space bounds of a specific cell in an array.
   */
  static getCellBounds(
    arr: Pick<DSAArray, "position" | "cellWidth" | "cellHeight">,
    index: number
  ): CellBounds {
    const { width, height } = ArrayLayout.getCellDimensions(arr);
    const x = arr.position.x + index * width;
    const y = arr.position.y;
    return {
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    };
  }

  /**
   * Calculates the target center X coordinate on the canvas for a pointer,
   * accounting for in-bounds indices as well as sentinel boundary offsets (-1 and length).
   */
  static getPointerTargetCenterX(
    arr: Pick<DSAArray, "position" | "elements" | "cellWidth">,
    index: number
  ): number {
    const { width: cellW } = ArrayLayout.getCellDimensions(arr);
    const len = arr.elements.length;

    if (index <= -1) {
      return arr.position.x - cellW / 2;
    } else if (index >= len) {
      return arr.position.x + len * cellW + cellW / 2;
    } else {
      return arr.position.x + index * cellW + cellW / 2;
    }
  }

  /**
   * Computes the bounding anchor (x, y) for rendering a pointer element on canvas.
   */
  static getPointerAnchor(
    arr: Pick<DSAArray, "position" | "elements" | "cellWidth">,
    index: number,
    pointerWidth = ArrayLayout.DEFAULT_POINTER_WIDTH,
    offsetY = ArrayLayout.DEFAULT_POINTER_OFFSET_Y
  ): { x: number; y: number; centerX: number } {
    const targetCenterX = ArrayLayout.getPointerTargetCenterX(arr, index);
    return {
      x: Math.round(targetCenterX - pointerWidth / 2),
      y: arr.position.y - offsetY,
      centerX: targetCenterX,
    };
  }

  /**
   * Snaps a pointer's canvas center X coordinate to the nearest array index,
   * clamping to [-1, elements.length].
   */
  static snapPointerToIndex(
    arr: Pick<DSAArray, "position" | "elements" | "cellWidth">,
    pointerCenterX: number
  ): number {
    const { width: cellW } = ArrayLayout.getCellDimensions(arr);
    const rawIdx = Math.round((pointerCenterX - arr.position.x - cellW / 2) / cellW);
    const maxIdx = arr.elements.length;
    return Math.max(-1, Math.min(maxIdx, rawIdx));
  }

  /**
   * Projects a canvas point into viewport screen coordinates.
   */
  static toScreen(
    point: { x: number; y: number },
    viewport: Viewport
  ): { screenX: number; screenY: number } {
    return {
      screenX: (point.x + viewport.scrollX) * viewport.zoom,
      screenY: (point.y + viewport.scrollY) * viewport.zoom,
    };
  }

  /**
   * Returns the screen-space bounding box of a cell for overlay elements (e.g. inline cell editor).
   */
  static getCellScreenBounds(
    arr: Pick<DSAArray, "position" | "cellWidth" | "cellHeight">,
    index: number,
    viewport: Viewport
  ): ScreenBounds {
    const bounds = ArrayLayout.getCellBounds(arr, index);
    const screenPos = ArrayLayout.toScreen(bounds, viewport);
    return {
      screenX: screenPos.screenX,
      screenY: screenPos.screenY,
      width: bounds.width * viewport.zoom,
      height: bounds.height * viewport.zoom,
    };
  }

  /**
   * Returns the screen anchor coordinates for the ArrayEndControls action pill.
   */
  static getControlsPillScreenAnchor(
    arr: Pick<DSAArray, "position" | "elements" | "cellWidth" | "cellHeight">,
    activePointerIndex: number | null,
    viewport: Viewport
  ): { screenX: number; screenY: number; targetIndex: number } {
    const { width: cellW, height: cellH } = ArrayLayout.getCellDimensions(arr);

    if (activePointerIndex !== null && activePointerIndex !== undefined) {
      const targetIndex = Math.max(-1, Math.min(arr.elements.length, activePointerIndex));
      const cellCenterX = ArrayLayout.getPointerTargetCenterX(arr, targetIndex);
      const actionY = arr.position.y + cellH + 34;
      const screenPos = ArrayLayout.toScreen({ x: cellCenterX, y: actionY }, viewport);
      return {
        screenX: screenPos.screenX,
        screenY: screenPos.screenY,
        targetIndex,
      };
    } else {
      const targetIndex = arr.elements.length - 1;
      const rawRightX = arr.position.x + arr.elements.length * cellW + 10;
      const rawCenterY = arr.position.y + (cellH - 32) / 2;
      const screenPos = ArrayLayout.toScreen({ x: rawRightX, y: rawCenterY }, viewport);
      return {
        screenX: screenPos.screenX,
        screenY: screenPos.screenY,
        targetIndex,
      };
    }
  }
}
