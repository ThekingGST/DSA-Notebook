import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PromptStudioModal } from "./PromptStudioModal";

describe("PromptStudioModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onLoadTrace: vi.fn(),
  };

  it("does not render when isOpen is false", () => {
    render(<PromptStudioModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Prompt Studio & Trace Importer/i)).not.toBeInTheDocument();
  });

  it("renders tabs, title, and prompt preview when open", () => {
    render(<PromptStudioModal {...defaultProps} />);
    expect(screen.getByText(/Prompt Studio & Trace Importer/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Prompt Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Paste & Visualize Trace/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Prompt for ChatGPT \/ Gemini/i)).toBeInTheDocument();
  });

  it("updates query when quick fill chip is clicked", () => {
    render(<PromptStudioModal {...defaultProps} />);
    const twoSumChip = screen.getByRole("button", { name: /Two Sum \(Two Pointers\)/i });
    fireEvent.click(twoSumChip);

    const input = screen.getByLabelText(/Algorithm Question \/ Problem:/i) as HTMLInputElement;
    expect(input.value).toContain("Two Sum on sorted array");
  });

  it("copies prompt to clipboard when copy button clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<PromptStudioModal {...defaultProps} />);
    const copyBtn = screen.getByText(/Copy Prompt for ChatGPT \/ Gemini/i);
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/Copied to Clipboard!/i)).toBeInTheDocument();
    });
  });

  it("switches to Paste & Visualize Trace tab and shows error on invalid JSON", () => {
    render(<PromptStudioModal {...defaultProps} />);
    const importTab = screen.getByText(/2\. Paste & Visualize Trace/i);
    fireEvent.click(importTab);

    const textarea = screen.getByPlaceholderText(/Paste JSON ExecutionTrace here/i);
    fireEvent.change(textarea, { target: { value: "{ invalid json: 123" } });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/JSON syntax error/i)).toBeInTheDocument();
  });

  it("allows inserting sample trace and mounting to canvas", () => {
    const onLoadTrace = vi.fn();
    const onClose = vi.fn();

    render(<PromptStudioModal {...defaultProps} onLoadTrace={onLoadTrace} onClose={onClose} />);
    const importTab = screen.getByText(/2\. Paste & Visualize Trace/i);
    fireEvent.click(importTab);

    const sampleBtn = screen.getByRole("button", { name: /Insert Working Sample Trace/i });
    fireEvent.click(sampleBtn);

    expect(screen.getByText(/Valid Trace:/i)).toBeInTheDocument();

    const mountBtn = screen.getByRole("button", { name: /Mount & Visualize on Canvas/i });
    expect(mountBtn).not.toBeDisabled();
    fireEvent.click(mountBtn);

    expect(onLoadTrace).toHaveBeenCalledTimes(1);
    expect(onLoadTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState: expect.any(Object),
        steps: expect.any(Array),
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders quick fill chips for diverse archetypes and updates prompt query", () => {
    render(<PromptStudioModal {...defaultProps} />);

    const mergeChip = screen.getByRole("button", { name: /Merge Two Sorted Arrays/i });
    const dnfChip = screen.getByRole("button", { name: /Dutch National Flag/i });
    const kadaneChip = screen.getByRole("button", { name: /Kadane's Algorithm/i });

    expect(mergeChip).toBeInTheDocument();
    expect(dnfChip).toBeInTheDocument();
    expect(kadaneChip).toBeInTheDocument();

    fireEvent.click(mergeChip);
    const input = screen.getByLabelText(/Algorithm Question \/ Problem:/i) as HTMLInputElement;
    expect(input.value).toContain("Merge two sorted arrays");
  });
});
