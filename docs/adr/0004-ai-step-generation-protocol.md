# Single-Batch JSON Generation with Zod Validation for AI Step Protocol

For V1, the AI Tutor generates algorithm execution traces as a single complete JSON payload rather than streaming individual step chunks. The client displays a loading state during generation and validates the payload using a strict Zod schema before loading it into the DSA State Engine.

While streaming reduces initial time-to-first-token, single-batch generation provides atomic validation, eliminates complex partial-JSON reconstruction, and ensures the full timeline is scrubbable the moment it appears. Comparison payloads (`compare`) emitted by modern LLMs are trusted for narration while validated against active cell values.
