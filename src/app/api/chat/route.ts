import { createVertex } from "@ai-sdk/google-vertex";
import { streamText, convertToModelMessages, tool } from "ai";
import { z } from "zod";
import { SLEEK_AGENT_SYSTEM_PROMPT } from "@/constants/agent-prompts";

export const maxDuration = 30;

const vertex = createVertex({
  ...(process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY && {
      googleAuthOptions: {
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        },
      },
    }),
});

function hasParts(msg: {
  parts?: unknown;
  content?: unknown;
}): msg is { role: string; parts: Array<{ type: string }> } {
  return Array.isArray((msg as { parts?: unknown }).parts);
}

/** Client-side tools: no execute. Run in onToolCall on the client with Redux. */
const sleekTools = {
  read_screen: tool({
    description:
      "Returns the current HTML of a screen. Call this before editing. id is the frame id (e.g. '1', '2').",
    inputSchema: z.object({ id: z.string() }),
  }),
  read_theme: tool({
    description: "Returns current CSS theme variables and fonts.",
    inputSchema: z.object({}),
  }),
  create_screen: tool({
    description:
      "Creates a new screen. screen_html is inner body content only (no html, head, or body tags).",
    inputSchema: z.object({
      name: z.string().describe("Screen label/name"),
      screen_html: z.string().describe("HTML for body content only"),
    }),
  }),
  update_screen: tool({
    description:
      "Replaces an entire screen's body content. screen_html is inner body only.",
    inputSchema: z.object({
      id: z.string().describe("Frame id"),
      screen_html: z.string().describe("HTML for body content only"),
    }),
  }),
  edit_screen: tool({
    description:
      "Replaces a specific string in screen HTML. find must match read_screen output exactly. Use only one edit per screen.",
    inputSchema: z.object({
      id: z.string(),
      find: z.string().describe("Exact string to find (from read_screen)"),
      replace: z.string().describe("Replacement string"),
    }),
  }),
  update_theme: tool({
    description:
      "Updates CSS theme variables. Example: { '--primary': '#2563EB' }",
    inputSchema: z.object({
      updates: z
        .record(z.string(), z.string())
        .describe("CSS variable names to values"),
    }),
  }),
  build_theme: tool({
    description:
      "Builds the global theme from user description. Replaces the entire theme. Use when the user describes a theme (e.g. 'dark blue', 'minimal light', 'forest green'). Provide a complete theme with all required vars: --background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --card, --card-foreground, --border, --input, --ring, --radius, --font-sans, --font-heading. No defaults - theme is built purely from the user prompt.",
    inputSchema: z.object({
      description: z.string().describe("User's theme description/prompt"),
      theme_vars: z
        .record(z.string(), z.string())
        .describe(
          "Complete theme as CSS variables. Keys like --primary, --background, etc.",
        ),
    }),
  }),
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];

    const modelMessages =
      rawMessages.length > 0 && hasParts(rawMessages[0])
        ? await convertToModelMessages(rawMessages)
        : rawMessages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content ?? "",
          }));

    const result = streamText({
      model: vertex("gemini-2.0-flash-001"),
      system: SLEEK_AGENT_SYSTEM_PROMPT,
      messages: modelMessages,
      tools: sleekTools,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
