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
    expect(val0?.y).toBe(200);
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
});
