import React, { useEffect, useState } from "react";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  useEffect(() => {
    if (!excalidrawAPI) return;

    excalidrawAPI.updateScene({
      elements: initialElements,
      appState: {
        theme: "dark",
        viewBackgroundColor: "#121214",
      },
    });
  }, [excalidrawAPI, initialElements]);

  return (
    <div
      className="whiteboard-wrapper"
      data-testid="whiteboard-wrapper"
      data-mode={mode}
    >
      <Excalidraw
        theme="dark"
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          elements: initialElements as any,
          appState: {
            theme: "dark",
            viewBackgroundColor: "#121214",
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
