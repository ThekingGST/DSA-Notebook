import { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { compileDSAToExcalidraw } from "../compiler/compileDSAToExcalidraw";

let mockUpdateScene = vi.fn();

vi.mock("@excalidraw/excalidraw", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Excalidraw: ({ excalidrawAPI, initialData }: any) => {
    useEffect(() => {
      if (excalidrawAPI) {
        excalidrawAPI({ updateScene: mockUpdateScene });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div data-testid="mock-excalidraw-canvas">
        Excalidraw Mock ({initialData?.elements?.length || 0} elements)
      </div>
    );
  },
}));

describe("WhiteboardCanvas component", () => {
  it("renders with compiled DSA initial elements", () => {
    mockUpdateScene = vi.fn();
    const elements = compileDSAToExcalidraw({
      arrays: [
        {
          id: "A",
          name: "nums",
          elements: [10, 20, 30],
          position: { x: 100, y: 200 },
        },
      ],
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
      variables: [],
    });

    render(<WhiteboardCanvas mode="student" initialElements={elements} />);
    expect(screen.getByTestId("whiteboard-wrapper")).toBeInTheDocument();
    expect(screen.getByText(/Excalidraw Mock/)).toBeInTheDocument();
    expect(mockUpdateScene).toHaveBeenCalled();
  });

  it("snaps pointer immediately when isRapidStepping is true", () => {
    mockUpdateScene = vi.fn();
    const state0 = {
      arrays: [
        {
          id: "A",
          name: "nums",
          elements: [10, 20, 30],
          position: { x: 100, y: 200 },
        },
      ],
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
      variables: [],
    };
    const state1 = {
      ...state0,
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 1 }],
    };

    const elements0 = compileDSAToExcalidraw(state0);
    const elements1 = compileDSAToExcalidraw(state1);

    const { rerender } = render(
      <WhiteboardCanvas mode="student" initialElements={elements0} isRapidStepping={false} />
    );

    mockUpdateScene.mockClear();

    // Rerender with step 1 under rapid stepping
    rerender(
      <WhiteboardCanvas mode="student" initialElements={elements1} isRapidStepping={true} />
    );

    // Under rapid stepping, it should immediately commit the target elements
    expect(mockUpdateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: elements1,
      })
    );
  });

  it("glides smoothly via requestAnimationFrame when isRapidStepping is false", () => {
    mockUpdateScene = vi.fn();
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    const state0 = {
      arrays: [
        {
          id: "A",
          name: "nums",
          elements: [10, 20, 30],
          position: { x: 100, y: 200 },
        },
      ],
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
      variables: [],
    };
    const state1 = {
      ...state0,
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 1 }],
    };

    const elements0 = compileDSAToExcalidraw(state0);
    const elements1 = compileDSAToExcalidraw(state1);

    const { rerender } = render(
      <WhiteboardCanvas mode="student" initialElements={elements0} isRapidStepping={false} />
    );

    rafSpy.mockClear();

    // Rerender with step 1 under normal (non-rapid) stepping
    rerender(
      <WhiteboardCanvas mode="student" initialElements={elements1} isRapidStepping={false} />
    );

    // Under normal stepping, it should start smooth gliding via requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it("cancels in-flight smooth glide and snaps immediately when rapid stepping interrupts", () => {
    mockUpdateScene = vi.fn();
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

    const state0 = {
      arrays: [{ id: "A", name: "nums", elements: [10, 20, 30], position: { x: 100, y: 200 } }],
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
      variables: [],
    };
    const state1 = {
      ...state0,
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 1 }],
    };
    const state2 = {
      ...state0,
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 2 }],
    };

    const elements0 = compileDSAToExcalidraw(state0);
    const elements1 = compileDSAToExcalidraw(state1);
    const elements2 = compileDSAToExcalidraw(state2);

    const { rerender } = render(
      <WhiteboardCanvas mode="student" initialElements={elements0} isRapidStepping={false} />
    );

    // Step 1: starts gliding
    rerender(
      <WhiteboardCanvas mode="student" initialElements={elements1} isRapidStepping={false} />
    );

    cancelSpy.mockClear();
    mockUpdateScene.mockClear();

    // Step 2: rapid step interrupts
    rerender(
      <WhiteboardCanvas mode="student" initialElements={elements2} isRapidStepping={true} />
    );

    // In-flight animation frame should be cancelled
    expect(cancelSpy).toHaveBeenCalled();
    // Step 2 elements should be committed immediately
    expect(mockUpdateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: elements2,
      })
    );

    cancelSpy.mockRestore();
  });
});

