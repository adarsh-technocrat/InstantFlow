/**
 * Partial JSON parsing utilities for streaming tool arguments.
 * Enables real-time canvas updates while the model is still generating HTML.
 */

export interface CreateScreenStreamState {
  buffer: string;
  lastEmit: number;
}

export interface UpdateScreenStreamState {
  buffer: string;
  lastEmit: number;
}

/**
 * Attempt to parse partial JSON for create_screen args.
 * Repairs unterminated strings/objects so we can extract name, description, and position (left, top) early.
 */
export function parseCreateScreenPartial(
  text: string,
): { name?: string; description?: string; left?: number; top?: number } | null {
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
      description?: string;
      left?: number;
      top?: number;
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
): { id?: string; description?: string } | null {
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
      description?: string;
    };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
