import React, { useState, useMemo } from "react";
import { Header, WorkspaceMode } from "./components/Header";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { PlaybackDock } from "./components/PlaybackDock";
import { TeacherToolbox } from "./components/TeacherToolbox";
import { ArrayEndControls } from "./components/ArrayEndControls";
import { CellInlineEditor, ActiveCellEdit } from "./components/CellInlineEditor";
import { useAlgorithmPlayback } from "./hooks/useAlgorithmPlayback";
import { useTeacherMode } from "./hooks/useTeacherMode";
import { compileDSAToExcalidraw } from "./compiler/compileDSAToExcalidraw";
import { ExecutionTrace } from "./engine/types";
import { ErrorBoundary } from "./components/ErrorBoundary";
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
  const initialMode = useMemo<WorkspaceMode>(() => {
    if (typeof window === "undefined") return "student";
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "teacher" ? "teacher" : "student";
  }, []);

  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [activeEdit, setActiveEdit] = useState<ActiveCellEdit | null>(null);

  const initialStep = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get("step") || "0", 10);
    return isNaN(s) ? 0 : s;
  }, []);

  // Student mode playback
  const {
    currentStep,
    totalSteps,
    isPlaying,
    isRapidStepping,
    currentState: studentState,
    stepTo,
    togglePlay,
    reset: resetPlayback,
  } = useAlgorithmPlayback(canonicalTrace, { initialStep });

  // Teacher mode authoring
  const {
    state: teacherRawState,
    dsaState: teacherState,
    activePointerId,
    setActivePointerId,
    activePointersByArray,
    setActivePointerForArray,
    addArray,
    updateArrayPosition,
    updateCellValue,
    appendCell,
    removeCell,
    addPointer,
    movePointer,
    resetTeacherState,
  } = useTeacherMode();

  const [viewport, setViewport] = useState({ scrollX: 0, scrollY: 0, zoom: 1 });
  // Transient flag: set true only while an arrow-button navigation is playing so
  // WhiteboardCanvas runs the smooth animation instead of snapping instantly.
  const [isSmoothingPointer, setIsSmoothingPointer] = useState(false);
  const smoothingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const smoothNavigatePointer = React.useCallback(
    (pointerId: string, targetIndex: number) => {
      // Clear any previous timeout so rapid clicks don't leave the flag stuck on
      if (smoothingTimeoutRef.current) clearTimeout(smoothingTimeoutRef.current);
      setIsSmoothingPointer(true);
      movePointer(pointerId, targetIndex);
      // 400ms > 300ms animation so the flag resets after the animation finishes
      smoothingTimeoutRef.current = setTimeout(() => {
        setIsSmoothingPointer(false);
        smoothingTimeoutRef.current = null;
      }, 400);
    },
    [movePointer]
  );

  const activeState = mode === "teacher" ? teacherState : studentState;

  const compiledElements = useMemo(() => {
    return compileDSAToExcalidraw(activeState, {
      standalonePointers: mode === "teacher",
    });
  }, [activeState, mode]);

  const handleCommitCellEdit = (
    arrayId: string,
    index: number,
    value: number | string
  ) => {
    updateCellValue(arrayId, index, value);
    setActiveEdit(null);
  };

  const handleCancelCellEdit = () => {
    setActiveEdit(null);
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Header mode={mode} onModeChange={setMode} />
        <main className="main-viewport">
          <WhiteboardCanvas
            mode={mode}
            initialElements={compiledElements}
            isRapidStepping={isRapidStepping}
            isSmoothingPointer={isSmoothingPointer}
            onCellDoubleClick={setActiveEdit}
            onPointerSnap={movePointer}
            onPointerSelect={(ptrId) => {
              setActivePointerId(ptrId);
              const ptr = teacherRawState.pointers.find((p) => p.id === ptrId);
              if (ptr) {
                setActivePointerForArray(ptr.targetArrayId, ptrId);
              }
            }}
            onArrayMove={updateArrayPosition}
            onViewportChange={mode === "teacher" ? setViewport : undefined}
            onCellClick={(arrayId, index) => {
              const arrPointers = teacherRawState.pointers.filter(
                (p) => p.targetArrayId === arrayId
              );
              const activePtrForArray = activePointersByArray[arrayId];
              const targetPointer =
                arrPointers.find((p) => p.id === activePtrForArray) ||
                arrPointers.find((p) => p.id === activePointerId) ||
                arrPointers[0];

              if (targetPointer) {
                movePointer(targetPointer.id, index);
                setActivePointerForArray(arrayId, targetPointer.id);
              } else {
                // If this array doesn't have a pointer yet, attach one directly to this cell
                const pointerNames = ["i", "j", "k", "left", "right", "mid"];
                const pointerColors = ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];
                const usedNames = new Set(teacherRawState.pointers.map((p) => p.name));
                const nextName =
                  pointerNames.find((n) => !usedNames.has(n)) ||
                  `p${teacherRawState.pointers.length + 1}`;
                const nextColor =
                  pointerColors[teacherRawState.pointers.length % pointerColors.length];
                addPointer(arrayId, nextName, index, nextColor);
              }
            }}
          />

          {/* Student Mode: Playback Dock */}
          {mode === "student" && (
            <PlaybackDock
              currentStep={currentStep}
              totalSteps={totalSteps}
              isPlaying={isPlaying}
              onStepChange={stepTo}
              onTogglePlay={togglePlay}
              onReset={resetPlayback}
            />
          )}

          {/* Teacher Mode: Authoring Tools */}
          {mode === "teacher" && (
            <>
              <ArrayEndControls
                arrays={teacherRawState.arrays}
                pointers={teacherRawState.pointers}
                activePointerId={activePointerId}
                activePointersByArray={activePointersByArray}
                scrollX={viewport.scrollX}
                scrollY={viewport.scrollY}
                zoom={viewport.zoom}
                isEditing={activeEdit !== null}
                onAppendCell={appendCell}
                onRemoveCell={removeCell}
                onNavigatePointer={smoothNavigatePointer}
              />
              <TeacherToolbox
                arrays={teacherRawState.arrays}
                onAddArray={addArray}
                onAddPointer={(arrayId, name, color) =>
                  addPointer(arrayId, name, 0, color)
                }
                onReset={resetTeacherState}
              />
              <CellInlineEditor
                activeEdit={activeEdit}
                onCommit={handleCommitCellEdit}
                onCancel={handleCancelCellEdit}
              />
            </>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
