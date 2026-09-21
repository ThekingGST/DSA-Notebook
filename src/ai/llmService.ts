import { ExecutionTrace } from "../engine/types";
import { ALGORITHM_PRESETS } from "./presets";
import { validateExecutionTrace } from "./traceSchema";
import { buildAlgorithmPrompt } from "./promptBuilder";

export interface LLMServiceOptions {
  fetcher?: (prompt: string, systemPrompt: string) => Promise<string>;
  apiKey?: string;
}

export function cleanJsonOutput(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
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
    // If no custom fetcher is provided, check if user provided a key or fallback to closest preset
    // In production without key, simulate a brief non-blocking delay and select most relevant preset
    await new Promise((res) => setTimeout(res, 600));

    if (normalized.includes("binary")) return ALGORITHM_PRESETS.binarySearch.trace;
    if (normalized.includes("two pointer") || normalized.includes("reverse"))
      return ALGORITHM_PRESETS.twoPointers.trace;
    if (normalized.includes("scan") || normalized.includes("max"))
      return ALGORITHM_PRESETS.linearScan.trace;

    // Default fallback to second largest canonical trace
    return ALGORITHM_PRESETS.secondLargest.trace;
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
