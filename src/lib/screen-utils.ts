/** HTML shell wrapper for screen body content. Includes Tailwind, Iconify, theme. */
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

/** Extract inner body content from full HTML document. Used by read_screen. */
export function extractBodyContent(fullHtml: string): string {
  if (!fullHtml) return "";
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  return fullHtml;
}
