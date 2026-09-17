# Hybrid State Model with Declarative Step Deltas and Precomputed Snapshots

We chose a hybrid state model for algorithm visualization. The AI Tutor outputs a minimal initial state and an array of declarative `AlgorithmStep` deltas containing typed operations (`move_pointer`, `set_variable`, `compare`, `swap`, `write_cell`, `highlight`). The client-side DSA State Engine processes this trace through a deterministic reducer on load, precomputing an immutable array of `ComputedSnapshot`s.

This balances compact LLM token generation (only changes are emitted) with $O(1)$ instantaneous random-access scrubbing in the UI without replay delays or reverse-diff calculations.
