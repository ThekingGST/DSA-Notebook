# Ticket 3: Step Playback Controls & Canvas-Native Narration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the step navigation, auto-play, and visual narration playback system with a bottom playback dock, keyboard navigation, mutated cell green highlights, and smooth pointer transitions.

**Architecture:** A streamlined playback dock component (`src/components/PlaybackDock.tsx`) paired with an algorithm playback hook (`src/hooks/useAlgorithmPlayback.ts`) that orchestrates `DSAStateEngine` stepping, auto-play timer intervals, and keyboard hotkeys. State engine and element compiler project step narration and green mutation highlights to Excalidraw.

**Tech Stack:** React 18, TypeScript, Vitest, `@testing-library/react`, `@excalidraw/excalidraw`, Vanilla CSS.

**Spec:** `docs/spec-v1-mvp.md` (Issue #8) / [Ticket 3 (Issue #11)](https://github.com/ThekingGST/DSA-Notebook/issues/11).

## Global Constraints

- Playback dock must float cleanly above the bottom center without colliding with future prompt bubble.
- Keyboard hotkeys (`ArrowLeft`, `ArrowRight`, `Spacebar`, `KeyR`) must be globally active except when an `input` or `textarea` element is focused.
- Pointers transition smoothly across cells (~300ms easing) during regular play/stepping and snap instantly during rapid navigation (< 250ms interval).
- Step narration and comparisons render on canvas with hand-drawn typography and high-contrast dark accents.
- All tests must pass with 0 failures under `npm test` and production build must succeed under `npm run build`.

---

### Task 1: Build PlaybackDock Component & Keyboard Shortcuts

**Files:**
- Create: `src/components/PlaybackDock.tsx`
- Create: `src/components/PlaybackDock.css`
- Create: `src/components/PlaybackDock.test.tsx`

**Interfaces:**
- Produces: `<PlaybackDock currentStep={step} totalSteps={total} isPlaying={isPlaying} onStepChange={fn} onTogglePlay={fn} onReset={fn} />`

- [ ] **Step 1: Write failing test for PlaybackDock**

`src/components/PlaybackDock.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlaybackDock } from "./PlaybackDock";

describe("PlaybackDock component", () => {
  it("renders step counter and controls", () => {
    render(
      <PlaybackDock
        currentStep={1}
        totalSteps={4}
        isPlaying={false}
        onStepChange={vi.fn()}
        onTogglePlay={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText("Step 1 / 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("disables previous and reset on step 0, and next on last step", () => {
    const { rerender } = render(
      <PlaybackDock
        currentStep={0}
        totalSteps={3}
        isPlaying={false}
        onStepChange={vi.fn()}
        onTogglePlay={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();

    rerender(
      <PlaybackDock
        currentStep={3}
        totalSteps={3}
        isPlaying={false}
        onStepChange={vi.fn()}
        onTogglePlay={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("responds to keyboard shortcuts (ArrowLeft, ArrowRight, Spacebar, R)", () => {
    const onStepChange = vi.fn();
    const onTogglePlay = vi.fn();
    const onReset = vi.fn();

    render(
      <PlaybackDock
        currentStep={1}
        totalSteps={4}
        isPlaying={false}
        onStepChange={onStepChange}
        onTogglePlay={onTogglePlay}
        onReset={onReset}
      />
    );

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onStepChange).toHaveBeenCalledWith(2);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onStepChange).toHaveBeenCalledWith(0);

    fireEvent.keyDown(window, { code: "Space" });
    expect(onTogglePlay).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "r" });
    expect(onReset).toHaveBeenCalled();
  });

  it("ignores keyboard shortcuts when an input element is focused", () => {
    const onStepChange = vi.fn();
    render(
      <div>
        <input data-testid="test-input" />
        <PlaybackDock
          currentStep={1}
          totalSteps={4}
          isPlaying={false}
          onStepChange={onStepChange}
          onTogglePlay={vi.fn()}
          onReset={vi.fn()}
        />
      </div>
    );

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onStepChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PlaybackDock.test.tsx`
Expected: FAIL ("Cannot find module './PlaybackDock'")

- [ ] **Step 3: Implement PlaybackDock.tsx and PlaybackDock.css**

`src/components/PlaybackDock.tsx`:
```tsx
import React, { useEffect } from "react";
import "./PlaybackDock.css";

interface PlaybackDockProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const PlaybackDock: React.FC<PlaybackDockProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  onStepChange,
  onTogglePlay,
  onReset,
}) => {
  const isFirstStep = currentStep <= 0;
  const isLastStep = currentStep >= totalSteps;

  const handlePrev = () => {
    if (!isFirstStep) onStepChange(currentStep - 1);
  };

  const handleNext = () => {
    if (!isLastStep) onStepChange(currentStep + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).isContentEditable);

      if (isInputFocused) return;

      if (e.key === "ArrowLeft" || e.key === "Left") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight" || e.key === "Right") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, totalSteps, isPlaying, onStepChange, onTogglePlay, onReset]);

  return (
    <div className="playback-dock" role="toolbar" aria-label="Step playback controls">
      <button
        type="button"
        className="dock-btn"
        onClick={onReset}
        disabled={isFirstStep}
        aria-label="Reset"
        title="Reset (R)"
      >
        ⏮
      </button>

      <button
        type="button"
        className="dock-btn"
        onClick={handlePrev}
        disabled={isFirstStep}
        aria-label="Previous step"
        title="Previous (Left Arrow)"
      >
        ◀
      </button>

      <button
        type="button"
        className={`dock-btn play-btn ${isPlaying ? "playing" : ""}`}
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      <button
        type="button"
        className="dock-btn"
        onClick={handleNext}
        disabled={isLastStep}
        aria-label="Next step"
        title="Next (Right Arrow)"
      >
        ▶
      </button>

      <div className="dock-divider" />

      <span className="dock-counter">
        Step <span className="counter-current">{currentStep}</span> / {totalSteps}
      </span>
    </div>
  );
};
```

`src/components/PlaybackDock.css`:
```css
.playback-dock {
  position: absolute;
  bottom: 24px;
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

.dock-btn {
  background: transparent;
  border: none;
  color: #e1e1e6;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;
}

.dock-btn:hover:not(:disabled) {
  background: #3f3f46;
  color: #ffffff;
}

.dock-btn:disabled {
  color: #52525b;
  cursor: not-allowed;
}

.dock-btn.play-btn {
  background: #8257e5;
  color: #ffffff;
}

.dock-btn.play-btn:hover {
  background: #996dff;
}

.dock-btn.play-btn.playing {
  background: #04d361;
  color: #000000;
}

.dock-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}

.dock-counter {
  font-size: 13px;
  font-weight: 600;
  color: #a1a1aa;
  padding: 0 4px;
}

.counter-current {
  color: #ffffff;
  font-weight: 700;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PlaybackDock.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/PlaybackDock.tsx src/components/PlaybackDock.css src/components/PlaybackDock.test.tsx
git commit -m "feat: add PlaybackDock component and keyboard navigation controls"
```

---

### Task 2: Build useAlgorithmPlayback Hook

**Files:**
- Create: `src/hooks/useAlgorithmPlayback.ts`
- Create: `src/hooks/useAlgorithmPlayback.test.ts`

**Interfaces:**
- Produces: `useAlgorithmPlayback(trace: ExecutionTrace, options?: { stepIntervalMs?: number })`
- Returns: `{ currentStep, totalSteps, isPlaying, isRapidStepping, currentSnapshot, currentState, stepTo, stepForward, stepBackward, togglePlay, reset }`

- [ ] **Step 1: Write failing test for useAlgorithmPlayback**

`src/hooks/useAlgorithmPlayback.test.ts`:
```typescript
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAlgorithmPlayback } from "./useAlgorithmPlayback";
import { ExecutionTrace } from "../engine/types";

describe("useAlgorithmPlayback hook", () => {
  const sampleTrace: ExecutionTrace = {
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
      variables: [],
    },
    steps: [
      {
        stepIndex: 1,
        title: "Step 1",
        explanation: "Advance pointer",
        actions: [{ type: "move_pointer", pointerId: "p1", toIndex: 1 }],
      },
      {
        stepIndex: 2,
        title: "Step 2",
        explanation: "Advance pointer to end",
        actions: [{ type: "move_pointer", pointerId: "p1", toIndex: 2 }],
      },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes at step 0 and steps forward and backward", () => {
    const { result } = renderHook(() => useAlgorithmPlayback(sampleTrace));

    expect(result.current.currentStep).toBe(0);
    expect(result.current.totalSteps).toBe(2);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentStep).toBe(2);

    act(() => {
      result.current.stepBackward();
    });
    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.reset();
    });
    expect(result.current.currentStep).toBe(0);
  });

  it("auto-plays through steps and pauses at the end", () => {
    const { result } = renderHook(() =>
      useAlgorithmPlayback(sampleTrace, { stepIntervalMs: 1000 })
    );

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentStep).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentStep).toBe(2);
    expect(result.current.isPlaying).toBe(false); // Pauses when finished
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useAlgorithmPlayback.test.ts`
Expected: FAIL ("Cannot find module './useAlgorithmPlayback'")

- [ ] **Step 3: Implement useAlgorithmPlayback.ts**

`src/hooks/useAlgorithmPlayback.ts`:
```typescript
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ExecutionTrace, ComputedSnapshot, DSAState } from "../engine/types";
import { DSAStateEngine } from "../engine/stateEngine";

interface UseAlgorithmPlaybackOptions {
  stepIntervalMs?: number;
}

export function useAlgorithmPlayback(
  trace: ExecutionTrace,
  options: UseAlgorithmPlaybackOptions = {}
) {
  const { stepIntervalMs = 1000 } = options;
  const engineRef = useRef<DSAStateEngine>(new DSAStateEngine(trace));

  // Re-initialize engine if trace reference changes
  useEffect(() => {
    engineRef.current.loadTrace(trace);
  }, [trace]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRapidStepping, setIsRapidStepping] = useState(false);
  const lastStepTimeRef = useRef<number>(0);
  const rapidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSteppingEvent = useCallback(() => {
    const now = Date.now();
    const diff = now - lastStepTimeRef.current;
    lastStepTimeRef.current = now;

    if (diff < 250) {
      setIsRapidStepping(true);
      if (rapidTimerRef.current) clearTimeout(rapidTimerRef.current);
      rapidTimerRef.current = setTimeout(() => {
        setIsRapidStepping(false);
      }, 300);
    }
  }, []);

  const totalSteps = useMemo(() => engineRef.current.getTotalSteps(), [trace]);

  const currentSnapshot: ComputedSnapshot = useMemo(() => {
    return engineRef.current.getCurrentSnapshot();
  }, [currentStep, trace]);

  const currentState: DSAState = currentSnapshot.state;

  const stepTo = useCallback((index: number) => {
    markSteppingEvent();
    engineRef.current.stepTo(index);
    setCurrentStep(engineRef.current.getCurrentStepIndex());
  }, [markSteppingEvent]);

  const stepForward = useCallback(() => {
    markSteppingEvent();
    engineRef.current.stepForward();
    setCurrentStep(engineRef.current.getCurrentStepIndex());
  }, [markSteppingEvent]);

  const stepBackward = useCallback(() => {
    markSteppingEvent();
    engineRef.current.stepBackward();
    setCurrentStep(engineRef.current.getCurrentStepIndex());
  }, [markSteppingEvent]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    engineRef.current.reset();
    setCurrentStep(0);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      // If at end, reset to 0 before starting play
      if (!prev && engineRef.current.getCurrentStepIndex() >= engineRef.current.getTotalSteps()) {
        engineRef.current.reset();
        setCurrentStep(0);
      }
      return !prev;
    });
  }, []);

  // Auto-play interval timer
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (engineRef.current.canStepForward()) {
        engineRef.current.stepForward();
        setCurrentStep(engineRef.current.getCurrentStepIndex());
      } else {
        setIsPlaying(false);
      }
    }, stepIntervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, stepIntervalMs]);

  return {
    currentStep,
    totalSteps,
    isPlaying,
    isRapidStepping,
    currentSnapshot,
    currentState,
    stepTo,
    stepForward,
    stepBackward,
    togglePlay,
    reset,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useAlgorithmPlayback.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAlgorithmPlayback.ts src/hooks/useAlgorithmPlayback.test.ts
git commit -m "feat: add useAlgorithmPlayback hook with auto-play and rapid-step detection"
```

---

### Task 3: Automatic Mutated Cell Highlights on Swaps and Writes

**Files:**
- Modify: `src/engine/stateEngine.ts`
- Modify: `src/engine/stateEngine.test.ts`

**Interfaces:**
- Produces: `dsaReducer` automatically tagging mutated indices with green highlight (`#04d361`) on `write_cell` and `swap` actions.

- [ ] **Step 1: Write failing test for mutated cell highlight**

Add to `src/engine/stateEngine.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/stateEngine.test.ts`
Expected: FAIL ("expected highlights to contain green mutation highlight")

- [ ] **Step 3: Update dsaReducer in stateEngine.ts**

In `src/engine/stateEngine.ts`, update `swap` and `write_cell`:
```typescript
    case "swap": {
      return {
        ...state,
        highlights: [
          { arrayId: action.arrayId, index: action.indexA, color: "#04d361" },
          { arrayId: action.arrayId, index: action.indexB, color: "#04d361" },
        ],
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
        highlights: [
          { arrayId: action.arrayId, index: action.index, color: "#04d361" },
        ],
        arrays: state.arrays.map((arr) => {
          if (arr.id !== action.arrayId) return arr;
          const nextElements = [...arr.elements];
          nextElements[action.index] = action.value;
          return { ...arr, elements: nextElements };
        }),
      };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/stateEngine.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/engine/stateEngine.ts src/engine/stateEngine.test.ts
git commit -m "feat(engine): add automatic green mutation highlights for cell writes and swaps"
```

---

### Task 4: Connect Playback System & Multi-Step Trace to Application Shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/WhiteboardCanvas.tsx`

**Interfaces:**
- Connects: `<PlaybackDock />`, `useAlgorithmPlayback`, multi-step canonical trace to root UI.

- [ ] **Step 1: Write integration test for Playback Dock in App**

Modify `src/App.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw">Mock Excalidraw Canvas</div>,
}));

describe("App root component", () => {
  it("renders playback dock in Student Mode and scrubs forward with Next button", () => {
    render(<App />);

    expect(screen.getByText("DSA Notebook")).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: /playback controls/i })).toBeInTheDocument();
    expect(screen.getByText(/Step 0 \//)).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /next step/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Step 1 \//)).toBeInTheDocument();
  });

  it("hides playback dock when switched to Teacher Mode", () => {
    render(<App />);

    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    expect(screen.queryByRole("toolbar", { name: /playback controls/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update App.tsx with canonical multi-step algorithm trace**

Update `src/App.tsx`:
```tsx
import React, { useState, useMemo } from "react";
import { Header, WorkspaceMode } from "./components/Header";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { PlaybackDock } from "./components/PlaybackDock";
import { useAlgorithmPlayback } from "./hooks/useAlgorithmPlayback";
import { compileDSAToExcalidraw } from "./compiler/compileDSAToExcalidraw";
import { ExecutionTrace } from "./engine/types";
import "./App.css";

const canonicalTrace: ExecutionTrace = {
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
      { id: "v2", name: "secondLargest", value: "-∞", color: "#fbbf24" },
    ],
    narration: {
      title: "Step 0: Initial State",
      text: "Initialize pointers i = 0 and max = 0. Largest = 10.",
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
};

export const App: React.FC = () => {
  const [mode, setMode] = useState<WorkspaceMode>("student");

  const {
    currentStep,
    totalSteps,
    isPlaying,
    currentState,
    stepTo,
    togglePlay,
    reset,
  } = useAlgorithmPlayback(canonicalTrace);

  const compiledElements = useMemo(() => {
    return compileDSAToExcalidraw(currentState);
  }, [currentState]);

  return (
    <div className="app-container">
      <Header mode={mode} onModeChange={setMode} />
      <main className="main-viewport">
        <WhiteboardCanvas mode={mode} initialElements={compiledElements} />
        {mode === "student" && (
          <PlaybackDock
            currentStep={currentStep}
            totalSteps={totalSteps}
            isPlaying={isPlaying}
            onStepChange={stepTo}
            onTogglePlay={togglePlay}
            onReset={reset}
          />
        )}
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
git add src/App.tsx src/App.test.tsx
git commit -m "feat: integrate PlaybackDock and canonical algorithm trace in Student Mode"
```
