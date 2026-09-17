import { useState, useCallback } from "react";
import { DSAArray, DSAPointer, DSAVariable, DSAState } from "../engine/types";

export interface TeacherState {
  arrays: DSAArray[];
  pointers: DSAPointer[];
  variables: DSAVariable[];
}

const defaultInitialTeacherState: TeacherState = {
  arrays: [
    {
      id: "A",
      name: "nums",
      elements: [10, 25, 7, 42, 18],
      position: { x: 140, y: 320 },
      cellWidth: 70,
      cellHeight: 56,
    },
  ],
  pointers: [
    { id: "ptr_i", name: "i", targetArrayId: "A", index: 0, color: "#a78bfa" },
  ],
  variables: [],
};

export function useTeacherMode(initialState?: Partial<TeacherState>) {
  const [state, setState] = useState<TeacherState>(() => ({
    arrays: initialState?.arrays ?? defaultInitialTeacherState.arrays,
    pointers: initialState?.pointers ?? defaultInitialTeacherState.pointers,
    variables: initialState?.variables ?? defaultInitialTeacherState.variables,
  }));

  const [activePointerId, setActivePointerId] = useState<string | null>(
    () => (initialState?.pointers ?? defaultInitialTeacherState.pointers)[0]?.id ?? null
  );

  const addArray = useCallback(
    (
      name: string,
      elements: (number | string)[],
      position?: { x: number; y: number }
    ) => {
      setState((prev) => {
        let finalPos = position;
        if (!finalPos) {
          if (prev.arrays.length === 0) {
            finalPos = { x: 140, y: 320 };
          } else {
            const maxY = Math.max(
              ...prev.arrays.map((a) => a.position.y + (a.cellHeight || 56) + 60)
            );
            finalPos = { x: 140, y: maxY + 40 };
          }
        }
        const id = `arr_${Date.now()}`;
        const newArray: DSAArray = {
          id,
          name: name || `arr_${prev.arrays.length + 1}`,
          elements: elements.length > 0 ? elements : [0],
          position: finalPos,
          cellWidth: 70,
          cellHeight: 56,
        };
        return {
          ...prev,
          arrays: [...prev.arrays, newArray],
        };
      });
    },
    []
  );

  const updateArrayPosition = useCallback(
    (arrayId: string, position: { x: number; y: number }) => {
      setState((prev) => ({
        ...prev,
        arrays: prev.arrays.map((arr) =>
          arr.id === arrayId ? { ...arr, position } : arr
        ),
      }));
    },
    []
  );

  const updateCellValue = useCallback(
    (arrayId: string, index: number, value: number | string) => {
      setState((prev) => ({
        ...prev,
        arrays: prev.arrays.map((arr) => {
          if (arr.id !== arrayId) return arr;
          const nextElements = [...arr.elements];
          if (index >= 0 && index < nextElements.length) {
            nextElements[index] = value;
          }
          return { ...arr, elements: nextElements };
        }),
      }));
    },
    []
  );

  const appendCell = useCallback(
    (arrayId: string, value?: number | string, atIndex?: number) => {
      setState((prev) => ({
        ...prev,
        arrays: prev.arrays.map((arr) => {
          if (arr.id !== arrayId) return arr;
          const lastVal = arr.elements[arr.elements.length - 1];
          let nextVal = value;
          if (nextVal === undefined) {
            nextVal = typeof lastVal === "number" ? lastVal + 1 : 0;
          }
          const nextElements = [...arr.elements];
          if (atIndex !== undefined && atIndex >= 0 && atIndex < nextElements.length) {
            nextElements.splice(atIndex + 1, 0, nextVal);
          } else {
            nextElements.push(nextVal);
          }
          return {
            ...arr,
            elements: nextElements,
          };
        }),
      }));
    },
    []
  );

  const removeCell = useCallback(
    (arrayId: string, atIndex?: number) => {
      setState((prev) => {
        const targetArr = prev.arrays.find((a) => a.id === arrayId);
        if (!targetArr || targetArr.elements.length <= 1) return prev;

        const nextElements = [...targetArr.elements];
        if (atIndex !== undefined && atIndex >= 0 && atIndex < nextElements.length) {
          nextElements.splice(atIndex, 1);
        } else {
          nextElements.pop();
        }

        const nextArrays = prev.arrays.map((arr) => {
          if (arr.id !== arrayId) return arr;
          return {
            ...arr,
            elements: nextElements,
          };
        });

        // Clamp any pointers that were pointing past new length
        const nextPointers = prev.pointers.map((p) => {
          if (p.targetArrayId !== arrayId) return p;
          return {
            ...p,
            index: Math.min(nextElements.length, Math.max(-1, p.index)),
          };
        });

        return {
          ...prev,
          arrays: nextArrays,
          pointers: nextPointers,
        };
      });
    },
    []
  );

  const addPointer = useCallback(
    (arrayId: string, name: string, index = 0, color = "#a78bfa") => {
      const id = `ptr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newPointer: DSAPointer = {
        id,
        name,
        targetArrayId: arrayId,
        index,
        color,
      };
      setState((prev) => ({
        ...prev,
        pointers: [...prev.pointers, newPointer],
      }));
      setActivePointerId(id);
    },
    []
  );

  const movePointer = useCallback(
    (pointerId: string, targetIndex: number) => {
      setState((prev) => {
        const ptr = prev.pointers.find((p) => p.id === pointerId);
        if (!ptr) return prev;
        const targetArr = prev.arrays.find((a) => a.id === ptr.targetArrayId);
        const maxIndex = targetArr ? targetArr.elements.length : 0;
        const clamped = Math.max(-1, Math.min(maxIndex, targetIndex));

        return {
          ...prev,
          pointers: prev.pointers.map((p) =>
            p.id === pointerId ? { ...p, index: clamped } : p
          ),
        };
      });
      setActivePointerId(pointerId);
    },
    []
  );

  const removePointer = useCallback((pointerId: string) => {
    setState((prev) => {
      const nextPointers = prev.pointers.filter((p) => p.id !== pointerId);
      return {
        ...prev,
        pointers: nextPointers,
      };
    });
    setActivePointerId((curr) => (curr === pointerId ? null : curr));
  }, []);

  const resetTeacherState = useCallback(
    (customState?: Partial<TeacherState>) => {
      setState({
        arrays: customState?.arrays ?? defaultInitialTeacherState.arrays,
        pointers: customState?.pointers ?? defaultInitialTeacherState.pointers,
        variables: customState?.variables ?? defaultInitialTeacherState.variables,
      });
    },
    []
  );

  // Computed DSAState suitable for compileDSAToExcalidraw
  const dsaState: DSAState = {
    arrays: state.arrays,
    pointers: state.pointers,
    variables: state.variables,
    activeComparison: null,
    highlights: [],
    narration: null,
  };

  return {
    state,
    dsaState,
    activePointerId,
    setActivePointerId,
    addArray,
    updateArrayPosition,
    updateCellValue,
    appendCell,
    removeCell,
    addPointer,
    movePointer,
    removePointer,
    resetTeacherState,
  };
}

