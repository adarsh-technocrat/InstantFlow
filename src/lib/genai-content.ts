import type { Content } from "@google/genai";

type ModelMessage = { role: string; content: string | unknown[] };

export function modelMessagesToGenAIContents(
  messages: ModelMessage[],
): Content[] {
  const contents: Content[] = [];

  for (const m of messages) {
    if (m.role === "tool" && Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p && typeof p === "object" && "type" in p) {
          const part = p as {
            type: string;
            toolCallId?: string;
            toolName?: string;
            output?: unknown;
            error?: unknown;
          };
          if (part.type === "tool-result" && part.toolName) {
            contents.push({
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: part.toolName,
                    response:
                      "error" in part && part.error != null
                        ? { error: String(part.error) }
                        : { result: part.output },
                  },
                },
              ],
            });
          }
        }
      }
      continue;
    }

    const role = m.role === "assistant" ? "model" : m.role;
    if (role !== "user" && role !== "model") continue;

    let text = "";
    if (typeof m.content === "string") {
      text = m.content;
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (typeof p === "string") text += p;
        else if (p && typeof p === "object" && "type" in p) {
          const part = p as {
            type: string;
            text?: string;
            toolName?: string;
            args?: unknown;
          };
          if (part.type === "text" && part.text) text += part.text;
          if (part.type === "tool-call" && part.toolName && part.args) {
            contents.push({
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: part.toolName,
                    args: (part.args as Record<string, unknown>) ?? {},
                  },
                },
              ],
            });
          }
        }
      }
    }

    if (text) {
      contents.push({
        role: role as "user" | "model",
        parts: [{ text }],
      });
    }
  }

  return contents;
}
