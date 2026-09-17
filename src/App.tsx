import React, { useState, useMemo } from "react";
import { Header, WorkspaceMode } from "./components/Header";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { compileDSAToExcalidraw } from "./compiler/compileDSAToExcalidraw";
import { DSAState } from "./engine/types";
import "./App.css";

const defaultDemoState: DSAState = {
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
    { id: "p1", name: "i", targetArrayId: "A", index: 1, color: "#a78bfa" },
    { id: "p2", name: "largest", targetArrayId: "A", index: 3, color: "#34d399" },
  ],
  variables: [
    { id: "v1", name: "max", value: 42, color: "#34d399" },
    { id: "v2", name: "secondLargest", value: 25, color: "#fbbf24" },
  ],
  narration: {
    title: "1D Array Demo Initialized",
    text: "Pointers i and largest positioned cleanly along nums array.",
  },
};

export const App: React.FC = () => {
  const [mode, setMode] = useState<WorkspaceMode>("student");

  const initialElements = useMemo(() => {
    return compileDSAToExcalidraw(defaultDemoState);
  }, []);

  return (
    <div className="app-container">
      <Header mode={mode} onModeChange={setMode} />
      <main className="main-viewport">
        <WhiteboardCanvas mode={mode} initialElements={initialElements} />
      </main>
    </div>
  );
};

export default App;
