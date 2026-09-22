import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Header } from "./Header";

describe("Header component", () => {
  it("renders branding title and segmented mode buttons", () => {
    const onModeChange = vi.fn();
    render(<Header mode="student" onModeChange={onModeChange} />);

    expect(screen.getByText("DSA Notebook")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /student mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /teacher mode/i })).toBeInTheDocument();
  });

  it("calls onModeChange when teacher mode button is clicked", () => {
    const onModeChange = vi.fn();
    render(<Header mode="student" onModeChange={onModeChange} />);

    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    expect(onModeChange).toHaveBeenCalledWith("teacher");
  });

  it("renders Prompt Studio button and opens PromptStudioModal", () => {
    render(<Header mode="student" onModeChange={vi.fn()} />);
    const studioBtn = screen.getByRole("button", { name: /prompt studio/i });
    expect(studioBtn).toBeInTheDocument();

    fireEvent.click(studioBtn);
    expect(screen.getByText(/Prompt Studio & Trace Importer/i)).toBeInTheDocument();
  });

  it("renders Code Inspector toggle button and handles click", () => {
    const onToggleCode = vi.fn();
    render(
      <Header
        mode="student"
        onModeChange={vi.fn()}
        isCodeOpen={false}
        onToggleCode={onToggleCode}
      />
    );

    const codeBtn = screen.getByRole("button", { name: /toggle code inspector/i });
    expect(codeBtn).toBeInTheDocument();

    fireEvent.click(codeBtn);
    expect(onToggleCode).toHaveBeenCalledTimes(1);
  });
});

