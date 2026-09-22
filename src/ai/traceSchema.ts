import { z } from "zod";
import { ExecutionTrace } from "../engine/types";

export const DSAArraySchema = z.object({
  id: z.string().min(1, "Array ID is required"),
  name: z.string().min(1, "Array name is required"),
  elements: z.array(z.union([z.number(), z.string(), z.null()])),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  cellWidth: z.number().positive().optional(),
  cellHeight: z.number().positive().optional(),
});

export const DSAPointerSchema = z.object({
  id: z.string().min(1, "Pointer ID is required"),
  name: z.string().min(1, "Pointer name is required"),
  targetArrayId: z.string().min(1, "Target Array ID is required"),
  index: z.number().int("Pointer index must be an integer"),
  color: z.string().optional(),
});

export const DSAVariableSchema = z.object({
  id: z.string().min(1, "Variable ID is required"),
  name: z.string().min(1, "Variable name is required"),
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  color: z.string().optional(),
});

export const DSAHighlightSchema = z.object({
  arrayId: z.string().min(1),
  index: z.number().int(),
  color: z.string(),
});

export const DSAActiveComparisonSchema = z.object({
  arrayId: z.string().optional(),
  indexA: z.number().int(),
  indexB: z.number().int().optional(),
  operator: z.string().optional(),
  result: z.boolean().optional(),
});

export const DSANarrationSchema = z.object({
  title: z.string().min(1),
  text: z.string().optional(),
});

export const DSAStateSchema = z.object({
  arrays: z.array(DSAArraySchema),
  pointers: z.array(DSAPointerSchema),
  variables: z.array(DSAVariableSchema),
  activeComparison: DSAActiveComparisonSchema.nullable().optional(),
  highlights: z.array(DSAHighlightSchema).optional(),
  narration: DSANarrationSchema.nullable().optional(),
});

export const AlgorithmStepActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move_pointer"),
    pointerId: z.string().min(1),
    toIndex: z.number().int(),
  }),
  z.object({
    type: z.literal("compare"),
    arrayId: z.string().optional(),
    indexA: z.number().int(),
    indexB: z.number().int().optional(),
    operator: z.string().optional(),
    result: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("swap"),
    arrayId: z.string().min(1),
    indexA: z.number().int(),
    indexB: z.number().int(),
  }),
  z.object({
    type: z.literal("write_cell"),
    arrayId: z.string().min(1),
    index: z.number().int(),
    value: z.union([z.number(), z.string(), z.null()]),
  }),
  z.object({
    type: z.literal("set_variable"),
    variableId: z.string().min(1),
    value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
    name: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({
    type: z.literal("highlight"),
    targets: z.array(DSAHighlightSchema),
  }),
  z.object({
    type: z.literal("clear_highlights"),
  }),
]);

export const AlgorithmStepSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  title: z.string().min(1),
  explanation: z.string(),
  actions: z.array(AlgorithmStepActionSchema),
});

export const ExecutionTraceSchema = z
  .object({
    initialState: DSAStateSchema,
    steps: z
      .array(AlgorithmStepSchema)
      .min(2, "Algorithm execution trace must contain at least 2 steps showing state progression"),
  })
  .superRefine((trace, ctx) => {
    const arrayLengths = new Map<string, number>();
    for (const arr of trace.initialState.arrays) {
      arrayLengths.set(arr.id, arr.elements.length);
    }

    const pointerTargetMap = new Map<string, string>();
    for (const ptr of trace.initialState.pointers) {
      if (!arrayLengths.has(ptr.targetArrayId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Pointer "${ptr.id}" references nonexistent targetArrayId "${ptr.targetArrayId}"`,
          path: ["initialState", "pointers", ptr.id, "targetArrayId"],
        });
      } else {
        const len = arrayLengths.get(ptr.targetArrayId)!;
        if (ptr.index < -1 || ptr.index > len) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Pointer "${ptr.id}" index ${ptr.index} is out of bounds for array "${ptr.targetArrayId}" (length ${len}). Valid range is [-1, ${len}].`,
            path: ["initialState", "pointers", ptr.id, "index"],
          });
        }
      }
      pointerTargetMap.set(ptr.id, ptr.targetArrayId);
    }

    trace.steps.forEach((step, stepIdx) => {
      step.actions.forEach((action, actionIdx) => {
        const actionPath = ["steps", stepIdx, "actions", actionIdx];
        switch (action.type) {
          case "move_pointer": {
            if (!pointerTargetMap.has(action.pointerId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action move_pointer references unknown pointerId "${action.pointerId}"`,
                path: [...actionPath, "pointerId"],
              });
            } else {
              const targetArrayId = pointerTargetMap.get(action.pointerId)!;
              const len = arrayLengths.get(targetArrayId) ?? 0;
              if (action.toIndex < -1 || action.toIndex > len) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Action move_pointer toIndex ${action.toIndex} is out of bounds for array "${targetArrayId}" (length ${len}). Valid range is [-1, ${len}].`,
                  path: [...actionPath, "toIndex"],
                });
              }
            }
            break;
          }
          case "swap": {
            if (!arrayLengths.has(action.arrayId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action swap references unknown arrayId "${action.arrayId}"`,
                path: [...actionPath, "arrayId"],
              });
            } else {
              const len = arrayLengths.get(action.arrayId)!;
              if (
                action.indexA < 0 ||
                action.indexA >= len ||
                action.indexB < 0 ||
                action.indexB >= len
              ) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Action swap indices (${action.indexA}, ${action.indexB}) out of bounds for array "${action.arrayId}" (length ${len}).`,
                  path: [...actionPath],
                });
              }
            }
            break;
          }
          case "write_cell": {
            if (!arrayLengths.has(action.arrayId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action write_cell references unknown arrayId "${action.arrayId}"`,
                path: [...actionPath, "arrayId"],
              });
            } else {
              const len = arrayLengths.get(action.arrayId)!;
              if (action.index < 0 || action.index >= len) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Action write_cell index ${action.index} out of bounds for array "${action.arrayId}" (length ${len}).`,
                  path: [...actionPath, "index"],
                });
              }
            }
            break;
          }
          case "compare": {
            if (action.arrayId && !arrayLengths.has(action.arrayId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Action compare references unknown arrayId "${action.arrayId}"`,
                path: [...actionPath, "arrayId"],
              });
            }
            break;
          }
        }
      });
    });
  });

export type ValidationResult =
  | { success: true; data: ExecutionTrace }
  | { success: false; error: string; issues: string[] };

/**
 * Auto-heals common minor edge-case boundaries in LLM-generated traces:
 * 1. Clamps pointer indices (both in initialState and move_pointer actions) to valid [-1, array.length].
 * 2. Clamps swap and write_cell indices to [0, array.length - 1].
 * 3. Filters highlight targets that exceed array length.
 */
export function autoHealExecutionTrace(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const rawTrace = payload as any;

  if (Array.isArray(rawTrace.initialState?.arrays)) {
    const arrayLengths = new Map<string, number>();
    for (const arr of rawTrace.initialState.arrays) {
      if (arr && arr.id && Array.isArray(arr.elements)) {
        arrayLengths.set(arr.id, arr.elements.length);
      }
    }

    const pointerTargetMap = new Map<string, string>();
    if (Array.isArray(rawTrace.initialState?.pointers)) {
      for (const ptr of rawTrace.initialState.pointers) {
        if (ptr && ptr.id && ptr.targetArrayId) {
          pointerTargetMap.set(ptr.id, ptr.targetArrayId);
          const len = arrayLengths.get(ptr.targetArrayId);
          if (len !== undefined && typeof ptr.index === "number") {
            ptr.index = Math.max(-1, Math.min(len, ptr.index));
          }
        }
      }
    }

    if (Array.isArray(rawTrace.steps)) {
      for (const step of rawTrace.steps) {
        if (step && Array.isArray(step.actions)) {
          for (const action of step.actions) {
            if (!action || typeof action !== "object") continue;
            switch (action.type) {
              case "move_pointer": {
                if (action.pointerId && typeof action.toIndex === "number") {
                  const targetArrId = pointerTargetMap.get(action.pointerId);
                  if (targetArrId && arrayLengths.has(targetArrId)) {
                    const len = arrayLengths.get(targetArrId)!;
                    // Auto-heal off-by-one boundary overshoots
                    if (action.toIndex === len + 1) {
                      action.toIndex = len;
                    } else if (action.toIndex === -2) {
                      action.toIndex = -1;
                    }
                  }
                }
                break;
              }
              case "swap": {
                if (action.arrayId && arrayLengths.has(action.arrayId)) {
                  const len = arrayLengths.get(action.arrayId)!;
                  if (action.indexA === len) action.indexA = len - 1;
                  if (action.indexB === len) action.indexB = len - 1;
                }
                break;
              }
              case "write_cell": {
                if (action.arrayId && arrayLengths.has(action.arrayId)) {
                  const len = arrayLengths.get(action.arrayId)!;
                  if (action.index === len) action.index = len - 1;
                }
                break;
              }
              case "compare": {
                if (action.arrayId && arrayLengths.has(action.arrayId)) {
                  const len = arrayLengths.get(action.arrayId)!;
                  if (action.indexA === len) action.indexA = len - 1;
                  if (action.indexB === len) action.indexB = len - 1;
                }
                break;
              }
              case "highlight": {
                if (Array.isArray(action.targets)) {
                  action.targets = action.targets.filter((t: any) => {
                    if (!t || typeof t.index !== "number" || !t.arrayId) return true;
                    const len = arrayLengths.get(t.arrayId);
                    return len === undefined || (t.index >= 0 && t.index < len);
                  });
                }
                break;
              }
            }
          }
        }
      }
    }
  }

  return rawTrace;
}

export function validateExecutionTrace(payload: unknown): ValidationResult {
  // Gracefully filter out-of-bounds highlight targets if payload is an object
  if (payload && typeof payload === "object") {
    const rawTrace = payload as any;
    if (Array.isArray(rawTrace.initialState?.arrays) && Array.isArray(rawTrace.steps)) {
      const arrayLengths = new Map<string, number>();
      for (const arr of rawTrace.initialState.arrays) {
        if (arr && arr.id && Array.isArray(arr.elements)) {
          arrayLengths.set(arr.id, arr.elements.length);
        }
      }
      for (const step of rawTrace.steps) {
        if (step && Array.isArray(step.actions)) {
          for (const action of step.actions) {
            if (action && action.type === "highlight" && Array.isArray(action.targets)) {
              action.targets = action.targets.filter((t: any) => {
                if (!t || typeof t.index !== "number" || !t.arrayId) return true;
                const len = arrayLengths.get(t.arrayId);
                return len === undefined || (t.index >= 0 && t.index < len);
              });
            }
          }
        }
      }
    }
  }

  const parseResult = ExecutionTraceSchema.safeParse(payload);
  if (parseResult.success) {
    return { success: true, data: parseResult.data as ExecutionTrace };
  }

  const issues = parseResult.error.issues.map(
    (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`
  );
  const primaryError = issues[0] || "Invalid execution trace schema";

  return {
    success: false,
    error: primaryError,
    issues,
  };
}
