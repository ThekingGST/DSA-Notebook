import React, { useEffect } from "react";
import "./PlaybackDock.css";

interface PlaybackDockProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const PlaybackDock: React.FC<PlaybackDockProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  onStepChange,
  onTogglePlay,
  onReset,
}) => {
  const isFirstStep = currentStep <= 0;
  const isLastStep = currentStep >= totalSteps;

  const handlePrev = () => {
    if (!isFirstStep) onStepChange(currentStep - 1);
  };

  const handleNext = () => {
    if (!isLastStep) onStepChange(currentStep + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).isContentEditable);

      if (isInputFocused) return;

      if (e.key === "ArrowLeft" || e.key === "Left") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight" || e.key === "Right") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, totalSteps, isPlaying, onStepChange, onTogglePlay, onReset]);

  return (
    <div className="playback-dock" role="toolbar" aria-label="Step playback controls">
      <button
        type="button"
        className="dock-btn"
        onClick={onReset}
        disabled={isFirstStep}
        aria-label="Reset"
        title="Reset (R)"
      >
        ⏮
      </button>

      <button
        type="button"
        className="dock-btn"
        onClick={handlePrev}
        disabled={isFirstStep}
        aria-label="Previous step"
        title="Previous (Left Arrow)"
      >
        ◀
      </button>

      <button
        type="button"
        className={`dock-btn play-btn ${isPlaying ? "playing" : ""}`}
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      <button
        type="button"
        className="dock-btn"
        onClick={handleNext}
        disabled={isLastStep}
        aria-label="Next step"
        title="Next (Right Arrow)"
      >
        ▶
      </button>

      <div className="dock-divider" />

      <span className="dock-counter">
        Step <span className="counter-current">{currentStep}</span> / {totalSteps}
      </span>
    </div>
  );
};
