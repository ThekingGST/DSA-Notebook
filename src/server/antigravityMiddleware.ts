import { IncomingMessage, ServerResponse } from "http";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { buildAlgorithmPrompt } from "../ai/promptBuilder";
import { cleanJsonOutput } from "../ai/llmService";
import { autoHealExecutionTrace, validateExecutionTrace } from "../ai/traceSchema";

export interface AntigravityStatus {
  available: boolean;
  path?: string;
}

export function findAgyBinary(): string | null {
  const candidatePaths = [
    "/home/thekinggst/.local/bin/agy",
    process.env.AGY_PATH,
    "/usr/local/bin/agy",
    "/usr/bin/agy",
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Fallback to searching PATH via bare command name
  return "agy";
}

export function handleAntigravityStatus(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  const agyPath = findAgyBinary();
  const available = agyPath ? existsSync(agyPath) || agyPath === "agy" : false;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ available, path: agyPath || undefined }));
}

export async function executeAgyPrompt(prompt: string, timeoutMs = 90000): Promise<string> {
  const agyPath = findAgyBinary();
  if (!agyPath) {
    throw new Error("Antigravity CLI ('agy') binary not found on the system.");
  }

  return new Promise((resolve, reject) => {
    execFile(
      agyPath,
      ["-p", prompt],
      {
        timeout: timeoutMs,
        maxBuffer: 15 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        if (err) {
          const detail = stderr?.trim() || err.message;
          reject(new Error(`Antigravity CLI execution failed: ${detail}`));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

export const agyExecutor = {
  execute: executeAgyPrompt,
};

export async function handleAntigravityGenerate(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method Not Allowed. Use POST." }));
    return;
  }

  // Read request body
  let bodyStr = "";
  for await (const chunk of req) {
    bodyStr += chunk;
  }

  let query = "";
  try {
    const parsedBody = JSON.parse(bodyStr || "{}");
    query = (parsedBody.query || "").trim();
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid JSON request body." }));
    return;
  }

  if (!query) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing 'query' in request body." }));
    return;
  }

  try {
    // 1. Build algorithm prompt incorporating 6 Universal Archetypes
    const { systemPrompt, userPrompt } = buildAlgorithmPrompt(query);
    const fullPrompt = `${systemPrompt}\n\nUSER REQUEST: ${userPrompt}\n\nOutput ONLY the complete valid JSON ExecutionTrace enclosed in a single \`\`\`json ... \`\`\` block. No preamble, no explanation, no markdown outside the single json fence.`;

    // 2. Invoke Antigravity CLI
    const rawOutput = await agyExecutor.execute(fullPrompt);

    // 3. Clean, repair and parse JSON
    const cleanedJson = cleanJsonOutput(rawOutput);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedJson);
    } catch (parseErr: unknown) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: `Failed to parse Antigravity CLI response as JSON: ${
            parseErr instanceof Error ? parseErr.message : "Syntax error"
          }`,
          rawOutput: rawOutput.slice(0, 1000),
        })
      );
      return;
    }

    // 4. Auto-heal boundary overflows and validate against strict trace schema
    const healed = autoHealExecutionTrace(parsedJson);
    const validation = validateExecutionTrace(healed);

    if (!validation.success) {
      res.statusCode = 422;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: `Generated trace failed schema validation: ${validation.error}`,
          trace: healed,
        })
      );
      return;
    }

    // 5. Success
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, trace: validation.data }));
  } catch (err: unknown) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      })
    );
  }
}
