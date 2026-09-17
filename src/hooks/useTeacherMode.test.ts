import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useTeacherMode } from "./useTeacherMode";

describe("useTeacherMode hook", () => {
  it("initializes with default array state if none provided", () => {
    const { result } = renderHook(() => useTeacherMode());

    expect(result.current.state.arrays.length).toBeGreaterThan(0);
    expect(result.current.state.arrays[0].elements).toEqual([10, 25, 7, 42, 18]);
  });

  it("adds a new array with specified elements and position", () => {
    const { result } = renderHook(() => useTeacherMode({ arrays: [], pointers: [], variables: [] }));

    act(() => {
      result.current.addArray("customArr", [1, 2, 3], { x: 100, y: 150 });
    });

    expect(result.current.state.arrays.length).toBe(1);
    expect(result.current.state.arrays[0].name).toBe("customArr");
    expect(result.current.state.arrays[0].elements).toEqual([1, 2, 3]);
    expect(result.current.state.arrays[0].position).toEqual({ x: 100, y: 150 });
  });

  it("updates cell value at specific index immutably", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A", name: "nums", elements: [10, 20, 30], position: { x: 100, y: 200 } },
        ],
        pointers: [],
        variables: [],
      })
    );

    act(() => {
      result.current.updateCellValue("A", 1, 99);
    });

    expect(result.current.state.arrays[0].elements).toEqual([10, 99, 30]);
  });

  it("appends and removes cells at array end", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A", name: "nums", elements: [10, 20], position: { x: 100, y: 200 } },
        ],
        pointers: [],
        variables: [],
      })
    );

    act(() => {
      result.current.appendCell("A", 30);
    });
    expect(result.current.state.arrays[0].elements).toEqual([10, 20, 30]);

    act(() => {
      result.current.removeCell("A");
    });
    expect(result.current.state.arrays[0].elements).toEqual([10, 20]);

    // Does not remove below 1 element
    act(() => {
      result.current.removeCell("A");
    });
    expect(result.current.state.arrays[0].elements.length).toBe(1);

    act(() => {
      result.current.removeCell("A");
    });
    expect(result.current.state.arrays[0].elements.length).toBe(1);
  });

  it("adds, moves, and removes pointers", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A", name: "nums", elements: [10, 20, 30], position: { x: 100, y: 200 } },
        ],
        pointers: [],
        variables: [],
      })
    );

    act(() => {
      result.current.addPointer("A", "i", 0, "#a78bfa");
    });

    expect(result.current.state.pointers.length).toBe(1);
    const ptr = result.current.state.pointers[0];
    expect(ptr.name).toBe("i");
    expect(ptr.index).toBe(0);
    expect(ptr.targetArrayId).toBe("A");

    act(() => {
      result.current.movePointer(ptr.id, 2);
    });
    expect(result.current.state.pointers[0].index).toBe(2);

    // Clamps pointer when moved out of range
    act(() => {
      result.current.movePointer(ptr.id, 99);
    });
    expect(result.current.state.pointers[0].index).toBe(3); // clamped to length

    act(() => {
      result.current.removePointer(ptr.id);
    });
    expect(result.current.state.pointers.length).toBe(0);
  });

  it("auto-calculates non-overlapping positions for sequentially added arrays", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A", name: "nums1", elements: [1, 2, 3], position: { x: 140, y: 320 }, cellHeight: 56 },
        ],
        pointers: [],
        variables: [],
      })
    );

    act(() => {
      result.current.addArray("nums2", [4, 5, 6]);
    });

    expect(result.current.state.arrays.length).toBe(2);
    const arr2 = result.current.state.arrays[1];
    // Must be placed below array 1 with clean clearance (y > 320 + 56 + 60)
    expect(arr2.position.y).toBeGreaterThanOrEqual(460);
    expect(arr2.position.x).toBe(140);
  });

  it("updates array position to lock canvas movement", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A", name: "nums", elements: [1, 2, 3], position: { x: 140, y: 320 } },
        ],
        pointers: [],
        variables: [],
      })
    );

    act(() => {
      result.current.updateArrayPosition("A", { x: 280, y: 400 });
    });

    expect(result.current.state.arrays[0].position).toEqual({ x: 280, y: 400 });
  });

  it("supports inserting and removing cells at contextual index", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A", name: "nums", elements: [10, 20, 30], position: { x: 100, y: 200 } },
        ],
        pointers: [
          { id: "ptr1", name: "i", targetArrayId: "A", index: 1, color: "#a78bfa" },
        ],
        variables: [],
      })
    );

    // Insert after index 1 (between 20 and 30)
    act(() => {
      result.current.appendCell("A", 25, 1);
    });
    expect(result.current.state.arrays[0].elements).toEqual([10, 20, 25, 30]);

    // Remove cell at index 1 (removes 20)
    act(() => {
      result.current.removeCell("A", 1);
    });
    expect(result.current.state.arrays[0].elements).toEqual([10, 25, 30]);
  });
});

