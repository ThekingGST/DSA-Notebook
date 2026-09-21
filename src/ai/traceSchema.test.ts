import { describe, it, expect } from "vitest";
import { validateExecutionTrace } from "./traceSchema";
import { ExecutionTrace } from "../engine/types";

describe("ExecutionTrace Zod Schema & Validation", () => {
  const validTrace: ExecutionTrace = {
    initialState: {
      arrays: [
        {
          id: "arr1",
          name: "nums",
          elements: [10, 20, 30],
          position: { x: 100, y: 100 },
        },
      ],
      pointers: [
        { id: "p1", name: "i", targetArrayId: "arr1", index: 0, color: "#38bdf8" },
      ],
      variables: [{ id: "v1", name: "target", value: 20 }],
      narration: { title: "Initial", text: "Starting search" },
    },
    steps: [
      {
        stepIndex: 1,
        title: "Step 1",
        explanation: "Check index 0",
        actions: [
          { type: "compare", arrayId: "arr1", indexA: 0, operator: "==", result: false },
          { type: "move_pointer", pointerId: "p1", toIndex: 1 },
        ],
      },
      {
        stepIndex: 2,
        title: "Step 2",
        explanation: "Found target at index 1",
        actions: [
          { type: "compare", arrayId: "arr1", indexA: 1, operator: "==", result: true },
          { type: "highlight", targets: [{ arrayId: "arr1", index: 1, color: "#04d361" }] },
        ],
      },
    ],
  };

  it("validates a well-formed execution trace", () => {
    const result = validateExecutionTrace(validTrace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toHaveLength(2);
    }
  });

  it("rejects non-object or malformed JSON payloads", () => {
    expect(validateExecutionTrace(null).success).toBe(false);
    expect(validateExecutionTrace("invalid string").success).toBe(false);
    expect(validateExecutionTrace({}).success).toBe(false);
  });

  it("rejects pointer referencing nonexistent arrayId in initialState", () => {
    const malformed = JSON.parse(JSON.stringify(validTrace));
    malformed.initialState.pointers[0].targetArrayId = "nonexistent_arr";
    const result = validateExecutionTrace(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/targetArrayId/i);
    }
  });

  it("rejects pointer index out of bounds (< -1 or > length)", () => {
    const malformed = JSON.parse(JSON.stringify(validTrace));
    malformed.initialState.pointers[0].index = 5; // array length is 3, max pointer index is 3
    const result = validateExecutionTrace(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/out of bounds/i);
    }

    malformed.initialState.pointers[0].index = -2;
    const resultNegative = validateExecutionTrace(malformed);
    expect(resultNegative.success).toBe(false);
  });

  it("rejects move_pointer action targeting nonexistent pointerId", () => {
    const malformed = JSON.parse(JSON.stringify(validTrace));
    malformed.steps[0].actions[1] = { type: "move_pointer", pointerId: "ghost_ptr", toIndex: 1 };
    const result = validateExecutionTrace(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/pointerId/i);
    }
  });

  it("rejects move_pointer action with out-of-bounds toIndex", () => {
    const malformed = JSON.parse(JSON.stringify(validTrace));
    malformed.steps[0].actions[1] = { type: "move_pointer", pointerId: "p1", toIndex: 10 };
    const result = validateExecutionTrace(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/out of bounds/i);
    }
  });

  it("rejects swap action targeting invalid indices or nonexistent arrayId", () => {
    const malformed = JSON.parse(JSON.stringify(validTrace));
    malformed.steps[0].actions = [
      { type: "swap", arrayId: "arr1", indexA: 0, indexB: 10 },
    ];
    const result = validateExecutionTrace(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/swap/i);
    }
  });

  it("rejects write_cell action targeting invalid index or nonexistent arrayId", () => {
    const malformed = JSON.parse(JSON.stringify(validTrace));
    malformed.steps[0].actions = [
      { type: "write_cell", arrayId: "ghost_arr", index: 0, value: 99 },
    ];
    const result = validateExecutionTrace(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/arrayId/i);
    }
  });

  it("rejects unknown action types", () => {
    const malformed = JSON.parse(JSON.stringify(validTrace));
    malformed.steps[0].actions = [
      { type: "explode_cell", arrayId: "arr1", index: 0 },
    ];
    const result = validateExecutionTrace(malformed);
    expect(result.success).toBe(false);
  });
});
