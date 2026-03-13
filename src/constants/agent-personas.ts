export const AGENT_PERSONAS = [
  { name: "Pixel", emoji: "🎨", color: "#8A87F8" },
  { name: "Neon", emoji: "⚡", color: "#F87171" },
  { name: "Mint", emoji: "🌿", color: "#34D399" },
  { name: "Blaze", emoji: "🔥", color: "#FBBF24" },
  { name: "Nova", emoji: "💫", color: "#60A5FA" },
  { name: "Haze", emoji: "🌀", color: "#A78BFA" },
] as const;

export type AgentPersona = (typeof AGENT_PERSONAS)[number];
