# Follow-Up Question Context Serialization and Unified Conversational Surface

When a student pauses an algorithm at step $K$ and asks a follow-up question, the client serializes the active `ComputedSnapshot` at step $K$ along with a short summary of the preceding 2–3 steps. This grounds the LLM in the exact visual state on screen without the token bloat of sending the full execution trace.

For counterfactual inquiries ("What if element 2 was 50?"), the AI returns a textual explanation alongside an optional one-click action to load a new branched `ExecutionTrace`. Both initial prompts and follow-up Q&A run through a single unified floating bottom prompt bar/bubble that can be expanded or docked into a sidebar.
