import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAntigravityStatus, handleAntigravityGenerate } from "./antigravityMiddleware";
import * as middleware from "./antigravityMiddleware";
import { IncomingMessage, ServerResponse } from "http";
import { EventEmitter } from "events";

function createMockReq(method: string, body?: any): IncomingMessage {
  const emitter = new EventEmitter() as any;
  emitter.method = method;
  emitter[Symbol.asyncIterator] = async function* () {
    if (body !== undefined) {
      yield Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    }
  };
  return emitter as IncomingMessage;
}

function createMockRes(): { res: ServerResponse; getOutput: () => string } {
  let output = "";
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    setHeader(key: string, val: string) {
      headers[key] = val;
    },
    end(chunk?: string) {
      if (chunk) output += chunk;
    },
  } as unknown as ServerResponse;

  return { res, getOutput: () => output };
}

describe("antigravityMiddleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleAntigravityStatus", () => {
    it("returns availability status as JSON", () => {
      const req = createMockReq("GET");
      const { res, getOutput } = createMockRes();

      handleAntigravityStatus(req, res);

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(getOutput());
      expect(typeof parsed.available).toBe("boolean");
    });
  });

  describe("handleAntigravityGenerate", () => {
    it("rejects non-POST requests with 405", async () => {
      const req = createMockReq("GET");
      const { res, getOutput } = createMockRes();

      await handleAntigravityGenerate(req, res);

      expect(res.statusCode).toBe(405);
      expect(getOutput()).toContain("Method Not Allowed");
    });

    it("rejects empty query with 400", async () => {
      const req = createMockReq("POST", { query: "" });
      const { res, getOutput } = createMockRes();

      await handleAntigravityGenerate(req, res);

      expect(res.statusCode).toBe(400);
      expect(getOutput()).toContain("Missing 'query'");
    });

    it("executes prompt and returns valid ExecutionTrace", async () => {
      const mockTraceJson = JSON.stringify({
        initialState: {
          arrays: [{ id: "A", name: "nums", elements: [1, 2], position: { x: 140, y: 290 } }],
          pointers: [{ id: "p1", name: "i", targetArrayId: "A", index: 0 }],
          variables: [{ id: "v1", name: "count", value: 0 }],
          narration: { title: "Start", text: "Initializing" },
        },
        steps: [
          {
            stepIndex: 1,
            title: "Step 1",
            explanation: "Increment count",
            actions: [{ type: "set_variable", variableId: "v1", value: 1 }],
          },
          {
            stepIndex: 2,
            title: "Step 2",
            explanation: "Complete",
            actions: [{ type: "clear_highlights" }],
          },
        ],
      });

      vi.spyOn(middleware.agyExecutor, "execute").mockResolvedValue(
        `\`\`\`json\n${mockTraceJson}\n\`\`\``
      );

      const req = createMockReq("POST", { query: "increment count" });
      const { res, getOutput } = createMockRes();

      await handleAntigravityGenerate(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(getOutput());
      expect(data.success).toBe(true);
      expect(data.trace).toBeDefined();
      expect(data.trace.initialState.arrays[0].name).toBe("nums");
      expect(data.trace.steps.length).toBe(2);
    });

    it("returns 502 if CLI returns non-parseable JSON", async () => {
      vi.spyOn(middleware.agyExecutor, "execute").mockResolvedValue("Sorry, I cannot help with that.");

      const req = createMockReq("POST", { query: "broken test" });
      const { res, getOutput } = createMockRes();

      await handleAntigravityGenerate(req, res);

      expect(res.statusCode).toBe(502);
      expect(getOutput()).toContain("Failed to parse Antigravity CLI response as JSON");
    });
  });

  describe("handleAntigravityTranslate", () => {
    it("rejects non-POST with 405", async () => {
      const req = createMockReq("GET");
      const { res, getOutput } = createMockRes();

      await middleware.handleAntigravityTranslate(req, res);

      expect(res.statusCode).toBe(405);
      expect(getOutput()).toContain("Method Not Allowed");
    });

    it("returns translated code on valid request", async () => {
      const mockTranslated = "public class Solution {\n    // Java code\n}";
      vi.spyOn(middleware.agyExecutor, "execute").mockResolvedValue(
        `\`\`\`java\n${mockTranslated}\n\`\`\``
      );

      const req = createMockReq("POST", {
        code: "def solution():\n    pass",
        toLanguage: "java",
        fromLanguage: "python",
      });
      const { res, getOutput } = createMockRes();

      await middleware.handleAntigravityTranslate(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(getOutput());
      expect(data.success).toBe(true);
      expect(data.translatedCode).toBe(mockTranslated);
      expect(data.language).toBe("java");
    });

    it("returns identical code if fromLanguage equals toLanguage", async () => {
      const pythonCode = "def test():\n    return 42";
      const req = createMockReq("POST", {
        code: pythonCode,
        toLanguage: "python",
        fromLanguage: "python",
      });
      const { res, getOutput } = createMockRes();

      await middleware.handleAntigravityTranslate(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(getOutput());
      expect(data.translatedCode).toBe(pythonCode);
    });
  });

  describe("handleAntigravityGenerateCode", () => {
    it("generates code and stepLineMap for a trace", async () => {
      const mockResult = {
        code: {
          language: "python",
          content: "def algo():\n    return 1",
        },
        stepLineMap: [1, 2],
      };

      vi.spyOn(middleware.agyExecutor, "execute").mockResolvedValue(
        `\`\`\`json\n${JSON.stringify(mockResult)}\n\`\`\``
      );

      const req = createMockReq("POST", {
        trace: {
          initialState: { narration: { title: "Test Algorithm" } },
          steps: [
            { title: "Step 1", explanation: "First" },
            { title: "Step 2", explanation: "Second" },
          ],
        },
      });
      const { res, getOutput } = createMockRes();

      await middleware.handleAntigravityGenerateCode(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(getOutput());
      expect(data.success).toBe(true);
      expect(data.code.language).toBe("python");
      expect(data.stepLineMap).toEqual([1, 2]);
    });
  });
});
