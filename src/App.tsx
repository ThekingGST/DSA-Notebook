import React, { useState } from "react";
import { Header, WorkspaceMode } from "./components/Header";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import "./App.css";

export const App: React.FC = () => {
  const [mode, setMode] = useState<WorkspaceMode>("student");

  return (
    <div className="app-container">
      <Header mode={mode} onModeChange={setMode} />
      <main className="main-viewport">
        <WhiteboardCanvas mode={mode} />
      </main>
    </div>
  );
};

export default App;
