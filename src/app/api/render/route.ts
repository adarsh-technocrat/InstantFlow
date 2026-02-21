import { NextRequest, NextResponse } from "next/server";
import { getFrame } from "../frames/store";
import { injectFrameScripts } from "@/lib/screen-utils";

export async function GET(req: NextRequest) {
  const frameId = req.nextUrl.searchParams.get("frameId");
  if (!frameId) {
    return new NextResponse("frameId required", { status: 400 });
  }
  const rawHtml = await getFrame(frameId);
  if (!rawHtml) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888">Loading frame…</body></html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
  const html = injectFrameScripts(rawHtml);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
