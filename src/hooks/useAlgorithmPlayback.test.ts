import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAlgorithmPlayback } from "./useAlgorithmPlayback";
import { ExecutionTrace } from "../engine/types";

describe("useAlgorithmPlayback hook", () => {
  const sampleTrace: ExecutionTrace = {
    initialState: {
      arrays: [
        {
          id: "A",
          name: "nums",
          elements: [10, 20, 30],
          position: { x: 100, y: 100 },
        },
      ],
      pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
      variables: [],
    },
    steps: [
      {
        stepIndex: 1,
        title: "Step 1",
        explanation: "Advance pointer",
        actions: [{ type: "move_pointer", pointerId: "p1", toIndex: 1 }],
      },
      {
        stepIndex: 2,
        title: "Step 2",
        explanation: "Advance pointer to end",
        actions: [{ type: "move_pointer", pointerId: "p1", toIndex: 2 }],
      },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes at step 0 and steps forward and backward", () => {
    const { result } = renderHook(() => useAlgorithmPlayback(sampleTrace));

    expect(result.current.currentStep).toBe(0);
    expect(result.current.totalSteps).toBe(2);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.stepForward();
    });
    expect(result.current.currentStep).toBe(2);

    act(() => {
      result.current.stepBackward();
    });
    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.reset();
    });
    expect(result.current.currentStep).toBe(0);
  });

  it("auto-plays through steps and pauses at the end", () => {
    const { result } = renderHook(() =>
      useAlgorithmPlayback(sampleTrace, { stepIntervalMs: 1000 })
    );

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentStep).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentStep).toBe(2);
    expect(result.current.isPlaying).toBe(false); // Pauses when finished
  });

  it("supports stepTo and detects rapid stepping", () => {
    const { result } = renderHook(() => useAlgorithmPlayback(sampleTrace));

    act(() => {
      result.current.stepTo(2);
    });
    expect(result.current.currentStep).toBe(2);

    // Rapid stepping trigger (< 250ms between steps)
    act(() => {
      result.current.stepBackward();
    });
    act(() => {
      // Step again immediately (< 250ms)
      result.current.stepBackward();
    });
    expect(result.current.isRapidStepping).toBe(true);

    // Advance beyond rapid reset timer (300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.isRapidStepping).toBe(false);
  });
});
