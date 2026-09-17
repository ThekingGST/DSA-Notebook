import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlaybackDock } from "./PlaybackDock";

describe("PlaybackDock component", () => {
  it("renders step counter and controls", () => {
    render(
      <PlaybackDock
        currentStep={1}
        totalSteps={4}
        isPlaying={false}
        onStepChange={vi.fn()}
        onTogglePlay={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(
      screen.getByText((_, element) => element?.textContent === "Step 1 / 4")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("disables previous and reset on step 0, and next on last step", () => {
    const { rerender } = render(
      <PlaybackDock
        currentStep={0}
        totalSteps={3}
        isPlaying={false}
        onStepChange={vi.fn()}
        onTogglePlay={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();

    rerender(
      <PlaybackDock
        currentStep={3}
        totalSteps={3}
        isPlaying={false}
        onStepChange={vi.fn()}
        onTogglePlay={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("responds to keyboard shortcuts (ArrowLeft, ArrowRight, Spacebar, R)", () => {
    const onStepChange = vi.fn();
    const onTogglePlay = vi.fn();
    const onReset = vi.fn();

    render(
      <PlaybackDock
        currentStep={1}
        totalSteps={4}
        isPlaying={false}
        onStepChange={onStepChange}
        onTogglePlay={onTogglePlay}
        onReset={onReset}
      />
    );

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onStepChange).toHaveBeenCalledWith(2);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onStepChange).toHaveBeenCalledWith(0);

    fireEvent.keyDown(window, { code: "Space" });
    expect(onTogglePlay).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "r" });
    expect(onReset).toHaveBeenCalled();
  });

  it("ignores keyboard shortcuts when an input element is focused", () => {
    const onStepChange = vi.fn();
    render(
      <div>
        <input data-testid="test-input" />
        <PlaybackDock
          currentStep={1}
          totalSteps={4}
          isPlaying={false}
          onStepChange={onStepChange}
          onTogglePlay={vi.fn()}
          onReset={vi.fn()}
        />
      </div>
    );

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onStepChange).not.toHaveBeenCalled();
  });
});
