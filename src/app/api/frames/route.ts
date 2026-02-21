import { NextRequest, NextResponse } from "next/server";
import { setFrame, deleteFrame } from "./store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frameId, html, label, left, top } = body as {
      frameId?: string;
      html?: string;
      label?: string;
      left?: number;
      top?: number;
    };
    if (!frameId || typeof html !== "string") {
      return NextResponse.json(
        { error: "frameId and html required" },
        { status: 400 },
      );
    }
    await setFrame(frameId, html, { label, left, top });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const frameId = req.nextUrl.searchParams.get("frameId");
    if (!frameId) {
      return NextResponse.json(
        { error: "frameId query parameter required" },
        { status: 400 },
      );
    }
    await deleteFrame(frameId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
