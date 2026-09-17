# Native Excalidraw Element Groups with CustomData for DSA Objects

We decided to represent DSA objects (arrays, cells, pointers, variables, narration) directly as native Excalidraw element groups tagged with `customData: { dsaType: string, ... }` rather than an external HTML/SVG overlay layer. Validated in prototype spike `prototype/excalidraw-dsa-integration.html`.

Native element groups preserve Excalidraw's hand-drawn Rough.js aesthetic, guarantee zero viewport desynchronization during panning/zooming, support out-of-the-box group dragging in Teacher Mode, and allow native export (PNG/SVG) and undo/redo (`Ctrl+Z`) without managing parallel coordinate systems.
