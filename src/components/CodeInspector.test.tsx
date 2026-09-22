import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CodeInspector } from "./CodeInspector";
import * as llmService from "../ai/llmService";

describe("CodeInspector component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleCode = {
    language: "python",
    content: `def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        return mid
    return -1`,
  };

  it("renders drawer in open state when isOpen is true", () => {
    render(
      <CodeInspector
        isOpen={true}
        onClose={vi.fn()}
        code={sampleCode}
        currentLine={2}
      />
    );

    const drawer = screen.getByTestId("code-inspector-drawer");
    expect(drawer.classList.contains("open")).toBe(true);
    expect(screen.getByText("Code Inspector")).toBeDefined();
  });

  it("renders drawer in closed state when isOpen is false", () => {
    render(
      <CodeInspector
        isOpen={false}
        onClose={vi.fn()}
        code={sampleCode}
      />
    );

    const drawer = screen.getByTestId("code-inspector-drawer");
    expect(drawer.classList.contains("closed")).toBe(true);
  });

  it("renders line numbers and code lines", () => {
    const { container } = render(
      <CodeInspector
        isOpen={true}
        onClose={vi.fn()}
        code={sampleCode}
      />
    );

    // 7 lines
    expect(container.querySelector("#code-line-1")).toBeDefined();
    expect(container.querySelector("#code-line-7")).toBeDefined();
    expect(screen.getByText("binary_search")).toBeDefined();
  });

  it("highlights the active line with indicator", () => {
    const { container } = render(
      <CodeInspector
        isOpen={true}
        onClose={vi.fn()}
        code={sampleCode}
        currentLine={5}
      />
    );

    const activeRow = container.querySelector(".code-line-row.active");
    expect(activeRow).toBeDefined();
    expect(activeRow?.getAttribute("data-line")).toBe("5");
    expect(activeRow?.querySelector(".code-line-pointer")?.textContent).toBe("▶");
  });

  it("calls onSeekToLine when a gutter line is clicked", () => {
    const onSeekToLine = vi.fn();
    const { container } = render(
      <CodeInspector
        isOpen={true}
        onClose={vi.fn()}
        code={sampleCode}
        onSeekToLine={onSeekToLine}
      />
    );

    const gutterLine4 = container.querySelector("#code-line-4 .code-line-gutter");
    expect(gutterLine4).toBeDefined();
    fireEvent.click(gutterLine4!);

    expect(onSeekToLine).toHaveBeenCalledWith(4);
  });

  it("renders empty state when code is missing", () => {
    render(
      <CodeInspector
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("code-empty-state")).toBeDefined();
    expect(screen.getByText("No Source Code Attached")).toBeDefined();
    expect(screen.getByText("⚡ Generate Code with Antigravity")).toBeDefined();
  });

  it("calls generateCodeForTrace when generate button is clicked", async () => {
    const onCodeGenerated = vi.fn();
    const mockTrace: any = {
      initialState: { narration: { title: "Test" } },
      steps: [{ title: "Step 1", explanation: "Step 1" }],
    };

    vi.spyOn(llmService, "generateCodeForTrace").mockResolvedValue({
      code: {
        language: "python",
        content: "def generated():\n    return 42",
      },
      stepLineMap: [2],
    });

    render(
      <CodeInspector
        isOpen={true}
        onClose={vi.fn()}
        trace={mockTrace}
        onCodeGenerated={onCodeGenerated}
      />
    );

    const generateBtn = screen.getByText("⚡ Generate Code with Antigravity");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(onCodeGenerated).toHaveBeenCalledWith(
        { language: "python", content: "def generated():\n    return 42" },
        [2]
      );
    });
  });

  it("triggers translation when language select changes", async () => {
    vi.spyOn(llmService, "translateAlgorithmCode").mockResolvedValue(
      "public class Solution {\n    // Translated\n}"
    );

    render(
      <CodeInspector
        isOpen={true}
        onClose={vi.fn()}
        code={sampleCode}
      />
    );

    const select = screen.getByLabelText("Select Programming Language");
    fireEvent.change(select, { target: { value: "java" } });

    await waitFor(() => {
      expect(llmService.translateAlgorithmCode).toHaveBeenCalledWith(
        sampleCode.content,
        "java",
        "python"
      );
    });

    expect(screen.getByText("// Translated")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <CodeInspector
        isOpen={true}
        onClose={onClose}
        code={sampleCode}
      />
    );

    const closeBtn = screen.getByLabelText("Close Code Inspector");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
