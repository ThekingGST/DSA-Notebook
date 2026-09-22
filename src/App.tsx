import React, { useState, useMemo, useCallback } from "react";
import { Header, WorkspaceMode } from "./components/Header";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { PlaybackDock } from "./components/PlaybackDock";
import { PromptBar } from "./components/PromptBar";
import { TeacherToolbox } from "./components/TeacherToolbox";
import { ArrayEndControls } from "./components/ArrayEndControls";
import { CellInlineEditor, ActiveCellEdit } from "./components/CellInlineEditor";
import { CodeInspector } from "./components/CodeInspector";
import { useAlgorithmPlayback } from "./hooks/useAlgorithmPlayback";
import { useTeacherMode } from "./hooks/useTeacherMode";
import { compileDSAToExcalidraw } from "./compiler/compileDSAToExcalidraw";
import { ExecutionTrace, AlgorithmCode } from "./engine/types";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryLLMTrace, cleanJsonOutput, checkAntigravityStatus } from "./ai/llmService";
import { autoHealExecutionTrace, validateExecutionTrace } from "./ai/traceSchema";
import { ALGORITHM_PRESETS } from "./ai/presets";
import "./App.css";

const canonicalTrace: ExecutionTrace = ALGORITHM_PRESETS.secondLargest.trace;

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

  const [activeTrace, setActiveTrace] = useState<ExecutionTrace>(canonicalTrace);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState("AI Tutor is reasoning & generating algorithm steps...");
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [isCodeOpen, setIsCodeOpen] = useState<boolean>(false);

  // Student mode playback
  const {
    currentStep,
    totalSteps,
    isPlaying,
    isRapidStepping,
    currentSnapshot,
    currentState: studentState,
    stepTo,
    togglePlay,
    reset: resetPlayback,
  } = useAlgorithmPlayback(activeTrace, { initialStep });

  const handleSeekToLine = useCallback(
    (targetLine: number) => {
      if (!activeTrace.steps) return;
      const stepIdx = activeTrace.steps.findIndex(
        (s) =>
          s.codeContext?.line === targetLine ||
          s.codeContext?.highlightLines?.includes(targetLine)
      );
      if (stepIdx !== -1) {
        stepTo(stepIdx + 1);
      }
    },
    [activeTrace.steps, stepTo]
  );

  const handleCodeGenerated = useCallback(
    (newCode: AlgorithmCode, stepLineMap?: number[]) => {
      setActiveTrace((prevTrace) => {
        const updatedSteps = prevTrace.steps.map((step, idx) => {
          const line = stepLineMap?.[idx];
          if (line && line > 0) {
            return {
              ...step,
              codeContext: { line },
            };
          }
          return step;
        });
        return {
          ...prevTrace,
          code: newCode,
          steps: updatedSteps,
        };
      });
    },
    []
  );

  const handlePromptSubmit = useCallback(async (query: string) => {
    setIsAiLoading(true);
    setAiError(null);
    setLastPrompt(query);

    const isAgy = await checkAntigravityStatus();
    setAiLoadingMessage(
      isAgy
        ? "🤖 Antigravity CLI is reasoning & generating algorithm steps..."
        : "AI Tutor is reasoning & generating algorithm steps..."
    );

    const trimmed = query.trim();

    // Fast-path: If user pastes raw JSON ExecutionTrace directly into prompt bar
    if (trimmed.startsWith("{") || trimmed.startsWith("```")) {
      try {
        const cleaned = cleanJsonOutput(trimmed);
        const parsed = JSON.parse(cleaned);
        const healed = autoHealExecutionTrace(parsed);
        const validation = validateExecutionTrace(healed);
        if (validation.success) {
          setActiveTrace(validation.data);
          setIsAiLoading(false);
          return;
        }
      } catch {
        // Fall through to normal LLM generation if JSON parsing fails
      }
    }

    try {
      const trace = await queryLLMTrace(query);
      setActiveTrace(trace);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate algorithm trace. Please retry.";
      setAiError(message);
    } finally {
      setIsAiLoading(false);
    }
  }, []);

  const handlePromptRetry = useCallback(() => {
    if (lastPrompt) {
      handlePromptSubmit(lastPrompt);
    }
  }, [handlePromptSubmit, lastPrompt]);

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

  const handleCanvasAction = React.useCallback(
    (action: import("./components/WhiteboardCanvas").CanvasAction) => {
      switch (action.type) {
        case "POINTER_SNAPPED":
          movePointer(action.pointerId, action.targetIndex);
          break;
        case "ARRAY_MOVED":
          updateArrayPosition(action.arrayId, action.position);
          break;
        case "CELL_EDIT_REQUESTED":
          setActiveEdit(action.edit);
          break;
        case "POINTER_SELECTED": {
          setActivePointerId(action.pointerId);
          const ptr = teacherRawState.pointers.find((p) => p.id === action.pointerId);
          if (ptr) {
            setActivePointerForArray(ptr.targetArrayId, action.pointerId);
          }
          break;
        }
        case "CELL_CLICKED": {
          const arrPointers = teacherRawState.pointers.filter(
            (p) => p.targetArrayId === action.arrayId
          );
          const activePtrForArray = activePointersByArray[action.arrayId];
          const targetPointer =
            arrPointers.find((p) => p.id === activePtrForArray) ||
            arrPointers.find((p) => p.id === activePointerId) ||
            arrPointers[0];

          if (targetPointer) {
            movePointer(targetPointer.id, action.index);
            setActivePointerForArray(action.arrayId, targetPointer.id);
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
            addPointer(action.arrayId, nextName, action.index, nextColor);
          }
          break;
        }
        case "VIEWPORT_CHANGED":
          if (mode === "teacher") {
            setViewport(action.viewport);
          }
          break;
      }
    },
    [
      movePointer,
      updateArrayPosition,
      setActivePointerId,
      setActivePointerForArray,
      teacherRawState.pointers,
      activePointersByArray,
      activePointerId,
      addPointer,
      mode,
    ]
  );

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Header
          mode={mode}
          onModeChange={setMode}
          onLoadTrace={setActiveTrace}
          isCodeOpen={isCodeOpen}
          onToggleCode={() => setIsCodeOpen((prev) => !prev)}
        />
        <main className="main-viewport">
          <WhiteboardCanvas
            mode={mode}
            initialElements={compiledElements}
            isRapidStepping={isRapidStepping}
            onCanvasAction={handleCanvasAction}
          />

          {/* Code Inspector Drawer */}
          <CodeInspector
            isOpen={isCodeOpen}
            onClose={() => setIsCodeOpen(false)}
            code={activeTrace.code}
            currentLine={currentSnapshot?.codeContext?.line}
            highlightLines={currentSnapshot?.codeContext?.highlightLines}
            onSeekToLine={handleSeekToLine}
            onCodeGenerated={handleCodeGenerated}
            trace={activeTrace}
          />

          {/* Student Mode: Playback Dock & Prompt Bar */}
          {mode === "student" && (
            <>
              <PlaybackDock
                currentStep={currentStep}
                totalSteps={totalSteps}
                isPlaying={isPlaying}
                onStepChange={stepTo}
                onTogglePlay={togglePlay}
                onReset={resetPlayback}
              />
              <PromptBar
                onSubmit={handlePromptSubmit}
                isLoading={isAiLoading}
                loadingMessage={aiLoadingMessage}
                errorMessage={aiError}
                onRetry={handlePromptRetry}
              />
            </>
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
                onNavigatePointer={movePointer}
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
