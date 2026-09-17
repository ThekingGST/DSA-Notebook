import { useEffect } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { compileDSAToExcalidraw } from "../compiler/compileDSAToExcalidraw";

let mockUpdateScene = vi.fn();
let mockSceneElements: any[] = [];
let mockAppState: any = {
  scrollX: 0,
  scrollY: 0,
  zoom: { value: 1 },
  selectedElementIds: {},
};

vi.mock("@excalidraw/excalidraw", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Excalidraw: ({ excalidrawAPI, initialData, onChange }: any) => {
    useEffect(() => {
      if (excalidrawAPI) {
        excalidrawAPI({
          updateScene: mockUpdateScene,
          getSceneElements: () => mockSceneElements,
          getAppState: () => mockAppState,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div
        data-testid="mock-excalidraw-canvas"
        onClick={() => onChange?.(mockSceneElements, mockAppState)}
      >
        Excalidraw Mock ({initialData?.elements?.length || 0} elements)
      </div>
    );
  },
}));

describe("WhiteboardCanvas component", () => {
  beforeEach(() => {
    mockUpdateScene = vi.fn((scene) => {
      if (scene?.elements) {
        mockSceneElements = scene.elements;
      }
    });
    mockSceneElements = [];
    mockAppState = {
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
      selectedElementIds: {},
    };
  });

  it("renders with compiled DSA initial elements", () => {
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
        elements: expect.arrayContaining([
          expect.objectContaining({ id: "ptr_p1" }),
        ]),
      })
    );
  });

  it("glides smoothly via requestAnimationFrame when isRapidStepping is false", () => {
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
        elements: expect.arrayContaining([
          expect.objectContaining({ id: "ptr_p1" }),
        ]),
      })
    );

    cancelSpy.mockRestore();
  });

  it("preserves non-DSA user drawings and shapes when updating scenes", () => {
    // Inject a non-DSA user freehand element
    const freehandElement = {
      id: "freehand_1",
      type: "freedraw",
      x: 50,
      y: 50,
      points: [[0, 0], [10, 10]],
    };
    mockSceneElements = [freehandElement];

    const dsaElements = compileDSAToExcalidraw({
      arrays: [{ id: "A", name: "nums", elements: [1, 2], position: { x: 100, y: 200 } }],
      pointers: [],
      variables: [],
    });

    render(<WhiteboardCanvas mode="teacher" initialElements={dsaElements} />);

    // Commit should preserve freehand_1 alongside DSA elements
    expect(mockUpdateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({ id: "freehand_1" }),
          expect.objectContaining({ id: "cell_A_0" }),
        ]),
      })
    );
  });

  it("triggers onCellDoubleClick when double clicking an array cell in Teacher Mode", () => {
    const handleCellDoubleClick = vi.fn();
    const dsaElements = compileDSAToExcalidraw({
      arrays: [{ id: "A", name: "nums", elements: [10, 20], position: { x: 100, y: 200 } }],
      pointers: [],
      variables: [],
    });

    mockSceneElements = [...dsaElements];
    mockAppState.selectedElementIds = { cell_A_1: true };

    render(
      <WhiteboardCanvas
        mode="teacher"
        initialElements={dsaElements}
        onCellDoubleClick={handleCellDoubleClick}
      />
    );

    const wrapper = screen.getByTestId("whiteboard-wrapper");
    fireEvent.doubleClick(wrapper);

    expect(handleCellDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({
        arrayId: "A",
        index: 1,
        initialValue: "20",
      })
    );
  });
});
