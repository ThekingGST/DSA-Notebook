import { describe, it, expect } from "vitest";
import { dsaReducer } from "./stateEngine";
import { DSAState, AlgorithmStepAction } from "./types";

describe("dsaReducer", () => {
  const baseState: DSAState = {
    arrays: [
      {
        id: "A",
        name: "nums",
        elements: [10, 25, 7, 42],
        position: { x: 100, y: 200 },
        cellWidth: 60,
        cellHeight: 50,
      },
    ],
    pointers: [
      { id: "p1", name: "i", targetArrayId: "A", index: 0, color: "#996dff" },
    ],
    variables: [
      { id: "v1", name: "max", value: 10, color: "#04d361" },
    ],
    activeComparison: null,
    highlights: [],
    narration: null,
  };

  it("handles move_pointer action within bounds", () => {
    const action: AlgorithmStepAction = {
      type: "move_pointer",
      pointerId: "p1",
      toIndex: 2,
    };
    const next = dsaReducer(baseState, action);
    expect(next.pointers[0].index).toBe(2);
    expect(baseState.pointers[0].index).toBe(0); // immutable
  });

  it("clamps move_pointer to boundary range [-1, length]", () => {
    const clampLeft = dsaReducer(baseState, {
      type: "move_pointer",
      pointerId: "p1",
      toIndex: -5,
    });
    expect(clampLeft.pointers[0].index).toBe(-1);

    const clampRight = dsaReducer(baseState, {
      type: "move_pointer",
      pointerId: "p1",
      toIndex: 10,
    });
    expect(clampRight.pointers[0].index).toBe(4);
  });

  it("handles swap action between two indices", () => {
    const action: AlgorithmStepAction = {
      type: "swap",
      arrayId: "A",
      indexA: 1,
      indexB: 3,
    };
    const next = dsaReducer(baseState, action);
    expect(next.arrays[0].elements).toEqual([10, 42, 7, 25]);
    expect(baseState.arrays[0].elements).toEqual([10, 25, 7, 42]);
  });

  it("handles write_cell action", () => {
    const action: AlgorithmStepAction = {
      type: "write_cell",
      arrayId: "A",
      index: 2,
      value: 99,
    };
    const next = dsaReducer(baseState, action);
    expect(next.arrays[0].elements[2]).toBe(99);
  });

  it("handles set_variable action for existing and new variables", () => {
    const updateExisting = dsaReducer(baseState, {
      type: "set_variable",
      variableId: "v1",
      value: 42,
    });
    expect(updateExisting.variables[0].value).toBe(42);

    const addNew = dsaReducer(baseState, {
      type: "set_variable",
      variableId: "v2",
      name: "count",
      value: 1,
    });
    expect(addNew.variables).toHaveLength(2);
    expect(addNew.variables[1]).toEqual({ id: "v2", name: "count", value: 1 });
  });

  it("handles compare action", () => {
    const action: AlgorithmStepAction = {
      type: "compare",
      arrayId: "A",
      indexA: 0,
      indexB: 1,
      operator: "<",
      result: true,
    };
    const next = dsaReducer(baseState, action);
    expect(next.activeComparison).toEqual({
      arrayId: "A",
      indexA: 0,
      indexB: 1,
      operator: "<",
      result: true,
    });
  });

  it("handles highlight and clear_highlights actions", () => {
    const highlightAction: AlgorithmStepAction = {
      type: "highlight",
      targets: [{ arrayId: "A", index: 2, color: "#f1b000" }],
    };
    const highlighted = dsaReducer(baseState, highlightAction);
    expect(highlighted.highlights).toEqual([
      { arrayId: "A", index: 2, color: "#f1b000" },
    ]);

    const cleared = dsaReducer(highlighted, { type: "clear_highlights" });
    expect(cleared.highlights).toEqual([]);
    expect(cleared.activeComparison).toBeNull();
  });
});
