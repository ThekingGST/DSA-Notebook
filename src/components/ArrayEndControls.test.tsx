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

  it("moves adjacent to the active pointer position", () => {
    const pointers = [
      { id: "p1", name: "i", targetArrayId: "A", index: 2, color: "#8b5cf6" },
    ];

    const { container } = render(
      <ArrayEndControls
        arrays={sampleArrays}
        pointers={pointers}
        activePointerId="p1"
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
      />
    );

    const pill = container.querySelector(".array-end-pill");
    expect(pill).toBeInTheDocument();
    // Element 2 center = 100 + 2 * 70 + 35 = 275. ActionY = 200 + 56 + 34 = 290.
    expect(pill?.getAttribute("style")).toContain("275px");
    expect(pill?.getAttribute("style")).toContain("290px");
  });

  it("renders step navigation buttons when pointers are attached and navigates pointer", () => {
    const pointers = [
      { id: "p1", name: "i", targetArrayId: "A", index: 1, color: "#8b5cf6" },
    ];
    const handleNavigate = vi.fn();

    render(
      <ArrayEndControls
        arrays={sampleArrays}
        pointers={pointers}
        activePointerId="p1"
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
        onNavigatePointer={handleNavigate}
      />
    );

    const prevBtn = screen.getByRole("button", { name: /move pointer i left/i });
    const nextBtn = screen.getByRole("button", { name: /move pointer i right/i });

    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(prevBtn);
    expect(handleNavigate).toHaveBeenCalledWith("p1", 0);

    fireEvent.click(nextBtn);
    expect(handleNavigate).toHaveBeenCalledWith("p1", 2);
  });

  it("hides controls when isEditing is true", () => {
    const { container } = render(
      <ArrayEndControls
        arrays={sampleArrays}
        isEditing={true}
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
      />
    );

    expect(container.querySelector(".array-end-pill")).not.toBeInTheDocument();
  });

  it("supports boundary pointer navigation at -1 and array length", () => {
    const pointers = [
      { id: "p1", name: "i", targetArrayId: "A", index: 0, color: "#8b5cf6" },
    ];
    const handleNavigate = vi.fn();

    const { rerender } = render(
      <ArrayEndControls
        arrays={sampleArrays}
        pointers={pointers}
        activePointerId="p1"
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
        onNavigatePointer={handleNavigate}
      />
    );

    // Can navigate left from 0 to boundary -1
    const prevBtn = screen.getByRole("button", { name: /move pointer i left/i });
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);
    expect(handleNavigate).toHaveBeenCalledWith("p1", -1);

    // When at boundary -1, left button is disabled
    rerender(
      <ArrayEndControls
        arrays={sampleArrays}
        pointers={[{ id: "p1", name: "i", targetArrayId: "A", index: -1, color: "#8b5cf6" }]}
        activePointerId="p1"
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
        onNavigatePointer={handleNavigate}
      />
    );
    expect(screen.getByRole("button", { name: /move pointer i left/i })).toBeDisabled();

    // When at array length (3), right button is disabled
    rerender(
      <ArrayEndControls
        arrays={sampleArrays}
        pointers={[{ id: "p1", name: "i", targetArrayId: "A", index: 3, color: "#8b5cf6" }]}
        activePointerId="p1"
        onAppendCell={vi.fn()}
        onRemoveCell={vi.fn()}
        onNavigatePointer={handleNavigate}
      />
    );
    expect(screen.getByRole("button", { name: /move pointer i right/i })).toBeDisabled();
  });
});

