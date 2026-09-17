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
  boundElements: null;
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
    const cellW = arr.cellWidth || 64;
    const cellH = arr.cellHeight || 54;
    const groupId = `group_${arr.id}`;

    arr.elements.forEach((val, idx) => {
      const cellX = arr.position.x + idx * cellW;
      const cellY = arr.position.y;

      const isComparing =
        activeComparison &&
        (activeComparison.arrayId ? activeComparison.arrayId === arr.id : true) &&
        (activeComparison.indexA === idx || activeComparison.indexB === idx);

      const customHighlight = highlights.find(
        (h) => h.arrayId === arr.id && h.index === idx
      );

      let strokeColor = "#e1e1e6";
      let backgroundColor = "rgba(255, 255, 255, 0.02)";
      let strokeWidth = 1.5;

      if (isComparing) {
        strokeColor = "#f1b000"; // amber
        backgroundColor = "rgba(241, 176, 0, 0.15)";
        strokeWidth = 2.5;
      } else if (customHighlight) {
        strokeColor = customHighlight.color;
        backgroundColor = `${customHighlight.color}26`; // ~15% opacity hex
        strokeWidth = 2.5;
      }

      // Cell rectangle
      const cellEl = createBaseElement(
        `cell_${arr.id}_${idx}`,
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
      elements.push(cellEl);

      // Cell value text (centered in cell)
      const valText = String(val);
      const textEl = createBaseElement(
        `val_${arr.id}_${idx}`,
        "text",
        cellX + cellW / 2,
        cellY + cellH / 2,
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
      elements.push(textEl);

      // Sub-cell index label
      const idxText = String(idx);
      const idxEl = createBaseElement(
        `idx_${arr.id}_${idx}`,
        "text",
        cellX + cellW / 2,
        cellY + cellH + 16,
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
      idxEl.strokeColor = "#8d8d99";
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

    const cellW = targetArr.cellWidth || 64;
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
    const yOffset = 30 + stackRank * 26;
    const pointerY = targetArr.position.y - yOffset;

    const ptrEl = createBaseElement(
      `ptr_${p.id}`,
      "text",
      cellCenterX,
      pointerY,
      60,
      28,
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
    let vy = 100;
    variables.forEach((v) => {
      const varEl = createBaseElement(
        `var_${v.id}`,
        "text",
        60,
        vy,
        140,
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
      60,
      35,
      400,
      40,
      ["narration_group"],
      { dsaType: "narration" }
    );
    const text = `📝 ${narration.title}\n${narration.text || ""}`;
    narrationEl.text = text;
    narrationEl.originalText = text;
    narrationEl.fontSize = 15;
    narrationEl.fontFamily = 1;
    narrationEl.strokeColor = "#e1e1e6";
    elements.push(narrationEl);
  }

  return elements;
}
