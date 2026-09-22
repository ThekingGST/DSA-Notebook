import { ExecutionTrace } from "../engine/types";
import { ALGORITHM_PRESETS } from "./presets";
import { validateExecutionTrace } from "./traceSchema";
import { buildAlgorithmPrompt } from "./promptBuilder";

export interface LLMServiceOptions {
  fetcher?: (prompt: string, systemPrompt: string) => Promise<string>;
  apiKey?: string;
  model?: string;
}

export function getNvidiaApiKey(): string | undefined {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("dsa_nvidia_api_key");
    if (local && local.trim()) return local.trim();
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_NVIDIA_API_KEY) {
    return import.meta.env.VITE_NVIDIA_API_KEY.trim();
  }
  return undefined;
}

export function setNvidiaApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key.trim()) {
      localStorage.removeItem("dsa_nvidia_api_key");
    } else {
      localStorage.setItem("dsa_nvidia_api_key", key.trim());
    }
  }
}

export function getNvidiaModel(): string {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("dsa_nvidia_model");
    if (local && local.trim()) return local.trim();
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_NVIDIA_MODEL) {
    return import.meta.env.VITE_NVIDIA_MODEL.trim();
  }
  return "meta/llama-3.2-11b-vision-instruct";
}

export function setNvidiaModel(model: string): void {
  if (typeof window !== "undefined") {
    if (!model.trim()) {
      localStorage.removeItem("dsa_nvidia_model");
    } else {
      localStorage.setItem("dsa_nvidia_model", model.trim());
    }
  }
}

export function repairTruncatedJson(str: string): string {
  let s = str.trim();

  // Strip trailing commas before closing braces/brackets
  s = s.replace(/,\s*([}\]])/g, "$1");

  // If already valid JSON, return immediately
  try {
    JSON.parse(s);
    return s;
  } catch {
    // Continue with repair attempts
  }

  // Check if we have an unclosed steps array
  const stepsIndex = s.indexOf('"steps"');
  if (stepsIndex !== -1) {
    let idx = s.lastIndexOf("}");
    while (idx > stepsIndex) {
      const candidate = s.slice(0, idx + 1).replace(/,\s*$/, "");
      try {
        const testStr = candidate + "\n  ]\n}";
        JSON.parse(testStr);
        return testStr;
      } catch {
        try {
          const testStr = candidate + "\n}";
          JSON.parse(testStr);
          return testStr;
        } catch {
          idx = s.lastIndexOf("}", idx - 1);
        }
      }
    }
  }

  return s;
}

export function sanitizeJsonExpressions(jsonStr: string): string {
  // Replace Math.max(a, b, ...) or Math.min(...) with evaluated number
  let s = jsonStr.replace(/Math\.(max|min)\(([^)]+)\)/g, (_match, func, args) => {
    try {
      const evaluatedArgs = args.split(",").map((arg: string) => {
        const trimmedArg = arg.trim();
        if (/^[\d\s+\-*/()]+$/.test(trimmedArg)) {
          return Function(`"use strict"; return (${trimmedArg})`)();
        }
        return parseFloat(trimmedArg);
      });
      const res = Math[func as "max" | "min"](...evaluatedArgs);
      return isNaN(res) ? "0" : String(res);
    } catch {
      return "0";
    }
  });

  // Replace unquoted arithmetic expressions in "value": 1 + 2 + 3,
  s = s.replace(/"value"\s*:\s*([0-9]+(?:\s*[\+\-\*\/]\s*[0-9]+)+)/g, (_match, expr) => {
    try {
      const trimmedExpr = expr.trim();
      if (/^[\d\s+\-*/()]+$/.test(trimmedExpr)) {
        const val = Function(`"use strict"; return (${trimmedExpr})`)();
        return `"value": ${val}`;
      }
    } catch {}
    return _match;
  });

  return s;
}

export function cleanJsonOutput(raw: string): string {
  let trimmed = raw.trim();

  // Strip <think>...</think> blocks if present from reasoning models
  trimmed = trimmed.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  let candidateJson = trimmed;

  // Handle markdown code-fenced JSON responses (prefer valid JSON blocks if reasoning text has fences)
  const fenceMatches = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g));
  if (fenceMatches.length > 0) {
    for (let i = fenceMatches.length - 1; i >= 0; i--) {
      const candidate = fenceMatches[i][1].trim();
      if (candidate.startsWith("{") && candidate.endsWith("}")) {
        candidateJson = candidate;
        break;
      }
    }
    if (candidateJson === trimmed) {
      candidateJson = fenceMatches[fenceMatches.length - 1][1].trim();
    }
  } else {
    // Handle cases where model adds introductory prose before or after raw JSON
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidateJson = trimmed.slice(firstBrace, lastBrace + 1);
    } else if (firstBrace !== -1) {
      candidateJson = trimmed.slice(firstBrace);
    }
  }

  // Pre-sanitize any raw mathematical expressions before repair and JSON parsing
  const sanitized = sanitizeJsonExpressions(candidateJson);
  return repairTruncatedJson(sanitized);
}

export async function queryLLMTrace(
  query: string,
  options: LLMServiceOptions = {}
): Promise<ExecutionTrace> {
  const normalized = query.trim().toLowerCase();

  // Match preset chips instantly without network latency
  for (const preset of Object.values(ALGORITHM_PRESETS)) {
    if (
      normalized === preset.label.toLowerCase() ||
      normalized === preset.prompt.toLowerCase()
    ) {
      return preset.trace;
    }
  }

  const { systemPrompt, userPrompt } = buildAlgorithmPrompt(query);

  let rawResponse: string;

  if (options.fetcher) {
    rawResponse = await options.fetcher(userPrompt, systemPrompt);
  } else {
    const apiKey = options.apiKey || getNvidiaApiKey();

    if (apiKey) {
      // Live NVIDIA NIM API call
      const isTestEnv =
        (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
        (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test");

      const endpoint =
        !isTestEnv &&
        typeof window !== "undefined" &&
        window.location.hostname === "localhost"
          ? "/api/nvidia/chat/completions"
          : "https://integrate.api.nvidia.com/v1/chat/completions";

      const model = options.model || getNvidiaModel();

      let res: Response;
      const controller = new AbortController();
      const timeoutMs = 120000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: model.includes("nemotron") ? 6144 : 4096,
          }),
          signal: controller.signal,
        });
      } catch (networkErr: unknown) {
        if (
          (networkErr instanceof DOMException && networkErr.name === "AbortError") ||
          (networkErr instanceof Error && networkErr.name === "AbortError")
        ) {
          throw new Error(
            `Request timed out after 2 minutes. The NVIDIA API server is experiencing high latency. Please retry your request.`
          );
        }
        throw new Error(
          `Network connection failed when connecting to NVIDIA API. Please check your internet connection.`
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        let errorDetail = "";
        try {
          const errorJson = await res.json();
          errorDetail =
            errorJson?.message ||
            errorJson?.error?.message ||
            JSON.stringify(errorJson);
        } catch {
          errorDetail = await res.text();
        }
        throw new Error(
          `NVIDIA API error (${res.status}): ${errorDetail || res.statusText}. Please verify your API key.`
        );
      }

      const data = await res.json();
      rawResponse = data?.choices?.[0]?.message?.content || "";
    } else {
      // Offline fallback simulation: brief non-blocking delay and select closest preset
      await new Promise((res) => setTimeout(res, 600));

      if (normalized.includes("binary")) return ALGORITHM_PRESETS.binarySearch.trace;
      if (normalized.includes("two pointer") || normalized.includes("reverse"))
        return ALGORITHM_PRESETS.twoPointers.trace;
      if (normalized.includes("scan") || normalized.includes("max"))
        return ALGORITHM_PRESETS.linearScan.trace;

      // Default fallback to second largest canonical trace
      return ALGORITHM_PRESETS.secondLargest.trace;
    }
  }

  const cleaned = cleanJsonOutput(rawResponse);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: unknown) {
    throw new Error(
      `Failed to parse LLM response as JSON. Please retry your prompt. (Raw output was not valid JSON)`
    );
  }

  const validation = validateExecutionTrace(parsed);
  if (!validation.success) {
    throw new Error(
      `Trace validation error: ${validation.error}. Please retry your prompt.`
    );
  }

  return validation.data;
}
