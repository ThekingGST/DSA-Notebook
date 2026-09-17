import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TeacherToolbox } from "./TeacherToolbox";

describe("TeacherToolbox component", () => {
  const sampleArrays = [
    { id: "A", name: "nums", elements: [10, 20, 30], position: { x: 100, y: 200 } },
  ];

  it("renders + Array and + Pointer buttons", () => {
    render(
      <TeacherToolbox
        arrays={sampleArrays}
        onAddArray={vi.fn()}
        onAddPointer={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /\+ Array/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Pointer/i })).toBeInTheDocument();
  });

  it("opens array popover, selects preset, and inserts array", () => {
    const handleAddArray = vi.fn();
    render(
      <TeacherToolbox
        arrays={sampleArrays}
        onAddArray={handleAddArray}
        onAddPointer={vi.fn()}
      />
    );

    const addArrayBtn = screen.getByRole("button", { name: /\+ Array/i });
    fireEvent.click(addArrayBtn);

    // Popover should be visible
    expect(screen.getByText(/Preset Arrays/i)).toBeInTheDocument();

    // Click on preset [1, 2, 3, 4, 5]
    const presetBtn = screen.getByText("[1, 2, 3, 4, 5]");
    fireEvent.click(presetBtn);

    // Click Insert Array
    const insertBtn = screen.getByRole("button", { name: /Insert Array/i });
    fireEvent.click(insertBtn);

    expect(handleAddArray).toHaveBeenCalledWith(
      expect.any(String),
      [1, 2, 3, 4, 5]
    );
  });

  it("parses custom comma-separated array input", () => {
    const handleAddArray = vi.fn();
    render(
      <TeacherToolbox
        arrays={sampleArrays}
        onAddArray={handleAddArray}
        onAddPointer={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ Array/i }));

    const input = screen.getByPlaceholderText(/e\.g\. 10, 25, 7/i);
    fireEvent.change(input, { target: { value: "42, 99, 100" } });

    const insertBtn = screen.getByRole("button", { name: /Insert Array/i });
    fireEvent.click(insertBtn);

    expect(handleAddArray).toHaveBeenCalledWith(
      expect.any(String),
      [42, 99, 100]
    );
  });

  it("opens pointer popover and attaches named pointer", () => {
    const handleAddPointer = vi.fn();
    render(
      <TeacherToolbox
        arrays={sampleArrays}
        onAddArray={vi.fn()}
        onAddPointer={handleAddPointer}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ Pointer/i }));

    expect(screen.getByText(/Attach Pointer/i)).toBeInTheDocument();

    // Select pointer 'left'
    const leftBtn = screen.getByRole("button", { name: "left" });
    fireEvent.click(leftBtn);

    expect(handleAddPointer).toHaveBeenCalledWith(
      "A",
      "left",
      expect.any(String)
    );
  });
});
