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
  const zoomScript = `<script>(function(){document.addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey){e.preventDefault();e.stopPropagation();try{window.parent.postMessage({type:"canvas-zoom",deltaY:e.deltaY,clientX:e.clientX,clientY:e.clientY},"*")}catch(_){}}},{passive:false,capture:true})})();</script>`;
  const inject = scrollbarHideStyle + zoomScript;
  let html = rawHtml;
  if (rawHtml.includes("</head>")) {
    html = rawHtml.replace("</head>", `${inject}</head>`);
  } else if (/<body[\s>]/i.test(rawHtml)) {
    html = rawHtml.replace(/<body(\s[^>]*)?>/i, (m) => m + inject);
  } else {
    html = rawHtml + inject;
  }
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
