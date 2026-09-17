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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
