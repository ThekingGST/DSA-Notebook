import { DSAState, AlgorithmStepAction } from "./types";

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
