# Two-Stage Algorithm Generation and Deterministic Execution

We decided that the AI Tutor will not stream live imperative canvas manipulation commands (e.g. ad-hoc pixel offsets). Instead, the AI generates a structured, declarative algorithm plan and step sequence, which our client-side DSA State Engine deterministically verifies and executes. This ensures that time-travel scrubbing (Previous, Next, Reset), auto-play, and state-restoration during follow-up questions are 100% deterministic and free of visual drift or animation glitches.
