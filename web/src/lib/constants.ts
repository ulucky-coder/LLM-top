// Agent configuration
export const AGENTS = [
  { id: "chatgpt", name: "ChatGPT", role: "Logical Analyst", color: "bg-emerald-500", colorHex: "#10b981" },
  { id: "claude", name: "Claude", role: "System Architect", color: "bg-amber-500", colorHex: "#f59e0b" },
  { id: "gemini", name: "Gemini", role: "Alternative Generator", color: "bg-blue-500", colorHex: "#3b82f6" },
  { id: "deepseek", name: "DeepSeek", role: "Formal Analyst", color: "bg-violet-500", colorHex: "#8b5cf6" },
] as const;

// Task types
export const TASK_TYPES = [
  { value: "strategy", label: "Strategy", description: "Markets, competitors, business decisions" },
  { value: "research", label: "Research", description: "Deep analysis of any topic" },
  { value: "investment", label: "Investment", description: "Project evaluation, risks, ROI" },
  { value: "development", label: "Development", description: "Architecture, technical decisions" },
  { value: "audit", label: "Audit", description: "Methodology check, error search" },
] as const;

export type TaskType = typeof TASK_TYPES[number]["value"];
export type AgentId = typeof AGENTS[number]["id"];

// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Default settings
export const DEFAULT_SETTINGS = {
  maxIterations: 3,
  consensusThreshold: 0.8,
  temperature: 0.3,
  budget: 5.0,
  agents: AGENTS.map(a => a.id),
};

// Keyboard shortcuts
export const SHORTCUTS = {
  commandPalette: "mod+k",
  newSession: "n",
  export: "e",
  compare: "c",
  search: "/",
  help: "?",
  toggleSidebar: "mod+\\",
  toggleDrawer: "mod+shift+\\",
  goToInput: "mod+i",
  goToSynthesis: "mod+s",
  agent1: "mod+1",
  agent2: "mod+2",
  agent3: "mod+3",
  agent4: "mod+4",
  startAnalysis: "mod+enter",
  pause: "mod+.",
  addNote: "mod+shift+n",
  collapseAll: "mod+up",
  expandAll: "mod+down",
} as const;
