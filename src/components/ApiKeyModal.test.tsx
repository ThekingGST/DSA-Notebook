import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiKeyModal } from "./ApiKeyModal";
import { getNvidiaApiKey } from "../ai/llmService";

describe("ApiKeyModal component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders when isOpen is true and allows saving an API key", () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(<ApiKeyModal isOpen={true} onClose={onClose} onSaved={onSaved} />);

    expect(screen.getByText(/NVIDIA AI Configuration/i)).toBeInTheDocument();
    expect(screen.getByText("meta/llama-3.3-70b-instruct")).toBeInTheDocument();

    const input = screen.getByLabelText(/NVIDIA API Key/i);
    fireEvent.change(input, { target: { value: "nvapi-my-secret-key" } });

    const saveBtn = screen.getByRole("button", { name: /save key/i });
    fireEvent.click(saveBtn);

    expect(getNvidiaApiKey()).toBe("nvapi-my-secret-key");
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render when isOpen is false", () => {
    render(<ApiKeyModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByText(/NVIDIA AI Configuration/i)).not.toBeInTheDocument();
  });
});
