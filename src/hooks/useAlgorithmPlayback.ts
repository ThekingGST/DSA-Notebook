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
  const engineRef = useRef<DSAStateEngine>(
    (() => {
      const engine = new DSAStateEngine(trace);
      if (initialStep > 0) {
        engine.stepTo(initialStep);
      }
      return engine;
    })()
  );

  // Re-initialize engine if trace reference changes
  useEffect(() => {
    engineRef.current.loadTrace(trace);
    if (initialStep > 0) {
      engineRef.current.stepTo(initialStep);
      setCurrentStep(engineRef.current.getCurrentStepIndex());
    }
  }, [trace, initialStep]);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRapidStepping, setIsRapidStepping] = useState(false);
  const lastStepTimeRef = useRef<number>(0);
  const rapidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const totalSteps = useMemo(() => engineRef.current.getTotalSteps(), [trace]);

  const currentSnapshot: ComputedSnapshot = useMemo(() => {
    return engineRef.current.getCurrentSnapshot();
  }, [currentStep, trace]);

  const currentState: DSAState = currentSnapshot.state;

  const stepTo = useCallback((index: number) => {
    markSteppingEvent();
    engineRef.current.stepTo(index);
    setCurrentStep(engineRef.current.getCurrentStepIndex());
  }, [markSteppingEvent]);

  const stepForward = useCallback(() => {
    markSteppingEvent();
    engineRef.current.stepForward();
    setCurrentStep(engineRef.current.getCurrentStepIndex());
  }, [markSteppingEvent]);

  const stepBackward = useCallback(() => {
    markSteppingEvent();
    engineRef.current.stepBackward();
    setCurrentStep(engineRef.current.getCurrentStepIndex());
  }, [markSteppingEvent]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    engineRef.current.reset();
    setCurrentStep(0);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      // If at end, reset to 0 before starting play
      if (!prev && engineRef.current.getCurrentStepIndex() >= engineRef.current.getTotalSteps()) {
        engineRef.current.reset();
        setCurrentStep(0);
      }
      return !prev;
    });
  }, []);

  // Auto-play interval timer
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (engineRef.current.canStepForward()) {
        engineRef.current.stepForward();
        setCurrentStep(engineRef.current.getCurrentStepIndex());
        if (!engineRef.current.canStepForward()) {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
      }
    }, stepIntervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, stepIntervalMs]);

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
