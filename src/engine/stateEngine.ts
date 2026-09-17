import { DSAState, AlgorithmStepAction, ExecutionTrace, ComputedSnapshot } from "./types";

export function dsaReducer(state: DSAState, action: AlgorithmStepAction): DSAState {
  switch (action.type) {
    case "move_pointer": {
      const pointer = state.pointers.find((p) => p.id === action.pointerId);
      if (!pointer) return state;

      const targetArray = state.arrays.find((a) => a.id === pointer.targetArrayId);
      const maxLength = targetArray ? targetArray.elements.length : 0;
      const clampedIndex = Math.max(-1, Math.min(maxLength, action.toIndex));

      return {
        ...state,
        pointers: state.pointers.map((p) =>
          p.id === action.pointerId ? { ...p, index: clampedIndex } : p
        ),
      };
    }

    case "swap": {
      return {
        ...state,
        arrays: state.arrays.map((arr) => {
          if (arr.id !== action.arrayId) return arr;
          const nextElements = [...arr.elements];
          const temp = nextElements[action.indexA];
          nextElements[action.indexA] = nextElements[action.indexB];
          nextElements[action.indexB] = temp;
          return { ...arr, elements: nextElements };
        }),
      };
    }

    case "write_cell": {
      return {
        ...state,
        arrays: state.arrays.map((arr) => {
          if (arr.id !== action.arrayId) return arr;
          const nextElements = [...arr.elements];
          nextElements[action.index] = action.value;
          return { ...arr, elements: nextElements };
        }),
      };
    }

    case "set_variable": {
      const exists = state.variables.some((v) => v.id === action.variableId);
      if (exists) {
        return {
          ...state,
          variables: state.variables.map((v) =>
            v.id === action.variableId
              ? {
                  ...v,
                  value: action.value,
                  name: action.name ?? v.name,
                  color: action.color ?? v.color,
                }
              : v
          ),
        };
      }
      return {
        ...state,
        variables: [
          ...state.variables,
          {
            id: action.variableId,
            name: action.name || action.variableId,
            value: action.value,
            color: action.color,
          },
        ],
      };
    }

    case "compare": {
      return {
        ...state,
        activeComparison: {
          arrayId: action.arrayId,
          indexA: action.indexA,
          indexB: action.indexB,
          operator: action.operator,
          result: action.result,
        },
      };
    }

    case "highlight": {
      return {
        ...state,
        highlights: action.targets,
      };
    }

    case "clear_highlights": {
      return {
        ...state,
        activeComparison: null,
        highlights: [],
      };
    }

    default:
      return state;
  }
}

export function computeSnapshots(trace: ExecutionTrace): ComputedSnapshot[] {
  const snapshots: ComputedSnapshot[] = [];

  // Snapshot 0: Initial State
  snapshots.push({
    stepIndex: 0,
    title: "Initial State",
    explanation: "Algorithm loaded at initial state.",
    state: {
      ...trace.initialState,
      narration: { title: "Initial State", text: "Algorithm initialized." },
    },
  });

  let currentState = { ...trace.initialState };

  trace.steps.forEach((step) => {
    for (const action of step.actions) {
      currentState = dsaReducer(currentState, action);
    }
    currentState = {
      ...currentState,
      narration: {
        title: step.title,
        text: step.explanation,
      },
    };
    snapshots.push({
      stepIndex: step.stepIndex,
      title: step.title,
      explanation: step.explanation,
      state: currentState,
    });
  });

  return snapshots;
}

export class DSAStateEngine {
  private trace: ExecutionTrace;
  private snapshots: ComputedSnapshot[];
  private currentStepIndex: number;

  constructor(trace: ExecutionTrace) {
    this.trace = trace;
    this.snapshots = computeSnapshots(trace);
    this.currentStepIndex = 0;
  }

  public loadTrace(trace: ExecutionTrace): void {
    this.trace = trace;
    this.snapshots = computeSnapshots(trace);
    this.currentStepIndex = 0;
  }

  public getTrace(): ExecutionTrace {
    return this.trace;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public getTotalSteps(): number {
    return Math.max(0, this.snapshots.length - 1);
  }

  public getCurrentSnapshot(): ComputedSnapshot {
    return this.snapshots[this.currentStepIndex];
  }

  public getCurrentState(): DSAState {
    return this.getCurrentSnapshot().state;
  }

  public canStepForward(): boolean {
    return this.currentStepIndex < this.snapshots.length - 1;
  }

  public canStepBackward(): boolean {
    return this.currentStepIndex > 0;
  }

  public stepForward(): ComputedSnapshot {
    if (this.canStepForward()) {
      this.currentStepIndex++;
    }
    return this.getCurrentSnapshot();
  }

  public stepBackward(): ComputedSnapshot {
    if (this.canStepBackward()) {
      this.currentStepIndex--;
    }
    return this.getCurrentSnapshot();
  }

  public stepTo(stepIndex: number): ComputedSnapshot {
    const clamped = Math.max(0, Math.min(this.snapshots.length - 1, stepIndex));
    this.currentStepIndex = clamped;
    return this.getCurrentSnapshot();
  }

  public reset(): ComputedSnapshot {
    this.currentStepIndex = 0;
    return this.getCurrentSnapshot();
  }
}
