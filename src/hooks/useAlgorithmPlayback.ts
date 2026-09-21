import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ExecutionTrace, ComputedSnapshot, DSAState } from "../engine/types";
import { DSAStateEngine } from "../engine/stateEngine";

interface UseAlgorithmPlaybackOptions {
  stepIntervalMs?: number;
  initialStep?: number;
}

export function useAlgorithmPlayback(
  trace: ExecutionTrace,
  options: UseAlgorithmPlaybackOptions = {}
) {
  const { stepIntervalMs = 1000, initialStep = 0 } = options;

  const [engineState, setEngineState] = useState(() => {
    const engine = new DSAStateEngine(trace);
    if (initialStep > 0) {
      engine.stepTo(initialStep);
    }
    return { engine, trace };
  });

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRapidStepping, setIsRapidStepping] = useState(false);
  const lastStepTimeRef = useRef<number>(0);
  const rapidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronously update engine when trace reference changes
  if (engineState.trace !== trace) {
    const newEngine = new DSAStateEngine(trace);
    if (initialStep > 0) {
      newEngine.stepTo(initialStep);
    }
    setEngineState({ engine: newEngine, trace });
    setCurrentStep(newEngine.getCurrentStepIndex());
    setIsPlaying(false);
  }

  const engine = engineState.engine;

  const markSteppingEvent = useCallback(() => {
    const now = Date.now();
    const diff = now - lastStepTimeRef.current;
    lastStepTimeRef.current = now;

    if (diff < 250) {
      setIsRapidStepping(true);
      if (rapidTimerRef.current) clearTimeout(rapidTimerRef.current);
      rapidTimerRef.current = setTimeout(() => {
        setIsRapidStepping(false);
      }, 300);
    }
  }, []);

  const totalSteps = useMemo(() => engine.getTotalSteps(), [engine]);

  const currentSnapshot: ComputedSnapshot = useMemo(() => {
    return engine.getCurrentSnapshot();
  }, [engine, currentStep]);

  const currentState: DSAState = currentSnapshot.state;

  const stepTo = useCallback((index: number) => {
    markSteppingEvent();
    engine.stepTo(index);
    setCurrentStep(engine.getCurrentStepIndex());
  }, [engine, markSteppingEvent]);

  const stepForward = useCallback(() => {
    markSteppingEvent();
    engine.stepForward();
    setCurrentStep(engine.getCurrentStepIndex());
  }, [engine, markSteppingEvent]);

  const stepBackward = useCallback(() => {
    markSteppingEvent();
    engine.stepBackward();
    setCurrentStep(engine.getCurrentStepIndex());
  }, [engine, markSteppingEvent]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    engine.reset();
    setCurrentStep(0);
  }, [engine]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      // If at end, reset to 0 before starting play
      if (!prev && engine.getCurrentStepIndex() >= engine.getTotalSteps()) {
        engine.reset();
        setCurrentStep(0);
      }
      return !prev;
    });
  }, [engine]);

  // Auto-play interval timer
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (engine.canStepForward()) {
        engine.stepForward();
        setCurrentStep(engine.getCurrentStepIndex());
        if (!engine.canStepForward()) {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
      }
    }, stepIntervalMs);

    return () => clearInterval(timer);
  }, [engine, isPlaying, stepIntervalMs]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (rapidTimerRef.current) clearTimeout(rapidTimerRef.current);
    };
  }, []);

  return {
    currentStep,
    totalSteps,
    isPlaying,
    isRapidStepping,
    currentSnapshot,
    currentState,
    stepTo,
    stepForward,
    stepBackward,
    togglePlay,
    reset,
  };
}
