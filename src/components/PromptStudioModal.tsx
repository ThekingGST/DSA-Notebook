import React, { useState, useMemo } from "react";
import { ExecutionTrace } from "../engine/types";
import { buildAlgorithmPrompt } from "../ai/promptBuilder";
import { cleanJsonOutput } from "../ai/llmService";
import { autoHealExecutionTrace, validateExecutionTrace, ValidationResult } from "../ai/traceSchema";
import "./PromptStudioModal.css";

interface PromptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTrace: (trace: ExecutionTrace) => void;
}

type ActiveTab = "prompt" | "import";

const SAMPLE_SLIDING_WINDOW_TRACE: ExecutionTrace = {
  initialState: {
    arrays: [
      {
        id: "A",
        name: "arr",
        elements: [2, 1, 5, 1, 3, 2],
        position: { x: 140, y: 320 },
      },
    ],
    pointers: [
      { id: "p_left", name: "left", targetArrayId: "A", index: 0, color: "#38bdf8" },
      { id: "p_right", name: "right", targetArrayId: "A", index: 2, color: "#38bdf8" },
    ],
    variables: [
      { id: "v_K", name: "K", value: 3, color: "#38bdf8" },
      { id: "v_windowSum", name: "windowSum", value: 0, color: "#fbbf24" },
      { id: "v_maxSum", name: "maxSum", value: 0, color: "#22c55e" },
    ],
    narration: {
      title: "Sliding Window Maximum Sum",
      text: "Find maximum sum of contiguous subarray of size K=3 in [2, 1, 5, 1, 3, 2].",
    },
  },
  steps: [
    {
      stepIndex: 1,
      title: "Compute Initial Window Sum",
      explanation: "Calculate sum of first window [2, 1, 5]: 2 + 1 + 5 = 8. Initialize maxSum = 8.",
      actions: [
        { type: "set_variable", variableId: "v_windowSum", value: 8 },
        { type: "set_variable", variableId: "v_maxSum", value: 8 },
        {
          type: "highlight",
          targets: [
            { arrayId: "A", index: 0, color: "#38bdf8" },
            { arrayId: "A", index: 1, color: "#38bdf8" },
            { arrayId: "A", index: 2, color: "#38bdf8" },
          ],
        },
      ],
    },
    {
      stepIndex: 2,
      title: "Slide Window to [1, 5, 1]",
      explanation: "Slide right: advance left to 1, right to 3. windowSum = 8 - 2 + 1 = 7. maxSum remains 8.",
      actions: [
        { type: "move_pointer", pointerId: "p_left", toIndex: 1 },
        { type: "move_pointer", pointerId: "p_right", toIndex: 3 },
        { type: "set_variable", variableId: "v_windowSum", value: 7 },
        {
          type: "highlight",
          targets: [
            { arrayId: "A", index: 1, color: "#38bdf8" },
            { arrayId: "A", index: 2, color: "#38bdf8" },
            { arrayId: "A", index: 3, color: "#38bdf8" },
          ],
        },
      ],
    },
    {
      stepIndex: 3,
      title: "Slide Window: New Maximum Found!",
      explanation: "Advance left to 2, right to 4: [5, 1, 3]. windowSum = 7 - 1 + 3 = 9. Since 9 > 8, update maxSum to 9!",
      actions: [
        { type: "move_pointer", pointerId: "p_left", toIndex: 2 },
        { type: "move_pointer", pointerId: "p_right", toIndex: 4 },
        { type: "set_variable", variableId: "v_windowSum", value: 9 },
        { type: "set_variable", variableId: "v_maxSum", value: 9 },
        {
          type: "highlight",
          targets: [
            { arrayId: "A", index: 2, color: "#22c55e" },
            { arrayId: "A", index: 3, color: "#22c55e" },
            { arrayId: "A", index: 4, color: "#22c55e" },
          ],
        },
      ],
    },
    {
      stepIndex: 4,
      title: "Slide Window to [1, 3, 2]",
      explanation: "Advance left to 3, right to 5: [1, 3, 2]. windowSum = 9 - 5 + 2 = 6. maxSum remains 9.",
      actions: [
        { type: "move_pointer", pointerId: "p_left", toIndex: 3 },
        { type: "move_pointer", pointerId: "p_right", toIndex: 5 },
        { type: "set_variable", variableId: "v_windowSum", value: 6 },
        {
          type: "highlight",
          targets: [
            { arrayId: "A", index: 3, color: "#38bdf8" },
            { arrayId: "A", index: 4, color: "#38bdf8" },
            { arrayId: "A", index: 5, color: "#38bdf8" },
          ],
        },
      ],
    },
    {
      stepIndex: 5,
      title: "Algorithm Complete",
      explanation: "Right pointer reached end of array. Maximum contiguous subarray sum of size K=3 is 9 at subarray [5, 1, 3].",
      actions: [
        { type: "move_pointer", pointerId: "p_left", toIndex: 2 },
        { type: "move_pointer", pointerId: "p_right", toIndex: 4 },
        {
          type: "highlight",
          targets: [
            { arrayId: "A", index: 2, color: "#22c55e" },
            { arrayId: "A", index: 3, color: "#22c55e" },
            { arrayId: "A", index: 4, color: "#22c55e" },
          ],
        },
      ],
    },
  ],
};

export const PromptStudioModal: React.FC<PromptStudioModalProps> = ({
  isOpen,
  onClose,
  onLoadTrace,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("prompt");
  const [algorithmQuery, setAlgorithmQuery] = useState(
    "Given an array of integers and an integer K, find the maximum sum of any contiguous subarray of size, Input: arr = [2, 1, 5, 1, 3, 2] K = 3 Output: 9"
  );
  const [copied, setCopied] = useState(false);
  const [pastedJson, setPastedJson] = useState("");

  const fullPromptToCopy = useMemo(() => {
    const { systemPrompt, userPrompt } = buildAlgorithmPrompt(algorithmQuery);
    return `${systemPrompt}\n\n========================================\nTASK INSTRUCTION:\n========================================\n${userPrompt}`;
  }, [algorithmQuery]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(fullPromptToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for environments where clipboard API is blocked
      const ta = document.createElement("textarea");
      ta.value = fullPromptToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const validationResult = useMemo<ValidationResult | null>(() => {
    const trimmed = pastedJson.trim();
    if (!trimmed) return null;

    try {
      const cleaned = cleanJsonOutput(trimmed);
      const parsed = JSON.parse(cleaned);
      const healed = autoHealExecutionTrace(parsed);
      const validation = validateExecutionTrace(healed);
      return validation;
    } catch (err: any) {
      return {
        success: false,
        error: `JSON syntax error: ${err.message || "Invalid JSON syntax"}`,
        issues: [err.message || "Invalid JSON syntax"],
      };
    }
  }, [pastedJson]);

  const handleVisualizePasted = () => {
    if (!validationResult || !validationResult.success) return;
    onLoadTrace(validationResult.data);
    onClose();
  };

  const handleLoadSample = () => {
    setPastedJson(JSON.stringify(SAMPLE_SLIDING_WINDOW_TRACE, null, 2));
  };

  if (!isOpen) return null;

  return (
    <div
      className="studio-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Prompt Studio & Trace Importer"
    >
      <div className="studio-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="studio-modal-header">
          <h2 className="studio-modal-title">
            <span>⚡</span> Prompt Studio & Trace Importer
            <span className="badge">Open Protocol</span>
          </h2>
          <button
            type="button"
            className="studio-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="studio-modal-tabs">
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === "prompt" ? "active" : ""}`}
            onClick={() => setActiveTab("prompt")}
          >
            📋 1. Prompt Generator (ChatGPT / Gemini)
          </button>
          <button
            type="button"
            className={`studio-tab-btn ${activeTab === "import" ? "active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            📥 2. Paste & Visualize Trace
          </button>
        </div>

        {activeTab === "prompt" && (
          <div className="studio-tab-content">
            <p className="studio-desc">
              Copy this standard protocol prompt into <strong>ChatGPT (GPT-4o)</strong>,{" "}
              <strong>Gemini 1.5 Pro</strong>, or <strong>Claude 3.5 Sonnet</strong>.
              Frontier models generate accurate, multi-step execution traces with zero rate-limiting!
            </p>

            <div>
              <label className="studio-label" htmlFor="algo-query-input">
                Algorithm Question / Problem:
              </label>
              <input
                id="algo-query-input"
                className="studio-input"
                type="text"
                value={algorithmQuery}
                onChange={(e) => setAlgorithmQuery(e.target.value)}
                placeholder="e.g. Sliding window maximum sum on arr=[2,1,5,1,3,2], K=3"
              />
            </div>

            <div className="studio-quick-chips">
              <span style={{ fontSize: "12px", color: "#71717a", alignSelf: "center" }}>
                Quick Fill:
              </span>
              <button
                type="button"
                className="studio-chip-btn"
                onClick={() =>
                  setAlgorithmQuery(
                    "Given an array of integers and an integer K, find the maximum sum of any contiguous subarray of size, Input: arr = [2, 1, 5, 1, 3, 2] K = 3 Output: 9"
                  )
                }
              >
                Sliding Window (K=3)
              </button>
              <button
                type="button"
                className="studio-chip-btn"
                onClick={() =>
                  setAlgorithmQuery(
                    "Two Sum on sorted array [2, 7, 11, 15], target = 9 using two pointers"
                  )
                }
              >
                Two Sum (Two Pointers)
              </button>
              <button
                type="button"
                className="studio-chip-btn"
                onClick={() =>
                  setAlgorithmQuery(
                    "Find maximum element in array [14, 32, 9, 45, 21] using linear scan"
                  )
                }
              >
                Linear Scan Max
              </button>
            </div>

            <div>
              <span className="studio-label">Formatted Prompt Preview:</span>
              <pre className="studio-prompt-preview">{fullPromptToCopy}</pre>
            </div>

            <div className="studio-actions">
              <button
                type="button"
                className={`studio-btn-primary ${copied ? "studio-btn-copied" : ""}`}
                onClick={handleCopyPrompt}
              >
                {copied ? "✓ Copied to Clipboard!" : "📋 Copy Prompt for ChatGPT / Gemini"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "import" && (
          <div className="studio-tab-content">
            <p className="studio-desc">
              Paste the JSON generated by ChatGPT, Gemini, or Claude below. Markdown code blocks
              (```json ... ```) and arithmetic operations are automatically sanitized.
            </p>

            <textarea
              className="studio-textarea"
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='Paste JSON ExecutionTrace here, e.g.:
{
  "initialState": { ... },
  "steps": [ ... ]
}'
            />

            {validationResult && !validationResult.success && (
              <div className="studio-alert-error" role="alert">
                <span>⚠️</span>
                <div>{validationResult.error}</div>
              </div>
            )}

            {validationResult && validationResult.success && (
              <div className="studio-alert-success" role="status">
                <span>✓</span>
                <div>
                  Valid Trace: <strong>{validationResult.data.steps.length} steps</strong>, array:{" "}
                  <strong>
                    {validationResult.data.initialState.arrays[0]?.name || "arr"} (
                    {validationResult.data.initialState.arrays[0]?.elements.length} elements)
                  </strong>
                  . Ready to visualize!
                </div>
              </div>
            )}

            <div className="studio-actions">
              <button
                type="button"
                className="studio-btn-secondary"
                onClick={handleLoadSample}
              >
                Insert Working Sample Trace
              </button>

              <button
                type="button"
                className="studio-btn-primary"
                onClick={handleVisualizePasted}
                disabled={!validationResult || !validationResult.success}
              >
                🚀 Mount & Visualize on Canvas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
