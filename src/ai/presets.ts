import { ExecutionTrace } from "../engine/types";

export interface PresetAlgorithm {
  label: string;
  prompt: string;
  trace: ExecutionTrace;
}

export const ALGORITHM_PRESETS: Record<
  "binarySearch" | "twoPointers" | "linearScan" | "secondLargest",
  PresetAlgorithm
> = {
  binarySearch: {
    label: "Binary Search",
    prompt: "Binary Search for target 23 in sorted array [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]",
    trace: {
      code: {
        language: "python",
        content: `def binary_search(nums, target):
    low = 0
    high = len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
      },
      initialState: {
        arrays: [
          {
            id: "A",
            name: "nums",
            elements: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
            position: { x: 120, y: 320 },
            cellWidth: 64,
            cellHeight: 52,
          },
        ],
        pointers: [
          { id: "p_low", name: "low", targetArrayId: "A", index: 0, color: "#38bdf8" },
          { id: "p_mid", name: "mid", targetArrayId: "A", index: 4, color: "#fbbf24" },
          { id: "p_high", name: "high", targetArrayId: "A", index: 9, color: "#f87171" },
        ],
        variables: [
          { id: "v_target", name: "target", value: 23, color: "#34d399" },
        ],
        narration: {
          title: "Step 0: Initial State",
          text: "Binary Search initialized. Searching for target 23 between low=0 and high=9.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Check middle element nums[mid=4]",
          explanation: "Calculate mid = (0 + 9) / 2 = 4. nums[4] is 16. Compare 16 with target 23.",
          codeContext: { line: 5 },
          actions: [
            { type: "compare", arrayId: "A", indexA: 4, operator: "<", result: true },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: 16 < 23, discard left half",
          explanation: "Target 23 must be in right half. Move low to mid + 1 = 5. Recalculate mid = (5 + 9) / 2 = 7.",
          codeContext: { line: 9 },
          actions: [
            { type: "move_pointer", pointerId: "p_low", toIndex: 5 },
            { type: "move_pointer", pointerId: "p_mid", toIndex: 7 },
            { type: "compare", arrayId: "A", indexA: 7, operator: ">", result: true },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: 56 > 23, discard right half",
          explanation: "nums[7] is 56, which is > 23. Move high to mid - 1 = 6. Recalculate mid = (5 + 6) / 2 = 5.",
          codeContext: { line: 11 },
          actions: [
            { type: "move_pointer", pointerId: "p_high", toIndex: 6 },
            { type: "move_pointer", pointerId: "p_mid", toIndex: 5 },
            { type: "compare", arrayId: "A", indexA: 5, operator: "==", result: true },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Target found at index 5",
          explanation: "nums[5] is 23! Target 23 successfully located at index 5.",
          codeContext: { line: 7 },
          actions: [
            { type: "highlight", targets: [{ arrayId: "A", index: 5, color: "#04d361" }] },
          ],
        },
      ],
    },
  },

  twoPointers: {
    label: "Two Pointers",
    prompt: "Reverse array [1, 2, 3, 4, 5, 6] using two pointers",
    trace: {
      code: {
        language: "python",
        content: `def reverse_array(arr):
    left = 0
    right = len(arr) - 1
    while left < right:
        arr[left], arr[right] = arr[right], arr[left]
        left += 1
        right -= 1
    return arr`,
      },
      initialState: {
        arrays: [
          {
            id: "A",
            name: "arr",
            elements: [1, 2, 3, 4, 5, 6],
            position: { x: 140, y: 320 },
            cellWidth: 70,
            cellHeight: 56,
          },
        ],
        pointers: [
          { id: "p_left", name: "left", targetArrayId: "A", index: 0, color: "#38bdf8" },
          { id: "p_right", name: "right", targetArrayId: "A", index: 5, color: "#f87171" },
        ],
        variables: [],
        narration: {
          title: "Step 0: Initial State",
          text: "Two pointers initialized at left = 0 and right = 5 to reverse the array.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Swap arr[0] and arr[5]",
          explanation: "Swap outer elements 1 and 6.",
          codeContext: { line: 5 },
          actions: [
            { type: "swap", arrayId: "A", indexA: 0, indexB: 5 },
            { type: "move_pointer", pointerId: "p_left", toIndex: 1 },
            { type: "move_pointer", pointerId: "p_right", toIndex: 4 },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: Swap arr[1] and arr[4]",
          explanation: "Swap elements 2 and 5.",
          codeContext: { line: 5 },
          actions: [
            { type: "swap", arrayId: "A", indexA: 1, indexB: 4 },
            { type: "move_pointer", pointerId: "p_left", toIndex: 2 },
            { type: "move_pointer", pointerId: "p_right", toIndex: 3 },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: Swap arr[2] and arr[3]",
          explanation: "Swap center elements 3 and 4.",
          codeContext: { line: 5 },
          actions: [
            { type: "swap", arrayId: "A", indexA: 2, indexB: 3 },
            { type: "move_pointer", pointerId: "p_left", toIndex: 3 },
            { type: "move_pointer", pointerId: "p_right", toIndex: 2 },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Pointers crossed, reverse complete",
          explanation: "left > right. Reversal is finished: [6, 5, 4, 3, 2, 1].",
          codeContext: { line: 8 },
          actions: [
            { type: "clear_highlights" },
          ],
        },
      ],
    },
  },

  linearScan: {
    label: "Linear Scan",
    prompt: "Linear scan to find maximum in [14, 32, 9, 45, 21]",
    trace: {
      code: {
        language: "python",
        content: `def find_maximum(nums):
    max_val = nums[0]
    for i in range(1, len(nums)):
        if nums[i] > max_val:
            max_val = nums[i]
    return max_val`,
      },
      initialState: {
        arrays: [
          {
            id: "A",
            name: "nums",
            elements: [14, 32, 9, 45, 21],
            position: { x: 140, y: 320 },
            cellWidth: 70,
            cellHeight: 56,
          },
        ],
        pointers: [
          { id: "p_i", name: "i", targetArrayId: "A", index: 0, color: "#a78bfa" },
        ],
        variables: [
          { id: "v_max", name: "maxVal", value: 14, color: "#34d399" },
        ],
        narration: {
          title: "Step 0: Initial State",
          text: "Linear scan initialized. Initial maximum set to nums[0] = 14.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Inspect nums[1] = 32",
          explanation: "32 > 14. Update maxVal to 32.",
          codeContext: { line: 5 },
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 1 },
            { type: "compare", arrayId: "A", indexA: 1, operator: ">", result: true },
            { type: "set_variable", variableId: "v_max", value: 32 },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: Inspect nums[2] = 9",
          explanation: "9 <= 32. maxVal remains 32.",
          codeContext: { line: 4 },
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 2 },
            { type: "compare", arrayId: "A", indexA: 2, operator: "<=", result: false },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: Inspect nums[3] = 45",
          explanation: "45 > 32. Update maxVal to 45.",
          codeContext: { line: 5 },
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 3 },
            { type: "compare", arrayId: "A", indexA: 3, operator: ">", result: true },
            { type: "set_variable", variableId: "v_max", value: 45 },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Inspect nums[4] = 21 and complete",
          explanation: "21 <= 45. Scan completed. Maximum element is 45.",
          codeContext: { line: 6 },
          actions: [
            { type: "move_pointer", pointerId: "p_i", toIndex: 4 },
            { type: "highlight", targets: [{ arrayId: "A", index: 3, color: "#04d361" }] },
          ],
        },
      ],
    },
  },

  secondLargest: {
    label: "Second Largest",
    prompt: "Find the second largest element in [10, 25, 7, 42, 18]",
    trace: {
      code: {
        language: "python",
        content: `def find_second_largest(nums):
    largest = nums[0]
    second = float('-inf')
    for i in range(1, len(nums)):
        if nums[i] > largest:
            second = largest
            largest = nums[i]
        elif nums[i] > second and nums[i] != largest:
            second = nums[i]
    return second`,
      },
      initialState: {
        arrays: [
          {
            id: "A",
            name: "nums",
            elements: [10, 25, 7, 42, 18],
            position: { x: 140, y: 320 },
            cellWidth: 70,
            cellHeight: 56,
          },
        ],
        pointers: [
          { id: "p1", name: "i", targetArrayId: "A", index: 0, color: "#a78bfa" },
          { id: "p2", name: "max", targetArrayId: "A", index: 0, color: "#34d399" },
        ],
        variables: [
          { id: "v1", name: "largest", value: 10, color: "#34d399" },
          { id: "v2", name: "secondLargest", value: "-inf", color: "#fbbf24" },
        ],
        narration: {
          title: "Step 0: Initial State",
          text: "Initialize pointers i = 0 and max = 0. Largest = 10, SecondLargest = -inf.",
        },
      },
      steps: [
        {
          stepIndex: 1,
          title: "Step 1: Compare nums[1] with largest",
          explanation: "Comparing nums[1] (25) > largest (10). Condition is true.",
          codeContext: { line: 7 },
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 1 },
            { type: "compare", arrayId: "A", indexA: 1, operator: ">", result: true },
            { type: "set_variable", variableId: "v2", value: 10 },
            { type: "set_variable", variableId: "v1", value: 25 },
            { type: "move_pointer", pointerId: "p2", toIndex: 1 },
          ],
        },
        {
          stepIndex: 2,
          title: "Step 2: Inspect nums[2]",
          explanation: "Comparing nums[2] (7) with largest (25). 7 < 25, largest unchanged.",
          codeContext: { line: 5 },
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 2 },
            { type: "compare", arrayId: "A", indexA: 2, operator: "<=", result: false },
          ],
        },
        {
          stepIndex: 3,
          title: "Step 3: New maximum found at nums[3]",
          explanation: "nums[3] (42) > largest (25). SecondLargest becomes 25, largest becomes 42.",
          codeContext: { line: 7 },
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 3 },
            { type: "compare", arrayId: "A", indexA: 3, operator: ">", result: true },
            { type: "set_variable", variableId: "v2", value: 25 },
            { type: "set_variable", variableId: "v1", value: 42 },
            { type: "move_pointer", pointerId: "p2", toIndex: 3 },
          ],
        },
        {
          stepIndex: 4,
          title: "Step 4: Scan complete",
          explanation: "Inspected nums[4] (18). Scan finished. Largest = 42, SecondLargest = 25.",
          codeContext: { line: 10 },
          actions: [
            { type: "move_pointer", pointerId: "p1", toIndex: 4 },
            { type: "compare", arrayId: "A", indexA: 4, operator: "<=", result: false },
            { type: "clear_highlights" },
          ],
        },
      ],
    },
  },
};
