import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PromptBar } from "./PromptBar";

describe("PromptBar component", () => {
  it("renders quick-start preset chips and input bar", () => {
    render(<PromptBar onSubmit={vi.fn()} isLoading={false} />);

    expect(screen.getByText("Binary Search")).toBeInTheDocument();
    expect(screen.getByText("Two Pointers")).toBeInTheDocument();
    expect(screen.getByText("Linear Scan")).toBeInTheDocument();
    expect(screen.getByText("Second Largest")).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/Ask AI Tutor to visualize an algorithm/i)
    ).toBeInTheDocument();
  });

  it("submits typed query when clicking submit or pressing Enter", () => {
    const onSubmit = vi.fn();
    render(<PromptBar onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText(/Ask AI Tutor/i);
    fireEvent.change(input, { target: { value: "Binary Search on [1, 2, 3]" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith("Binary Search on [1, 2, 3]");
  });

  it("submits preset query immediately when clicking a preset chip", () => {
    const onSubmit = vi.fn();
    render(<PromptBar onSubmit={onSubmit} isLoading={false} />);

    fireEvent.click(screen.getByText("Binary Search"));
    expect(onSubmit).toHaveBeenCalledWith("Binary Search");
  });

  it("renders non-blocking loading state when isLoading is true", () => {
    render(<PromptBar onSubmit={vi.fn()} isLoading={true} />);

    expect(screen.getByText(/AI Tutor is reasoning/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask AI Tutor/i)).toBeDisabled();
  });

  it("displays error message and allows retry", () => {
    const onRetry = vi.fn();
    render(
      <PromptBar
        onSubmit={vi.fn()}
        isLoading={false}
        errorMessage="Trace validation error: pointer index out of bounds"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/Trace validation error/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });
});
