# Universal Array Execution Protocol & Multi-Array Auto-Stacking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform DSA Notebook's AI Tutor into a universal array algorithm engine capable of visualizing any array-related problem across 6 foundational archetypes with client-side multi-array auto-stacking, canvas name badges, and detailed simulation stepping.

**Architecture:** A unified 6-archetype master system prompt classifies student problems into canonical mechanics and outputs multi-array, multi-pointer ExecutionTraces. The client-side Excalidraw compiler automatically stacks multiple arrays vertically and displays left-aligned array name badges, guaranteeing collision-free, pedagogically clear visualizations with zero coordinate drift.

**Tech Stack:** TypeScript, React, Excalidraw Element Schema, Zod, Vitest, Testing Library.

**Spec:** [Issue #21: Spec: Universal Array Execution Protocol & Multi-Array Auto-Stacking Layout](https://github.com/ThekingGST/DSA-Notebook/issues/21)

## Global Constraints

- Respect ADR-0003 (Declarative Step Deltas & Precomputed Snapshots), ADR-0004 (Single-Batch JSON Generation), and ADR-0009 (Universal Array Execution Protocol & Multi-Array Auto-Stacking Layout).
- All domain terminology must strictly follow `CONTEXT.md` (Auxiliary Array, Multi-Array Stacking, Array Archetype, DSA Object, Algorithm Step).
- Do not introduce breaking schema changes to `ExecutionTrace` or `AlgorithmStepAction`. Use composable `DSAArray`, `DSAPointer`, `DSAVariable`, and `DSAHighlight` primitives.
- All code changes must target the `feat-hackathon` branch.
- Maintain 100% test pass rate with zero TypeScript compile warnings or bundle errors.

---

### Task 1: Multi-Array Vertical Auto-Stacking & Layout Coordinates

**Files:**
- Modify: `src/layout/arrayLayout.ts`
- Modify: `src/compiler/compileDSAToExcalidraw.ts`
- Test: `src/compiler/compileDSAToExcalidraw.test.ts`

**Interfaces:**
- Produces: `ArrayLayout.getStackedArrayY(arrayIndex: number, baseY?: number, spacingY?: number): number`
- Produces: `compileDSAToExcalidraw` rendering multiple arrays vertically stacked with distinct, non-overlapping Y bounds.

- [ ] **Step 1: Write the failing test for multi-array vertical auto-stacking**

In `src/compiler/compileDSAToExcalidraw.test.ts`, add test verifying that two arrays are stacked with distinct non-overlapping vertical coordinates:

```typescript
it("automatically stacks multiple arrays vertically with collision-free spacing", () => {
  const multiArrayState: DSAState = {
    arrays: [
      {
        id: "A",
        name: "nums",
        elements: [1, 2, 3],
        position: { x: 140, y: 320 },
      },
      {
        id: "B",
        name: "prefixSum",
        elements: [1, 3, 6],
        position: { x: 140, y: 320 }, // Colliding initial position
      },
    ],
    pointers: [
      { id: "p1", name: "i", targetArrayId: "A", index: 0 },
      { id: "p2", name: "j", targetArrayId: "B", index: 1 },
    ],
    variables: [],
  };

  const elements = compileDSAToExcalidraw(multiArrayState);

  const cellA0 = elements.find((el) => el.id === "cell_A_0");
  const cellB0 = elements.find((el) => el.id === "cell_B_0");

  expect(cellA0).toBeDefined();
  expect(cellB0).toBeDefined();
  // Array B must be vertically below Array A by at least 150px
  expect(cellB0!.y).toBeGreaterThanOrEqual(cellA0!.y + 150);

  // Pointer p2 (targeting B) must anchor relative to B's stacked Y, not A's Y
  const ptr2 = elements.find((el) => el.id === "ptr_p2");
  expect(ptr2).toBeDefined();
  expect(ptr2!.y).toBeGreaterThan(cellA0!.y);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/compiler/compileDSAToExcalidraw.test.ts`
Expected: FAIL because `cellB0.y === cellA0.y` (both at 320).

- [ ] **Step 3: Implement minimal code for vertical auto-stacking**

In `src/layout/arrayLayout.ts`:
```typescript
static readonly DEFAULT_ARRAY_STACK_SPACING = 170;
static readonly DEFAULT_BASE_ARRAY_Y = 260;

static getStackedArrayY(
  arrayIndex: number,
  baseY = ArrayLayout.DEFAULT_BASE_ARRAY_Y,
  spacingY = ArrayLayout.DEFAULT_ARRAY_STACK_SPACING
): number {
  return baseY + arrayIndex * spacingY;
}
```

In `src/compiler/compileDSAToExcalidraw.ts`:
Update `arrays.forEach((arr, arrIdx) => { ... })`:
When rendering arrays, calculate the array's effective Y coordinate:
```typescript
// Auto-stack arrays vertically if multiple arrays exist or use standard stacked spacing
const effectiveY = ArrayLayout.getStackedArrayY(arrIdx);
const arrayWithStackedY = {
  ...arr,
  position: { x: arr.position?.x ?? 140, y: effectiveY },
};
```
Use `arrayWithStackedY` when calling `ArrayLayout.getCellBounds` and when resolving pointer positions so `ptr_p2` anchors cleanly above Array B.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/compiler/compileDSAToExcalidraw.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/layout/arrayLayout.ts src/compiler/compileDSAToExcalidraw.ts src/compiler/compileDSAToExcalidraw.test.ts
git commit -m "feat(compiler): implement deterministic multi-array vertical auto-stacking layout"
```

---

### Task 2: Left-Side Array Name Badges on Whiteboard Canvas

**Files:**
- Modify: `src/compiler/compileDSAToExcalidraw.ts`
- Test: `src/compiler/compileDSAToExcalidraw.test.ts`

**Interfaces:**
- Produces: Excalidraw text element for each array with `id: "name_${arr.id}"`, `text: "${arr.name}:"`, `dsaType: "arrayName"`, positioned at $x = \text{arrayX} - 85$.

- [ ] **Step 1: Write the failing test for left-side array name badges**

In `src/compiler/compileDSAToExcalidraw.test.ts`, add test verifying that array names are rendered as left-aligned badges:

```typescript
it("renders left-aligned array name badge for each array", () => {
  const state: DSAState = {
    arrays: [
      {
        id: "arr1",
        name: "prefixSum",
        elements: [10, 20, 30],
        position: { x: 140, y: 260 },
      },
    ],
    pointers: [],
    variables: [],
  };

  const elements = compileDSAToExcalidraw(state);
  const nameEl = elements.find((el) => el.id === "name_arr1");

  expect(nameEl).toBeDefined();
  expect(nameEl?.type).toBe("text");
  expect(nameEl?.text).toBe("prefixSum:");
  expect(nameEl?.customData?.dsaType).toBe("arrayName");
  // Positioned to the left of the array cells
  expect(nameEl!.x).toBeLessThan(140);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/compiler/compileDSAToExcalidraw.test.ts`
Expected: FAIL because `name_arr1` is undefined.

- [ ] **Step 3: Implement minimal code for array name badges**

In `src/compiler/compileDSAToExcalidraw.ts`, inside the array rendering loop:
```typescript
// Render left-side array name badge
const nameBadgeWidth = 75;
const nameBadgeX = Math.max(10, arrayWithStackedY.position.x - nameBadgeWidth - 10);
const nameBadgeY = Math.round(arrayWithStackedY.position.y + (ArrayLayout.DEFAULT_CELL_HEIGHT - 24) / 2);
const nameText = `${arr.name}:`;

const nameEl = createBaseElement(
  `name_${arr.id}`,
  "text",
  nameBadgeX,
  nameBadgeY,
  nameBadgeWidth,
  24,
  [groupId],
  { dsaType: "arrayName", arrayId: arr.id }
);
nameEl.text = nameText;
nameEl.originalText = nameText;
nameEl.fontSize = 15;
nameEl.fontFamily = 1;
nameEl.textAlign = "right";
nameEl.verticalAlign = "middle";
nameEl.strokeColor = "#71717a"; // zinc-500
elements.push(nameEl);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/compiler/compileDSAToExcalidraw.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler/compileDSAToExcalidraw.ts src/compiler/compileDSAToExcalidraw.test.ts
git commit -m "feat(compiler): render left-aligned array name badge for each array on canvas"
```

---

### Task 3: Universal AI Tutor System Prompt Redesign (6 Universal Archetypes)

**Files:**
- Modify: `src/ai/systemPrompt.ts`
- Modify: `src/ai/promptBuilder.ts`
- Test: `src/ai/promptBuilder.test.ts`

**Interfaces:**
- Produces: `SYSTEM_PROMPT` containing full 6 Universal Archetype classification matrix, multi-array rules, dedicated pointer conventions, emerald locking, and pre-evaluated math constraints.
- Produces: `buildAlgorithmPrompt` generating instructions for deep simulation stepping.

- [ ] **Step 1: Write the failing test for universal prompt builder**

In `src/ai/promptBuilder.test.ts`, add tests verifying that `buildAlgorithmPrompt` and `SYSTEM_PROMPT` mention the 6 archetypes and allow up to 15–20 simulation steps:

```typescript
it("includes the 6 Universal Archetypes in SYSTEM_PROMPT", () => {
  const { systemPrompt } = buildAlgorithmPrompt("Merge two sorted arrays");
  expect(systemPrompt).toContain("Archetype 1: Single-Array Scanner");
  expect(systemPrompt).toContain("Archetype 2: Two-Pointer Convergence");
  expect(systemPrompt).toContain("Archetype 3: Sliding Window Bounded Range");
  expect(systemPrompt).toContain("Archetype 4: Dual / Multi-Array Coordination");
  expect(systemPrompt).toContain("Archetype 5: In-Place Partitioning & Sorting");
  expect(systemPrompt).toContain("Archetype 6: 2D Matrix / Grid Traversal");
});

it("instructs on dedicated pointers per array and persistent emerald highlights", () => {
  const { systemPrompt } = buildAlgorithmPrompt("Bubble sort");
  expect(systemPrompt).toContain("#22c55e");
  expect(systemPrompt).toContain("targetArrayId");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ai/promptBuilder.test.ts`
Expected: FAIL because archetype titles are not in `systemPrompt`.

- [ ] **Step 3: Implement universal system prompt**

Update `src/ai/systemPrompt.ts` to articulate the 6 Universal Archetypes, rules for dedicated pointers per array, auxiliary array pre-allocation, persistent emerald locking for sorted zones, and pre-evaluated numbers.
Update `src/ai/promptBuilder.ts` to guide the model through archetype identification and simulation stepping.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ai/promptBuilder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ai/systemPrompt.ts src/ai/promptBuilder.ts src/ai/promptBuilder.test.ts
git commit -m "feat(ai): redesign system prompt with 6 Universal Archetypes and simulation stepping"
```

---

### Task 4: Prompt Studio Modal Expansion & Multi-Archetype Quick Chips

**Files:**
- Modify: `src/components/PromptStudioModal.tsx`
- Test: `src/components/PromptStudioModal.test.tsx`

**Interfaces:**
- Produces: `PromptStudioModal` rendering quick fill chips for diverse archetypes (Sliding Window, Merge Two Sorted Arrays, Dutch National Flag, Kadane's Algorithm, Two Sum).

- [ ] **Step 1: Write the failing test for updated quick fill chips**

In `src/components/PromptStudioModal.test.tsx`, add test checking for the new chips:

```typescript
it("renders quick fill chips for diverse archetypes and updates prompt query", () => {
  render(<PromptStudioModal isOpen={true} onClose={vi.fn()} onLoadTrace={vi.fn()} />);

  const mergeChip = screen.getByRole("button", { name: /Merge Two Sorted Arrays/i });
  const dnfChip = screen.getByRole("button", { name: /Dutch National Flag/i });
  const kadaneChip = screen.getByRole("button", { name: /Kadane's Algorithm/i });

  expect(mergeChip).toBeInTheDocument();
  expect(dnfChip).toBeInTheDocument();
  expect(kadaneChip).toBeInTheDocument();

  fireEvent.click(mergeChip);
  const input = screen.getByLabelText(/Algorithm Question \/ Problem:/i) as HTMLInputElement;
  expect(input.value).toContain("Merge two sorted arrays");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PromptStudioModal.test.tsx`
Expected: FAIL because `Merge Two Sorted Arrays` chip is not found.

- [ ] **Step 3: Update PromptStudioModal quick chips**

In `src/components/PromptStudioModal.tsx`:
Add quick fill buttons for:
- Sliding Window (K=3)
- Merge Two Sorted Arrays
- Dutch National Flag (3-Way Partition)
- Kadane's Algorithm (Max Subarray Sum)
- Two Sum (Two Pointers)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PromptStudioModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptStudioModal.tsx src/components/PromptStudioModal.test.tsx
git commit -m "feat(studio): expand Prompt Studio quick fill chips across multiple archetypes"
```

---

### Task 5: End-to-End Verification & Production Build

**Files:**
- Test: Full Vitest suite
- Build: Vite production bundle

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All test suites (20+ files, 140+ tests) PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: TypeScript check and Vite build succeed with zero errors.

- [ ] **Step 3: Verify git status and commit any artifacts**

Run: `git status`
Expected: Clean working tree on `feat-hackathon`.
