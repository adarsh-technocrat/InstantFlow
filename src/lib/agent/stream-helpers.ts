/**
 * Partial JSON parsing utilities for streaming tool arguments.
 * Enables real-time canvas updates while the model is still generating HTML.
 */

export interface CreateScreenStreamState {
  buffer: string;
  lastEmit: number;
  lastHtmlLen: number;
}

export interface UpdateScreenStreamState {
  buffer: string;
  lastEmit: number;
}

/**
 * Extract partial screen_html from a JSON buffer by manually parsing
 * the string value — handles incomplete JSON that JSON.parse would reject.
 */
export function extractPartialScreenHtml(buffer: string): string | null {
  const key = '"screen_html"';
  const idx = buffer.indexOf(key);
  if (idx === -1) return null;
  const valStart = buffer.indexOf('"', idx + key.length);
  if (valStart === -1) return null;
  let i = valStart + 1;
  let out = "";
  while (i < buffer.length) {
    const c = buffer[i];
    if (c === "\\") {
      if (i + 1 >= buffer.length) break;
      const next = buffer[i + 1];
      if (next === '"') {
        out += '"';
        i += 2;
      } else if (next === "\\") {
        out += "\\";
        i += 2;
      } else if (next === "n") {
        out += "\n";
        i += 2;
      } else if (next === "t") {
        out += "\t";
        i += 2;
      } else {
        out += next;
        i += 2;
      }
      continue;
    }
    if (c === '"') break;
    out += c;
    i++;
  }
  return out.length > 0 ? out : null;
}

/**
 * Attempt to parse partial JSON for create_screen args.
 * Repairs unterminated strings/objects so we can extract name and screen_html early.
 */
export function parseCreateScreenPartial(
  text: string,
): { name?: string; screen_html?: string } | null {
  if (!text || typeof text !== "string") return null;
  try {
    let repaired = text.trim();
    if (!repaired.startsWith("{")) return null;
    if (!repaired.endsWith("}")) {
      if (repaired.endsWith('"')) {
        repaired += "}";
      } else if (/"[^"]*$/.test(repaired) || /:\s*$/.test(repaired)) {
        repaired += '"}';
      } else {
        repaired += "}";
      }
    }
    const parsed = JSON.parse(repaired) as {
      name?: string;
      screen_html?: string;
    };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Attempt to parse partial JSON for update_screen args.
 */
export function parseUpdateScreenPartial(
  text: string,
): { id?: string; screen_html?: string } | null {
  if (!text || typeof text !== "string") return null;
  try {
    let repaired = text.trim();
    if (!repaired.startsWith("{")) return null;
    if (!repaired.endsWith("}")) {
      if (repaired.endsWith('"')) {
        repaired += "}";
      } else if (/"[^"]*$/.test(repaired) || /:\s*$/.test(repaired)) {
        repaired += '"}';
      } else {
        repaired += "}";
      }
    }
    const parsed = JSON.parse(repaired) as {
      id?: string;
      screen_html?: string;
    };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
