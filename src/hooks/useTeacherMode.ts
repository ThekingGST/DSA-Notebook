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

  const [activePointersByArray, setActivePointersByArray] = useState<Record<string, string>>(() => {
    const initialPointers = initialState?.pointers ?? defaultInitialTeacherState.pointers;
    const map: Record<string, string> = {};
    initialPointers.forEach((p) => {
      if (!map[p.targetArrayId]) {
        map[p.targetArrayId] = p.id;
      }
    });
    return map;
  });

  const setActivePointerForArray = useCallback((arrayId: string, pointerId: string) => {
    setActivePointerId(pointerId);
    setActivePointersByArray((prev) => ({
      ...prev,
      [arrayId]: pointerId,
    }));
  }, []);

  const addArray = useCallback(
    (
      name: string,
      elements: (number | string)[],
      position?: { x: number; y: number }
    ) => {
      const arrayId = `arr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const pointerId = `ptr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

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
        const newArray: DSAArray = {
          id: arrayId,
          name: name || `arr_${prev.arrays.length + 1}`,
          elements: elements.length > 0 ? elements : [0],
          position: finalPos,
          cellWidth: 70,
          cellHeight: 56,
        };

        const pointerNames = ["i", "j", "k", "left", "right", "mid"];
        const pointerColors = ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];
        const usedNames = new Set(prev.pointers.map((p) => p.name));
        const nextName =
          pointerNames.find((n) => !usedNames.has(n)) || `p${prev.pointers.length + 1}`;
        const nextColor = pointerColors[prev.pointers.length % pointerColors.length];

        const newPointer: DSAPointer = {
          id: pointerId,
          name: nextName,
          targetArrayId: arrayId,
          index: 0,
          color: nextColor,
        };

        return {
          ...prev,
          arrays: [...prev.arrays, newArray],
          pointers: [...prev.pointers, newPointer],
        };
      });

      setActivePointerId(pointerId);
      setActivePointersByArray((prev) => ({
        ...prev,
        [arrayId]: pointerId,
      }));
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
      setActivePointersByArray((prev) => ({
        ...prev,
        [arrayId]: id,
      }));
    },
    []
  );

  const movePointer = useCallback(
    (pointerId: string, targetIndex: number) => {
      let targetArrayId: string | undefined;
      setState((prev) => {
        const ptr = prev.pointers.find((p) => p.id === pointerId);
        if (!ptr) return prev;
        targetArrayId = ptr.targetArrayId;
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
      if (targetArrayId) {
        setActivePointersByArray((prev) => ({
          ...prev,
          [targetArrayId!]: pointerId,
        }));
      }
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
      const resetPointers = customState?.pointers ?? defaultInitialTeacherState.pointers;
      setState({
        arrays: customState?.arrays ?? defaultInitialTeacherState.arrays,
        pointers: resetPointers,
        variables: customState?.variables ?? defaultInitialTeacherState.variables,
      });
      setActivePointerId(
        resetPointers[0]?.id ?? null
      );
      const map: Record<string, string> = {};
      resetPointers.forEach((p) => {
        if (!map[p.targetArrayId]) {
          map[p.targetArrayId] = p.id;
        }
      });
      setActivePointersByArray(map);
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
    activePointersByArray,
    setActivePointerForArray,
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

