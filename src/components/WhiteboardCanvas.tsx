import React, { useEffect, useState, useCallback, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./WhiteboardCanvas.css";
import { WorkspaceMode } from "./Header";
import { ExcalidrawCompiledElement } from "../compiler/compileDSAToExcalidraw";
import { ActiveCellEdit } from "./CellInlineEditor";

export interface WhiteboardCanvasProps {
  mode: WorkspaceMode;
  initialElements?: ExcalidrawCompiledElement[];
  isRapidStepping?: boolean;
  onCellDoubleClick?: (edit: ActiveCellEdit) => void;
  onPointerSnap?: (pointerId: string, targetIndex: number) => void;
  onArrayMove?: (arrayId: string, position: { x: number; y: number }) => void;
  onCellClick?: (arrayId: string, index: number) => void;
  onPointerSelect?: (pointerId: string) => void;
  onViewportChange?: (viewport: { scrollX: number; scrollY: number; zoom: number }) => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  mode,
  initialElements = [],
  isRapidStepping = false,
  onCellDoubleClick,
  onPointerSnap,
  onArrayMove,
  onCellClick,
  onPointerSelect,
  onViewportChange,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const handleExcalidrawAPI = useCallback((api: any) => {
    setExcalidrawAPI(api);
  }, []);
  const currentPointersRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const lastKnownPointerPositionsRef = useRef<Map<string, number>>(new Map());
  const lastKnownArrayPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastViewportRef = useRef({ scrollX: 0, scrollY: 0, zoom: 1 });
  const lastSelectedCellRef = useRef<string | null>(null);

  const commitScene = useCallback(
    (elements: ExcalidrawCompiledElement[]) => {
      if (!excalidrawAPI) return;

      // Preserve existing non-DSA elements (e.g. teacher's freehand drawings, arrows, shapes)
      let nonDsaElements: any[] = [];
      try {
        const sceneElements = excalidrawAPI.getSceneElements?.() || [];
        nonDsaElements = sceneElements.filter((el: any) => !el.customData?.dsaType);
      } catch {
        nonDsaElements = [];
      }

      const currentAppState = excalidrawAPI.getAppState?.() || {};
      excalidrawAPI.updateScene({
        elements: [...nonDsaElements, ...elements],
        appState: {
          theme: "dark",
          viewBackgroundColor: "#ffffff",
          scrollX: currentAppState.scrollX,
          scrollY: currentAppState.scrollY,
          zoom: currentAppState.zoom,
        },
      });
    },
    [excalidrawAPI]
  );

  useEffect(() => {
    initialElements.forEach((el) => {
      if (el.customData?.dsaType === "cell" && el.customData.arrayId && el.customData.index === 0) {
        lastKnownArrayPositionsRef.current.set(el.customData.arrayId as string, { x: el.x, y: el.y });
      }
      if (el.customData?.dsaType === "pointer") {
        const pointerId = (el.customData.pointerId as string) || el.id.replace(/^ptr_/, "");
        lastKnownPointerPositionsRef.current.set(pointerId, (el.customData.index as number) ?? 0);
      }
    });
  }, [initialElements]);



  useEffect(() => {
    if (!excalidrawAPI) return;

    // Cancel any running animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const currentPointers = currentPointersRef.current;
    const targetPointers = initialElements.filter(
      (el) => el.customData?.dsaType === "pointer"
    );

    // Identify pointers that have changed coordinates
    const movingPointers: Array<{
      id: string;
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
    }> = [];

    targetPointers.forEach((p) => {
      const prev = currentPointers.get(p.id);
      if (prev && (prev.x !== p.x || prev.y !== p.y)) {
        movingPointers.push({
          id: p.id,
          startX: prev.x,
          startY: prev.y,
          targetX: p.x,
          targetY: p.y,
        });
      }
    });

    // If rapid stepping, teacher mode authoring, initial render, or no pointer moved: snap instantly
    if (isRapidStepping || mode === "teacher" || movingPointers.length === 0) {
      targetPointers.forEach((p) => {
        currentPointers.set(p.id, { x: p.x, y: p.y });
      });
      commitScene(initialElements);
      return;
    }

    // Smooth gliding (~300ms) with cubic ease-out
    const startTime = performance.now();
    const duration = 300;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);

      const movingMap = new Map(
        movingPointers.map((m) => [
          m.id,
          {
            x: Math.round(m.startX + (m.targetX - m.startX) * ease),
            y: Math.round(m.startY + (m.targetY - m.startY) * ease),
          },
        ])
      );

      const interpolatedElements = initialElements.map((el) => {
        if (el.customData?.dsaType === "pointer" && movingMap.has(el.id)) {
          const pos = movingMap.get(el.id)!;
          return {
            ...el,
            x: pos.x,
            y: pos.y,
            version: Date.now(),
            versionNonce: Math.floor(Math.random() * 100000),
          };
        }
        return el;
      });

      interpolatedElements.forEach((el) => {
        if (el.customData?.dsaType === "pointer") {
          currentPointers.set(el.id, { x: el.x, y: el.y });
        }
      });

      commitScene(interpolatedElements);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        animFrameRef.current = null;
        targetPointers.forEach((p) => {
          currentPointers.set(p.id, { x: p.x, y: p.y });
        });
        commitScene(initialElements);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [excalidrawAPI, initialElements, isRapidStepping, commitScene]);

  // Handle double clicking a cell in Teacher Mode for in-place editing
  const handleDoubleClick = () => {
    if (mode !== "teacher" || !excalidrawAPI || !onCellDoubleClick) return;

    try {
      const appState = excalidrawAPI.getAppState?.() || {};
      const sceneElements = (excalidrawAPI.getSceneElements?.() || []) as ExcalidrawCompiledElement[];

      const selectedIds = Object.keys(appState.selectedElementIds || {});
      const targetElement = sceneElements.find(
        (el) =>
          selectedIds.includes(el.id) &&
          (el.customData?.dsaType === "cell" || el.customData?.dsaType === "valueText")
      );

      if (targetElement) {
        const arrayId = targetElement.customData?.arrayId as string;
        const index = targetElement.customData?.index as number;

        const cellEl =
          sceneElements.find(
            (el) =>
              el.customData?.dsaType === "cell" &&
              el.customData?.arrayId === arrayId &&
              el.customData?.index === index
          ) || targetElement;

        const zoom = appState.zoom?.value || 1;
        const scrollX = appState.scrollX || 0;
        const scrollY = appState.scrollY || 0;

        // Position coordinates relative to viewport overlay
        const screenX = (cellEl.x + scrollX) * zoom;
        const screenY = (cellEl.y + scrollY) * zoom;
        const width = cellEl.width * zoom;
        const height = cellEl.height * zoom;

        const valEl = sceneElements.find(
          (el) =>
            el.customData?.dsaType === "valueText" &&
            el.customData?.arrayId === arrayId &&
            el.customData?.index === index
        );

        onCellDoubleClick({
          arrayId,
          index,
          initialValue: valEl?.text ?? "",
          screenX,
          screenY,
          width,
          height,
        });
      }
    } catch {
      // ignore
    }
  };

  // Handle pointer dragging and snap cleanly to nearest cell on release
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleExcalidrawChange = (elements: readonly any[], appState: any) => {
    if (!appState) return;

    if (onViewportChange && mode === "teacher") {
      const nextScrollX = appState.scrollX || 0;
      const nextScrollY = appState.scrollY || 0;
      const nextZoom = appState.zoom?.value || 1;
      const prev = lastViewportRef.current;
      if (
        Math.abs(prev.scrollX - nextScrollX) > 0.5 ||
        Math.abs(prev.scrollY - nextScrollY) > 0.5 ||
        Math.abs(prev.zoom - nextZoom) > 0.01
      ) {
        lastViewportRef.current = {
          scrollX: nextScrollX,
          scrollY: nextScrollY,
          zoom: nextZoom,
        };
        onViewportChange({
          scrollX: nextScrollX,
          scrollY: nextScrollY,
          zoom: nextZoom,
        });
      }
    }

    if (mode !== "teacher") return;

    // Detect dragging state using real Excalidraw AppState flags
    const isDragging = Boolean(
      appState.selectedElementsAreBeingDragged ||
      appState.cursorButton === "down"
    );

    // Track array movement and sync position to state
    if (onArrayMove && !isDragging) {
      const cellsByArray: Record<string, any[]> = {};
      elements.forEach((el) => {
        if (el.customData?.dsaType === "cell" && el.customData.arrayId) {
          const arrId = el.customData.arrayId;
          if (!cellsByArray[arrId]) cellsByArray[arrId] = [];
          cellsByArray[arrId].push(el);
        }
      });

      Object.entries(cellsByArray).forEach(([arrId, cells]) => {
        const cell0 = cells.find((c) => c.customData?.index === 0) || cells[0];
        if (cell0) {
          const lastPos = lastKnownArrayPositionsRef.current.get(arrId);
          if (!lastPos) {
            lastKnownArrayPositionsRef.current.set(arrId, { x: cell0.x, y: cell0.y });
          } else if (
            Math.abs(lastPos.x - cell0.x) > 1 ||
            Math.abs(lastPos.y - cell0.y) > 1
          ) {
            lastKnownArrayPositionsRef.current.set(arrId, { x: cell0.x, y: cell0.y });
            onArrayMove(arrId, { x: cell0.x, y: cell0.y });
          }
        }
      });
    }

    // Track pointer movement and snapping on release
    if (onPointerSnap && !animFrameRef.current && !isDragging) {
      elements.forEach((el) => {
        if (el.customData?.dsaType === "pointer") {
          const pointerId = (el.customData.pointerId as string) || el.id.replace(/^ptr_/, "");
          const targetArrayId = el.customData.targetArrayId;

          // Find target array cell elements to determine geometry
          const arrayCells = elements.filter(
            (c) => c.customData?.dsaType === "cell" && c.customData?.arrayId === targetArrayId
          );

          if (arrayCells.length > 0) {
            const cell0 = arrayCells.find((c) => c.customData?.index === 0) || arrayCells[0];
            const cellW = cell0.width || 70;
            const ptrCenterX = el.x + (el.width || 70) / 2;

            // Calculate closest cell index relative to cell 0 center
            const rawIdx = Math.round((ptrCenterX - cell0.x - cellW / 2) / cellW);
            const maxIdx = arrayCells.length;
            const snappedIdx = Math.max(-1, Math.min(maxIdx, rawIdx));

            const lastPos = lastKnownPointerPositionsRef.current.get(pointerId);
            if (lastPos !== undefined && lastPos !== snappedIdx) {
              lastKnownPointerPositionsRef.current.set(pointerId, snappedIdx);
              onPointerSnap(pointerId, snappedIdx);
            } else if (lastPos === undefined) {
              lastKnownPointerPositionsRef.current.set(pointerId, snappedIdx);
            }
          }
        }
      });
    }

    // Support pointer element selection or cell selection
    if (!isDragging && appState.selectedElementIds) {
      const selectedIds = Object.keys(appState.selectedElementIds);

      // If a pointer was clicked, activate it
      const selectedPtr = elements.find(
        (el) =>
          selectedIds.includes(el.id) &&
          el.customData?.dsaType === "pointer"
      );
      if (selectedPtr && onPointerSelect) {
        const ptrId = (selectedPtr.customData.pointerId as string) || selectedPtr.id.replace(/^ptr_/, "");
        onPointerSelect(ptrId);
      }

      // If a cell was clicked, navigate active pointer to it
      if (onCellClick) {
        const selectedCell = elements.find(
          (el) =>
            selectedIds.includes(el.id) &&
            (el.customData?.dsaType === "cell" || el.customData?.dsaType === "valueText")
        );
        const selectedKey = selectedCell
          ? `${selectedCell.customData.arrayId}_${selectedCell.customData.index}`
          : null;

        if (selectedKey && selectedKey !== lastSelectedCellRef.current) {
          lastSelectedCellRef.current = selectedKey;
          onCellClick(
            selectedCell.customData.arrayId,
            selectedCell.customData.index
          );
        } else if (!selectedKey) {
          lastSelectedCellRef.current = null;
        }
      }
    }
  };



  return (
    <div
      className="whiteboard-wrapper"
      data-testid="whiteboard-wrapper"
      data-mode={mode}
      onDoubleClick={handleDoubleClick}
    >
      <Excalidraw
        theme="dark"
        excalidrawAPI={handleExcalidrawAPI}
        onChange={handleExcalidrawChange}
        initialData={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          elements: initialElements as any,
          appState: {
            theme: "dark",
            viewBackgroundColor: "#ffffff",
          },
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
    </div>
  );
};
