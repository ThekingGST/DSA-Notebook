import React, { useEffect, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./WhiteboardCanvas.css";
import { WorkspaceMode } from "./Header";
import { ExcalidrawCompiledElement } from "../compiler/compileDSAToExcalidraw";

interface WhiteboardCanvasProps {
  mode: WorkspaceMode;
  initialElements?: ExcalidrawCompiledElement[];
  isRapidStepping?: boolean;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  mode,
  initialElements = [],
  isRapidStepping = false,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const handleExcalidrawAPI = React.useCallback((api: any) => {
    setExcalidrawAPI(api);
  }, []);
  const currentPointersRef = React.useRef<Map<string, { x: number; y: number }>>(new Map());
  const animFrameRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!excalidrawAPI) return;

    const commitScene = (elements: ExcalidrawCompiledElement[]) => {
      excalidrawAPI.updateScene({
        elements,
        appState: {
          theme: "dark",
          viewBackgroundColor: "#ffffff",
        },
      });
    };

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
  }, [excalidrawAPI, initialElements, isRapidStepping]);

  return (
    <div
      className="whiteboard-wrapper"
      data-testid="whiteboard-wrapper"
      data-mode={mode}
    >
      <Excalidraw
        theme="dark"
        excalidrawAPI={handleExcalidrawAPI}
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
