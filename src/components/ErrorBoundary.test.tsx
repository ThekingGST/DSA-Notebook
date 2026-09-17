import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test intentional crash");
  }
  return <div>Normal Content</div>;
};

describe("ErrorBoundary component", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("catches errors and renders fallback UI with reload button", () => {
    // Prevent console.error noise in test runner
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test intentional crash")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload application/i })).toBeInTheDocument();

    spy.mockRestore();
  });
});
