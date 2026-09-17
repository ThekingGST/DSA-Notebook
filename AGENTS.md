My intial Idea is in `IDEA.md`

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.


## Browser / WSL Environment

Antigravity is running inside WSL.

The WSL environment does NOT have a web browser installed.

When browser access is required — including:
- website testing
- UI testing
- opening localhost applications
- browser-based debugging
- checking responsive behavior
- verifying frontend behavior
- interacting with web applications

do NOT attempt to launch or install a browser inside WSL.

Use the browser available on the outer Windows host instead (normal Windows Chrome/browser).

When testing a locally running application:
1. Start the development server from WSL.
2. Determine the appropriate host/port.
3. Access the application through the Windows-host browser.
4. Do not install a second browser inside WSL merely for testing.

If the current agent environment cannot directly control the Windows browser, explicitly state that browser interaction requires the Windows-side browser and use the available cross-environment/browser mechanism rather than attempting a WSL browser installation.

Do not install Chrome, Chromium, Playwright browsers, or other browser binaries into WSL unless the user explicitly requests it.

## Matt Pocock Skills vs Superpowers

These are intentionally separate workflows.

### Matt Pocock skills own the product/system side

Use Matt Pocock skills for:
- idea refinement
- grilling requirements
- research
- codebase/domain understanding
- Wayfinder-style exploration
- domain modeling
- architecture decisions
- specifications
- ticket decomposition

Matt's workflow answers:

> WHAT are we building, WHY are we building it, and WHAT should the implementation contract be?

### Superpowers owns the implementation side

Superpowers is an execution workflow for implementation-ready work.

It answers:

> HOW do we safely implement the agreed ticket?

### IMPORTANT: Superpowers is opt-in

**Do NOT automatically invoke, follow, or imitate the Superpowers implementation workflow.**

Only use the Superpowers implementation workflow when the user explicitly says something equivalent to:

> "Use Superpowers skills and implement ticket #XX."

or:

> "Use superpower skills and implement ticket XX."

or another unambiguous request that explicitly asks for Superpowers and identifies the ticket/work item.

If the user only says:
- "implement ticket #XX"
- "implement this ticket"
- "work on ticket #XX"
- "build this feature"

do NOT automatically activate the Superpowers workflow.

Instead, use the normal implementation approach appropriate to the task.

### Once explicitly activated

If the user explicitly requests Superpowers for a ticket, follow the Superpowers implementation workflow available in the environment, including its relevant planning, execution, testing, review, and verification practices.

Do not use Superpowers to redefine product scope silently.

If implementation reveals that the ticket's requirements or architecture are insufficient, stop and report the issue rather than silently expanding the ticket.

The correct feedback loop is:

`Superpowers implementation → discovered architectural/product issue → return to planning/specification → update ticket → implementation`

not:

`Superpowers implementation → silently redesign the system`


