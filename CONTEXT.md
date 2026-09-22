# DSA Notebook

An interactive, AI-powered whiteboard environment for learning, teaching, and visually reasoning about Data Structures & Algorithms through live state manipulation.

## Language

**DSA Object**:
A state-aware canvas element (such as an Array, Pointer, or Variable) that encapsulates structural identity, algorithmic data, and visual coordinates.
_Avoid_: Shape, widget, canvas element, vector graphic

**DSA State Engine**:
The headless, declarative runtime that holds the source-of-truth algorithm state, executes transitions, and emits change events to the canvas.
_Avoid_: Visualizer, animation runner, canvas controller

**Canvas Layer**:
The interactive whiteboard surface that renders freeform whiteboard strokes, annotations, and visual representations of DSA Objects.
_Avoid_: Board, drawing pane, Excalidraw view

**Student Mode**:
The interaction mode where a conversational AI Tutor interprets user questions, translates them into algorithm steps, and dynamically drives the canvas.
_Avoid_: Learn mode, chat mode, tutor mode

**Teacher Mode**:
The interaction mode where a human instructor manually creates, inspects, and directly manipulates DSA Objects via a dedicated sidebar toolbox.
_Avoid_: Edit mode, manual mode, presenter mode

**Algorithm Step**:
A discrete, deterministic transition in algorithm state representing a single logical operation (e.g. pointer advance, comparison, value assignment).
_Avoid_: Animation frame, tick, slide

**Execution Trace**:
A serialized, deterministic sequence containing the initial DSA state and an ordered array of Algorithm Steps.
_Avoid_: Run log, history dump, replay file

**Computed Snapshot**:
A precomputed, immutable point-in-time state of all arrays, pointers, variables, and active highlights at a specific step index.
_Avoid_: Frame, state cache, canvas dump

**Auxiliary Array**:
A secondary stateful DSA array (such as a prefix sum array, temporary merge buffer, or frequency bucket) declared alongside the primary input array to visually represent $O(N)$ auxiliary memory.
_Avoid_: Temp array, helper buffer, extra list

**Multi-Array Stacking**:
The deterministic, client-side vertical layout calculation that positions multiple arrays on the canvas layer with calculated vertical offsets, guaranteeing collision-free rendering of cells, pointers, and index labels.
_Avoid_: Manual positioning, coordinate guessing

**Array Archetype**:
A foundational algorithmic classification (e.g. Single-Pass Scanner, Two-Pointer Convergence, Sliding Window, Dual-Array Coordination, In-Place Partitioning, 2D Grid Traversal) that dictates the minimal necessary visual scaffolding (arrays, pointers, variables) for explaining an algorithm.
_Avoid_: Algorithm category, problem template

**Code Inspector**:
A dedicated, collapsible docking surface rendered alongside the Canvas Layer that displays syntax-highlighted algorithm source code with synchronized line-execution markers.
_Avoid_: Code editor, IDE window, script pane

**Code Context**:
The declarative metadata attached to an Algorithm Step specifying the active 1-indexed source code line and optional block range currently being evaluated.
_Avoid_: Line pointer, program counter, debug tag

**Synchronized Playback**:
The bidirectional interaction model that links whiteboard state scrubbing with active Code Inspector line highlights and click-to-seek navigation.
_Avoid_: Coordinated playback, code tracking


