export interface DSAArray {
  id: string;
  name: string;
  elements: (number | string | null)[];
  position: { x: number; y: number };
  cellWidth?: number;
  cellHeight?: number;
}

export interface DSAPointer {
  id: string;
  name: string;
  targetArrayId: string;
  index: number;
  color?: string;
}

export interface DSAVariable {
  id: string;
  name: string;
  value: number | string | boolean | null;
  color?: string;
}

export interface DSAActiveComparison {
  arrayId?: string;
  indexA: number;
  indexB?: number;
  operator?: string;
  result?: boolean;
}

export interface DSAHighlight {
  arrayId: string;
  index: number;
  color: string;
}

export interface DSANarration {
  title: string;
  text?: string;
}

export interface DSAState {
  arrays: DSAArray[];
  pointers: DSAPointer[];
  variables: DSAVariable[];
  activeComparison?: DSAActiveComparison | null;
  highlights?: DSAHighlight[];
  narration?: DSANarration | null;
}

export type AlgorithmStepAction =
  | { type: "move_pointer"; pointerId: string; toIndex: number }
  | {
      type: "compare";
      arrayId?: string;
      indexA: number;
      indexB?: number;
      operator?: string;
      result?: boolean;
    }
  | { type: "swap"; arrayId: string; indexA: number; indexB: number }
  | { type: "write_cell"; arrayId: string; index: number; value: number | string | null }
  | {
      type: "set_variable";
      variableId: string;
      value: number | string | boolean | null;
      name?: string;
      color?: string;
    }
  | { type: "highlight"; targets: DSAHighlight[] }
  | { type: "clear_highlights" };

export interface AlgorithmCode {
  language: string;
  content: string;
}

export interface StepCodeContext {
  line: number;
  highlightLines?: number[];
  explanation?: string;
}

export interface AlgorithmStep {
  stepIndex: number;
  title: string;
  explanation: string;
  actions: AlgorithmStepAction[];
  codeContext?: StepCodeContext;
}

export interface ExecutionTrace {
  initialState: DSAState;
  steps: AlgorithmStep[];
  code?: AlgorithmCode;
}

export interface ComputedSnapshot {
  stepIndex: number;
  title: string;
  explanation: string;
  state: DSAState;
  codeContext?: StepCodeContext;
}

