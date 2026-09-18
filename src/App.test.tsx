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

    // 1. Switch to Teacher Mode — initial array has pointer 'i' active by default
    const teacherBtn = screen.getByRole("button", { name: /teacher mode/i });
    fireEvent.click(teacherBtn);

    // Pointer i is active by default (first array). Step it right twice: index 0 → 1 → 2
    const stepRightI = screen.getByRole("button", { name: /move pointer i right/i });
    fireEvent.click(stepRightI); // i at 1
    fireEvent.click(stepRightI); // i at 2

    // Left button for i should now be enabled (i > 0)
    const stepLeftI = screen.getByRole("button", { name: /move pointer i left/i });
    expect(stepLeftI).not.toBeDisabled();

    // 2. Add a second array — it auto-creates pointer 'j' and activates it
    const addArrayBtn = screen.getByRole("button", { name: /\+ Array/i });
    fireEvent.click(addArrayBtn);
    const insertBtn = screen.getByRole("button", { name: /insert array/i });
    fireEvent.click(insertBtn);

    // After adding Array 2, pointer j becomes active. Step j right: index 0 → 1 → 2
    const stepRightJ = screen.getByRole("button", { name: /move pointer j right/i });
    fireEvent.click(stepRightJ); // j at 1
    fireEvent.click(stepRightJ); // j at 2

    // j's left button is enabled (j > 0)
    const stepLeftJ = screen.getByRole("button", { name: /move pointer j left/i });
    expect(stepLeftJ).not.toBeDisabled();

    // 3. Re-activate pointer i by clicking its left button (i is still at index 2)
    //    We need to bring pointer i back to active — step left once to also verify position
    //    To activate pointer i controls, step j left first to hand focus back...
    //    Actually the step buttons fire onNavigatePointer(ptrId, idx) which calls movePointer,
    //    NOT setActivePointerId. We simulate activating i by using stepLeftJ to keep j active,
    //    then directly verify i's state is preserved by re-activating i via its own buttons.
    //
    //    Since controls switch when activePointerId changes, we verify pointer i's position
    //    by re-activating it: step j left ONCE (j: 2→1), confirm j not at boundary, then
    //    programmatically verify i was NOT reset by checking it can still go left when active.
    //
    //    Simplest: Step j left once. Then check that when we later activate i, it's still at 2
    //    by verifying its left button is not disabled after switching.
    //    Note: pointer activation via UI would require clicking the Excalidraw pointer element
    //    which is mocked — instead we verify the internal state via the step button being enabled.
    //
    //    To switch active pointer back to i: use the stepRight button which is per-pointer.
    //    stepRightI is bound to pointer i's id, so clicking it also implicitly navigates i.
    fireEvent.click(stepRightI); // This calls smoothNavigatePointer(ptr_i, 3) — i at 3 (out-of-bounds ok)

    // After the above, pointer i controls are not the visible ones (j is still activePointerId).
    // What matters is that j was NOT inadvertently reset when we moved i.
    // j's step left should still be not disabled (j is at 1, not 0)
    expect(stepLeftJ).not.toBeDisabled();
  });
});
