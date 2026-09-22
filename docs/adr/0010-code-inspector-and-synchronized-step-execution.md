# Code Inspector and Synchronized Step Execution

We chose a collapsible, docked Code Inspector side-panel with bidirectional step synchronization and single-pass Python-first code generation to visually link whiteboard animations with source code execution.

Instead of rendering static code blocks inside Excalidraw canvas shapes (which suffer from scaling and panning distortions and clutter the whiteboard) or forcing a persistent split-pane that restricts canvas space, we established:

1. **Collapsible Docked Code Inspector**: A dedicated 380px slide-out drawer on the right edge toggled via a top header `[💻 Code]` button. This preserves full canvas manipulation while providing an authentic debugger experience.
2. **Declarative Step Code Context**: Each `AlgorithmStep` optionally includes `codeContext: { line: number, highlightLines?: number[], explanation?: string }` declaring the 1-indexed line of source code actively executing at that step.
3. **Single-Pass Unified Trace Generation**: The AI emits the complete canonical algorithm source code under `trace.code` and assigns line numbers to each step in a single generation pass, avoiding multiple latency-inducing network roundtrips.
4. **Bidirectional Synchronized Playback**: Stepping through the algorithm synchronously highlights the executing line in the Code Inspector with a subtle glow, gutter pointer (`▶`), and auto-scroll. Clicking a line number in the gutter seeks the animation directly to the first step executing that line.
5. **Python-First with On-Demand Polyglot Translation**: Canonical algorithms are generated in Python for speed and accuracy. When users switch language tabs (Java, C++, TypeScript), the Antigravity CLI translates the code on-demand while preserving line alignment.
6. **Graceful Empty State**: Traces lacking code display a clean inactive state with an action to generate or attach code on-demand.
