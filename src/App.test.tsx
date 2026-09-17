import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw">Mock Excalidraw Canvas</div>,
}));

describe("App root component", () => {
  it("boots with default Student Mode and toggles to Teacher Mode", () => {
    render(<App />);

    expect(screen.getByText("DSA Notebook")).toBeInTheDocument();
    expect(screen.getByTestId("mock-excalidraw")).toBeInTheDocument();

    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    expect(teacherBtn).toHaveClass("active");
    expect(screen.getByTestId("whiteboard-wrapper")).toHaveAttribute("data-mode", "teacher");
  });

  it("renders playback dock in Student Mode and scrubs forward with Next button", () => {
    render(<App />);

    expect(screen.getByRole("toolbar", { name: /step playback controls/i })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent?.trim() === "Step 0 / 4")
    ).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /next step/i });
    fireEvent.click(nextBtn);

    expect(
      screen.getByText((_, element) => element?.textContent?.trim() === "Step 1 / 4")
    ).toBeInTheDocument();
  });

  it("hides playback dock when switched to Teacher Mode and displays TeacherToolbox", () => {
    render(<App />);

    expect(screen.getByRole("toolbar", { name: /step playback controls/i })).toBeInTheDocument();

    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    expect(screen.queryByRole("toolbar", { name: /step playback controls/i })).not.toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: /dsa teacher toolbox/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Array/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Pointer/i })).toBeInTheDocument();
  });

  it("renders array end-caps in Teacher Mode and supports appending and removing cells", () => {
    render(<App />);

    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    const appendBtn = screen.getByRole("button", { name: /append cell/i });
    const removeBtn = screen.getByRole("button", { name: /remove cell/i });

    expect(appendBtn).toBeInTheDocument();
    expect(removeBtn).toBeInTheDocument();

    // Click append cell
    fireEvent.click(appendBtn);
    // Click remove cell
    fireEvent.click(removeBtn);
  });

  it("maintains independent pointers across multiple arrays without cross-array reset", () => {
    render(<App />);

    // 1. Switch to Teacher Mode
    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    // Initial array 1 has pointer 'i'. Step pointer i right two times (index 0 -> 1 -> 2)
    const stepRightI = screen.getByRole("button", { name: /move pointer i right/i });
    fireEvent.click(stepRightI);
    fireEvent.click(stepRightI);

    // 2. Add a second array via Teacher Toolbox
    const addArrayBtn = screen.getByRole("button", { name: /\+ Array/i });
    fireEvent.click(addArrayBtn);

    const insertBtn = screen.getByRole("button", { name: /insert array/i });
    fireEvent.click(insertBtn);

    // Both array pointer controls should now be visible (pointer i for Array 1, pointer j for Array 2)
    const stepRightJ = screen.getByRole("button", { name: /move pointer j right/i });
    expect(stepRightJ).toBeInTheDocument();

    // 3. Move pointer j on Array 2 right (from index 0 -> 1)
    fireEvent.click(stepRightJ);

    // Pointer i for Array 1 must still have its controls and NOT be disabled at index 0
    // (If it had reset to 0, move pointer i left would be disabled!)
    const stepLeftI = screen.getByRole("button", { name: /move pointer i left/i });
    expect(stepLeftI).toBeInTheDocument();
    expect(stepLeftI).not.toBeDisabled();

    // Move pointer j right again (index 1 -> 2)
    fireEvent.click(stepRightJ);

    // Pointer i must STILL not be at index 0 (can move left twice)
    fireEvent.click(stepLeftI); // 2 -> 1
    expect(stepLeftI).not.toBeDisabled(); // 1 > 0, so not disabled!

    // Pointer j should be at index 2 (so its step left is not disabled)
    const stepLeftJ = screen.getByRole("button", { name: /move pointer j left/i });
    expect(stepLeftJ).not.toBeDisabled();
  });
});
