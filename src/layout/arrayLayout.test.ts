import { describe, it, expect } from "vitest";
import { ArrayLayout } from "./arrayLayout";
import { DSAArray } from "../engine/types";

describe("ArrayLayout", () => {
  const sampleArray: DSAArray = {
    id: "arr_1",
    name: "nums",
    elements: [10, 20, 30, 40, 50],
    position: { x: 100, y: 200 },
    cellWidth: 80,
    cellHeight: 60,
  };

  const defaultArray: DSAArray = {
    id: "arr_2",
    name: "arr",
    elements: [1, 2, 3],
    position: { x: 50, y: 150 },
  };

  describe("getCellDimensions", () => {
    it("uses provided cell dimensions", () => {
      const dims = ArrayLayout.getCellDimensions(sampleArray);
      expect(dims).toEqual({ width: 80, height: 60 });
    });

    it("falls back to default dimensions if missing", () => {
      const dims = ArrayLayout.getCellDimensions(defaultArray);
      expect(dims).toEqual({
        width: ArrayLayout.DEFAULT_CELL_WIDTH,
        height: ArrayLayout.DEFAULT_CELL_HEIGHT,
      });
    });
  });

  describe("getCellBounds", () => {
    it("calculates bounds for cell 0 correctly", () => {
      const bounds = ArrayLayout.getCellBounds(sampleArray, 0);
      expect(bounds).toEqual({
        x: 100,
        y: 200,
        width: 80,
        height: 60,
        centerX: 140,
        centerY: 230,
      });
    });

    it("calculates bounds for cell 3 correctly", () => {
      const bounds = ArrayLayout.getCellBounds(sampleArray, 3);
      expect(bounds).toEqual({
        x: 100 + 3 * 80,
        y: 200,
        width: 80,
        height: 60,
        centerX: 340 + 40,
        centerY: 230,
      });
    });
  });

  describe("getPointerTargetCenterX and getPointerAnchor", () => {
    it("calculates center for in-bounds index", () => {
      const centerX = ArrayLayout.getPointerTargetCenterX(sampleArray, 2);
      expect(centerX).toBe(100 + 2 * 80 + 40); // 300
    });

    it("calculates off-boundary left index (-1)", () => {
      const centerX = ArrayLayout.getPointerTargetCenterX(sampleArray, -1);
      expect(centerX).toBe(100 - 80 / 2); // 60
    });

    it("calculates off-boundary right index (length)", () => {
      const len = sampleArray.elements.length;
      const centerX = ArrayLayout.getPointerTargetCenterX(sampleArray, len);
      expect(centerX).toBe(100 + len * 80 + 40); // 100 + 400 + 40 = 540
    });

    it("returns pointer anchor with rounded top-left coordinate", () => {
      const anchor = ArrayLayout.getPointerAnchor(sampleArray, 1, 70, 75);
      expect(anchor.centerX).toBe(100 + 1 * 80 + 40); // 220
      expect(anchor.x).toBe(Math.round(220 - 35)); // 185
      expect(anchor.y).toBe(200 - 75); // 125
    });
  });

  describe("snapPointerToIndex", () => {
    it("snaps center point to corresponding cell index", () => {
      expect(ArrayLayout.snapPointerToIndex(sampleArray, 140)).toBe(0);
      expect(ArrayLayout.snapPointerToIndex(sampleArray, 220)).toBe(1);
      expect(ArrayLayout.snapPointerToIndex(sampleArray, 300)).toBe(2);
    });

    it("snaps off-boundary left to -1", () => {
      expect(ArrayLayout.snapPointerToIndex(sampleArray, 60)).toBe(-1);
      expect(ArrayLayout.snapPointerToIndex(sampleArray, 0)).toBe(-1);
    });

    it("snaps off-boundary right to elements.length", () => {
      expect(ArrayLayout.snapPointerToIndex(sampleArray, 540)).toBe(5);
      expect(ArrayLayout.snapPointerToIndex(sampleArray, 999)).toBe(5);
    });
  });

  describe("toScreen and getCellScreenBounds", () => {
    const viewport = { scrollX: 20, scrollY: -10, zoom: 1.5 };

    it("projects canvas point into screen space", () => {
      const screen = ArrayLayout.toScreen({ x: 100, y: 200 }, viewport);
      expect(screen).toEqual({
        screenX: (100 + 20) * 1.5, // 180
        screenY: (200 - 10) * 1.5, // 285
      });
    });

    it("computes cell screen bounds with zoom scaling", () => {
      const screenBounds = ArrayLayout.getCellScreenBounds(sampleArray, 0, viewport);
      expect(screenBounds).toEqual({
        screenX: 180,
        screenY: 285,
        width: 80 * 1.5,
        height: 60 * 1.5,
      });
    });
  });

  describe("getControlsPillScreenAnchor", () => {
    const viewport = { scrollX: 0, scrollY: 0, zoom: 1 };

    it("computes anchor below active cell when pointer is provided", () => {
      const anchor = ArrayLayout.getControlsPillScreenAnchor(sampleArray, 2, viewport);
      expect(anchor.targetIndex).toBe(2);
      expect(anchor.screenX).toBe(300); // cell 2 centerX
      expect(anchor.screenY).toBe(200 + 60 + 34); // position.y + cellH + 34
    });

    it("computes anchor on array right end when active pointer is null", () => {
      const anchor = ArrayLayout.getControlsPillScreenAnchor(sampleArray, null, viewport);
      expect(anchor.targetIndex).toBe(4);
      expect(anchor.screenX).toBe(100 + 5 * 80 + 10); // 510
      expect(anchor.screenY).toBe(200 + (60 - 32) / 2); // 214
    });
  });
});
