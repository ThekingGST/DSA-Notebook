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
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  mode,
  initialElements = [],
  isRapidStepping = false,
  onCellDoubleClick,
  onPointerSnap,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const handleExcalidrawAPI = useCallback((api: any) => {
    setExcalidrawAPI(api);
  }, []);
  const currentPointersRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const lastKnownPointerPositionsRef = useRef<Map<string, number>>(new Map());

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

      excalidrawAPI.updateScene({
        elements: [...nonDsaElements, ...elements],
        appState: {
          theme: "dark",
          viewBackgroundColor: "#ffffff",
        },
      });
    },
    [excalidrawAPI]
  );

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

    // If rapid stepping, initial render, or no pointer moved: snap instantly
    if (isRapidStepping || movingPointers.length === 0) {
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
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
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

        const rect = e.currentTarget.getBoundingClientRect();
        const screenX = rect.left + (cellEl.x + scrollX) * zoom;
        const screenY = rect.top + (cellEl.y + scrollY) * zoom;
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
    if (mode !== "teacher" || !onPointerSnap) return;

    // Check if dragging has completed (no active drag)
    const isDragging = appState?.draggingElement != null || appState?.cursorButton === "down";

    elements.forEach((el) => {
      if (el.customData?.dsaType === "pointer") {
        const pointerId = el.customData.pointerId || el.id.replace(/^ptr_/, "");
        const targetArrayId = el.customData.targetArrayId;

        // Find target array cell elements to determine geometry
        const arrayCells = elements.filter(
          (c) => c.customData?.dsaType === "cell" && c.customData?.arrayId === targetArrayId
        );

        if (arrayCells.length > 0 && !isDragging) {
          const firstCell = arrayCells[0];
          const cellW = firstCell.width || 70;
          const ptrCenterX = el.x + (el.width || 70) / 2;

          // Calculate closest cell index
          const rawIdx = Math.round((ptrCenterX - firstCell.x - cellW / 2) / cellW);
          const snappedIdx = Math.max(0, Math.min(arrayCells.length - 1, rawIdx));

          const lastPos = lastKnownPointerPositionsRef.current.get(pointerId);
          if (lastPos !== snappedIdx) {
            lastKnownPointerPositionsRef.current.set(pointerId, snappedIdx);
            onPointerSnap(pointerId, snappedIdx);
          }
        }
      }
    });
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
