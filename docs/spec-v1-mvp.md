# Specification: DSA Notebook V1 MVP (Dual-Mode Interactive Whiteboard for 1D Arrays)

> GitHub Issue: [#8](https://github.com/ThekingGST/DSA-Notebook/issues/8) (labeled `ready-for-agent`)

## Problem Statement

Students learning Data Structures & Algorithms struggle to build intuition because traditional visualizers are passive, rigid, and disconnected from the learning process. They present pre-baked animations where learners simply sit and watch slides rather than actively reasoning about state. If a student has a question midway through an algorithm—such as *"Why did pointer j move instead of i?"* or *"What if this number was 50?"*—static visualizers cannot respond from the active whiteboard state. 

At the same time, computer science instructors teaching in classrooms are forced to switch awkwardly between drawing on dumb digital whiteboards (Excalidraw, Miro) and running code in a terminal. They cannot easily drag, step, or manipulate state-aware algorithmic objects on a whiteboard without manually redrawing every cell, pointer, and variable label by hand.

## Solution

**DSA Notebook V1 MVP** is an interactive, digital whiteboard environment built directly on `@excalidraw/excalidraw` that treats the whiteboard itself as a stateful, programmable algorithmic playground.

It provides a unified whiteboard canvas with two complementary modes:

1. **Student Mode**: An AI Tutor acts as a whiteboard operator. A student asks a natural language question (e.g. *"Explain finding the second largest element in [10, 25, 7, 42, 18]"*). The AI generates a deterministic `Execution Trace`. The whiteboard immediately renders the array, pointers, and variables using hand-drawn aesthetics, and allows the student to scrub through discrete `Algorithm Steps` with smooth gliding transitions. The student can pause at any step and ask contextual follow-up questions from the exact canvas state rendered on screen.
2. **Teacher Mode**: An instructor uses the whiteboard during live lectures with full manual control over stateful DSA objects. Through a dedicated DSA Toolbox, teachers can drop 1D arrays onto the canvas, edit cell values in-place with double-clicks, resize arrays, and smoothly drag pointers along array cells with snap-to-cell-center behavior, while retaining standard Excalidraw freehand pen, shape, and text tools.

## User Stories

### Student Mode — Core Algorithm Tutoring
1. As a student, I want to type an algorithm question into a floating prompt bar, so that I can see the algorithm explained visually on a whiteboard.
2. As a student, I want to click quick-start prompt presets (e.g. "Binary Search", "Two Pointers", "Linear Scan"), so that I can explore canonical array algorithms with one click without typing.
3. As a student, I want to see a clear loading indicator while the AI generates the algorithm trace, so that I know my request is being processed.
4. As a student, I want the algorithm to be rendered as an interactive 1D array with hand-drawn Rough.js styling, so that the experience feels like an authentic whiteboard lesson.
5. As a student, I want to see clearly labeled pointers (e.g. `i`, `left`, `right`) positioned above array cells, so that I can track algorithm indexes and loop counters visually.
6. As a student, I want to see scalar algorithm variables (e.g. `largest = 25`, `target = 9`) displayed in an algorithm HUD, so that I can monitor auxiliary state changes.
7. As a student, I want to read a plain-English explanation of each step rendered directly on the whiteboard canvas with collision avoidance, so that I understand why the algorithm took that specific action.

### Student Mode — Step Scrubbing & Navigation
8. As a student, I want a streamlined playback control dock with `Step K / N`, `Previous`, `Play/Pause`, `Next`, and `Reset` buttons, so that I can control the pace of the visual explanation.
9. As a student, I want to use `ArrowLeft` and `ArrowRight` keyboard shortcuts, so that I can quickly step back and forth through algorithmic transitions.
10. As a student, I want to use the `Spacebar` to toggle auto-play, so that I can watch the algorithm step forward hands-free.
11. As a student, I want pointers to glide smoothly (~300ms transition) between cells during playback, so that I can visually follow pointer movements along the array.
12. As a student, I want pointer transitions to snap instantly when I step rapidly with arrow keys, so that rapid navigation feels snappy and without animation backlog lag.
13. As a student, I want comparisons between elements to be visually highlighted (e.g. glowing border and boolean status), so that I can see conditions being evaluated in real time.
14. As a student, I want mutated or swapped array cells to flash green, so that data writes are visually obvious.
15. As a student, I want to click `Reset` at any time, so that the canvas returns immediately to Step 0.

### Student Mode — Follow-Up Interaction & What-If Branching
16. As a student, I want to pause playback at any step and ask a follow-up question via the prompt bar, so that I can clarify things I don't understand about the current state.
17. As a student, I want the AI to answer my question grounded in the active array values and pointer positions on screen, so that the explanation doesn't restart from the beginning.
18. As a student, I want to ask counterfactual "what-if" questions (e.g. *"What if this value was 50?"*), so that I can see how changing input alters the outcome.
19. As a student, I want a one-click *"Load modified algorithm on canvas"* action for what-if scenarios, so that I can immediately watch the branched execution trace on the whiteboard.
20. As a student, I want to expand or dock the question bubble into a sidebar, so that I can review a chronological history of my questions and answers alongside the canvas.

### Teacher Mode — Manual Object Creation & Manipulation
21. As an instructor, I want to toggle between Student Mode and Teacher Mode via a top-bar switch, so that I can switch teaching postures on the exact same whiteboard canvas.
22. As an instructor, I want a dedicated DSA Toolbox visible in Teacher Mode, so that I can quickly access DSA-specific creation tools.
23. As an instructor, I want to click `+ Array` to open a popover where I can choose preset values or enter comma-separated numbers, so that I can place an array on the canvas instantly.
24. As an instructor, I want to double-click any array cell on the canvas to edit its value in place, so that I can alter numbers dynamically during a lecture.
25. As an instructor, I want to click `[+]` or `[−]` buttons on the end-cap of an array, so that I can dynamically append or pop cells.
26. As an instructor, I want to click `+ Pointer` to create a named pointer (`i`, `left`, `mid`) attached to an array, so that I can illustrate traversal manually.
27. As an instructor, I want to drag a pointer along an array and have it snap cleanly to cell centers upon release, so that pointers never sit awkwardly between cells.
28. As an instructor, I want to drag an array across the whiteboard and have all its cells, values, index labels, and attached pointers move together as one atomic unit, so that I can rearrange my whiteboard freely without breaking layout.
29. As an instructor, I want to use Excalidraw's freehand pen, shapes, arrows, and eraser alongside DSA objects, so that I can circle cells, write formulas, and sketch explanations freely.
30. As an instructor, I want native undo/redo (`Ctrl+Z` / `Ctrl+Y`) and PNG/SVG export to work seamlessly with all DSA objects on the canvas, so that I can export diagrams for my students after class.

## Implementation Decisions

### 1. Three-Tier Decoupled Architecture
The system is divided into three strictly decoupled layers, as established in [ADR-0001](adr/0001-excalidraw-canvas-foundation.md) and [ADR-0002](adr/0002-two-stage-algorithm-execution.md):
- **Visual Canvas Layer**: Powered by `@excalidraw/excalidraw`. Renders freehand drawings and native Excalidraw element groups for DSA objects.
- **Headless DSA State Engine**: The single source of truth. Manages array data, pointer logical indices, variable registries, and transitions. Completely decoupled from the DOM and Excalidraw.
- **AI Tutor / Operator**: Translates natural language into declarative algorithm execution traces and answers follow-up inquiries.

### 2. State Model & Hybrid Snapshot Strategy ([ADR-0003](adr/0003-dsa-state-engine-schema.md))
- The AI emits an `ExecutionTrace` consisting of initial state and an array of `AlgorithmStep` deltas containing typed actions:
  - `move_pointer`: `{ type: 'move_pointer', pointerId, toIndex }`
  - `compare`: `{ type: 'compare', comparison: { left, operator, right, result } }`
  - `swap`: `{ type: 'swap', arrayId, indexA, indexB }`
  - `write_cell`: `{ type: 'write_cell', arrayId, index, value }`
  - `set_variable`: `{ type: 'set_variable', variableId, value }`
  - `highlight`: `{ type: 'highlight', targets: [{ arrayId, index, color }] }`
- **Precomputed Snapshots**: On loading an `ExecutionTrace`, the client engine runs a pure deterministic reducer once to precompute immutable `ComputedSnapshot`s (`[state_0, ..., state_N]`).
- **Pointers**: Store logical target bindings `{ targetArrayId, index }` supporting boundary indices (`-1`, `length`). Co-located pointers on the same cell automatically receive vertical offset ranks.

```typescript
// Core State Contract (produced by prototype spike)
interface DSAArray {
  id: string;
  name: string;
  elements: (number | string)[];
  position: { x: number; y: number };
  cellWidth?: number;
  cellHeight?: number;
}

interface DSAPointer {
  id: string;
  name: string;
  targetArrayId: string;
  index: number;
  color?: string;
}

interface AlgorithmStep {
  stepIndex: number;
  title: string;
  explanation: string;
  actions: AlgorithmStepAction[];
}
```

### 3. Excalidraw Custom Element Group Integration ([ADR-0007](adr/0007-excalidraw-custom-dsa-elements.md))
- DSA Objects are compiled directly into native `ExcalidrawElement[]` groups rather than an external HTML/SVG overlay.
- Each array cell is a native rectangle (`roughness: 1.2`), paired with centered value text and sub-cell index text, all sharing a single `groupId: group_<arrayId>`.
- Tagged with `customData: { dsaType: 'cell' | 'pointer' | 'variable', arrayId, index }` for state correlation.
- Validated in `prototype/excalidraw-dsa-integration.html` to eliminate viewport zoom/pan lag, support native group drag, and enable native export and undo/redo.

### 4. AI Step Protocol & Validation ([ADR-0004](adr/0004-ai-step-generation-protocol.md))
- Single-batch JSON generation delivering the complete `ExecutionTrace` atomically.
- Client-side Zod schema validation checks:
  - All referenced IDs exist.
  - Pointers and cell writes adhere to array bounds `[-1, length]`.
  - Action types and payloads conform to the typed action union.
- In case of validation failure, execution halts cleanly at the last valid state with a retry option.

### 5. Follow-Up Context Serialization & Unified Prompt Bubble ([ADR-0005](adr/0005-follow-up-question-protocol.md))
- When asking follow-ups at step $K$, the client packages:
  - Active `ComputedSnapshot` at step $K$.
  - Summary of the last 2–3 causal steps.
  - Active student question.
- Both initial queries and follow-up threads flow through a single bottom floating prompt bubble that can be expanded or docked into a sidebar.
- "What-if" counterfactual questions return text explanations plus a one-click action to load a new branched `ExecutionTrace`.

### 6. Step Scrubbing Controls & Canvas Narration ([ADR-0006](adr/0006-step-scrubbing-and-canvas-narration-ux.md))
- Focused playback dock containing `Step K / N`, `Reset`, `Previous`, `Play/Pause`, and `Next`, positioned without colliding with the bottom prompt bubble.
- Step explanations are rendered as native Excalidraw text elements on the canvas, dynamically cleared above the array to prevent overlapping existing drawings.
- Pointer transitions glide smoothly (~300ms) during play and snap instantly during rapid stepping.
- Keyboard navigation supported via `ArrowLeft`, `ArrowRight`, and `Spacebar`.

### 7. Teacher Mode Interaction Model ([ADR-0008](adr/0008-teacher-mode-interaction-model.md))
- Single-canvas mode switching via a top-bar toggle `[ 🎓 Student Mode | 👨‍🏫 Teacher Mode ]`.
- In Teacher Mode, the DSA Toolbox provides quick popovers to configure and place 1D arrays.
- Pointers support smooth freehand drag with clean cell-center snapping on release.
- Array cells support in-place double-click editing and end-cap `[+]` / `[−]` resize buttons.

## Testing Decisions

### What Makes a Good Test
Tests must exercise observable external behavior across clean architectural seams, not implementation details or private internal functions. Tests should verify that given an input trace or user action, the resulting state snapshots and compiled Excalidraw elements maintain invariants and accurate spatial relationships.

### The Three Testing Seams

1. **Seam 1: Headless State & Projection Seam (Unit / Integration)**
   - **Target**: `DSA State Engine` and `Excalidraw Element Compiler`.
   - **Characteristics**: 100% pure TypeScript, zero DOM / browser dependencies.
   - **Test Scenarios**:
     - Reducer correctly transitions states across `move_pointer`, `compare`, `swap`, `write_cell`, and `set_variable`.
     - Time-travel scrubbing (`stepTo`, `stepForward`, `stepBackward`, `reset`) returns exact deterministic snapshots.
     - Boundary index handling (`index = -1` and `index = length`) behaves without exceptions.
     - Multiple co-located pointers receive distinct vertical offset ranks.
     - `compileDSAToExcalidraw` produces valid `ExcalidrawElement[]` with matching `groupIds`, correct bounding boxes, and collision-free narration text offsets.

2. **Seam 2: AI Step Protocol & Schema Validation Seam (Integration)**
   - **Target**: Prompt generator, Zod validator, and serialization layer.
   - **Characteristics**: Exercised using mocked LLM responses.
   - **Test Scenarios**:
     - Valid JSON traces parse successfully and load into the state engine.
     - Hallucinated / malformed payloads (out-of-bounds indices, missing target IDs, unknown action types) are rejected with descriptive validation errors.
     - Follow-up context serialization at step $K$ bundles the exact active snapshot and recent step history.

3. **Seam 3: Interactive Whiteboard UI Seam (E2E / Browser)**
   - **Target**: Full React application with Excalidraw canvas, player dock, and prompt bubble.
   - **Characteristics**: Evaluated in browser environment.
   - **Test Scenarios**:
     - Switching between Student Mode and Teacher Mode toggles toolbars without losing canvas drawings.
     - Entering a prompt generates the array, steps through with arrow keys, and pauses correctly.
     - In Teacher Mode, inserting an array and double-clicking a cell updates the value and re-renders the element.

## Out of Scope (Deferred to Future Versions)

The following capabilities are deliberately ruled out of the V1 MVP scope:
- Multi-dimensional arrays, Linked Lists, Stacks, Queues, Trees, and Graphs (focused strictly on 1D Arrays, Pointers, and Variables in V1).
- Freehand sketch-to-array gesture recognition and slash `/` command palettes.
- Real-time multiplayer collaboration (CRDTs/Yjs) and shared classroom sockets.
- Audio and voice-synthesized AI tutoring.
- Bi-directional code-on-canvas synchronization (monaco editor sidecar).
- Server-side multi-language code sandbox execution runtime.
- Student grading, testing, or quiz assessment platform.

## Further Notes

- **Prototype Reference**: The working prototype spike is preserved at `prototype/excalidraw-dsa-integration.html`.
- **Glossary Authority**: All terms follow [CONTEXT.md](../CONTEXT.md).
- **Architecture Integrity**: Implementation of this spec must strictly preserve the separation between the headless state engine and Excalidraw canvas rendering.
