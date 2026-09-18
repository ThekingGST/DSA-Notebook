# Ticket 6: Teacher Mode Array Creation & Element Manipulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the manual authoring tools and interactions for Teacher Mode, including the DSA Toolbox (`+ Array`, `+ Pointer`), array end-cap cell mutators (`[+]` and `[−]`), in-place cell double-click value editing, pointer dragging with clean cell snapping on release, and preserving Excalidraw freehand drawings alongside DSA objects.

**Architecture:** 
- A specialized state hook `useTeacherMode` manages the teacher's mutable DSA structures (arrays, pointers) with actions for insertion, cell appending/popping, cell editing, and pointer snapping.
- The `TeacherToolbox` renders a floating dark glassmorphic dock offering array presets, custom comma-separated array insertion, and named pointer attachment.
- The canvas layer in `WhiteboardCanvas` hosts floating array end-cap buttons (`[+]`/`[−]`), an in-place double-click cell value editor, pointer drag-release cell snapping, and retains all non-DSA user drawings (freehand strokes, shapes, text).
- `App.tsx` seamlessly switches between Student Mode (playback dock & narration) and Teacher Mode (DSA Toolbox & authoring controls).

**Tech Stack:** React 18, TypeScript, Excalidraw 0.18.0, Vitest, Testing Library.

**Spec:** Issue #14: Ticket 6: Teacher Mode Array Creation & Element Manipulation

## Global Constraints
- Target workspace: `.worktrees/ticket-6-teacher-mode-manipulation` on branch `ticket-6-teacher-mode-manipulation`.
- Dark theme styling: glassmorphic docks (`#18181b` / `#121214`), purple accent `#8b5cf6`, green `#34d399`, amber `#fbbf24`.
- Excalidraw integration: preserve non-DSA elements across scene updates (`!el.customData?.dsaType`).
- TDD required: write failing tests first, make them pass, and verify baseline integrity before commits.

---

### Task 1: Teacher Mode State Hook (`useTeacherMode.ts`)

**Files:**
- Create: `src/hooks/useTeacherMode.ts`
- Test: `src/hooks/useTeacherMode.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TeacherState {
    arrays: DSAArray[];
    pointers: DSAPointer[];
    variables: DSAVariable[];
  }

  export function useTeacherMode(initialState?: Partial<TeacherState>): {
    state: TeacherState;
    addArray: (name: string, elements: (number | string)[], position?: { x: number; y: number }) => void;
    updateCellValue: (arrayId: string, index: number, value: number | string) => void;
    appendCell: (arrayId: string, value?: number | string) => void;
    removeCell: (arrayId: string) => void;
    addPointer: (arrayId: string, name: string, index?: number, color?: string) => void;
    movePointer: (pointerId: string, targetIndex: number) => void;
    removePointer: (pointerId: string) => void;
    resetTeacherState: (customState?: Partial<TeacherState>) => void;
  }
  ```

- [ ] **Step 1: Write failing tests for `useTeacherMode`**
  - Test initial state with default array.
  - Test `addArray` adding a new 1D array.
  - Test `updateCellValue` modifying specific cell.
  - Test `appendCell` and `removeCell` modifying array length.
  - Test `addPointer` and `movePointer` updating pointer target index.

- [ ] **Step 2: Run tests to verify they fail**
  - Run `npx vitest run src/hooks/useTeacherMode.test.ts` -> Verify failure.

- [ ] **Step 3: Implement `useTeacherMode`**
  - Implement hook with clean immutable updates.

- [ ] **Step 4: Run tests to verify they pass**
  - Run `npx vitest run src/hooks/useTeacherMode.test.ts` -> Verify passing.

- [ ] **Step 5: Commit**
  - `git add src/hooks/useTeacherMode.ts src/hooks/useTeacherMode.test.ts`
  - `git commit -m "feat(teacher): implement useTeacherMode state hook"`

---

### Task 2: Floating DSA Toolbox Component (`TeacherToolbox.tsx`)

**Files:**
- Create: `src/components/TeacherToolbox.tsx`
- Create: `src/components/TeacherToolbox.css`
- Test: `src/components/TeacherToolbox.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export interface TeacherToolboxProps {
    arrays: DSAArray[];
    onAddArray: (name: string, elements: (number | string)[]) => void;
    onAddPointer: (arrayId: string, name: string, color?: string) => void;
    onReset?: () => void;
  }
  export const TeacherToolbox: React.FC<TeacherToolboxProps>;
  ```

- [ ] **Step 1: Write failing tests for `TeacherToolbox`**
  - Verify rendering `+ Array` and `+ Pointer` buttons.
  - Test clicking `+ Array` opens popover with preset options and custom comma-separated inputs.
  - Test selecting preset triggers `onAddArray` with parsed numbers.
  - Test custom input parsing `10, 20, 30` triggers `onAddArray`.
  - Test clicking `+ Pointer` opens pointer selector and triggers `onAddPointer`.

- [ ] **Step 2: Run tests to verify they fail**
  - Run `npx vitest run src/components/TeacherToolbox.test.tsx` -> Verify failure.

- [ ] **Step 3: Implement `TeacherToolbox` and `TeacherToolbox.css`**
  - Create styled dock positioned at bottom center or top sub-bar.
  - Implement preset pills: `[10, 25, 7, 42, 18]`, `[1, 2, 3, 4, 5]`, `[5, 4, 3, 2, 1]`, `[0, 0, 0, 0]`.
  - Implement custom comma-separated text input with instant validation.
  - Implement pointer picker with preset labels (`i`, `j`, `left`, `right`, `mid`, `max`) and color accents.

- [ ] **Step 4: Run tests to verify they pass**
  - Run `npx vitest run src/components/TeacherToolbox.test.tsx` -> Verify passing.

- [ ] **Step 5: Commit**
  - `git add src/components/TeacherToolbox.tsx src/components/TeacherToolbox.css src/components/TeacherToolbox.test.tsx`
  - `git commit -m "feat(teacher): implement TeacherToolbox with presets and pointer picker"`

---

### Task 3: Array End-Caps Cell Append/Remove Controls (`ArrayEndControls.tsx`)

**Files:**
- Create: `src/components/ArrayEndControls.tsx`
- Create: `src/components/ArrayEndControls.css`
- Test: `src/components/ArrayEndControls.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export interface ArrayEndControlsProps {
    arrays: DSAArray[];
    onAppendCell: (arrayId: string) => void;
    onRemoveCell: (arrayId: string) => void;
  }
  export const ArrayEndControls: React.FC<ArrayEndControlsProps>;
  ```

- [ ] **Step 1: Write failing tests for `ArrayEndControls`**
  - Verify rendering `[+]` and `[−]` buttons positioned relative to array bounds.
  - Clicking `[+]` calls `onAppendCell(arrayId)`.
  - Clicking `[−]` calls `onRemoveCell(arrayId)`.
  - When array has length <= 1, `[−]` is disabled.

- [ ] **Step 2: Run tests to verify they fail**
  - Run `npx vitest run src/components/ArrayEndControls.test.tsx` -> Verify failure.

- [ ] **Step 3: Implement `ArrayEndControls`**
  - Compute rightmost pixel coordinate of array (`arr.position.x + arr.elements.length * arr.cellWidth`).
  - Render compact glassmorphic `+` and `−` badge buttons at the right end of the array.

- [ ] **Step 4: Run tests to verify they pass**
  - Run `npx vitest run src/components/ArrayEndControls.test.tsx` -> Verify passing.

- [ ] **Step 5: Commit**
  - `git add src/components/ArrayEndControls.tsx src/components/ArrayEndControls.css src/components/ArrayEndControls.test.tsx`
  - `git commit -m "feat(teacher): implement ArrayEndControls for cell append and remove"`

---

### Task 4: In-Place Cell Double-Click Editing (`CellInlineEditor.tsx`)

**Files:**
- Create: `src/components/CellInlineEditor.tsx`
- Create: `src/components/CellInlineEditor.css`
- Test: `src/components/CellInlineEditor.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export interface ActiveCellEdit {
    arrayId: string;
    index: number;
    initialValue: number | string;
    screenX: number;
    screenY: number;
    width: number;
    height: number;
  }
  export interface CellInlineEditorProps {
    activeEdit: ActiveCellEdit | null;
    onCommit: (arrayId: string, index: number, value: number | string) => void;
    onCancel: () => void;
  }
  export const CellInlineEditor: React.FC<CellInlineEditorProps>;
  ```

- [ ] **Step 1: Write failing tests for `CellInlineEditor`**
  - Test renders input with initial value at specified screen coordinates.
  - Test submitting new value with `Enter` calls `onCommit`.
  - Test pressing `Escape` calls `onCancel`.
  - Test clicking outside / blur calls `onCommit`.

- [ ] **Step 2: Run tests to verify they fail**
  - Run `npx vitest run src/components/CellInlineEditor.test.tsx` -> Verify failure.

- [ ] **Step 3: Implement `CellInlineEditor`**
  - Auto-focuses and selects text on mount.
  - Handles Enter, Escape, and onBlur cleanly.

- [ ] **Step 4: Run tests to verify they pass**
  - Run `npx vitest run src/components/CellInlineEditor.test.tsx` -> Verify passing.

- [ ] **Step 5: Commit**
  - `git add src/components/CellInlineEditor.tsx src/components/CellInlineEditor.css src/components/CellInlineEditor.test.tsx`
  - `git commit -m "feat(teacher): implement CellInlineEditor for in-place cell editing"`

---

### Task 5: Pointer Drag Snapping & Non-DSA Drawing Preservation in `WhiteboardCanvas.tsx`

**Files:**
- Modify: `src/components/WhiteboardCanvas.tsx`
- Test: `src/components/WhiteboardCanvas.test.tsx`

**Interfaces:**
- Enhances `WhiteboardCanvasProps`:
  ```tsx
  interface WhiteboardCanvasProps {
    mode: WorkspaceMode;
    initialElements?: ExcalidrawCompiledElement[];
    isRapidStepping?: boolean;
    arrays?: DSAArray[];
    onCellDoubleClick?: (edit: ActiveCellEdit) => void;
    onPointerSnap?: (pointerId: string, targetIndex: number) => void;
  }
  ```

- [ ] **Step 1: Write failing tests in `WhiteboardCanvas.test.tsx`**
  - Test that existing non-DSA elements (e.g. drawn shapes/freehand) are preserved when scene updates.
  - Test double-clicking cell triggers `onCellDoubleClick` with cell coordinates.
  - Test dragging pointer snaps to closest cell index on pointer up.

- [ ] **Step 2: Run tests to verify they fail**
  - Run `npx vitest run src/components/WhiteboardCanvas.test.tsx` -> Verify failure.

- [ ] **Step 3: Implement non-DSA preservation & snapping in `WhiteboardCanvas.tsx`**
  - When committing scene, preserve non-DSA elements from `excalidrawAPI.getSceneElements()`.
  - Hook canvas double-click event to identify clicked cell/valueText element and invoke `onCellDoubleClick`.
  - Handle Excalidraw `onChange` / pointer-up to detect pointer repositioning and snap to nearest cell center index.

- [ ] **Step 4: Run tests to verify they pass**
  - Run `npx vitest run src/components/WhiteboardCanvas.test.tsx` -> Verify passing.

- [ ] **Step 5: Commit**
  - `git add src/components/WhiteboardCanvas.tsx src/components/WhiteboardCanvas.test.tsx`
  - `git commit -m "feat(canvas): support non-DSA element preservation and pointer snapping"`

---

### Task 6: App Integration, Mode Switching & End-to-End Verification

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write failing tests in `App.test.tsx`**
  - Toggling to Teacher Mode renders `TeacherToolbox` and hides `PlaybackDock`.
  - Adding an array via `TeacherToolbox` renders new array on canvas.
  - Appending/removing cell via end-caps updates state.
  - Toggling back to Student Mode restores `PlaybackDock`.

- [ ] **Step 2: Run tests to verify they fail**
  - Run `npx vitest run src/App.test.tsx` -> Verify failure.

- [ ] **Step 3: Implement Teacher Mode in `App.tsx`**
  - Connect `useTeacherMode` for Teacher Mode and `useAlgorithmPlayback` for Student Mode.
  - Render `TeacherToolbox`, `ArrayEndControls`, and `CellInlineEditor` when `mode === "teacher"`.

- [ ] **Step 4: Run full test suite & production build**
  - Run `npm test` across all test files.
  - Run `npm run build`.

- [ ] **Step 5: Commit**
  - `git add src/App.tsx src/App.test.tsx`
  - `git commit -m "feat: complete Teacher Mode array creation and manipulation integration"`
