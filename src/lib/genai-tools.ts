import type { FunctionDeclaration } from "@google/genai";

export const GENAI_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "read_screen",
    description:
      "Returns the current HTML of a screen. Call this before editing. id must be from the Current Screens table in the system context.",
    parametersJsonSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "read_theme",
    description: "Returns current CSS theme variables and fonts.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "create_screen",
    description:
      'Creates a new screen. screen_html is inner body content only (no html, head, or body tags). Use src="placeholder:{id}" for AI-generated images; call generate_image first with the same id.',
    parametersJsonSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Screen label/name" },
        screen_html: {
          type: "string",
          description: "HTML for body content only",
        },
      },
      required: ["name", "screen_html"],
    },
  },
  {
    name: "update_screen",
    description:
      "Replaces the ENTIRE screen body. Use only for broad layout redesigns. Do NOT use for small targeted edits.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Frame id" },
        screen_html: {
          type: "string",
          description: "HTML for body content only",
        },
      },
      required: ["id", "screen_html"],
    },
  },
  {
    name: "edit_screen",
    description:
      "Targeted find/replace on screen HTML. Use for specific-section edits (e.g., change one button color). Preserves the rest of the UI. find must match read_screen output exactly. One edit per screen.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        find: {
          type: "string",
          description: "Exact string to find (from read_screen)",
        },
        replace: { type: "string", description: "Replacement string" },
      },
      required: ["id", "find", "replace"],
    },
  },
  {
    name: "update_theme",
    description:
      "Updates CSS theme variables. Example: { '--primary': '#2563EB' }",
    parametersJsonSchema: {
      type: "object",
      properties: {
        updates: {
          type: "object",
          additionalProperties: { type: "string" },
          description: "CSS variable names to values",
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "build_theme",
    description:
      'Creates or replaces the global theme. Pass theme_vars as an object: CSS variable names (with -- prefix) to values. Required keys: --background, --foreground, --primary, --primary-foreground, --secondary, --muted, --card, --border, --radius, --font-sans, --font-heading. Example: {"--primary":"#2563eb","--background":"#0f172a","--foreground":"#f8fafc","--card":"#1e293b","--radius":"0.5rem"}',
    parametersJsonSchema: {
      type: "object",
      properties: {
        description: { type: "string" },
        theme_vars: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      },
      required: ["theme_vars"],
    },
  },
  {
    name: "generate_image",
    description:
      'Generates an AI image. Call FIRST before create_screen/update_screen that uses it. In HTML use src="placeholder:{id}" to reference. aspect_ratio: square|landscape|portrait. background: opaque (photos) or transparent (icons).',
    parametersJsonSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Placeholder id, e.g. img-1",
        },
        prompt: {
          type: "string",
          description: "Detailed image description",
        },
        aspect_ratio: {
          type: "string",
          enum: ["square", "landscape", "portrait"],
        },
        background: {
          type: "string",
          enum: ["opaque", "transparent"],
        },
      },
      required: ["id", "prompt", "aspect_ratio", "background"],
    },
  },
];
