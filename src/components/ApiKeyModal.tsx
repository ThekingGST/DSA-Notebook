import React, { useState, useEffect } from "react";
import { getNvidiaApiKey, setNvidiaApiKey, getNvidiaModel } from "../ai/llmService";
import "./ApiKeyModal.css";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState("");
  const model = getNvidiaModel();

  useEffect(() => {
    if (isOpen) {
      setApiKey(getNvidiaApiKey() || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setNvidiaApiKey(apiKey);
    onSaved();
    onClose();
  };

  const handleClear = () => {
    setNvidiaApiKey("");
    setApiKey("");
    onSaved();
    onClose();
  };

  return (
    <div className="api-modal-backdrop" onClick={onClose}>
      <div
        className="api-modal-card"
        role="dialog"
        aria-label="NVIDIA AI Configuration"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="api-modal-header">
          <h3 className="api-modal-title">⚡ NVIDIA AI Configuration</h3>
          <button
            type="button"
            className="api-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <p className="api-modal-desc">
          Connect your free NVIDIA API key from{" "}
          <a
            href="https://build.nvidia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="api-modal-link"
          >
            build.nvidia.com
          </a>{" "}
          to enable live AI algorithm generation for custom questions.
        </p>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="api-modal-field">
            <label htmlFor="nvidia-api-key" className="api-modal-label">
              NVIDIA API Key
            </label>
            <input
              id="nvidia-api-key"
              type="password"
              className="api-modal-input"
              placeholder="nvapi-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="api-modal-field">
            <span className="api-modal-label">Active Model</span>
            <span className="api-modal-badge">{model}</span>
          </div>

          <div className="api-modal-actions">
            {apiKey && (
              <button
                type="button"
                className="api-modal-btn-cancel"
                onClick={handleClear}
                style={{ color: "#f87171", borderColor: "#7f1d1d" }}
              >
                Clear Key
              </button>
            )}
            <button
              type="button"
              className="api-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="api-modal-btn-save">
              Save Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
