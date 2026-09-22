import { describe, it, expect } from "vitest";
import { compileDSAToExcalidraw } from "./compileDSAToExcalidraw";
import { DSAState } from "../engine/types";

describe("compileDSAToExcalidraw", () => {
  const sampleState: DSAState = {
    arrays: [
      {
        id: "A",
        name: "nums",
        elements: [10, 25, 7],
        position: { x: 100, y: 200 },
        cellWidth: 64,
        cellHeight: 54,
      },
    ],
    pointers: [
      { id: "p1", name: "i", targetArrayId: "A", index: 0, color: "#996dff" },
      { id: "p2", name: "j", targetArrayId: "A", index: 0, color: "#04d361" }, // co-located with p1
      { id: "p3", name: "left", targetArrayId: "A", index: -1 }, // boundary -1
      { id: "p4", name: "right", targetArrayId: "A", index: 3 }, // boundary length
    ],
    variables: [
      { id: "v1", name: "max", value: 25, color: "#04d361" },
    ],
    narration: { title: "Step 1", text: "Comparing elements" },
  };

  it("compiles array cells, value text, and index labels sharing groupIds", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    // Check cells
    const cell0 = elements.find((e) => e.id === "cell_A_0");
    expect(cell0).toBeDefined();
    expect(cell0?.type).toBe("rectangle");
    expect(cell0?.x).toBe(100);
    expect(cell0?.y).toBe(200);
    expect(cell0?.width).toBe(64);
    expect(cell0?.height).toBe(54);
    expect(cell0?.groupIds).toEqual(["group_A"]);
    expect(cell0?.customData).toEqual({ dsaType: "cell", arrayId: "A", index: 0 });

    // Check value text (centered inside cell bounding box with containerId binding)
    const val0 = elements.find((e) => e.id === "val_A_0");
    expect(val0).toBeDefined();
    expect(val0?.type).toBe("text");
    expect(val0?.text).toBe("10");
    expect(val0?.x).toBe(100);
    expect(val0?.y).toBe(200 + (54 - 28) / 2); // vertically centered inside cell
    expect(val0?.containerId).toBe("cell_A_0");
    expect(val0?.groupIds).toEqual(["group_A"]);
    expect(val0?.lineHeight).toBe(1.25);
    expect(val0?.autoResize).toBe(true);
    expect(val0?.strokeColor).toBe("#1e1e1e");

    // Check index label (aligned under cell)
    const idx0 = elements.find((e) => e.id === "idx_A_0");
    expect(idx0).toBeDefined();
    expect(idx0?.type).toBe("text");
    expect(idx0?.text).toBe("0");
    expect(idx0?.x).toBe(100);
    expect(idx0?.y).toBe(200 + 54 + 8);
    expect(idx0?.groupIds).toEqual(["group_A"]);
    expect(idx0?.lineHeight).toBe(1.25);
    expect(idx0?.strokeColor).toBe("#52525b");
  });

  it("vertically stacks co-located pointers on the same index", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    const ptr1 = elements.find((e) => e.id === "ptr_p1");
    const ptr2 = elements.find((e) => e.id === "ptr_p2");

    expect(ptr1).toBeDefined();
    expect(ptr2).toBeDefined();
    expect(ptr1?.x).toBe(ptr2?.x); // Same horizontal center
    // ptr2 should be stacked higher (more negative Y offset) than ptr1
    expect(ptr2!.y).toBeLessThan(ptr1!.y);
    expect(ptr1?.groupIds).toEqual(["group_A"]);
    expect(ptr2?.groupIds).toEqual(["group_A"]);
  });

  it("positions boundary pointers at index -1 and index length correctly", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    const ptrLeft = elements.find((e) => e.id === "ptr_p3");
    const ptrRight = elements.find((e) => e.id === "ptr_p4");

    expect(ptrLeft).toBeDefined();
    expect(ptrRight).toBeDefined();

    // index -1: placed to the left of index 0
    expect(ptrLeft!.x).toBeLessThan(100);

    // index 3: placed to the right of index 2
    expect(ptrRight!.x).toBeGreaterThan(100 + 3 * 64 - 32);
  });

  it("compiles variables HUD and narration elements", () => {
    const elements = compileDSAToExcalidraw(sampleState);

    const varElement = elements.find((e) => e.id === "var_v1");
    expect(varElement).toBeDefined();
    expect(varElement?.text).toContain("max = 25");
    expect(varElement?.customData).toEqual({ dsaType: "variable", variableId: "v1" });

    const narrationElement = elements.find((e) => e.id === "narration_card");
    expect(narrationElement).toBeDefined();
    expect(narrationElement?.text).toContain("Step 1");
  });

  it("supports standalonePointers option for Teacher Mode independent pointer dragging", () => {
    const elements = compileDSAToExcalidraw(sampleState, { standalonePointers: true });
    const ptr1 = elements.find((e) => e.id === "ptr_p1");

    expect(ptr1).toBeDefined();
    expect(ptr1?.groupIds).toEqual(["ptr_group_p1"]);
    expect(ptr1?.groupIds).not.toContain("group_A");
  });

  it("produces deterministic seeds based on element IDs", () => {
    const el1 = compileDSAToExcalidraw(sampleState);
    const el2 = compileDSAToExcalidraw(sampleState);

    const cell1 = el1.find((e) => e.id === "cell_A_0");
    const cell2 = el2.find((e) => e.id === "cell_A_0");
    expect(cell1?.seed).toBe(cell2?.seed);
  });

  it("prioritizes custom highlights (e.g. green for match, red for mismatch) over comparison amber", () => {
    const stateWithCompareAndHighlight: DSAState = {
      ...sampleState,
      activeComparison: {
        arrayId: "A",
        indexA: 0,
        indexB: 1,
        operator: "==",
        result: true,
      },
      highlights: [{ arrayId: "A", index: 0, color: "#22c55e" }],
    };

    const elements = compileDSAToExcalidraw(stateWithCompareAndHighlight);
    const cell0 = elements.find((e) => e.id === "cell_A_0");
    const cell1 = elements.find((e) => e.id === "cell_A_1");

    // Cell 0 should receive the green custom highlight (#22c55e), NOT amber (#d97706)
    expect(cell0?.strokeColor).toBe("#22c55e");

    // Cell 1 was not part of explicit highlights, so it should NOT receive an amber highlight
    expect(cell1?.strokeColor).toBe("#1e1e1e");
  });

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

  it("renders visually distinguished Variables HUD card with header, divider, and container", () => {
    const state: DSAState = {
      arrays: [{ id: "A", name: "nums", elements: [1, 2, 3], position: { x: 140, y: 290 } }],
      pointers: [],
      variables: [
        { id: "v_mid", name: "mid", value: 1 },
        { id: "v_right", name: "right", value: 1 },
      ],
      narration: { title: "Binary Search", text: "Comparing middle element" },
    };

    const elements = compileDSAToExcalidraw(state);

    // Narration container
    const narrContainer = elements.find((e) => e.id === "narration_card_container");
    expect(narrContainer).toBeDefined();
    expect(narrContainer?.type).toBe("rectangle");
    expect(narrContainer?.strokeColor).toBe("#3f3f46");

    // Variables card container
    const varContainer = elements.find((e) => e.id === "var_card_container");
    expect(varContainer).toBeDefined();
    expect(varContainer?.type).toBe("rectangle");
    expect(varContainer?.strokeColor).toBe("#6366f1");
    expect(varContainer?.backgroundColor).toBe("rgba(30, 27, 75, 0.45)");

    // Variables header and divider
    const varHeader = elements.find((e) => e.id === "var_card_header");
    expect(varHeader).toBeDefined();
    expect(varHeader?.text).toBe("STATE VARIABLES");

    const varDivider = elements.find((e) => e.id === "var_card_divider");
    expect(varDivider).toBeDefined();

    // Variable items
    const varMid = elements.find((e) => e.id === "var_v_mid");
    expect(varMid).toBeDefined();
    expect(varMid?.text).toBe("mid = 1");

    // Variables HUD sits to the right of Narration Card (x >= 600)
    expect(varContainer!.x).toBeGreaterThan(narrContainer!.x + narrContainer!.width - 10);
  });

  it("guarantees zero overlap between multiline narration, pointers, and array cells", () => {
    const longNarrationState: DSAState = {
      arrays: [
        {
          id: "A",
          name: "nums",
          elements: [4, 1, 3, 2],
          position: { x: 140, y: 260 }, // AI suggested 260
        },
      ],
      pointers: [
        { id: "p_i", name: "i", targetArrayId: "A", index: 0 },
        { id: "p_j", name: "j", targetArrayId: "A", index: 1 },
      ],
      variables: [
        { id: "v1", name: "mid", value: 1 },
        { id: "v2", name: "right", value: 1 },
      ],
      narration: {
        title: "Merge Sort",
        text: "Merge sort repeatedly divides the array into smaller halves, sorts those halves, and merges the sorted halves. For this example, [4, 1, 3, 2] is divided into [4, 1] and [3, 2], then merged into the final sorted array [1, 2, 3, 4].",
      },
    };

    const elements = compileDSAToExcalidraw(longNarrationState);

    const narrContainer = elements.find((e) => e.id === "narration_card_container")!;
    const varContainer = elements.find((e) => e.id === "var_card_container")!;
    const cell0 = elements.find((e) => e.id === "cell_A_0")!;
    const ptrI = elements.find((e) => e.id === "ptr_p_i")!;

    // 1. Narration and Variables HUD do not horizontally collide
    expect(varContainer.x).toBeGreaterThanOrEqual(narrContainer.x + narrContainer.width);

    // 2. The array is pushed down below the header cards so pointers never collide with narration
    const headerBottom = Math.max(narrContainer.y + narrContainer.height, varContainer.y + varContainer.height);
    expect(cell0.y).toBeGreaterThan(headerBottom);

    // 3. Pointer top is strictly below the header bottom
    expect(ptrI.y).toBeGreaterThanOrEqual(headerBottom);
  });
});


