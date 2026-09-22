import React, { useState } from "react";
import { ALGORITHM_PRESETS } from "../ai/presets";
import "./PromptBar.css";

export interface PromptBarProps {
  onSubmit: (query: string) => Promise<void> | void;
  isLoading: boolean;
  errorMessage?: string | null;
  loadingMessage?: string | null;
  onRetry?: () => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onSubmit,
  isLoading,
  errorMessage,
  loadingMessage,
  onRetry,
}) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
  };

  const handlePresetClick = (presetLabel: string) => {
    if (isLoading) return;
    setQuery(presetLabel);
    onSubmit(presetLabel);
  };

  return (
    <div className="prompt-bar-container">
      {/* Quick-Start Preset Chips */}
      <div className="preset-chips-row">
        {Object.values(ALGORITHM_PRESETS).map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="preset-chip-btn"
            disabled={isLoading}
            onClick={() => handlePresetClick(preset.label)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="prompt-error-banner" role="alert">
          <span>{errorMessage}</span>
          {onRetry && (
            <button
              type="button"
              className="prompt-retry-btn"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Main Input Form */}
      <form className="prompt-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="prompt-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI Tutor to visualize an algorithm (e.g. 'Binary Search on [2, 5, 8, 12, 16]')..."
          disabled={isLoading}
        />

        {isLoading && (
          <div className="prompt-loading-indicator">
            <div className="prompt-spinner" />
            <span>{loadingMessage || "AI Tutor is reasoning & generating algorithm steps..."}</span>
          </div>
        )}

        <button
          type="submit"
          className="prompt-submit-btn"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? "Generating..." : "Ask AI"}
        </button>
      </form>
    </div>
  );
};
