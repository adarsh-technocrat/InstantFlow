import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_PROJECT_ID } from "@/constants/project";

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("id") ?? DEFAULT_PROJECT_ID;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        frames: true,
        chatSessions: true,
      },
    });

    if (!project) {
      return NextResponse.json({
        frames: [],
        messages: [],
        theme: {},
      });
    }

    const frames = project.frames.map((f) => ({
      id: f.id,
      label: f.label,
      left: f.left,
      top: f.top,
      html: f.html,
    }));

    // Load the default (single-agent) session messages
    const defaultSession = project.chatSessions.find(
      (s) => s.agentId === "default",
    );
    const messages = (defaultSession?.messages as unknown[]) ?? [];

    return NextResponse.json({ frames, messages });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
