import { NextRequest, NextResponse } from "next/server";
import { frameStore } from "../frames/store";

export async function GET(req: NextRequest) {
  const frameId = req.nextUrl.searchParams.get("frameId");
  if (!frameId) {
    return new NextResponse("frameId required", { status: 400 });
  }
  const rawHtml = frameStore.get(frameId);
  if (!rawHtml) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888">Loading frame…</body></html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
  const scrollbarHideStyle =
    "<style>html,body{-ms-overflow-style:none;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}</style>";
  const html = rawHtml.includes("</head>")
    ? rawHtml.replace("</head>", `${scrollbarHideStyle}</head>`)
    : rawHtml.replace(/<body(\s[^>]*)?>/i, `${scrollbarHideStyle}<body$1>`);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
