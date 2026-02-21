import { NextRequest, NextResponse } from "next/server";
import { frameStore } from "./store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frameId, html } = body as { frameId?: string; html?: string };
    if (!frameId || typeof html !== "string") {
      return NextResponse.json(
        { error: "frameId and html required" },
        { status: 400 },
      );
    }
    frameStore.set(frameId, html);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
