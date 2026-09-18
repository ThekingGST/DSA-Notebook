import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CellInlineEditor, ActiveCellEdit } from "./CellInlineEditor";

describe("CellInlineEditor component", () => {
  const sampleEdit: ActiveCellEdit = {
    arrayId: "A",
    index: 2,
    initialValue: 42,
    screenX: 240,
    screenY: 320,
    width: 70,
    height: 56,
  };

  it("renders nothing when activeEdit is null", () => {
    const { container } = render(
      <CellInlineEditor activeEdit={null} onCommit={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders input with initial value and correct position", () => {
    render(
      <CellInlineEditor activeEdit={sampleEdit} onCommit={vi.fn()} onCancel={vi.fn()} />
    );

    const input = screen.getByDisplayValue("42") as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("commits updated numeric value on Enter key", () => {
    const handleCommit = vi.fn();
    render(
      <CellInlineEditor activeEdit={sampleEdit} onCommit={handleCommit} onCancel={vi.fn()} />
    );

    const input = screen.getByDisplayValue("42");
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(handleCommit).toHaveBeenCalledWith("A", 2, 99);
  });

  it("cancels editing on Escape key", () => {
    const handleCancel = vi.fn();
    render(
      <CellInlineEditor activeEdit={sampleEdit} onCommit={vi.fn()} onCancel={handleCancel} />
    );

    const input = screen.getByDisplayValue("42");
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    expect(handleCancel).toHaveBeenCalled();
  });

  it("commits updated value on blur", () => {
    const handleCommit = vi.fn();
    render(
      <CellInlineEditor activeEdit={sampleEdit} onCommit={handleCommit} onCancel={vi.fn()} />
    );

    const input = screen.getByDisplayValue("42");
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.blur(input);

    expect(handleCommit).toHaveBeenCalledWith("A", 2, 100);
  });
});
