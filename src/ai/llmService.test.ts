import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ALGORITHM_PRESETS } from "./presets";
import {
  queryLLMTrace,
  getNvidiaApiKey,
  setNvidiaApiKey,
  getNvidiaModel,
  cleanJsonOutput,
  repairTruncatedJson,
  queryAntigravityTrace,
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
    const origEnvKey = import.meta.env.VITE_NVIDIA_API_KEY;
    try {
      // Temporarily clear env key to test pure localStorage isolation
      delete (import.meta.env as Record<string, unknown>).VITE_NVIDIA_API_KEY;
      expect(getNvidiaApiKey()).toBeUndefined();
      setNvidiaApiKey("nvapi-my-saved-key");
      expect(getNvidiaApiKey()).toBe("nvapi-my-saved-key");
      expect(getNvidiaModel()).toBe("meta/llama-3.2-11b-vision-instruct");
      setNvidiaApiKey("");
      expect(getNvidiaApiKey()).toBeUndefined();
    } finally {
      if (origEnvKey !== undefined) {
        (import.meta.env as Record<string, unknown>).VITE_NVIDIA_API_KEY = origEnvKey;
      }
    }
  });

  it("repairs truncated JSON responses when token limit cuts off mid-step", () => {
    const step1 = ALGORITHM_PRESETS.linearScan.trace.steps[0];
    const step2 = ALGORITHM_PRESETS.linearScan.trace.steps[1];
    const truncated = `{"initialState": ${JSON.stringify(ALGORITHM_PRESETS.linearScan.trace.initialState)}, "steps": [${JSON.stringify(step1)}, ${JSON.stringify(step2)}, {"stepIndex": 3, "title": "Incomplete", "actions": [{"type": "move_`;

    const cleaned = cleanJsonOutput(truncated);
    const parsed = JSON.parse(cleaned);

    expect(parsed.initialState).toBeDefined();
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.steps[0].stepIndex).toBe(step1.stepIndex);
    expect(parsed.steps[1].stepIndex).toBe(step2.stepIndex);
  });

  it("removes trailing commas before closing braces", () => {
    const jsonWithTrailingCommas = '{\n  "name": "test",\n  "values": [1, 2, ],\n}';
    const repaired = repairTruncatedJson(jsonWithTrailingCommas);
    expect(() => JSON.parse(repaired)).not.toThrow();
  });

  it("sanitizes unquoted arithmetic expressions and Math functions into valid JSON numbers", () => {
    const rawWithMath = `{\n  "step": 1,\n  "actions": [\n    {\n      "type": "set_variable",\n      "variableId": "v_windowSum",\n      "value": 2 + 1 + 5,\n      "name": "windowSum"\n    },\n    {\n      "type": "set_variable",\n      "variableId": "v_maxSum",\n      "value": Math.max(8, 7),\n      "name": "maxSum"\n    }\n  ]\n}`;
    const cleaned = cleanJsonOutput(rawWithMath);
    const parsed = JSON.parse(cleaned);
    expect(parsed.actions[0].value).toBe(8);
    expect(parsed.actions[1].value).toBe(8);
  });

  it("auto-heals off-by-one pointer index overshoot without failing validation", async () => {
    const traceWithOffByOne = JSON.parse(
      JSON.stringify(ALGORITHM_PRESETS.twoPointers.trace)
    );
    // Array length is 6, valid pointer range is [-1, 6]. Set toIndex: 7 (off-by-one overshoot)
    traceWithOffByOne.steps[0].actions.push({
      type: "move_pointer",
      pointerId: "p_right",
      toIndex: 7,
    });

    const mockFetcher = vi.fn().mockResolvedValue(JSON.stringify(traceWithOffByOne));

    const result = await queryLLMTrace("Two pointer reverse", {
      fetcher: mockFetcher,
    });

    expect(result).toBeDefined();
    const moveAction = result.steps[0].actions.find(
      (a) => a.type === "move_pointer" && (a as any).toIndex === 6
    );
    expect(moveAction).toBeDefined();
  });

  it("recovers via multi-turn self-correction feedback loop when first attempt fails validation", async () => {
    const invalidTrace = JSON.parse(
      JSON.stringify(ALGORITHM_PRESETS.linearScan.trace)
    );
    // Break pointer reference to cause validation failure
    invalidTrace.steps[0].actions[0] = {
      type: "move_pointer",
      pointerId: "nonexistent_pointer",
      toIndex: 1,
    };

    const validTrace = ALGORITHM_PRESETS.linearScan.trace;

    // First call returns invalidTrace, second call returns validTrace
    const mockFetcher = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(invalidTrace))
      .mockResolvedValueOnce(JSON.stringify(validTrace));

    const result = await queryLLMTrace("Linear scan prompt", {
      fetcher: mockFetcher,
      maxAttempts: 2,
    });

    expect(mockFetcher).toHaveBeenCalledTimes(2);
    expect(result.initialState.arrays[0].name).toBe("nums");
    // Verify the second call prompt contained the validation error feedback
    const secondCallPrompt = mockFetcher.mock.calls[1][0];
    expect(secondCallPrompt).toContain("VALIDATION ERROR");
  });

  it("calls /api/antigravity/generate and returns parsed trace on success", async () => {
    const mockTrace = ALGORITHM_PRESETS.twoPointers.trace;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, trace: mockTrace }),
    } as Response);

    const trace = await queryAntigravityTrace("Reverse array with two pointers");
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/antigravity/generate", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ query: "Reverse array with two pointers" }),
    }));
    expect(trace.initialState.arrays[0].name).toBe("arr");
  });

  it("throws clear error when /api/antigravity/generate returns failure status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Antigravity CLI execution timed out" }),
    } as Response);

    await expect(queryAntigravityTrace("Crash test")).rejects.toThrow(
      /Antigravity CLI execution timed out/
    );
  });
});

