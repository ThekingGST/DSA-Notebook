# Use @excalidraw/excalidraw as Canvas Foundation

We chose `@excalidraw/excalidraw` as the whiteboard engine for DSA Notebook. While other canvas libraries (like `tldraw`) provide bespoke shape-subclassing APIs, Excalidraw delivers the exact hand-drawn aesthetic, familiar intuitive toolset, and student/teacher whiteboard experience envisioned in `IDEA.md`. DSA-specific elements (arrays, pointers) will be integrated by rendering them as structured Excalidraw element groups with metadata (`customData`) synchronized by our decoupled DSA State Engine.
