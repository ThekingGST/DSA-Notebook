import React, { useState, useEffect, useRef } from "react";
import { AlgorithmCode, ExecutionTrace } from "../engine/types";
import { translateAlgorithmCode, generateCodeForTrace } from "../ai/llmService";
import "./CodeInspector.css";

export interface CodeInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  code?: AlgorithmCode;
  currentLine?: number;
  highlightLines?: number[];
  onSeekToLine?: (line: number) => void;
  onCodeGenerated?: (code: AlgorithmCode, stepLineMap?: number[]) => void;
  trace?: ExecutionTrace;
}

const SUPPORTED_LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "typescript", label: "TypeScript" },
];

/**
 * Lightweight deterministic syntax highlighter for common algorithmic languages
 */
export function formatCodeTokens(lineText: string, language: string): React.ReactNode {
  if (!lineText) return "\u00A0";

  // Check for comments first
  const isPython = language.toLowerCase() === "python";
  const commentChar = isPython ? "#" : "//";
  const commentIndex = lineText.indexOf(commentChar);

  let codePart = lineText;
  let commentPart = "";

  if (commentIndex !== -1) {
    codePart = lineText.slice(0, commentIndex);
    commentPart = lineText.slice(commentIndex);
  }

  // Regex tokenizer for keywords, function calls, strings, numbers, operators
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:def|class|return|if|elif|else|while|for|in|range|and|or|not|None|True|False|int|void|public|private|static|let|const|var|function|new|continue|break)\b)|(\b[a-zA-Z_]\w*(?=\s*\())|(\b\d+\b)|(==|!=|<=|>=|[+\-*/%=<>!])/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(codePart)) !== null) {
    // Add text preceding match
    if (match.index > lastIndex) {
      elements.push(codePart.slice(lastIndex, match.index));
    }

    const [fullMatch, str, keyword, func, num, op] = match;

    if (str) {
      elements.push(
        <span key={`str-${match.index}`} className="token-string">
          {str}
        </span>
      );
    } else if (keyword) {
      elements.push(
        <span key={`kw-${match.index}`} className="token-keyword">
          {keyword}
        </span>
      );
    } else if (func) {
      elements.push(
        <span key={`fn-${match.index}`} className="token-function">
          {func}
        </span>
      );
    } else if (num) {
      elements.push(
        <span key={`num-${match.index}`} className="token-number">
          {num}
        </span>
      );
    } else if (op) {
      elements.push(
        <span key={`op-${match.index}`} className="token-operator">
          {op}
        </span>
      );
    } else {
      elements.push(fullMatch);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < codePart.length) {
    elements.push(codePart.slice(lastIndex));
  }

  if (commentPart) {
    elements.push(
      <span key="comment" className="token-comment">
        {commentPart}
      </span>
    );
  }

  return elements;
}

export const CodeInspector: React.FC<CodeInspectorProps> = ({
  isOpen,
  onClose,
  code,
  currentLine,
  highlightLines = [],
  onSeekToLine,
  onCodeGenerated,
  trace,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("python");
  const [translatedCodes, setTranslatedCodes] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Sync selected language when code changes or resets
  useEffect(() => {
    if (code?.language) {
      const initialLang = code.language.toLowerCase();
      setSelectedLanguage(initialLang);
      setTranslatedCodes({ [initialLang]: code.content });
    }
  }, [code?.content, code?.language]);

  // Smooth auto-scroll active line into view during playback
  useEffect(() => {
    if (isOpen && activeLineRef.current && typeof activeLineRef.current.scrollIntoView === "function") {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentLine, isOpen]);

  const activeContent =
    translatedCodes[selectedLanguage] || (code?.language?.toLowerCase() === selectedLanguage ? code?.content : "") || code?.content || "";

  const lines = activeContent ? activeContent.split("\n") : [];

  const handleLanguageChange = async (targetLang: string) => {
    setSelectedLanguage(targetLang);
    setErrorMsg(null);

    if (translatedCodes[targetLang]) {
      return;
    }

    const baseCode = code?.content;
    if (!baseCode) return;

    try {
      setIsTranslating(true);
      const translated = await translateAlgorithmCode(
        baseCode,
        targetLang,
        code?.language || "python"
      );
      setTranslatedCodes((prev) => ({ ...prev, [targetLang]: translated }));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!trace) return;
    try {
      setIsGenerating(true);
      setErrorMsg(null);
      const res = await generateCodeForTrace(trace);
      if (res.code) {
        setTranslatedCodes({ python: res.code.content });
        setSelectedLanguage("python");
        if (onCodeGenerated) {
          onCodeGenerated(res.code, res.stepLineMap);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Code generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <aside
      className={`code-inspector-drawer ${isOpen ? "open" : "closed"}`}
      aria-label="Code Inspector"
      data-testid="code-inspector-drawer"
    >
      <div className="code-inspector-header">
        <div className="code-inspector-title-group">
          <span className="code-inspector-title">
            <span>💻</span> Code Inspector
          </span>
        </div>

        <div className="code-inspector-controls">
          {code && (
            <select
              className="code-lang-select"
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isTranslating}
              aria-label="Select Programming Language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          )}

          <button
            className="code-inspector-close"
            onClick={onClose}
            title="Close Code Inspector"
            aria-label="Close Code Inspector"
          >
            ✕
          </button>
        </div>
      </div>

      {isTranslating && (
        <div className="code-loading-banner">
          <span>⚡</span> Translating to {selectedLanguage}...
        </div>
      )}

      {errorMsg && (
        <div className="code-loading-banner" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {(!code || !code.content) ? (
        <div className="code-empty-state" data-testid="code-empty-state">
          <div className="code-empty-icon">📄</div>
          <h4 className="code-empty-title">No Source Code Attached</h4>
          <p className="code-empty-desc">
            This execution trace doesn't have source code mapped yet. Generate code with Antigravity to enable synchronized line execution.
          </p>
          <button
            className="code-generate-btn"
            onClick={handleGenerateCode}
            disabled={isGenerating || !trace}
          >
            {isGenerating ? "⚡ Generating Code..." : "⚡ Generate Code with Antigravity"}
          </button>
        </div>
      ) : (
        <div className="code-viewer-container" ref={containerRef}>
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const isActive = currentLine === lineNum;
            const isHighlighted = highlightLines.includes(lineNum);

            return (
              <div
                key={lineNum}
                id={`code-line-${lineNum}`}
                ref={isActive ? activeLineRef : undefined}
                className={`code-line-row ${isActive ? "active" : ""} ${
                  isHighlighted ? "highlight-range" : ""
                }`}
                data-line={lineNum}
              >
                <div
                  className="code-line-gutter"
                  onClick={() => onSeekToLine && onSeekToLine(lineNum)}
                  title={`Click to seek playback to line ${lineNum}`}
                >
                  <span className="code-line-pointer">{isActive ? "▶" : ""}</span>
                  <span className="code-line-num">{lineNum}</span>
                </div>
                <div className="code-line-content">
                  {formatCodeTokens(lineText, selectedLanguage)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
