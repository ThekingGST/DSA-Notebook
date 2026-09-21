import { SYSTEM_PROMPT } from "./systemPrompt";
import { ComputedSnapshot, AlgorithmStep } from "../engine/types";

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

export function buildAlgorithmPrompt(userQuery: string): PromptPayload {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Generate a complete ExecutionTrace for the following algorithm request:\n"${userQuery}"`,
  };
}

export function serializeFollowUpContext(
  snapshot: ComputedSnapshot,
  recentSteps: AlgorithmStep[] = []
): string {
  const { stepIndex, title, explanation, state } = snapshot;

  const arraysSummary = state.arrays
    .map((arr) => `${arr.name} (id: ${arr.id}): [${arr.elements.join(", ")}]`)
    .join("\n");

  const pointersSummary = state.pointers
    .map((ptr) => `${ptr.name}: index ${ptr.index} on array ${ptr.targetArrayId}`)
    .join(", ");

  const variablesSummary = state.variables
    .map((v) => `${v.name} = ${v.value}`)
    .join(", ");

  const recentStepsSummary = recentSteps
    .map((s) => `- Step ${s.stepIndex}: ${s.title} (${s.explanation})`)
    .join("\n");

  return [
    `Active Step: ${stepIndex}`,
    `Title: ${title}`,
    `Explanation: ${explanation}`,
    `Arrays:\n${arraysSummary}`,
    `Pointers: ${pointersSummary || "none"}`,
    `Variables: ${variablesSummary || "none"}`,
    recentStepsSummary ? `Recent Step History:\n${recentStepsSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
