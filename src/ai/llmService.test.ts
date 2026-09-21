import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ALGORITHM_PRESETS } from "./presets";
import {
  queryLLMTrace,
  getNvidiaApiKey,
  setNvidiaApiKey,
  getNvidiaModel,
} from "./llmService";
import { validateExecutionTrace } from "./traceSchema";

describe("Seam 2: AI Step Protocol & LLM Service Integration", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("all 4 presets pass strict schema validation", () => {
    const presetKeys = Object.keys(ALGORITHM_PRESETS);
    expect(presetKeys).toEqual([
      "binarySearch",
      "twoPointers",
      "linearScan",
      "secondLargest",
    ]);

    for (const key of presetKeys) {
      const preset = ALGORITHM_PRESETS[key as keyof typeof ALGORITHM_PRESETS];
      expect(preset.label).toBeTruthy();
      expect(preset.prompt).toBeTruthy();
      const validation = validateExecutionTrace(preset.trace);
      expect(
        validation.success,
        `Preset ${key} failed validation: ${
          !validation.success && validation.error
        }`
      ).toBe(true);
    }
  });

  it("resolves canonical trace instantly when query matches preset", async () => {
    const trace = await queryLLMTrace("Binary Search");
    expect(trace.initialState.arrays[0].name).toBe("nums");
    expect(trace.steps.length).toBeGreaterThan(0);
  });

  it("parses valid JSON response from custom fetcher", async () => {
    const mockTrace = ALGORITHM_PRESETS.secondLargest.trace;
    const mockFetcher = vi.fn().mockResolvedValue(JSON.stringify(mockTrace));

    const trace = await queryLLMTrace("Custom prompt", {
      fetcher: mockFetcher,
    });
    expect(mockFetcher).toHaveBeenCalled();
    expect(trace.initialState.arrays[0].name).toBe(
      mockTrace.initialState.arrays[0].name
    );
  });

  it("handles markdown code-fenced JSON responses cleanly", async () => {
    const mockTrace = ALGORITHM_PRESETS.secondLargest.trace;
    const fencedResponse = "```json\n" + JSON.stringify(mockTrace) + "\n```";
    const mockFetcher = vi.fn().mockResolvedValue(fencedResponse);

    const trace = await queryLLMTrace("Custom prompt", {
      fetcher: mockFetcher,
    });
    expect(trace.steps).toHaveLength(mockTrace.steps.length);
  });

  it("rejects malformed non-JSON responses with clear retry message", async () => {
    const mockFetcher = vi
      .fn()
      .mockResolvedValue("Sorry, I cannot generate that algorithm right now.");

    await expect(
      queryLLMTrace("Bad response", { fetcher: mockFetcher })
    ).rejects.toThrow(/Failed to parse LLM response/i);
  });

  it("rejects hallucinated out-of-bounds indices with schema error retry message", async () => {
    const invalidTrace = JSON.parse(
      JSON.stringify(ALGORITHM_PRESETS.binarySearch.trace)
    );
    invalidTrace.steps[0].actions = [
      { type: "move_pointer", pointerId: "p_mid", toIndex: 999 }, // out of bounds
    ];
    const mockFetcher = vi.fn().mockResolvedValue(JSON.stringify(invalidTrace));

    await expect(
      queryLLMTrace("Hallucinated trace", { fetcher: mockFetcher })
    ).rejects.toThrow(/out of bounds/i);
  });

  it("handles network failure cleanly", async () => {
    const mockFetcher = vi
      .fn()
      .mockRejectedValue(new Error("Network connection lost"));

    await expect(
      queryLLMTrace("Network error", { fetcher: mockFetcher })
    ).rejects.toThrow(/Network connection lost/i);
  });

  it("queries live NVIDIA API format when apiKey is provided", async () => {
    const mockTrace = ALGORITHM_PRESETS.linearScan.trace;
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify(mockTrace),
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const trace = await queryLLMTrace("Find max in custom array", {
      apiKey: "nvapi-test-key-12345",
    });

    expect(globalThis.fetch).toHaveBeenCalled();
    const [callUrl, callOptions] = (globalThis.fetch as any).mock.calls[0];
    expect(callUrl).toContain("chat/completions");
    expect(callOptions.headers["Authorization"]).toBe(
      "Bearer nvapi-test-key-12345"
    );
    expect(trace.initialState.arrays[0].name).toBe("nums");
  });

  it("handles NVIDIA API error responses (e.g. 401 Unauthorized)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Invalid API key provided." }),
    } as Response);

    await expect(
      queryLLMTrace("Find max in custom array", {
        apiKey: "nvapi-invalid-key",
      })
    ).rejects.toThrow(/NVIDIA API error \(401\)/i);
  });

  it("manages localStorage API key and default model", () => {
    expect(getNvidiaApiKey()).toBeUndefined();
    setNvidiaApiKey("nvapi-my-saved-key");
    expect(getNvidiaApiKey()).toBe("nvapi-my-saved-key");
    expect(getNvidiaModel()).toBe("meta/llama-3.3-70b-instruct");
    setNvidiaApiKey("");
    expect(getNvidiaApiKey()).toBeUndefined();
  });
});
