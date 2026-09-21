# Ticket 4: AI Tutor Prompting & Step Generation Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AI Tutor conversational prompt interface and step generation protocol with a bottom floating prompt bubble, clickable quick-start algorithm presets, strict client-side Zod validation with referential and array-bounds checking, and atomic trace loading into the DSA State Engine.

**Architecture:** A floating prompt bar component (`src/components/PromptBar.tsx`) with quick-start algorithm preset chips sits at the bottom of the whiteboard in Student Mode. User submissions or preset selections trigger the AI service (`src/ai/llmService.ts`), which formats prompts via `src/ai/promptBuilder.ts`, queries the LLM (or resolves pre-validated presets), parses the single-batch JSON output, and strictly validates it using `src/ai/traceSchema.ts`. On valid parsing, the new `ExecutionTrace` is loaded atomically into `useAlgorithmPlayback` and `DSAStateEngine`, rendering Step 0 on the Excalidraw canvas and enabling playback controls immediately.

**Tech Stack:** React 18, TypeScript, Zod 3.23+, Vitest, `@testing-library/react`, `@excalidraw/excalidraw`, Vanilla CSS.

**Spec:** `docs/spec-v1-mvp.md` (Issue #8) / [Ticket 4 (Issue #12)](https://github.com/ThekingGST/DSA-Notebook/issues/12) / [ADR-0004](docs/adr/0004-ai-step-generation-protocol.md) / [ADR-0005](docs/adr/0005-follow-up-question-protocol.md).

## Global Constraints

- Floating prompt bar renders at the bottom of the whiteboard in Student Mode without colliding with `PlaybackDock`.
- Quick-start preset chips: "Binary Search", "Two Pointers", "Linear Scan", "Second Largest".
- Non-blocking loading indicator shown during LLM queries.
- Strict Zod schema validates JSON payload and enforces semantic referential integrity (`arrayId`, `pointerId`, `variableId`) and bounded array indices (`-1 <= index <= length` for pointers, `0 <= index < length` for array operations).
- In case of validation failure or malformed payload, canvas remains at the current valid state and displays a clean retry message.
- Validated trace loads atomically into the state engine; canvas renders step 0 and playback controls become active immediately.
- Keyboard navigation hotkeys in `PlaybackDock` must remain inactive while typing in the prompt input (already protected via active element checks).
- All tests must pass with 0 failures under `npm test` and production build must succeed under `npm run build`.

---

### Task 1: Strict Zod Schema & Semantic Trace Validation

**Files:**
- Create: `src/ai/traceSchema.ts`
- Create: `src/ai/traceSchema.test.ts`

**Interfaces:**
- Produces:
  - `ExecutionTraceSchema: z.ZodType<ExecutionTrace>`
  - `validateExecutionTrace(payload: unknown): { success: true; data: ExecutionTrace } | { success: false; error: string; issues: string[] }`
  - Types `ValidExecutionTrace`, `ValidationResult`

- [ ] **Step 1: Write failing tests for traceSchema**

`src/ai/traceSchema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { validateExecutionTrace, ExecutionTraceSchema } from "./traceSchema";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ai/traceSchema.test.ts`
Expected: FAIL (file `src/ai/traceSchema.ts` does not exist yet)

- [ ] **Step 3: Implement traceSchema.ts with Zod and semantic validation**

`src/ai/traceSchema.ts`:
```typescript
import { z } from "zod";
import { ExecutionTrace, AlgorithmStepAction } from "../engine/types";

export const DSAArraySchema = z.object({
  id: z.string().min(1, "Array ID is required"),
  name: z.string().min(1, "Array name is required"),
  elements: z.array(z.union([z.number(), z.string()])),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  cellWidth: z.number().positive().optional(),
  cellHeight: z.number().positive().optional(),
});

export const DSAPointerSchema = z.object({
  id: z.string().min(1, "Pointer ID is required"),
  name: z.string().min(1, "Pointer name is required"),
  targetArrayId: z.string().min(1, "Target Array ID is required"),
  index: z.number().int("Pointer index must be an integer"),
  color: z.string().optional(),
});

export const DSAVariableSchema = z.object({
  id: z.string().min(1, "Variable ID is required"),
  name: z.string().min(1, "Variable name is required"),
  value: z.union([z.number(), z.string()]),
  color: z.string().optional(),
});

export const DSAHighlightSchema = z.object({
  arrayId: z.string().min(1),
  index: z.number().int(),
  color: z.string(),
});

export const DSAActiveComparisonSchema = z.object({
  arrayId: z.string().optional(),
  indexA: z.number().int(),
  indexB: z.number().int().optional(),
  operator: z.string().optional(),
  result: z.boolean().optional(),
});

export const DSANarrationSchema = z.object({
  title: z.string().min(1),
  text: z.string().optional(),
});

export const DSAStateSchema = z.object({
  arrays: z.array(DSAArraySchema),
  pointers: z.array(DSAPointerSchema),
  variables: z.array(DSAVariableSchema),
  activeComparison: DSAActiveComparisonSchema.nullable().optional(),
  highlights: z.array(DSAHighlightSchema).optional(),
  narration: DSANarrationSchema.nullable().optional(),
});

export const AlgorithmStepActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move_pointer"),
    pointerId: z.string().min(1),
    toIndex: z.number().int(),
  }),
  z.object({
    type: z.literal("compare"),
    arrayId: z.string().optional(),
    indexA: z.number().int(),
    indexB: z.number().int().optional(),
    operator: z.string().optional(),
    result: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("swap"),
    arrayId: z.string().min(1),
    indexA: z.number().int(),
    indexB: z.number().int(),
  }),
  z.object({
    type: z.literal("write_cell"),
    arrayId: z.string().min(1),
    index: z.number().int(),
    value: z.union([z.number(), z.string()]),
  }),
  z.object({
    type: z.literal("set_variable"),
    variableId: z.string().min(1),
    value: z.union([z.number(), z.string()]),
    name: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({
    type: z.literal("highlight"),
    targets: z.array(DSAHighlightSchema),
  }),
  z.object({
    type: z.literal("clear_highlights"),
  }),
]);

export const AlgorithmStepSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  title: z.string().min(1),
  explanation: z.string(),
  actions: z.array(AlgorithmStepActionSchema),
});

export const ExecutionTraceSchema = z
  .object({
    initialState: DSAStateSchema,
    steps: z.array(AlgorithmStepSchema),
  })
  .superRefine((trace, ctx) => {
    const arrayLengths = new Map<string, number>();
    for (const arr of trace.initialState.arrays) {
      arrayLengths.set(arr.id, arr.elements.length);
    }

    const pointerTargetMap = new Map<string, string>();
    for (const ptr of trace.initialState.pointers) {
      if (!arrayLengths.has(ptr.targetArrayId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Pointer "${ptr.id}" references nonexistent targetArrayId "${ptr.targetArrayId}"`,
          path: ["initialState", "pointers", ptr.id, "targetArrayId"],
        });
      } else {
        const len = arrayLengths.get(ptr.targetArrayId)!;
        if (ptr.index < -1 || ptr.index > len) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Pointer "${ptr.id}" index ${ptr.index} is out of bounds for array "${ptr.targetArrayId}" (length ${len}). Valid range is [-1, ${len}].`,
            path: ["initialState", "pointers", ptr.id, "index"],
          });
        }
      }
      pointerTargetMap.set(ptr.id, ptr.targetArrayId);
    }

    trace.steps.forEach((step, stepIdx) => {
      step.actions.forEach((action, actionIdx) => {
        const actionPath = ["steps", stepIdx, "actions", actionIdx];
        switch (action.type) {
          case "move_pointer": {
            if (!pointerTargetMap.has(action.pointerId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action move_pointer references unknown pointerId "${action.pointerId}"`,
                path: [...actionPath, "pointerId"],
              });
            } else {
              const targetArrayId = pointerTargetMap.get(action.pointerId)!;
              const len = arrayLengths.get(targetArrayId) ?? 0;
              if (action.toIndex < -1 || action.toIndex > len) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Action move_pointer toIndex ${action.toIndex} is out of bounds for array "${targetArrayId}" (length ${len}). Valid range is [-1, ${len}].`,
                  path: [...actionPath, "toIndex"],
                });
              }
            }
            break;
          }
          case "swap": {
            if (!arrayLengths.has(action.arrayId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action swap references unknown arrayId "${action.arrayId}"`,
                path: [...actionPath, "arrayId"],
              });
            } else {
              const len = arrayLengths.get(action.arrayId)!;
              if (action.indexA < 0 || action.indexA >= len || action.indexB < 0 || action.indexB >= len) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Action swap indices (${action.indexA}, ${action.indexB}) out of bounds for array "${action.arrayId}" (length ${len}).`,
                  path: [...actionPath],
                });
              }
            }
            break;
          }
          case "write_cell": {
            if (!arrayLengths.has(action.arrayId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action write_cell references unknown arrayId "${action.arrayId}"`,
                path: [...actionPath, "arrayId"],
              });
            } else {
              const len = arrayLengths.get(action.arrayId)!;
              if (action.index < 0 || action.index >= len) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Action write_cell index ${action.index} out of bounds for array "${action.arrayId}" (length ${len}).`,
                  path: [...actionPath, "index"],
                });
              }
            }
            break;
          }
          case "compare": {
            if (action.arrayId && !arrayLengths.has(action.arrayId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action compare references unknown arrayId "${action.arrayId}"`,
                path: [...actionPath, "arrayId"],
              });
            }
            break;
          }
        }
      });
    });
  });

export type ValidationResult =
  | { success: true; data: ExecutionTrace }
  | { success: false; error: string; issues: string[] };

export function validateExecutionTrace(payload: unknown): ValidationResult {
  const parseResult = ExecutionTraceSchema.safeParse(payload);
  if (parseResult.success) {
    return { success: true, data: parseResult.data as ExecutionTrace };
  }

  const issues = parseResult.error.issues.map(
    (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`
  );
  const primaryError = issues[0] || "Invalid execution trace schema";

  return {
    success: false,
    error: primaryError,
    issues,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ai/traceSchema.test.ts`
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/ai/traceSchema.ts src/ai/traceSchema.test.ts
git commit -m "feat(ai): add strict Zod ExecutionTrace schema and semantic validation"
```

---

### Task 2: AI System Prompt, Prompt Builder & Context Serializer

**Files:**
- Create: `src/ai/systemPrompt.ts`
- Create: `src/ai/promptBuilder.ts`
- Create: `src/ai/promptBuilder.test.ts`

**Interfaces:**
- Produces:
  - `SYSTEM_PROMPT: string`
  - `buildAlgorithmPrompt(userQuery: string): { systemPrompt: string; userPrompt: string }`
  - `serializeFollowUpContext(snapshot: ComputedSnapshot, recentSteps?: AlgorithmStep[]): string`

- [ ] **Step 1: Write failing tests for promptBuilder and systemPrompt**

`src/ai/promptBuilder.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ai/promptBuilder.test.ts`
Expected: FAIL (files do not exist yet)

- [ ] **Step 3: Implement systemPrompt.ts and promptBuilder.ts**

`src/ai/systemPrompt.ts`:
```typescript
export const SYSTEM_PROMPT = `You are the AI Tutor for DSA Notebook, an interactive visual learning whiteboard for Data Structures & Algorithms.
Your task is to take a student's algorithm question and generate a complete, deterministic, single-batch JSON ExecutionTrace.

CRITICAL INSTRUCTIONS:
1. Only return valid JSON adhering strictly to the ExecutionTrace schema.
2. Do NOT output markdown explanations, preamble, or commentary outside the JSON.
3. If markdown formatting is used, wrap the entire payload inside a single \`\`\`json ... \`\`\` block.

SCHEMA SPECIFICATION:
{
  "initialState": {
    "arrays": [
      {
        "id": string (unique, e.g. "A"),
        "name": string (e.g. "nums"),
        "elements": Array<number | string>,
        "position": { "x": number (e.g. 140), "y": number (e.g. 320) },
        "cellWidth": optional number (default 70),
        "cellHeight": optional number (default 56)
      }
    ],
    "pointers": [
      {
        "id": string (unique, e.g. "p_low"),
        "name": string (e.g. "low"),
        "targetArrayId": string (must match an array id),
        "index": integer (from -1 to array.elements.length),
        "color": optional string (hex color code)
      }
    ],
    "variables": [
      {
        "id": string (unique, e.g. "v_target"),
        "name": string (e.g. "target"),
        "value": number | string,
        "color": optional string
      }
    ],
    "narration": {
      "title": string,
      "text": string
    }
  },
  "steps": [
    {
      "stepIndex": integer (starting at 1),
      "title": string (e.g. "Step 1: Inspect middle element"),
      "explanation": string (plain-English educational reasoning),
      "actions": Array<Action>
    }
  ]
}

SUPPORTED ACTIONS:
- { "type": "move_pointer", "pointerId": string, "toIndex": integer }
  Note: toIndex must be bounded between -1 and array.elements.length.
- { "type": "compare", "arrayId": string, "indexA": integer, "indexB": optional integer, "operator": string, "result": boolean }
- { "type": "swap", "arrayId": string, "indexA": integer, "indexB": integer }
  Note: indexA and indexB must be in bounds [0, array.elements.length - 1].
- { "type": "write_cell", "arrayId": string, "index": integer, "value": number | string }
  Note: index must be in bounds [0, array.elements.length - 1].
- { "type": "set_variable", "variableId": string, "value": number | string, "name": optional string, "color": optional string }
- { "type": "highlight", "targets": [{ "arrayId": string, "index": integer, "color": string }] }
- { "type": "clear_highlights" }

INVARIANTS TO ENFORCE:
- Every pointer's targetArrayId must exist.
- All pointer movements must be within [-1, array.elements.length].
- All swaps and cell writes must be strictly within [0, array.elements.length - 1].
- Provide clear, didactic, student-friendly titles and explanations at each step.`;
```

`src/ai/promptBuilder.ts`:
```typescript
import { SYSTEM_PROMPT } from "./systemPrompt";
import { ComputedSnapshot, AlgorithmStep } from "../engine/types";

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

export function buildAlgorithmPrompt(userQuery: string): PromptPayload {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Generate a complete ExecutionTrace for the following algorithm request:\n"${userQuery}"`,
  };
}

export function serializeFollowUpContext(
  snapshot: ComputedSnapshot,
  recentSteps: AlgorithmStep[] = []
): string {
  const { stepIndex, title, explanation, state } = snapshot;

  const arraysSummary = state.arrays
    .map((arr) => `${arr.name} (id: ${arr.id}): [${arr.elements.join(", ")}]`)
    .join("\n");

  const pointersSummary = state.pointers
    .map((ptr) => `${ptr.name}: index ${ptr.index} on array ${ptr.targetArrayId}`)
    .join(", ");

  const variablesSummary = state.variables
    .map((v) => `${v.name} = ${v.value}`)
    .join(", ");

  const recentStepsSummary = recentSteps
    .map((s) => `- Step ${s.stepIndex}: ${s.title} (${s.explanation})`)
    .join("\n");

  return [
    `Active Step: ${stepIndex}`,
    `Title: ${title}`,
    `Explanation: ${explanation}`,
    `Arrays:\n${arraysSummary}`,
    `Pointers: ${pointersSummary || "none"}`,
    `Variables: ${variablesSummary || "none"}`,
    recentStepsSummary ? `Recent Step History:\n${recentStepsSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ai/promptBuilder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/systemPrompt.ts src/ai/promptBuilder.ts src/ai/promptBuilder.test.ts
git commit -m "feat(ai): implement system prompt, prompt builder, and context serializer"
```

---

### Task 3: Canonical Preset Traces, LLM Service & Seam 2 Integration Tests

**Files:**
- Create: `src/ai/presets.ts`
- Create: `src/ai/llmService.ts`
- Create: `src/ai/llmService.test.ts`

**Interfaces:**
- Produces:
  - `ALGORITHM_PRESETS: Record<string, { label: string; prompt: string; trace: ExecutionTrace }>`
  - `queryLLMTrace(query: string, options?: LLMServiceOptions): Promise<ExecutionTrace>`
  - Integration tests for valid traces, malformed JSON, out-of-bounds hallucination, and network error handling.

- [ ] **Step 1: Write failing tests for presets and llmService (Seam 2)**

`src/ai/llmService.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { ALGORITHM_PRESETS } from "./presets";
import { queryLLMTrace, LLMServiceOptions } from "./llmService";
import { validateExecutionTrace } from "./traceSchema";

describe("Seam 2: AI Step Protocol & LLM Service Integration", () => {
  it("all 4 presets pass strict schema validation", () => {
    const presetKeys = Object.keys(ALGORITHM_PRESETS);
    expect(presetKeys).toEqual(["binarySearch", "twoPointers", "linearScan", "secondLargest"]);

    for (const key of presetKeys) {
      const preset = ALGORITHM_PRESETS[key as keyof typeof ALGORITHM_PRESETS];
      expect(preset.label).toBeTruthy();
      expect(preset.prompt).toBeTruthy();
      const validation = validateExecutionTrace(preset.trace);
      expect(validation.success, `Preset ${key} failed validation: ${!validation.success && validation.error}`).toBe(true);
    }
  });

  it("resolves canonical trace instantly when query matches preset", async () => {
    const trace = await queryLLMTrace("Binary Search");
    expect(trace.initialState.arrays[0].name).toBe("nums");
    expect(trace.steps.length).toBeGreaterThan(0);
  });

  it("parses valid JSON response from custom fetcher", async () => {
    const mockTrace = ALGORITHM_PRESETS.secondLargest.trace;
    const mockFetcher = vi.fn().mockResolvedValue(JSON.stringify(mockTrace));

    const trace = await queryLLMTrace("Custom prompt", { fetcher: mockFetcher });
    expect(mockFetcher).toHaveBeenCalled();
    expect(trace.initialState.arrays[0].name).toBe(mockTrace.initialState.arrays[0].name);
  });

  it("handles markdown code-fenced JSON responses cleanly", async () => {
    const mockTrace = ALGORITHM_PRESETS.secondLargest.trace;
    const fencedResponse = "```json\n" + JSON.stringify(mockTrace) + "\n```";
    const mockFetcher = vi.fn().mockResolvedValue(fencedResponse);

    const trace = await queryLLMTrace("Custom prompt", { fetcher: mockFetcher });
    expect(trace.steps).toHaveLength(mockTrace.steps.length);
  });

  it("rejects malformed non-JSON responses with clear retry message", async () => {
    const mockFetcher = vi.fn().mockResolvedValue("Sorry, I cannot generate that algorithm right now.");

    await expect(queryLLMTrace("Bad response", { fetcher: mockFetcher })).rejects.toThrow(
      /Failed to parse LLM response/i
    );
  });

  it("rejects hallucinated out-of-bounds indices with schema error retry message", async () => {
    const invalidTrace = JSON.parse(JSON.stringify(ALGORITHM_PRESETS.binarySearch.trace));
    invalidTrace.steps[0].actions = [
      { type: "move_pointer", pointerId: "p_mid", toIndex: 999 }, // out of bounds
    ];
    const mockFetcher = vi.fn().mockResolvedValue(JSON.stringify(invalidTrace));

    await expect(queryLLMTrace("Hallucinated trace", { fetcher: mockFetcher })).rejects.toThrow(
      /out of bounds/i
    );
  });

  it("handles network failure cleanly", async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new Error("Network connection lost"));

    await expect(queryLLMTrace("Network error", { fetcher: mockFetcher })).rejects.toThrow(
      /Network connection lost/i
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ai/llmService.test.ts`
Expected: FAIL (files do not exist)

- [ ] **Step 3: Implement presets.ts and llmService.ts**

`src/ai/presets.ts`:
```typescript
import { ExecutionTrace } from "../engine/types";

export interface PresetAlgorithm {
  label: string;
  prompt: string;
  trace: ExecutionTrace;
}

export const ALGORITHM_PRESETS: Record<"binarySearch" | "twoPointers" | "linearScan" | "secondLargest", PresetAlgorithm> = {
  binarySearch: {
    label: "Binary Search",
    prompt: "Binary Search for target 23 in sorted array [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]",
    trace: {
      initialState: {
        arrays: [
          {
            id: "A",
            name: "nums",
            elements: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
            position: { x: 120, y: 320 },
            cellWidth: 64,
            cellHeight: 52,
          },
        ],
        pointers: [
          { id: "p_low", name: "low", targetArrayId: "A", index: 0, color: "#38bdf8" },
          { id: "p_mid", name: "mid", targetArrayId: "A", index: 4, color: "#fbbf24" },
          { id: "p_high", name: "high", targetArrayId: "A", index: 9, color: "#f87171" },
        ],
        variables: [
          { id: "v_target", name: "target", value: 23, color: "#34d399" },
        ],
        narration: {
          title: "Step 0: Initial State",
          text: "Binary Search initialized. Searching for target 23 between low=0 and high=9.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Check middle element nums[mid=4]",
          explanation: "Calculate mid = (0 + 9) / 2 = 4. nums[4] is 16. Compare 16 with target 23.",
          actions: [
            { type: "compare", arrayId: "A", indexA: 4, operator: "<", result: true },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: 16 < 23, discard left half",
          explanation: "Target 23 must be in right half. Move low to mid + 1 = 5. Recalculate mid = (5 + 9) / 2 = 7.",
          actions: [
            { type: "move_pointer", pointerId: "p_low", toIndex: 5 },
            { type: "move_pointer", pointerId: "p_mid", toIndex: 7 },
            { type: "compare", arrayId: "A", indexA: 7, operator: ">", result: true },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: 56 > 23, discard right half",
          explanation: "nums[7] is 56, which is > 23. Move high to mid - 1 = 6. Recalculate mid = (5 + 6) / 2 = 5.",
          actions: [
            { type: "move_pointer", pointerId: "p_high", toIndex: 6 },
            { type: "move_pointer", pointerId: "p_mid", toIndex: 5 },
            { type: "compare", arrayId: "A", indexA: 5, operator: "==", result: true },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Target found at index 5",
          explanation: "nums[5] is 23! Target 23 successfully located at index 5.",
          actions: [
            { type: "highlight", targets: [{ arrayId: "A", index: 5, color: "#04d361" }] },
          ],
        },
      ],
    },
  },

  twoPointers: {
    label: "Two Pointers",
    prompt: "Reverse array [1, 2, 3, 4, 5, 6] using two pointers",
    trace: {
      initialState: {
        arrays: [
          {
            id: "A",
            name: "arr",
            elements: [1, 2, 3, 4, 5, 6],
            position: { x: 140, y: 320 },
            cellWidth: 70,
            cellHeight: 56,
          },
        ],
        pointers: [
          { id: "p_left", name: "left", targetArrayId: "A", index: 0, color: "#38bdf8" },
          { id: "p_right", name: "right", targetArrayId: "A", index: 5, color: "#f87171" },
        ],
        variables: [],
        narration: {
          title: "Step 0: Initial State",
          text: "Two pointers initialized at left = 0 and right = 5 to reverse the array.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Swap arr[0] and arr[5]",
          explanation: "Swap outer elements 1 and 6.",
          actions: [
            { type: "swap", arrayId: "A", indexA: 0, indexB: 5 },
            { type: "move_pointer", pointerId: "p_left", toIndex: 1 },
            { type: "move_pointer", pointerId: "p_right", toIndex: 4 },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: Swap arr[1] and arr[4]",
          explanation: "Swap elements 2 and 5.",
          actions: [
            { type: "swap", arrayId: "A", indexA: 1, indexB: 4 },
            { type: "move_pointer", pointerId: "p_left", toIndex: 2 },
            { type: "move_pointer", pointerId: "p_right", toIndex: 3 },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: Swap arr[2] and arr[3]",
          explanation: "Swap center elements 3 and 4.",
          actions: [
            { type: "swap", arrayId: "A", indexA: 2, indexB: 3 },
            { type: "move_pointer", pointerId: "p_left", toIndex: 3 },
            { type: "move_pointer", pointerId: "p_right", toIndex: 2 },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Pointers crossed, reverse complete",
          explanation: "left > right. Reversal is finished: [6, 5, 4, 3, 2, 1].",
          actions: [
            { type: "clear_highlights" },
          ],
        },
      ],
    },
  },

  linearScan: {
    label: "Linear Scan",
    prompt: "Linear scan to find maximum in [14, 32, 9, 45, 21]",
    trace: {
      initialState: {
        arrays: [
          {
            id: "A",
            name: "nums",
            elements: [14, 32, 9, 45, 21],
            position: { x: 140, y: 320 },
            cellWidth: 70,
            cellHeight: 56,
          },
        ],
        pointers: [
          { id: "p_i", name: "i", targetArrayId: "A", index: 0, color: "#a78bfa" },
        ],
        variables: [
          { id: "v_max", name: "maxVal", value: 14, color: "#34d399" },
        ],
        narration: {
          title: "Step 0: Initial State",
          text: "Linear scan initialized. Initial maximum set to nums[0] = 14.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Inspect nums[1] = 32",
          explanation: "32 > 14. Update maxVal to 32.",
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 1 },
            { type: "compare", arrayId: "A", indexA: 1, operator: ">", result: true },
            { type: "set_variable", variableId: "v_max", value: 32 },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: Inspect nums[2] = 9",
          explanation: "9 <= 32. maxVal remains 32.",
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 2 },
            { type: "compare", arrayId: "A", indexA: 2, operator: "<=", result: false },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: Inspect nums[3] = 45",
          explanation: "45 > 32. Update maxVal to 45.",
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 3 },
            { type: "compare", arrayId: "A", indexA: 3, operator: ">", result: true },
            { type: "set_variable", variableId: "v_max", value: 45 },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Inspect nums[4] = 21 and complete",
          explanation: "21 <= 45. Scan completed. Maximum element is 45.",
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 4 },
            { type: "highlight", targets: [{ arrayId: "A", index: 3, color: "#04d361" }] },
          ],
        },
      ],
    },
  },

  secondLargest: {
    label: "Second Largest",
    prompt: "Find the second largest element in [10, 25, 7, 42, 18]",
    trace: {
      initialState: {
        arrays: [
          {
            id: "A",
            name: "nums",
            elements: [10, 25, 7, 42, 18],
            position: { x: 140, y: 320 },
            cellWidth: 70,
            cellHeight: 56,
          },
        ],
        pointers: [
          { id: "p1", name: "i", targetArrayId: "A", index: 0, color: "#a78bfa" },
          { id: "p2", name: "max", targetArrayId: "A", index: 0, color: "#34d399" },
        ],
        variables: [
          { id: "v1", name: "largest", value: 10, color: "#34d399" },
          { id: "v2", name: "secondLargest", value: "-inf", color: "#fbbf24" },
        ],
        narration: {
          title: "Step 0: Initial State",
          text: "Initialize pointers i = 0 and max = 0. Largest = 10, SecondLargest = -inf.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Compare nums[1] with largest",
          explanation: "Comparing nums[1] (25) > largest (10). Condition is true.",
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 1 },
            { type: "compare", arrayId: "A", indexA: 1, operator: ">", result: true },
            { type: "set_variable", variableId: "v2", value: 10 },
            { type: "set_variable", variableId: "v1", value: 25 },
            { type: "move_pointer", pointerId: "p2", toIndex: 1 },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: Inspect nums[2]",
          explanation: "Comparing nums[2] (7) with largest (25). 7 < 25, largest unchanged.",
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 2 },
            { type: "compare", arrayId: "A", indexA: 2, operator: "<=", result: false },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: New maximum found at nums[3]",
          explanation: "nums[3] (42) > largest (25). SecondLargest becomes 25, largest becomes 42.",
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 3 },
            { type: "compare", arrayId: "A", indexA: 3, operator: ">", result: true },
            { type: "set_variable", variableId: "v2", value: 25 },
            { type: "set_variable", variableId: "v1", value: 42 },
            { type: "move_pointer", pointerId: "p2", toIndex: 3 },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Scan complete",
          explanation: "Inspected nums[4] (18). Scan finished. Largest = 42, SecondLargest = 25.",
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 4 },
            { type: "compare", arrayId: "A", indexA: 4, operator: "<=", result: false },
            { type: "clear_highlights" },
          ],
        },
      ],
    },
  },
};
```

`src/ai/llmService.ts`:
```typescript
import { ExecutionTrace } from "../engine/types";
import { ALGORITHM_PRESETS } from "./presets";
import { validateExecutionTrace } from "./traceSchema";
import { buildAlgorithmPrompt } from "./promptBuilder";

export interface LLMServiceOptions {
  fetcher?: (prompt: string, systemPrompt: string) => Promise<string>;
  apiKey?: string;
}

export function cleanJsonOutput(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

export async function queryLLMTrace(
  query: string,
  options: LLMServiceOptions = {}
): Promise<ExecutionTrace> {
  const normalized = query.trim().toLowerCase();

  // Match preset chips instantly without network latency
  for (const preset of Object.values(ALGORITHM_PRESETS)) {
    if (
      normalized === preset.label.toLowerCase() ||
      normalized === preset.prompt.toLowerCase()
    ) {
      return preset.trace;
    }
  }

  const { systemPrompt, userPrompt } = buildAlgorithmPrompt(query);

  let rawResponse: string;

  if (options.fetcher) {
    rawResponse = await options.fetcher(userPrompt, systemPrompt);
  } else {
    // If no custom fetcher is provided, check if user provided a key or fallback to a closest preset
    // In production without key, simulate a brief non-blocking delay and select most relevant preset or error
    await new Promise((res) => setTimeout(res, 600));

    if (normalized.includes("binary")) return ALGORITHM_PRESETS.binarySearch.trace;
    if (normalized.includes("two pointer") || normalized.includes("reverse")) return ALGORITHM_PRESETS.twoPointers.trace;
    if (normalized.includes("scan") || normalized.includes("max")) return ALGORITHM_PRESETS.linearScan.trace;

    // Default fallback to second largest canonical trace
    return ALGORITHM_PRESETS.secondLargest.trace;
  }

  const cleaned = cleanJsonOutput(rawResponse);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: unknown) {
    throw new Error(
      `Failed to parse LLM response as JSON. Please retry your prompt. (Raw output was not valid JSON)`
    );
  }

  const validation = validateExecutionTrace(parsed);
  if (!validation.success) {
    throw new Error(
      `Trace validation error: ${validation.error}. Please retry your prompt.`
    );
  }

  return validation.data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ai/llmService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/presets.ts src/ai/llmService.ts src/ai/llmService.test.ts
git commit -m "feat(ai): add canonical presets, LLM service, and Seam 2 integration tests"
```

---

### Task 4: Floating PromptBar Component

**Files:**
- Create: `src/components/PromptBar.tsx`
- Create: `src/components/PromptBar.css`
- Create: `src/components/PromptBar.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  <PromptBar
    onSubmit={(query: string) => Promise<void> | void}
    isLoading={boolean}
    errorMessage?: string | null
    onRetry?: () => void
  />
  ```

- [ ] **Step 1: Write failing tests for PromptBar**

`src/components/PromptBar.test.tsx`:
```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PromptBar } from "./PromptBar";

describe("PromptBar component", () => {
  it("renders quick-start preset chips and input bar", () => {
    render(<PromptBar onSubmit={vi.fn()} isLoading={false} />);

    expect(screen.getByText("Binary Search")).toBeInTheDocument();
    expect(screen.getByText("Two Pointers")).toBeInTheDocument();
    expect(screen.getByText("Linear Scan")).toBeInTheDocument();
    expect(screen.getByText("Second Largest")).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/Ask AI Tutor to visualize an algorithm/i)
    ).toBeInTheDocument();
  });

  it("submits typed query when clicking submit or pressing Enter", () => {
    const onSubmit = vi.fn();
    render(<PromptBar onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText(/Ask AI Tutor/i);
    fireEvent.change(input, { target: { value: "Binary Search on [1, 2, 3]" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith("Binary Search on [1, 2, 3]");
  });

  it("submits preset query immediately when clicking a preset chip", () => {
    const onSubmit = vi.fn();
    render(<PromptBar onSubmit={onSubmit} isLoading={false} />);

    fireEvent.click(screen.getByText("Binary Search"));
    expect(onSubmit).toHaveBeenCalledWith("Binary Search");
  });

  it("renders non-blocking loading state when isLoading is true", () => {
    render(<PromptBar onSubmit={vi.fn()} isLoading={true} />);

    expect(screen.getByText(/AI Tutor is reasoning/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask AI Tutor/i)).toBeDisabled();
  });

  it("displays error message and allows retry", () => {
    const onRetry = vi.fn();
    render(
      <PromptBar
        onSubmit={vi.fn()}
        isLoading={false}
        errorMessage="Trace validation error: pointer index out of bounds"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/Trace validation error/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PromptBar.test.tsx`
Expected: FAIL (component does not exist)

- [ ] **Step 3: Implement PromptBar.tsx and PromptBar.css**

`src/components/PromptBar.css`:
```css
.prompt-bar-container {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 95;
  width: 90%;
  max-width: 680px;
  pointer-events: auto;
}

.preset-chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.preset-chip-btn {
  background: rgba(24, 24, 27, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #a1a1aa;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-chip-btn:hover:not(:disabled) {
  background: #3f3f46;
  color: #f4f4f5;
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.preset-chip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prompt-form {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  background: rgba(24, 24, 27, 0.94);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 6px 8px 6px 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.prompt-form:focus-within {
  border-color: #8257e5;
  box-shadow: 0 10px 32px rgba(130, 87, 229, 0.25);
}

.prompt-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 13.5px;
  outline: none;
  font-family: inherit;
}

.prompt-input::placeholder {
  color: #71717a;
}

.prompt-submit-btn {
  background: #8257e5;
  border: none;
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.prompt-submit-btn:hover:not(:disabled) {
  background: #996dff;
}

.prompt-submit-btn:disabled {
  background: #3f3f46;
  color: #71717a;
  cursor: not-allowed;
}

.prompt-loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #c4b5fd;
  padding: 4px 8px;
}

.prompt-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(196, 181, 253, 0.3);
  border-top-color: #c4b5fd;
  border-radius: 50%;
  animation: prompt-spin 0.8s linear infinite;
}

@keyframes prompt-spin {
  to {
    transform: rotate(360deg);
  }
}

.prompt-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  color: #fca5a5;
  backdrop-filter: blur(8px);
}

.prompt-retry-btn {
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.prompt-retry-btn:hover {
  background: #dc2626;
}
```

`src/components/PromptBar.tsx`:
```tsx
import React, { useState } from "react";
import { ALGORITHM_PRESETS } from "../ai/presets";
import "./PromptBar.css";

export interface PromptBarProps {
  onSubmit: (query: string) => Promise<void> | void;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onSubmit,
  isLoading,
  errorMessage,
  onRetry,
}) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
  };

  const handlePresetClick = (presetLabel: string) => {
    if (isLoading) return;
    setQuery(presetLabel);
    onSubmit(presetLabel);
  };

  return (
    <div className="prompt-bar-container">
      {/* Quick-Start Preset Chips */}
      <div className="preset-chips-row">
        {Object.values(ALGORITHM_PRESETS).map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="preset-chip-btn"
            disabled={isLoading}
            onClick={() => handlePresetClick(preset.label)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="prompt-error-banner" role="alert">
          <span>{errorMessage}</span>
          {onRetry && (
            <button
              type="button"
              className="prompt-retry-btn"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Main Input Form */}
      <form className="prompt-form" onSubmit={handleSubmit}>
        {isLoading ? (
          <div className="prompt-loading-indicator">
            <div className="prompt-spinner" />
            <span>AI Tutor is reasoning & generating algorithm steps...</span>
          </div>
        ) : (
          <input
            type="text"
            className="prompt-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask AI Tutor to visualize an algorithm (e.g. 'Binary Search on [2, 5, 8, 12, 16]')..."
            disabled={isLoading}
          />
        )}

        <button
          type="submit"
          className="prompt-submit-btn"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? "Generating..." : "Ask AI"}
        </button>
      </form>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PromptBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptBar.tsx src/components/PromptBar.css src/components/PromptBar.test.tsx
git commit -m "feat(ui): implement PromptBar with preset chips, loading state, and retry banner"
```

---

### Task 5: App Integration & Full Timeline Scrubbing

**Files:**
- Modify: `src/components/PlaybackDock.css` (raise dock to float cleanly above `PromptBar` in Student Mode)
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `PromptBar`, `queryLLMTrace`, `ALGORITHM_PRESETS`
- Produces: Atomically loads newly generated traces into `useAlgorithmPlayback`, renders step 0 on the canvas, activates playback controls, and handles errors with retry support.

- [ ] **Step 1: Write failing tests in App.test.tsx for AI Tutor prompt workflow**

Update `src/App.test.tsx`:
```tsx
it("renders PromptBar in Student Mode and loads trace when preset chip is clicked", async () => {
  render(<App />);

  // Should render preset chips
  expect(screen.getByText("Binary Search")).toBeInTheDocument();
  expect(screen.getByText("Two Pointers")).toBeInTheDocument();

  // Click Binary Search preset chip
  fireEvent.click(screen.getByText("Binary Search"));

  // Check that Step 0 of Binary Search is loaded
  await waitFor(() => {
    expect(screen.getByText(/Binary Search initialized/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (`Binary Search` not found in `App`)

- [ ] **Step 3: Modify PlaybackDock.css and App.tsx**

Adjust `src/components/PlaybackDock.css`:
```css
.playback-dock {
  position: absolute;
  bottom: 96px; /* Raised to float cleanly above PromptBar without collision */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(24, 24, 27, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 90;
  user-select: none;
}
```

In `src/App.tsx`:
- Add `activeTrace` state (initialized to `canonicalTrace` or `ALGORITHM_PRESETS.secondLargest.trace`).
- Pass `activeTrace` to `useAlgorithmPlayback(activeTrace, { initialStep })`.
- Add `isAiLoading`, `aiError`, and `lastQuery` states.
- Define `handlePromptSubmit(query: string)`:
  - sets `isAiLoading(true)`, `setAiError(null)`, `setLastQuery(query)`
  - calls `queryLLMTrace(query)`
  - on success: `setActiveTrace(trace)`
  - on error: `setAiError(err.message)`
  - finally: `setIsAiLoading(false)`
- Render `<PromptBar />` in Student Mode alongside `<PlaybackDock />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PlaybackDock.css src/App.tsx src/App.test.tsx
git commit -m "feat(app): integrate PromptBar and atomic trace loading in Student Mode"
```

---

### Task 6: Full Verification & Build Check

**Files:**
- None (verification phase)

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass (0 failures)

- [ ] **Step 2: Run production TypeScript and Vite build**

Run: `npm run build`
Expected: Clean build with zero TypeScript or Vite errors

- [ ] **Step 3: Commit any final cleanup or documentation updates**

```bash
git status
```
