import React, { useState, useEffect } from "react";
import { ApiKeyModal } from "./ApiKeyModal";
import { PromptStudioModal } from "./PromptStudioModal";
import { getNvidiaApiKey, checkAntigravityStatus } from "../ai/llmService";
import { ExecutionTrace } from "../engine/types";
import "./Header.css";

export type WorkspaceMode = "student" | "teacher";

interface HeaderProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onLoadTrace?: (trace: ExecutionTrace) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange, onLoadTrace }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(() => !!getNvidiaApiKey());
  const [isAgyAvailable, setIsAgyAvailable] = useState<boolean>(false);

  useEffect(() => {
    checkAntigravityStatus().then((available) => setIsAgyAvailable(available));
  }, []);

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
          {isAgyAvailable && (
            <span
              className="status-indicator agy-connected-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#4ade80",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "9999px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 500,
              }}
              title="Antigravity CLI is active and ready for automated generation"
            >
              🤖 Antigravity Connected
            </span>
          )}
          <button
            type="button"
            className="api-key-header-btn studio-header-btn"
            onClick={() => setIsStudioOpen(true)}
            title="AI Prompt Studio & Trace Importer (ChatGPT / Gemini / Claude)"
          >
            ⚡ Prompt Studio
          </button>
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

      <PromptStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        onLoadTrace={(trace) => {
          onLoadTrace?.(trace);
        }}
      />
    </>
  );
};
