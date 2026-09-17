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
});
