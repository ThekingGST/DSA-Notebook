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
  autoResize?: boolean;
}

export interface CompilerOptions {
  standalonePointers?: boolean;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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
  const el: ExcalidrawCompiledElement = {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1.5,
    strokeStyle: "solid",
    roughness: 1.2,
    opacity: 100,
    groupIds,
    frameId: null,
    roundness: type === "rectangle" ? { type: 3 } : null,
    seed: (hashString(id) % 100000) + 1,
    version: Date.now(),
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData,
  };

  if (type === "text") {
    el.lineHeight = 1.25 as any;
    el.autoResize = true;
    el.baseline = 14;
    el.textAlign = "center";
    el.verticalAlign = "middle";
  }

  return el;
}

function wrapText(text: string, maxCharsPerLine = 48): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}

export function compileDSAToExcalidraw(
  dsaState: DSAState,
  options?: CompilerOptions
): ExcalidrawCompiledElement[] {

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

      let strokeColor = "#1e1e1e";
      let backgroundColor = "rgba(255, 255, 255, 0.05)";
      let strokeWidth = 2;

      if (isComparing) {
        strokeColor = "#d97706"; // amber
        backgroundColor = "rgba(241, 176, 0, 0.2)";
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

      // Cell value text (vertically centered inside cell)
      const valText = String(val);
      const textH = 28;
      const textY = Math.round(cellY + (cellH - textH) / 2);
      const textEl = createBaseElement(
        valTextId,
        "text",
        cellX,
        textY,
        cellW,
        textH,
        [groupId],
        { dsaType: "valueText", arrayId: arr.id, index: idx }
      );
      textEl.text = valText;
      textEl.originalText = valText;
      textEl.fontSize = 20;
      textEl.fontFamily = 1;
      textEl.textAlign = "center";
      textEl.verticalAlign = "middle";
      textEl.strokeColor = "#1e1e1e";
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
      idxEl.strokeColor = "#52525b";
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
    const ptrGroupIds = options?.standalonePointers
      ? [`ptr_group_${p.id}`]
      : [`group_${targetArr.id}`];

    const ptrEl = createBaseElement(
      `ptr_${p.id}`,
      "text",
      pointerX,
      pointerY,
      ptrWidth,
      ptrHeight,
      ptrGroupIds,
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
    const wrappedExplanation = narration.text ? wrapText(narration.text, 52) : "";
    const fullText = wrappedExplanation
      ? `${narration.title}\n${wrappedExplanation}`
      : narration.title;

    const lineCount = fullText.split("\n").length;
    const cardHeight = Math.max(44, lineCount * 22 + 6);

    const narrationEl = createBaseElement(
      "narration_card",
      "text",
      140,
      68,
      520,
      cardHeight,
      ["narration_group"],
      { dsaType: "narration" }
    );
    narrationEl.text = fullText;
    narrationEl.originalText = fullText;
    narrationEl.fontSize = 15;
    narrationEl.fontFamily = 1;
    narrationEl.lineHeight = 1.35 as any;
    narrationEl.textAlign = "left";
    narrationEl.verticalAlign = "top";
    narrationEl.strokeColor = "#1e1e1e";
    elements.push(narrationEl);
  }

  return elements;
}

