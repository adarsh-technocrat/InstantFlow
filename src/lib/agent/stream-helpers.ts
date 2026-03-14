export interface CreateScreenStreamState {
  buffer: string;
  lastEmit: number;
}

export interface UpdateScreenStreamState {
  buffer: string;
  lastEmit: number;
}

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
