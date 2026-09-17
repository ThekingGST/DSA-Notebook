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

  it("maintains independent pointer positions across multiple arrays when moved", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A1", name: "nums1", elements: [10, 20, 30, 40], position: { x: 100, y: 100 } },
          { id: "A2", name: "nums2", elements: [50, 60, 70, 80], position: { x: 100, y: 250 } },
        ],
        pointers: [
          { id: "ptr_i", name: "i", targetArrayId: "A1", index: 0, color: "#a78bfa" },
          { id: "ptr_j", name: "j", targetArrayId: "A2", index: 0, color: "#38bdf8" },
        ],
        variables: [],
      })
    );

    // 1. Move pointer i on Array 1 to index 3
    act(() => {
      result.current.movePointer("ptr_i", 3);
    });

    expect(result.current.state.pointers.find((p) => p.id === "ptr_i")?.index).toBe(3);
    expect(result.current.state.pointers.find((p) => p.id === "ptr_j")?.index).toBe(0);

    // 2. Move pointer j on Array 2 to index 2
    act(() => {
      result.current.movePointer("ptr_j", 2);
    });

    // Array 1's pointer i must REMAIN at index 3 and NOT reset to 0
    expect(result.current.state.pointers.find((p) => p.id === "ptr_i")?.index).toBe(3);
    expect(result.current.state.pointers.find((p) => p.id === "ptr_j")?.index).toBe(2);

    // 3. Move pointer i again to index 1
    act(() => {
      result.current.movePointer("ptr_i", 1);
    });

    // Array 2's pointer j must REMAIN at index 2
    expect(result.current.state.pointers.find((p) => p.id === "ptr_i")?.index).toBe(1);
    expect(result.current.state.pointers.find((p) => p.id === "ptr_j")?.index).toBe(2);
  });

  it("auto-creates dedicated pointer and activates it when addArray is called", () => {
    const { result } = renderHook(() =>
      useTeacherMode({
        arrays: [
          { id: "A1", name: "nums1", elements: [1, 2, 3], position: { x: 140, y: 320 } },
        ],
        pointers: [
          { id: "ptr_i", name: "i", targetArrayId: "A1", index: 2, color: "#a78bfa" },
        ],
        variables: [],
      })
    );

    act(() => {
      result.current.addArray("nums2", [4, 5, 6]);
    });

    expect(result.current.state.arrays.length).toBe(2);
    expect(result.current.state.pointers.length).toBe(2);

    const arr1Pointer = result.current.state.pointers.find((p) => p.targetArrayId === "A1");
    const arr2Pointer = result.current.state.pointers.find((p) => p.targetArrayId !== "A1");

    // Array 1's pointer stayed at 2
    expect(arr1Pointer?.index).toBe(2);

    // Array 2 got a new pointer at 0
    expect(arr2Pointer).toBeDefined();
    expect(arr2Pointer?.index).toBe(0);
    expect(arr2Pointer?.name).toBe("j");
    expect(result.current.activePointerId).toBe(arr2Pointer?.id);
  });
});

