import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { compileDSAToExcalidraw } from "../compiler/compileDSAToExcalidraw";

vi.mock("@excalidraw/excalidraw", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Excalidraw: ({ initialData }: any) => (
    <div data-testid="mock-excalidraw-canvas">
      Excalidraw Mock ({initialData?.elements?.length || 0} elements)
    </div>
  ),
}));

describe("WhiteboardCanvas component", () => {
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
  });
});
