import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDefaultProject } from "@/lib/db";
import { DEFAULT_PROJECT_ID } from "@/constants/project";

export async function GET(req: NextRequest) {
  try {
    const agentId = req.nextUrl.searchParams.get("agentId") ?? "default";

    const session = await prisma.chatSession.findUnique({
      where: {
        projectId_agentId: {
          projectId: DEFAULT_PROJECT_ID,
          agentId,
        },
      },
    });
    const messages = (session?.messages as unknown[]) ?? [];
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultProject();
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const agentId = body?.agentId ?? "default";

    await prisma.chatSession.upsert({
      where: {
        projectId_agentId: {
          projectId: DEFAULT_PROJECT_ID,
          agentId,
        },
      },
      create: { projectId: DEFAULT_PROJECT_ID, agentId, messages },
      update: { messages },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
