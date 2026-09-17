import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ArrayEndControls } from "./ArrayEndControls";

describe("ArrayEndControls component", () => {
  const sampleArrays = [
    {
      id: "A",
      name: "nums",
      elements: [10, 20, 30],
      position: { x: 100, y: 200 },
      cellWidth: 70,
      cellHeight: 56,
    },
  ];

  it("renders [+] and [−] action buttons for array", () => {
    render(
      <ArrayEndControls
        arrays={sampleArrays}
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /append cell to nums/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove cell from nums/i })).toBeInTheDocument();
  });

  it("calls onAppendCell when [+] is clicked", () => {
    const handleAppend = vi.fn();
    render(
      <ArrayEndControls
        arrays={sampleArrays}
        onAppendCell={handleAppend}
        onRemoveCell={vi.fn()}
      />
    );

    const appendBtn = screen.getByRole("button", { name: /append cell to nums/i });
    fireEvent.click(appendBtn);

    expect(handleAppend).toHaveBeenCalledWith("A");
  });

  it("calls onRemoveCell when [−] is clicked", () => {
    const handleRemove = vi.fn();
    render(
      <ArrayEndControls
        arrays={sampleArrays}
        onAppendCell={vi.fn()}
        onRemoveCell={handleRemove}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /remove cell from nums/i });
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith("A");
  });

  it("disables [−] button when array length is 1", () => {
    const singleElementArray = [
      {
        id: "A",
        name: "nums",
        elements: [10],
        position: { x: 100, y: 200 },
        cellWidth: 70,
        cellHeight: 56,
      },
    ];

    render(
      <ArrayEndControls
        arrays={singleElementArray}
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /remove cell from nums/i });
    expect(removeBtn).toBeDisabled();
  });
});
