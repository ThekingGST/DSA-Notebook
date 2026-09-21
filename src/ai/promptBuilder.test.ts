import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { buildAlgorithmPrompt, serializeFollowUpContext } from "./promptBuilder";
import { ComputedSnapshot, AlgorithmStep } from "../engine/types";

describe("PromptBuilder & SystemPrompt", () => {
  it("system prompt specifies JSON output and action types", () => {
    expect(SYSTEM_PROMPT).toContain("ExecutionTrace");
    expect(SYSTEM_PROMPT).toContain("move_pointer");
    expect(SYSTEM_PROMPT).toContain("compare");
    expect(SYSTEM_PROMPT).toContain("swap");
    expect(SYSTEM_PROMPT).toContain("write_cell");
    expect(SYSTEM_PROMPT).toContain("set_variable");
    expect(SYSTEM_PROMPT).toContain("Only return valid JSON");
  });

  it("buildAlgorithmPrompt wraps user query with system instructions", () => {
    const prompt = buildAlgorithmPrompt("Explain binary search on [1, 3, 5, 7, 9] for target 7");
    expect(prompt.systemPrompt).toBe(SYSTEM_PROMPT);
    expect(prompt.userPrompt).toContain("Explain binary search on [1, 3, 5, 7, 9] for target 7");
  });

  it("serializeFollowUpContext formats active snapshot and last steps", () => {
    const snapshot: ComputedSnapshot = {
      stepIndex: 3,
      title: "Step 3: Compare mid",
      explanation: "arr[mid] is 5, smaller than target 7",
      state: {
        arrays: [{ id: "A", name: "nums", elements: [1, 3, 5, 7, 9], position: { x: 100, y: 100 } }],
        pointers: [
          { id: "p1", name: "low", targetArrayId: "A", index: 0 },
          { id: "p2", name: "mid", targetArrayId: "A", index: 2 },
          { id: "p3", name: "high", targetArrayId: "A", index: 4 },
        ],
        variables: [{ id: "v1", name: "target", value: 7 }],
      },
    };

    const recentSteps: AlgorithmStep[] = [
      {
        stepIndex: 2,
        title: "Step 2: Calculate mid",
        explanation: "mid = 2",
        actions: [{ type: "move_pointer", pointerId: "p2", toIndex: 2 }],
      },
    ];

    const contextStr = serializeFollowUpContext(snapshot, recentSteps);
    expect(contextStr).toContain("Active Step: 3");
    expect(contextStr).toContain("low: index 0");
    expect(contextStr).toContain("mid: index 2");
    expect(contextStr).toContain("target = 7");
    expect(contextStr).toContain("Step 2: Calculate mid");
  });
});
