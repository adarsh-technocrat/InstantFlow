import { readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getFrame } from "../frames/store";
import { injectFrameScripts } from "@/lib/screen-utils";

function getElementInspectorScript(): string {
  const scriptPath = path.join(
    process.cwd(),
    "src/lib/iframe/element-inspector.js",
  );
  return readFileSync(scriptPath, "utf-8");
}

function injectElementInspectorScript(
  html: string,
  scriptContent: string,
): string {
  const scriptTag = `<script>${scriptContent}</script>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${scriptTag}</body>`);
  }
  return html + scriptTag;
}

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

  const elementInspectorScript = getElementInspectorScript();

  const html = injectElementInspectorScript(
    injectFrameScripts(rawHtml),
    elementInspectorScript,
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
