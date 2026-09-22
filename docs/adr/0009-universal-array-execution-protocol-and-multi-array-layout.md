# Universal Array Execution Protocol and Multi-Array Auto-Stacking Layout

We chose a unified, archetype-based AI Tutor protocol and deterministic client-side multi-array auto-stacking layout to support all array-based Data Structures & Algorithms (searching, sorting, sliding window, prefix sums, two pointers, partitioning, and 2D matrices).

Instead of creating fragmented, problem-specific prompts or adding complex custom visual primitives (like dedicated 2D matrix grids, hash table widgets, or physical window bracket elements), the system models all array algorithms using composable foundations:
1. **Composable Multi-Arrays**: Auxiliary data structures (prefix sums, merge buffers, frequency buckets, matrix rows) are represented as standard `DSAArray` objects declared in `initialState` and populated step-by-step via `write_cell`.
2. **Deterministic Client-Side Auto-Stacking**: Rather than relying on LLMs to calculate pixel coordinates, the Excalidraw compiler automatically calculates collision-free vertical spacing and left-side array name badges (`arr:`, `prefix:`) for multi-array layouts.
3. **Dedicated Semantic Pointers**: Each array has dedicated, stable pointers (`p_i`, `p_j`, `p_k`) avoiding cross-array pointer jumping.
4. **Persistent Emerald Highlights**: Sorted and partitioned regions lock into emerald green (`#22c55e`) across steps to visually illustrate algorithm progression.
5. **6 Universal Archetypes Master Prompt**: A single, clean, highly effective system prompt classifies student problems into one of 6 canonical mechanics (Single-Pass Scanner, Two-Pointer Convergence, Sliding Window, Dual-Array Coordination, In-Place Partitioning, 2D Grid Traversal) with strict 0-indexed math and evaluated numeric values.
