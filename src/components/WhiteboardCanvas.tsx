import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./WhiteboardCanvas.css";
import { WorkspaceMode } from "./Header";

interface WhiteboardCanvasProps {
  mode: WorkspaceMode;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ mode }) => {
  return (
    <div className="whiteboard-wrapper" data-testid="whiteboard-wrapper" data-mode={mode}>
      <Excalidraw
        theme="dark"
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
    </div>
  );
};
