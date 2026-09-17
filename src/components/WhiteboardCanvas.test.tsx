import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WhiteboardCanvas } from "./WhiteboardCanvas";

// Mock @excalidraw/excalidraw since it requires full Canvas/WebGL APIs in JSDOM
vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw-canvas">Excalidraw Canvas Mock</div>,
}));

describe("WhiteboardCanvas component", () => {
  it("renders the canvas container with Excalidraw child", () => {
    render(<WhiteboardCanvas mode="student" />);
    expect(screen.getByTestId("whiteboard-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("mock-excalidraw-canvas")).toBeInTheDocument();
  });
});
