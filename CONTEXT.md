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

