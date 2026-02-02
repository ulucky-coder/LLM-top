// Agent configuration
export const AGENTS = [
  { id: "chatgpt", name: "ChatGPT", role: "Logical Analyst", color: "bg-emerald-500", colorHex: "#10b981" },
  { id: "claude", name: "Claude", role: "System Architect", color: "bg-amber-500", colorHex: "#f59e0b" },
  { id: "gemini", name: "Gemini", role: "Alternative Generator", color: "bg-blue-500", colorHex: "#3b82f6" },
  { id: "deepseek", name: "DeepSeek", role: "Formal Analyst", color: "bg-violet-500", colorHex: "#8b5cf6" },
] as const;

// View modes
export const VIEW_MODES = [
  { id: "workspace", label: "Workspace", icon: "LayoutDashboard", shortcut: "1", description: "Multi-panel analysis workspace" },
  { id: "document", label: "Document", icon: "FileText", shortcut: "2", description: "Full-width prose view" },
  { id: "present", label: "Present", icon: "Presentation", shortcut: "3", description: "Fullscreen presentation" },
  { id: "compare", label: "Compare", icon: "GitCompare", shortcut: "4", description: "Side-by-side session comparison" },
] as const;

export type ViewModeId = typeof VIEW_MODES[number]["id"];

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
  // View mode shortcuts
  modeWorkspace: "1",
  modeDocument: "2",
  modePresent: "3",
  modeCompare: "4",
  cycleMode: "m",
  // Present mode shortcuts
  nextSlide: "space",
  prevSlide: "left",
  presentFullscreen: "f",
  speakerNotes: "n",
  exitPresent: "escape",
  // Compare mode shortcuts
  syncScroll: "s",
  toggleDiff: "d",
} as const;
