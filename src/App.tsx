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
