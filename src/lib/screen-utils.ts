export const SCREEN_HTML_HEAD = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Screen</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Poppins:wght@100..900&family=Fira+Code:wght@300..700&family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>
    <style type="text/tailwindcss">
      @theme inline {
        --color-background: var(--background);
        --color-foreground: var(--foreground);
        --color-primary: var(--primary);
        --color-primary-foreground: var(--primary-foreground);
        --color-secondary: var(--secondary);
        --color-secondary-foreground: var(--secondary-foreground);
        --color-muted: var(--muted);
        --color-muted-foreground: var(--muted-foreground);
        --color-accent: var(--accent);
        --color-destructive: var(--destructive);
        --color-card: var(--card);
        --color-card-foreground: var(--card-foreground);
        --color-border: var(--border);
        --color-input: var(--input);
        --color-ring: var(--ring);
        --radius-sm: calc(var(--radius) - 4px);
        --radius-md: calc(var(--radius) - 2px);
        --radius-lg: var(--radius);
      }
      :root { /* THEME_VARS */ }
    </style>
  </head>
  <body>`;

export const SCREEN_HTML_TAIL = `</body></html>`;

export type ThemeVariables = Record<string, string>;

const THEME_KEY_ALIASES: Record<string, string> = {
  r: "--primary",
  y: "--secondary",
  t: "--accent",
  boarder: "--border",
  primary: "--primary",
  secondary: "--secondary",
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  "card-foreground": "--card-foreground",
  border: "--border",
  radius: "--radius",
  muted: "--muted",
  "muted-foreground": "--muted-foreground",
  "primary-foreground": "--primary-foreground",
  "secondary-foreground": "--secondary-foreground",
  input: "--input",
  ring: "--ring",
  accent: "--accent",
  destructive: "--destructive",
  "font-sans": "--font-sans",
  "font-heading": "--font-heading",
};

export function normalizeThemeVars(
  raw: Record<string, string>,
): ThemeVariables {
  const out: ThemeVariables = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== "string") continue;
    const key = k.trim();
    if (!key) continue;
    const normalized = key.startsWith("--")
      ? key
      : (THEME_KEY_ALIASES[key] ?? `--${key.replace(/^--/, "")}`);
    out[normalized] = v;
  }
  return out;
}

const EMPTY_THEME_FALLBACK: ThemeVariables = {
  "--background": "#ffffff",
  "--foreground": "#000000",
  "--primary": "#2563eb",
  "--primary-foreground": "#ffffff",
  "--secondary": "#f1f5f9",
  "--secondary-foreground": "#1e293b",
  "--muted": "#f1f5f9",
  "--muted-foreground": "#64748b",
  "--card": "#ffffff",
  "--card-foreground": "#0f172a",
  "--border": "#e2e8f0",
  "--input": "#f0f2f1",
  "--ring": "#2563eb",
  "--radius": "0.5rem",
  "--font-sans": "system-ui,sans-serif",
  "--font-heading": "system-ui,sans-serif",
};

function themeVarsToCSS(vars: ThemeVariables): string {
  return Object.entries(vars)
    .filter(([k]) => k.startsWith("--"))
    .map(([k, v]) => `        ${k}: ${v};`)
    .join("\n");
}

const THEME_PLACEHOLDER = "/* THEME_VARS */";

export function wrapScreenBody(
  bodyContent: string,
  theme: ThemeVariables = {},
): string {
  const activeTheme =
    Object.keys(theme).length > 0 ? theme : EMPTY_THEME_FALLBACK;
  const themeCSS = themeVarsToCSS(activeTheme);
  const headWithTheme = SCREEN_HTML_HEAD.replace(THEME_PLACEHOLDER, themeCSS);
  return `${headWithTheme}\n${bodyContent}\n${SCREEN_HTML_TAIL}`;
}

export function extractBodyContent(fullHtml: string): string {
  if (!fullHtml) return "";
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  return fullHtml;
}

export function injectFrameScripts(html: string): string {
  const scrollbarHideStyle =
    "<style>html,body{-ms-overflow-style:none;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}</style>";
  const zoomScript = `<script>(function(){document.addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey){e.preventDefault();e.stopPropagation();try{window.parent.postMessage({type:"canvas-zoom",deltaY:e.deltaY,clientX:e.clientX,clientY:e.clientY},"*")}catch(_){}}},{passive:false,capture:true})})();</script>`;
  const inject = scrollbarHideStyle + zoomScript;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${inject}</head>`);
  }
  if (/<body[\s>]/i.test(html)) {
    return html.replace(/<body(\s[^>]*)?>/i, (m) => m + inject);
  }
  return html + inject;
}
