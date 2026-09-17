import { DSAState } from "../engine/types";

export interface ExcalidrawCompiledElement {
  id: string;
  type: "rectangle" | "text" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid" | "hachure" | "cross-hatch";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  roundness: { type: number } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: Array<{ id: string; type: "text" | "arrow" }> | null;
  updated: number;
  link: null;
  locked: boolean;
  customData: Record<string, unknown>;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  baseline?: number;
  containerId?: string | null;
  originalText?: string;
  lineHeight?: number;
}

function createBaseElement(
  id: string,
  type: "rectangle" | "text" | "arrow",
  x: number,
  y: number,
  width: number,
  height: number,
  groupIds: string[],
  customData: Record<string, unknown>
): ExcalidrawCompiledElement {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#e1e1e6",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    strokeStyle: "solid",
    roughness: 1.2,
    opacity: 100,
    groupIds,
    frameId: null,
    roundness: type === "rectangle" ? { type: 3 } : null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData,
  };
}

export function compileDSAToExcalidraw(dsaState: DSAState): ExcalidrawCompiledElement[] {
  const elements: ExcalidrawCompiledElement[] = [];
  const { arrays, pointers, variables, narration, activeComparison, highlights = [] } = dsaState;

  // 1. Compile 1D Arrays
  arrays.forEach((arr) => {
    const cellW = arr.cellWidth || 70;
    const cellH = arr.cellHeight || 56;
    const groupId = `group_${arr.id}`;

    arr.elements.forEach((val, idx) => {
      const cellX = arr.position.x + idx * cellW;
      const cellY = arr.position.y;
      const cellId = `cell_${arr.id}_${idx}`;
      const valTextId = `val_${arr.id}_${idx}`;
      const idxTextId = `idx_${arr.id}_${idx}`;

      const isComparing =
        activeComparison &&
        (activeComparison.arrayId ? activeComparison.arrayId === arr.id : true) &&
        (activeComparison.indexA === idx || activeComparison.indexB === idx);

      const customHighlight = highlights.find(
        (h) => h.arrayId === arr.id && h.index === idx
      );

      let strokeColor = "#e1e1e6";
      let backgroundColor = "rgba(255, 255, 255, 0.04)";
      let strokeWidth = 1.5;

      if (isComparing) {
        strokeColor = "#f1b000"; // amber
        backgroundColor = "rgba(241, 176, 0, 0.15)";
        strokeWidth = 2.5;
      } else if (customHighlight) {
        strokeColor = customHighlight.color;
        backgroundColor = `${customHighlight.color}26`;
        strokeWidth = 2.5;
      }

      // Cell rectangle container
      const cellEl = createBaseElement(
        cellId,
        "rectangle",
        cellX,
        cellY,
        cellW,
        cellH,
        [groupId],
        { dsaType: "cell", arrayId: arr.id, index: idx }
      );
      cellEl.strokeColor = strokeColor;
      cellEl.backgroundColor = backgroundColor;
      cellEl.strokeWidth = strokeWidth;
      cellEl.boundElements = [{ id: valTextId, type: "text" }];
      elements.push(cellEl);

      // Cell value text (bound to cell container, matching cell bounds for perfect centering)
      const valText = String(val);
      const textEl = createBaseElement(
        valTextId,
        "text",
        cellX,
        cellY,
        cellW,
        cellH,
        [groupId],
        { dsaType: "valueText", arrayId: arr.id, index: idx }
      );
      textEl.text = valText;
      textEl.originalText = valText;
      textEl.fontSize = 20;
      textEl.fontFamily = 1;
      textEl.textAlign = "center";
      textEl.verticalAlign = "middle";
      textEl.strokeColor = "#ffffff";
      textEl.containerId = cellId;
      elements.push(textEl);

      // Sub-cell index label (centered below cell)
      const idxText = String(idx);
      const idxEl = createBaseElement(
        idxTextId,
        "text",
        cellX,
        cellY + cellH + 8,
        cellW,
        20,
        [groupId],
        { dsaType: "indexLabel", arrayId: arr.id, index: idx }
      );
      idxEl.text = idxText;
      idxEl.originalText = idxText;
      idxEl.fontSize = 12;
      idxEl.fontFamily = 1;
      idxEl.textAlign = "center";
      idxEl.verticalAlign = "middle";
      idxEl.strokeColor = "#a1a1aa";
      elements.push(idxEl);
    });
  });

  // 2. Compile Pointers with vertical stacking
  const pointersByTarget: Record<string, typeof pointers> = {};
  pointers.forEach((p) => {
    const key = `${p.targetArrayId}_${p.index}`;
    if (!pointersByTarget[key]) pointersByTarget[key] = [];
    pointersByTarget[key].push(p);
  });

  pointers.forEach((p) => {
    const targetArr = arrays.find((a) => a.id === p.targetArrayId);
    if (!targetArr) return;

    const cellW = targetArr.cellWidth || 70;
    let cellCenterX: number;

    if (p.index === -1) {
      cellCenterX = targetArr.position.x - cellW / 2;
    } else if (p.index >= targetArr.elements.length) {
      cellCenterX = targetArr.position.x + targetArr.elements.length * cellW + cellW / 2;
    } else {
      cellCenterX = targetArr.position.x + p.index * cellW + cellW / 2;
    }

    const siblings = pointersByTarget[`${p.targetArrayId}_${p.index}`] || [p];
    const stackRank = siblings.indexOf(p);

    const ptrWidth = 70;
    const ptrHeight = 44;
    // Position pointer above cell, leaving 8px gap above cell border
    const pointerY = targetArr.position.y - 8 - ptrHeight - stackRank * (ptrHeight + 6);
    // Center pointer bounding box horizontally over cell center
    const pointerX = Math.round(cellCenterX - ptrWidth / 2);

    const ptrEl = createBaseElement(
      `ptr_${p.id}`,
      "text",
      pointerX,
      pointerY,
      ptrWidth,
      ptrHeight,
      [`group_${targetArr.id}`],
      {
        dsaType: "pointer",
        pointerId: p.id,
        targetArrayId: p.targetArrayId,
        index: p.index,
      }
    );
    const label = `${p.name}\n↓`;
    ptrEl.text = label;
    ptrEl.originalText = label;
    ptrEl.fontSize = 16;
    ptrEl.fontFamily = 1;
    ptrEl.textAlign = "center";
    ptrEl.verticalAlign = "bottom";
    ptrEl.strokeColor = p.color || "#996dff";
    elements.push(ptrEl);
  });

  // 3. Compile Variables HUD
  if (variables && variables.length > 0) {
    let vy = 150;
    variables.forEach((v) => {
      const varEl = createBaseElement(
        `var_${v.id}`,
        "text",
        140,
        vy,
        180,
        24,
        ["variables_hud"],
        { dsaType: "variable", variableId: v.id }
      );
      const text = `${v.name} = ${v.value}`;
      varEl.text = text;
      varEl.originalText = text;
      varEl.fontSize = 15;
      varEl.fontFamily = 1;
      varEl.strokeColor = v.color || "#04d361";
      elements.push(varEl);
      vy += 26;
    });
  }

  // 4. Compile Step Narration Card
  if (narration && narration.title) {
    const narrationEl = createBaseElement(
      "narration_card",
      "text",
      140,
      80,
      450,
      44,
      ["narration_group"],
      { dsaType: "narration" }
    );
    const text = `📝 ${narration.title}\n${narration.text || ""}`;
    narrationEl.text = text;
    narrationEl.originalText = text;
    narrationEl.fontSize = 15;
    narrationEl.fontFamily = 1;
    narrationEl.strokeColor = "#f4f4f5";
    elements.push(narrationEl);
  }

  return elements;
}
