import { createVertex } from "@ai-sdk/google-vertex";
import { streamText, convertToModelMessages } from "ai";

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
      messages: modelMessages,
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
