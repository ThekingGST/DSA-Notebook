# Ticket 2: Headless 1D Array State Engine & Excalidraw Element Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure TypeScript headless DSA State Engine and `compileDSAToExcalidraw` element projection compiler for 1D arrays, pointers, variables, and step actions, integrated with the Excalidraw canvas.

**Architecture:** Pure TypeScript headless state management and declarative reducer (`src/engine/`) managing 1D array state transitions and time-travel scrubbing, coupled with a pure element compiler (`src/compiler/`) projecting state snapshots into native hand-drawn `ExcalidrawElement[]` groups with zero DOM dependencies. Connected to `<WhiteboardCanvas />` to render stateful arrays.

**Tech Stack:** TypeScript, React 18, `@excalidraw/excalidraw`, Vitest, Vanilla CSS.

**Spec:** `docs/spec-v1-mvp.md` (Issue #8) / [Ticket 2 (Issue #10)](https://github.com/ThekingGST/DSA-Notebook/issues/10).

## Global Constraints

- 100% pure TypeScript engine and compiler with zero DOM/browser dependencies (Seam 1 requirement).
- Co-located pointers on the same cell index must receive deterministic vertical stacking ranks.
- Boundary indices (`index = -1` and `index = length`) must compute valid spatial coordinates without crashing.
- Every array cell, value text, index label, and attached pointer must share `groupIds: ['group_' + arrayId]` and include `customData: { dsaType: ... }` for atomic canvas grouping and dragging.
- Reducer and state engine must produce immutable snapshots for $O(1)$ scrubbing without mutating prior states.

---

### Task 1: Core DSA State Types & Pure Reducer Engine

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/engine/stateEngine.ts`
- Create: `src/engine/stateEngine.test.ts`

**Interfaces:**
- Produces: `DSAState`, `AlgorithmStepAction`, `ExecutionTrace`, `ComputedSnapshot`, `dsaReducer(state, action): DSAState`

- [ ] **Step 1: Write failing test for dsaReducer**

`src/engine/stateEngine.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/stateEngine.test.ts`
Expected: FAIL ("Cannot find module './stateEngine'")

- [ ] **Step 3: Implement types.ts and dsaReducer in stateEngine.ts**

`src/engine/types.ts`:
```typescript
export interface DSAArray {
  id: string;
  name: string;
  elements: (number | string)[];
  position: { x: number; y: number };
  cellWidth?: number;
  cellHeight?: number;
}

export interface DSAPointer {
  id: string;
  name: string;
  targetArrayId: string;
  index: number;
  color?: string;
}

export interface DSAVariable {
  id: string;
  name: string;
  value: number | string;
  color?: string;
}

export interface DSAActiveComparison {
  arrayId?: string;
  indexA: number;
  indexB?: number;
  operator?: string;
  result?: boolean;
}

export interface DSAHighlight {
  arrayId: string;
  index: number;
  color: string;
}

export interface DSANarration {
  title: string;
  text?: string;
}

export interface DSAState {
  arrays: DSAArray[];
  pointers: DSAPointer[];
  variables: DSAVariable[];
  activeComparison?: DSAActiveComparison | null;
  highlights?: DSAHighlight[];
  narration?: DSANarration | null;
}

export type AlgorithmStepAction =
  | { type: "move_pointer"; pointerId: string; toIndex: number }
  | {
      type: "compare";
      arrayId?: string;
      indexA: number;
      indexB?: number;
      operator?: string;
      result?: boolean;
    }
  | { type: "swap"; arrayId: string; indexA: number; indexB: number }
  | { type: "write_cell"; arrayId: string; index: number; value: number | string }
  | {
      type: "set_variable";
      variableId: string;
      value: number | string;
      name?: string;
      color?: string;
    }
  | { type: "highlight"; targets: DSAHighlight[] }
  | { type: "clear_highlights" };

export interface AlgorithmStep {
  stepIndex: number;
  title: string;
  explanation: string;
  actions: AlgorithmStepAction[];
}

export interface ExecutionTrace {
  initialState: DSAState;
  steps: AlgorithmStep[];
}

export interface ComputedSnapshot {
  stepIndex: number;
  title: string;
  explanation: string;
  state: DSAState;
}
```

`src/engine/stateEngine.ts`:
```typescript
import { DSAState, AlgorithmStepAction } from "./types";

export function dsaReducer(state: DSAState, action: AlgorithmStepAction): DSAState {
  switch (action.type) {
    case "move_pointer": {
      const pointer = state.pointers.find((p) => p.id === action.pointerId);
      if (!pointer) return state;

      const targetArray = state.arrays.find((a) => a.id === pointer.targetArrayId);
      const maxLength = targetArray ? targetArray.elements.length : 0;
      const clampedIndex = Math.max(-1, Math.min(maxLength, action.toIndex));

      return {
        ...state,
        pointers: state.pointers.map((p) =>
          p.id === action.pointerId ? { ...p, index: clampedIndex } : p
        ),
      };
    }

    case "swap": {
      return {
        ...state,
        arrays: state.arrays.map((arr) => {
          if (arr.id !== action.arrayId) return arr;
          const nextElements = [...arr.elements];
          const temp = nextElements[action.indexA];
          nextElements[action.indexA] = nextElements[action.indexB];
          nextElements[action.indexB] = temp;
          return { ...arr, elements: nextElements };
        }),
      };
    }

    case "write_cell": {
      return {
        ...state,
        arrays: state.arrays.map((arr) => {
          if (arr.id !== action.arrayId) return arr;
          const nextElements = [...arr.elements];
          nextElements[action.index] = action.value;
          return { ...arr, elements: nextElements };
        }),
      };
    }

    case "set_variable": {
      const exists = state.variables.some((v) => v.id === action.variableId);
      if (exists) {
        return {
          ...state,
          variables: state.variables.map((v) =>
            v.id === action.variableId
              ? {
                  ...v,
                  value: action.value,
                  name: action.name ?? v.name,
                  color: action.color ?? v.color,
                }
              : v
          ),
        };
      }
      return {
        ...state,
        variables: [
          ...state.variables,
          {
            id: action.variableId,
            name: action.name || action.variableId,
            value: action.value,
            color: action.color,
          },
        ],
      };
    }

    case "compare": {
      return {
        ...state,
        activeComparison: {
          arrayId: action.arrayId,
          indexA: action.indexA,
          indexB: action.indexB,
          operator: action.operator,
          result: action.result,
        },
      };
    }

    case "highlight": {
      return {
        ...state,
        highlights: action.targets,
      };
    }

    case "clear_highlights": {
      return {
        ...state,
        activeComparison: null,
        highlights: [],
      };
    }

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/stateEngine.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/stateEngine.ts src/engine/stateEngine.test.ts
git commit -m "feat(engine): implement core DSA state types and pure state reducer"
```

---

### Task 2: Time-Travel Engine & Precomputed Snapshots

**Files:**
- Modify: `src/engine/stateEngine.ts`
- Modify: `src/engine/stateEngine.test.ts`

**Interfaces:**
- Produces: `computeSnapshots(trace: ExecutionTrace): ComputedSnapshot[]`, `DSAStateEngine` class

- [ ] **Step 1: Write failing test for computeSnapshots and DSAStateEngine**

Add to `src/engine/stateEngine.test.ts`:
```typescript
import { computeSnapshots, DSAStateEngine } from "./stateEngine";
import { ExecutionTrace } from "./types";

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
          { type: "compare", arrayId: "A", indexA: 0, indexB: 1 },
          { type: "move_pointer", pointerId: "p1", toIndex: 1 },
        ],
      },
      {
        stepIndex: 2,
        title: "Step 2: Update Max",
        explanation: "nums[1] > max, updating max to 20",
        actions: [{ type: "set_variable", variableId: "v1", value: 20 }],
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/stateEngine.test.ts`
Expected: FAIL ("computeSnapshots is not defined")

- [ ] **Step 3: Implement computeSnapshots and DSAStateEngine in stateEngine.ts**

Add to `src/engine/stateEngine.ts`:
```typescript
import { ExecutionTrace, ComputedSnapshot } from "./types";

export function computeSnapshots(trace: ExecutionTrace): ComputedSnapshot[] {
  const snapshots: ComputedSnapshot[] = [];

  // Snapshot 0: Initial State
  snapshots.push({
    stepIndex: 0,
    title: "Initial State",
    explanation: "Algorithm loaded at initial state.",
    state: {
      ...trace.initialState,
      narration: { title: "Initial State", text: "Algorithm initialized." },
    },
  });

  let currentState = { ...trace.initialState };

  trace.steps.forEach((step) => {
    for (const action of step.actions) {
      currentState = dsaReducer(currentState, action);
    }
    currentState = {
      ...currentState,
      narration: {
        title: step.title,
        text: step.explanation,
      },
    };
    snapshots.push({
      stepIndex: step.stepIndex,
      title: step.title,
      explanation: step.explanation,
      state: currentState,
    });
  });

  return snapshots;
}

export class DSAStateEngine {
  private trace: ExecutionTrace;
  private snapshots: ComputedSnapshot[];
  private currentStepIndex: number;

  constructor(trace: ExecutionTrace) {
    this.trace = trace;
    this.snapshots = computeSnapshots(trace);
    this.currentStepIndex = 0;
  }

  public loadTrace(trace: ExecutionTrace): void {
    this.trace = trace;
    this.snapshots = computeSnapshots(trace);
    this.currentStepIndex = 0;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public getTotalSteps(): number {
    return Math.max(0, this.snapshots.length - 1);
  }

  public getCurrentSnapshot(): ComputedSnapshot {
    return this.snapshots[this.currentStepIndex];
  }

  public getCurrentState(): DSAState {
    return this.getCurrentSnapshot().state;
  }

  public canStepForward(): boolean {
    return this.currentStepIndex < this.snapshots.length - 1;
  }

  public canStepBackward(): boolean {
    return this.currentStepIndex > 0;
  }

  public stepForward(): ComputedSnapshot {
    if (this.canStepForward()) {
      this.currentStepIndex++;
    }
    return this.getCurrentSnapshot();
  }

  public stepBackward(): ComputedSnapshot {
    if (this.canStepBackward()) {
      this.currentStepIndex--;
    }
    return this.getCurrentSnapshot();
  }

  public stepTo(stepIndex: number): ComputedSnapshot {
    const clamped = Math.max(0, Math.min(this.snapshots.length - 1, stepIndex));
    this.currentStepIndex = clamped;
    return this.getCurrentSnapshot();
  }

  public reset(): ComputedSnapshot {
    this.currentStepIndex = 0;
    return this.getCurrentSnapshot();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/stateEngine.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/stateEngine.ts src/engine/stateEngine.test.ts
git commit -m "feat(engine): implement computeSnapshots and DSAStateEngine time-travel scrubbing"
```

---

### Task 3: Excalidraw Element Compiler (`compileDSAToExcalidraw`)

**Files:**
- Create: `src/compiler/compileDSAToExcalidraw.ts`
- Create: `src/compiler/compileDSAToExcalidraw.test.ts`

**Interfaces:**
- Produces: `compileDSAToExcalidraw(state: DSAState): ExcalidrawCompiledElement[]`
- Produces: `ExcalidrawCompiledElement` pure type

- [ ] **Step 1: Write failing test for compileDSAToExcalidraw**

`src/compiler/compileDSAToExcalidraw.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { compileDSAToExcalidraw } from "./compileDSAToExcalidraw";
import { DSAState } from "../engine/types";

describe("compileDSAToExcalidraw", () => {
  const sampleState: DSAState = {
    arrays: [
      {
        id: "A",
        name: "nums",
        elements: [10, 25, 7],
        position: { x: 100, y: 200 },
        cellWidth: 64,
        cellHeight: 54,
      },
    ],
    pointers: [
      { id: "p1", name: "i", targetArrayId: "A", index: 0, color: "#996dff" },
      { id: "p2", name: "j", targetArrayId: "A", index: 0, color: "#04d361" }, // co-located with p1
      { id: "p3", name: "left", targetArrayId: "A", index: -1 }, // boundary -1
      { id: "p4", name: "right", targetArrayId: "A", index: 3 }, // boundary length
    ],
    variables: [
      { id: "v1", name: "max", value: 25, color: "#04d361" },
    ],
    narration: { title: "Step 1", text: "Comparing elements" },
  };

  it("compiles array cells, value text, and index labels sharing groupIds", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    // Check cells
    const cell0 = elements.find((e) => e.id === "cell_A_0");
    expect(cell0).toBeDefined();
    expect(cell0?.type).toBe("rectangle");
    expect(cell0?.x).toBe(100);
    expect(cell0?.y).toBe(200);
    expect(cell0?.width).toBe(64);
    expect(cell0?.height).toBe(54);
    expect(cell0?.groupIds).toEqual(["group_A"]);
    expect(cell0?.customData).toEqual({ dsaType: "cell", arrayId: "A", index: 0 });

    // Check value text
    const val0 = elements.find((e) => e.id === "val_A_0");
    expect(val0).toBeDefined();
    expect(val0?.type).toBe("text");
    expect(val0?.text).toBe("10");
    expect(val0?.x).toBe(100 + 32);
    expect(val0?.groupIds).toEqual(["group_A"]);

    // Check index label
    const idx0 = elements.find((e) => e.id === "idx_A_0");
    expect(idx0).toBeDefined();
    expect(idx0?.type).toBe("text");
    expect(idx0?.text).toBe("0");
    expect(idx0?.groupIds).toEqual(["group_A"]);
  });

  it("vertically stacks co-located pointers on the same index", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    const ptr1 = elements.find((e) => e.id === "ptr_p1");
    const ptr2 = elements.find((e) => e.id === "ptr_p2");

    expect(ptr1).toBeDefined();
    expect(ptr2).toBeDefined();
    expect(ptr1?.x).toBe(ptr2?.x); // Same horizontal center
    // ptr2 should be stacked higher (more negative Y offset) than ptr1
    expect(ptr2!.y).toBeLessThan(ptr1!.y);
    expect(ptr1?.groupIds).toEqual(["group_A"]);
    expect(ptr2?.groupIds).toEqual(["group_A"]);
  });

  it("positions boundary pointers at index -1 and index length correctly", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    const ptrLeft = elements.find((e) => e.id === "ptr_p3");
    const ptrRight = elements.find((e) => e.id === "ptr_p4");

    expect(ptrLeft).toBeDefined();
    expect(ptrRight).toBeDefined();

    // index -1: placed to the left of index 0
    expect(ptrLeft!.x).toBeLessThan(100);

    // index 3: placed to the right of index 2
    expect(ptrRight!.x).toBeGreaterThan(100 + 3 * 64 - 32);
  });

  it("compiles variables HUD and narration elements", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    const varElement = elements.find((e) => e.id === "var_v1");
    expect(varElement).toBeDefined();
    expect(varElement?.text).toContain("max = 25");
    expect(varElement?.customData).toEqual({ dsaType: "variable", variableId: "v1" });

    const narrationElement = elements.find((e) => e.id === "narration_card");
    expect(narrationElement).toBeDefined();
    expect(narrationElement?.text).toContain("Step 1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/compiler/compileDSAToExcalidraw.test.ts`
Expected: FAIL ("Cannot find module './compileDSAToExcalidraw'")

- [ ] **Step 3: Implement compileDSAToExcalidraw**

`src/compiler/compileDSAToExcalidraw.ts`:
```typescript
import { DSAState } from "../engine/types";

export interface ExcalidrawCompiledElement {
  id: string;
  type: "rectangle" | "text" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid" | "hachure" | "cross-hatch";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  roundness: { type: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: null;
  updated: number;
  link: null;
  locked: boolean;
  customData: Record<string, unknown>;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  baseline?: number;
  containerId?: string | null;
  originalText?: string;
  lineHeight?: number;
}

function createBaseElement(
  id: string,
  type: "rectangle" | "text" | "arrow",
  x: number,
  y: number,
  width: number,
  height: number,
  groupIds: string[],
  customData: Record<string, unknown>
): ExcalidrawCompiledElement {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#e1e1e6",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    strokeStyle: "solid",
    roughness: 1.2,
    opacity: 100,
    groupIds,
    frameId: null,
    roundness: type === "rectangle" ? { type: 3 } : null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData,
  };
}

export function compileDSAToExcalidraw(dsaState: DSAState): ExcalidrawCompiledElement[] {
  const elements: ExcalidrawCompiledElement[] = [];
  const { arrays, pointers, variables, narration, activeComparison, highlights = [] } = dsaState;

  // 1. Compile 1D Arrays
  arrays.forEach((arr) => {
    const cellW = arr.cellWidth || 64;
    const cellH = arr.cellHeight || 54;
    const groupId = `group_${arr.id}`;

    arr.elements.forEach((val, idx) => {
      const cellX = arr.position.x + idx * cellW;
      const cellY = arr.position.y;

      const isComparing =
        activeComparison &&
        (activeComparison.arrayId ? activeComparison.arrayId === arr.id : true) &&
        (activeComparison.indexA === idx || activeComparison.indexB === idx);

      const customHighlight = highlights.find(
        (h) => h.arrayId === arr.id && h.index === idx
      );

      let strokeColor = "#e1e1e6";
      let backgroundColor = "rgba(255, 255, 255, 0.02)";
      let strokeWidth = 1.5;

      if (isComparing) {
        strokeColor = "#f1b000"; // amber
        backgroundColor = "rgba(241, 176, 0, 0.15)";
        strokeWidth = 2.5;
      } else if (customHighlight) {
        strokeColor = customHighlight.color;
        backgroundColor = `${customHighlight.color}26`; // ~15% opacity hex
        strokeWidth = 2.5;
      }

      // Cell rectangle
      const cellEl = createBaseElement(
        `cell_${arr.id}_${idx}`,
        "rectangle",
        cellX,
        cellY,
        cellW,
        cellH,
        [groupId],
        { dsaType: "cell", arrayId: arr.id, index: idx }
      );
      cellEl.strokeColor = strokeColor;
      cellEl.backgroundColor = backgroundColor;
      cellEl.strokeWidth = strokeWidth;
      elements.push(cellEl);

      // Cell value text (centered in cell)
      const valText = String(val);
      const textEl = createBaseElement(
        `val_${arr.id}_${idx}`,
        "text",
        cellX + cellW / 2,
        cellY + cellH / 2,
        cellW,
        cellH,
        [groupId],
        { dsaType: "valueText", arrayId: arr.id, index: idx }
      );
      textEl.text = valText;
      textEl.originalText = valText;
      textEl.fontSize = 20;
      textEl.fontFamily = 1;
      textEl.textAlign = "center";
      textEl.verticalAlign = "middle";
      textEl.strokeColor = "#ffffff";
      elements.push(textEl);

      // Sub-cell index label
      const idxText = String(idx);
      const idxEl = createBaseElement(
        `idx_${arr.id}_${idx}`,
        "text",
        cellX + cellW / 2,
        cellY + cellH + 16,
        cellW,
        20,
        [groupId],
        { dsaType: "indexLabel", arrayId: arr.id, index: idx }
      );
      idxEl.text = idxText;
      idxEl.originalText = idxText;
      idxEl.fontSize = 12;
      idxEl.fontFamily = 1;
      idxEl.textAlign = "center";
      idxEl.verticalAlign = "middle";
      idxEl.strokeColor = "#8d8d99";
      elements.push(idxEl);
    });
  });

  // 2. Compile Pointers with vertical stacking
  const pointersByTarget: Record<string, typeof pointers> = {};
  pointers.forEach((p) => {
    const key = `${p.targetArrayId}_${p.index}`;
    if (!pointersByTarget[key]) pointersByTarget[key] = [];
    pointersByTarget[key].push(p);
  });

  pointers.forEach((p) => {
    const targetArr = arrays.find((a) => a.id === p.targetArrayId);
    if (!targetArr) return;

    const cellW = targetArr.cellWidth || 64;
    let cellCenterX: number;

    if (p.index === -1) {
      cellCenterX = targetArr.position.x - cellW / 2;
    } else if (p.index >= targetArr.elements.length) {
      cellCenterX = targetArr.position.x + targetArr.elements.length * cellW + cellW / 2;
    } else {
      cellCenterX = targetArr.position.x + p.index * cellW + cellW / 2;
    }

    const siblings = pointersByTarget[`${p.targetArrayId}_${p.index}`] || [p];
    const stackRank = siblings.indexOf(p);
    const yOffset = 30 + stackRank * 26;
    const pointerY = targetArr.position.y - yOffset;

    const ptrEl = createBaseElement(
      `ptr_${p.id}`,
      "text",
      cellCenterX,
      pointerY,
      60,
      28,
      [`group_${targetArr.id}`],
      {
        dsaType: "pointer",
        pointerId: p.id,
        targetArrayId: p.targetArrayId,
        index: p.index,
      }
    );
    const label = `${p.name}\n↓`;
    ptrEl.text = label;
    ptrEl.originalText = label;
    ptrEl.fontSize = 16;
    ptrEl.fontFamily = 1;
    ptrEl.textAlign = "center";
    ptrEl.verticalAlign = "bottom";
    ptrEl.strokeColor = p.color || "#996dff";
    elements.push(ptrEl);
  });

  // 3. Compile Variables HUD
  if (variables && variables.length > 0) {
    let vy = 100;
    variables.forEach((v) => {
      const varEl = createBaseElement(
        `var_${v.id}`,
        "text",
        60,
        vy,
        140,
        24,
        ["variables_hud"],
        { dsaType: "variable", variableId: v.id }
      );
      const text = `${v.name} = ${v.value}`;
      varEl.text = text;
      varEl.originalText = text;
      varEl.fontSize = 15;
      varEl.fontFamily = 1;
      varEl.strokeColor = v.color || "#04d361";
      elements.push(varEl);
      vy += 26;
    });
  }

  // 4. Compile Step Narration Card
  if (narration && narration.title) {
    const narrationEl = createBaseElement(
      "narration_card",
      "text",
      60,
      35,
      400,
      40,
      ["narration_group"],
      { dsaType: "narration" }
    );
    const text = `📝 ${narration.title}\n${narration.text || ""}`;
    narrationEl.text = text;
    narrationEl.originalText = text;
    narrationEl.fontSize = 15;
    narrationEl.fontFamily = 1;
    narrationEl.strokeColor = "#e1e1e6";
    elements.push(narrationEl);
  }

  return elements;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/compiler/compileDSAToExcalidraw.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/compiler/compileDSAToExcalidraw.ts src/compiler/compileDSAToExcalidraw.test.ts
git commit -m "feat(compiler): implement compileDSAToExcalidraw native element projector"
```

---

### Task 4: Connect WhiteboardCanvas with Sample Array & Full Test Pass

**Files:**
- Modify: `src/components/WhiteboardCanvas.tsx`
- Modify: `src/components/WhiteboardCanvas.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Connects: `DSAStateEngine` and `compileDSAToExcalidraw` to `<WhiteboardCanvas initialElements={elements} />`

- [ ] **Step 1: Write updated test for WhiteboardCanvas with initialElements**

Modify `src/components/WhiteboardCanvas.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { compileDSAToExcalidraw } from "../compiler/compileDSAToExcalidraw";

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: ({ initialData }: any) => (
    <div data-testid="mock-excalidraw-canvas">
      Excalidraw Mock ({initialData?.elements?.length || 0} elements)
    </div>
  ),
}));

describe("WhiteboardCanvas component", () => {
  it("renders with compiled DSA initial elements", () => {
    const elements = compileDSAToExcalidraw({
      arrays: [
        {
          id: "A",
          name: "nums",
          elements: [10, 20, 30],
          position: { x: 100, y: 200 },
        },
      ],
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
      variables: [],
    });

    render(<WhiteboardCanvas mode="student" initialElements={elements} />);
    expect(screen.getByTestId("whiteboard-wrapper")).toBeInTheDocument();
    expect(screen.getByText(/Excalidraw Mock/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update WhiteboardCanvas and App**

`src/components/WhiteboardCanvas.tsx`:
```tsx
import React, { useMemo } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./WhiteboardCanvas.css";
import { WorkspaceMode } from "./Header";
import { ExcalidrawCompiledElement } from "../compiler/compileDSAToExcalidraw";

interface WhiteboardCanvasProps {
  mode: WorkspaceMode;
  initialElements?: ExcalidrawCompiledElement[];
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  mode,
  initialElements = [],
}) => {
  const initialData = useMemo(
    () => ({
      elements: initialElements as any,
      appState: {
        theme: "dark" as const,
        viewBackgroundColor: "#18181b",
      },
    }),
    [initialElements]
  );

  return (
    <div
      className="whiteboard-wrapper"
      data-testid="whiteboard-wrapper"
      data-mode={mode}
    >
      <Excalidraw
        theme="dark"
        initialData={initialData}
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
    </div>
  );
};
```

Update `src/App.tsx` to load default demo array so manual testing in browser shows the compiled array:
```tsx
import React, { useState, useMemo } from "react";
import { Header, WorkspaceMode } from "./components/Header";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { compileDSAToExcalidraw } from "./compiler/compileDSAToExcalidraw";
import { DSAState } from "./engine/types";
import "./App.css";

const defaultDemoState: DSAState = {
  arrays: [
    {
      id: "A",
      name: "nums",
      elements: [10, 25, 7, 42, 18],
      position: { x: 120, y: 240 },
      cellWidth: 68,
      cellHeight: 56,
    },
  ],
  pointers: [
    { id: "p1", name: "i", targetArrayId: "A", index: 1, color: "#996dff" },
    { id: "p2", name: "largest", targetArrayId: "A", index: 3, color: "#04d361" },
  ],
  variables: [
    { id: "v1", name: "max", value: 42, color: "#04d361" },
    { id: "v2", name: "secondLargest", value: 25, color: "#f1b000" },
  ],
  narration: {
    title: "1D Array Demo Initialized",
    text: "Pointers i and largest positioned along nums array.",
  },
};

export const App: React.FC = () => {
  const [mode, setMode] = useState<WorkspaceMode>("student");

  const initialElements = useMemo(() => {
    return compileDSAToExcalidraw(defaultDemoState);
  }, []);

  return (
    <div className="app-container">
      <Header mode={mode} onModeChange={setMode} />
      <main className="main-viewport">
        <WhiteboardCanvas mode={mode} initialElements={initialElements} />
      </main>
    </div>
  );
};

export default App;
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: PASS across all test files

- [ ] **Step 4: Run production build verification**

Run: `npm run build`
Expected: Exit code 0, cleanly emitted bundle in `dist/`

- [ ] **Step 5: Commit**

```bash
git add src/components/WhiteboardCanvas.tsx src/components/WhiteboardCanvas.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: integrate compiled DSA elements into Excalidraw whiteboard canvas"
```
