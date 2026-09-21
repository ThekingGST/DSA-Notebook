import React, { useState } from "react";
import { ApiKeyModal } from "./ApiKeyModal";
import { getNvidiaApiKey } from "../ai/llmService";
import "./Header.css";

export type WorkspaceMode = "student" | "teacher";

interface HeaderProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(() => !!getNvidiaApiKey());

  const handleSaved = () => {
    setHasKey(!!getNvidiaApiKey());
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">⚡</span>
          <h1 className="header-title">DSA Notebook</h1>
          <span className="header-badge">v1 MVP</span>
        </div>
        <div className="header-center">
          <div className="mode-toggle" role="group" aria-label="Workspace mode">
            <button
              type="button"
              className={`mode-btn ${mode === "student" ? "active" : ""}`}
              onClick={() => onModeChange("student")}
              aria-pressed={mode === "student"}
            >
              🎓 Student Mode
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === "teacher" ? "active" : ""}`}
              onClick={() => onModeChange("teacher")}
              aria-pressed={mode === "teacher"}
            >
              👨‍🏫 Teacher Mode
            </button>
          </div>
        </div>
        <div className="header-right" style={{ gap: "10px" }}>
          <button
            type="button"
            className={`api-key-header-btn ${hasKey ? "connected" : ""}`}
            onClick={() => setIsModalOpen(true)}
            title="Configure NVIDIA API Key"
          >
            🔑 {hasKey ? "NVIDIA Connected" : "Set NVIDIA Key"}
          </button>
          <span className="status-indicator">● Online</span>
        </div>
      </header>

      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
};
