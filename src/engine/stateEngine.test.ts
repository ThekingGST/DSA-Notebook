import { describe, it, expect } from "vitest";
import { dsaReducer, computeSnapshots, DSAStateEngine } from "./stateEngine";
import { DSAState, AlgorithmStepAction, ExecutionTrace } from "./types";

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

  it("automatically adds green highlight on write_cell and swap actions", () => {
    const writeResult = dsaReducer(baseState, {
      type: "write_cell",
      arrayId: "A",
      index: 1,
      value: 99,
    });
    expect(writeResult.highlights).toContainEqual({
      arrayId: "A",
      index: 1,
      color: "#04d361",
    });

    const swapResult = dsaReducer(baseState, {
      type: "swap",
      arrayId: "A",
      indexA: 0,
      indexB: 2,
    });
    expect(swapResult.highlights).toContainEqual({
      arrayId: "A",
      index: 0,
      color: "#04d361",
    });
    expect(swapResult.highlights).toContainEqual({
      arrayId: "A",
      index: 2,
      color: "#04d361",
    });
  });
});

describe("computeSnapshots & DSAStateEngine", () => {
  const trace: ExecutionTrace = {
    initialState: {
      arrays: [
        {
          id: "A",
          name: "nums",
          elements: [10, 20, 30],
          position: { x: 100, y: 100 },
        },
      ],
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
      variables: [{ id: "v1", name: "max", value: 10 }],
    },
    steps: [
      {
        stepIndex: 1,
        title: "Step 1: Compare",
        explanation: "Comparing nums[0] and nums[1]",
        actions: [
          { type: "compare" as const, arrayId: "A", indexA: 0, indexB: 1 },
          { type: "move_pointer" as const, pointerId: "p1", toIndex: 1 },
        ],
      },
      {
        stepIndex: 2,
        title: "Step 2: Update Max",
        explanation: "nums[1] > max, updating max to 20",
        actions: [{ type: "set_variable" as const, variableId: "v1", value: 20 }],
      },
    ],
  };

  it("precomputes all snapshots deterministically from initial state", () => {
    const snapshots = computeSnapshots(trace);
    expect(snapshots).toHaveLength(3); // step 0, 1, 2
    expect(snapshots[0].stepIndex).toBe(0);
    expect(snapshots[0].state.pointers[0].index).toBe(0);

    expect(snapshots[1].stepIndex).toBe(1);
    expect(snapshots[1].state.pointers[0].index).toBe(1);
    expect(snapshots[1].state.activeComparison?.indexB).toBe(1);

    expect(snapshots[2].stepIndex).toBe(2);
    expect(snapshots[2].state.variables[0].value).toBe(20);
  });

  it("supports state scrubbing, step forward/backward, and reset", () => {
    const engine = new DSAStateEngine(trace);
    expect(engine.getCurrentStepIndex()).toBe(0);
    expect(engine.canStepBackward()).toBe(false);
    expect(engine.canStepForward()).toBe(true);

    engine.stepForward();
    expect(engine.getCurrentStepIndex()).toBe(1);
    expect(engine.getCurrentSnapshot().state.pointers[0].index).toBe(1);

    engine.stepForward();
    expect(engine.getCurrentStepIndex()).toBe(2);
    expect(engine.canStepForward()).toBe(false);

    engine.stepBackward();
    expect(engine.getCurrentStepIndex()).toBe(1);

    engine.reset();
    expect(engine.getCurrentStepIndex()).toBe(0);

    engine.stepTo(2);
    expect(engine.getCurrentStepIndex()).toBe(2);
  });
});
