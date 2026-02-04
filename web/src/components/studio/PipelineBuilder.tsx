"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Plus,
  Trash2,
  Settings,
  ChevronRight,
  ChevronDown,
  GitBranch,
  Bot,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Zap,
  Filter,
  Merge,
  Split,
  Save,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";

interface PipelineBuilderProps {
  onLog?: (message: string) => void;
}

interface PipelineNode {
  id: string;
  type: "input" | "agent" | "parallel" | "critique" | "filter" | "synthesis" | "output";
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  connections: string[];
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  enabled: boolean;
}

const DEFAULT_PIPELINE: Pipeline = {
  id: "main",
  name: "Main Analysis Pipeline",
  description: "Стандартный пайплайн анализа с 4 агентами",
  enabled: true,
  nodes: [
    {
      id: "input",
      type: "input",
      name: "Input",
      config: { fields: ["task", "context", "task_type"] },
      position: { x: 100, y: 50 },
      connections: ["parallel-agents"],
    },
    {
      id: "parallel-agents",
      type: "parallel",
      name: "Parallel Agents",
      config: {
        agents: ["chatgpt", "claude", "gemini", "deepseek"],
      },
      position: { x: 100, y: 150 },
      connections: ["critique"],
    },
    {
      id: "critique",
      type: "critique",
      name: "Critique Round",
      config: { enabled: true, rounds: 1 },
      position: { x: 100, y: 250 },
      connections: ["synthesis"],
    },
    {
      id: "synthesis",
      type: "synthesis",
      name: "Synthesis",
      config: { agent: "claude", consensusThreshold: 0.8 },
      position: { x: 100, y: 350 },
      connections: ["output"],
    },
    {
      id: "output",
      type: "output",
      name: "Output",
      config: { format: "json" },
      position: { x: 100, y: 450 },
      connections: [],
    },
  ],
};

const NODE_TYPES = [
  { type: "input", name: "Input", icon: <ArrowRight className="h-4 w-4" />, color: "bg-blue-500" },
  { type: "agent", name: "Agent", icon: <Bot className="h-4 w-4" />, color: "bg-emerald-500" },
  { type: "parallel", name: "Parallel", icon: <Split className="h-4 w-4" />, color: "bg-violet-500" },
  { type: "critique", name: "Critique", icon: <MessageSquare className="h-4 w-4" />, color: "bg-amber-500" },
  { type: "filter", name: "Filter", icon: <Filter className="h-4 w-4" />, color: "bg-red-500" },
  { type: "synthesis", name: "Synthesis", icon: <Merge className="h-4 w-4" />, color: "bg-pink-500" },
  { type: "output", name: "Output", icon: <Zap className="h-4 w-4" />, color: "bg-cyan-500" },
];

export function PipelineBuilder({ onLog }: PipelineBuilderProps) {
  const [pipeline, setPipeline] = useState<Pipeline>(DEFAULT_PIPELINE);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    onLog?.(`Selected node: ${nodeId}`);
  };

  const handleNodeConfigChange = (nodeId: string, key: string, value: any) => {
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, config: { ...node.config, [key]: value } }
          : node
      ),
    }));
  };

  const handleAddNode = (type: string) => {
    const newNode: PipelineNode = {
      id: `${type}-${Date.now()}`,
      type: type as PipelineNode["type"],
      name: NODE_TYPES.find((t) => t.type === type)?.name || type,
      config: {},
      position: { x: 100, y: pipeline.nodes.length * 100 + 50 },
      connections: [],
    };
    setPipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    onLog?.(`Added node: ${newNode.name}`);
  };

  const handleDeleteNode = (nodeId: string) => {
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
    }));
    setSelectedNode(null);
    onLog?.(`Deleted node: ${nodeId}`);
  };

  const handleSave = () => {
    // Save to localStorage or API
    localStorage.setItem("llm-top-pipeline", JSON.stringify(pipeline));
    onLog?.("✓ Pipeline saved");
  };

  const selectedNodeData = pipeline.nodes.find((n) => n.id === selectedNode);

  return (
    <div className="flex h-full">
      {/* Left Panel - Node Types */}
      <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Nodes
          </h3>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType.type}
              type="button"
              onClick={() => handleAddNode(nodeType.type)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <div className={cn("p-1 rounded", nodeType.color)}>
                {nodeType.icon}
              </div>
              <span>{nodeType.name}</span>
              <Plus className="h-3 w-3 ml-auto opacity-50" />
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="w-full border-slate-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Pipeline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowJson(!showJson)}
            className="w-full text-slate-400"
          >
            {showJson ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showJson ? "Hide JSON" : "Show JSON"}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-white">{pipeline.name}</h2>
            <Badge variant="outline" className={pipeline.enabled ? "border-emerald-500 text-emerald-400" : "border-slate-600"}>
              {pipeline.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Zoom: {zoom}%</span>
            <input
              type="range"
              min="50"
              max="150"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="w-24 accent-violet-500"
            />
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Visual Canvas */}
          {!showJson ? (
            <div
              className="flex-1 bg-slate-950 overflow-auto p-8"
              style={{
                backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            >
              <div
                className="relative"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
              >
                {/* Connections */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "600px" }}>
                  {pipeline.nodes.map((node) =>
                    node.connections.map((targetId) => {
                      const target = pipeline.nodes.find((n) => n.id === targetId);
                      if (!target) return null;
                      return (
                        <line
                          key={`${node.id}-${targetId}`}
                          x1={node.position.x + 120}
                          y1={node.position.y + 40}
                          x2={target.position.x + 120}
                          y2={target.position.y}
                          stroke="#6366f1"
                          strokeWidth="2"
                          strokeDasharray="4"
                        />
                      );
                    })
                  )}
                </svg>

                {/* Nodes */}
                {pipeline.nodes.map((node) => {
                  const nodeType = NODE_TYPES.find((t) => t.type === node.type);
                  return (
                    <div
                      key={node.id}
                      onClick={() => handleNodeClick(node.id)}
                      className={cn(
                        "absolute w-60 bg-slate-900 border rounded-lg cursor-pointer transition-all",
                        selectedNode === node.id
                          ? "border-violet-500 ring-2 ring-violet-500/20"
                          : "border-slate-700 hover:border-slate-600"
                      )}
                      style={{
                        left: node.position.x,
                        top: node.position.y,
                      }}
                    >
                      <div className="flex items-center gap-2 p-3 border-b border-slate-800">
                        <div className={cn("p-1.5 rounded", nodeType?.color)}>
                          {nodeType?.icon}
                        </div>
                        <span className="font-medium text-white text-sm">{node.name}</span>
                        {node.type === "parallel" && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {node.config.agents?.length || 0} agents
                          </Badge>
                        )}
                      </div>
                      <div className="p-3 text-xs text-slate-400">
                        {node.type === "input" && "Task, Context, Type"}
                        {node.type === "parallel" && node.config.agents?.join(", ")}
                        {node.type === "critique" && `${node.config.rounds || 1} round(s)`}
                        {node.type === "synthesis" && `Threshold: ${node.config.consensusThreshold || 0.8}`}
                        {node.type === "output" && `Format: ${node.config.format || "json"}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* JSON View */
            <div className="flex-1 bg-slate-950 p-4 overflow-auto">
              <pre className="text-xs text-slate-300 font-mono">
                {JSON.stringify(pipeline, null, 2)}
              </pre>
            </div>
          )}

          {/* Properties Panel */}
          {selectedNodeData && (
            <div className="w-72 bg-slate-900 border-l border-slate-800 overflow-auto">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Properties</h3>
                <button
                  type="button"
                  onClick={() => handleDeleteNode(selectedNodeData.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Node ID</label>
                  <Input
                    value={selectedNodeData.id}
                    disabled
                    className="bg-slate-950 border-slate-700 text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Name</label>
                  <Input
                    value={selectedNodeData.name}
                    onChange={(e) => {
                      setPipeline((prev) => ({
                        ...prev,
                        nodes: prev.nodes.map((n) =>
                          n.id === selectedNodeData.id ? { ...n, name: e.target.value } : n
                        ),
                      }));
                    }}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Type</label>
                  <Badge className={NODE_TYPES.find((t) => t.type === selectedNodeData.type)?.color}>
                    {selectedNodeData.type}
                  </Badge>
                </div>

                {/* Type-specific config */}
                {selectedNodeData.type === "parallel" && (
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Agents</label>
                    <div className="space-y-1">
                      {["chatgpt", "claude", "gemini", "deepseek"].map((agent) => (
                        <label key={agent} className="flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedNodeData.config.agents?.includes(agent) || false}
                            onChange={(e) => {
                              const agents = selectedNodeData.config.agents || [];
                              const newAgents = e.target.checked
                                ? [...agents, agent]
                                : agents.filter((a: string) => a !== agent);
                              handleNodeConfigChange(selectedNodeData.id, "agents", newAgents);
                            }}
                            className="accent-violet-500"
                          />
                          {agent}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNodeData.type === "critique" && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedNodeData.config.enabled ?? true}
                        onChange={(e) =>
                          handleNodeConfigChange(selectedNodeData.id, "enabled", e.target.checked)
                        }
                        className="accent-violet-500"
                      />
                      <label className="text-sm text-slate-300">Enabled</label>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Rounds</label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={selectedNodeData.config.rounds || 1}
                        onChange={(e) =>
                          handleNodeConfigChange(selectedNodeData.id, "rounds", parseInt(e.target.value))
                        }
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                  </>
                )}

                {selectedNodeData.type === "synthesis" && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Agent</label>
                      <select
                        value={selectedNodeData.config.agent || "claude"}
                        onChange={(e) =>
                          handleNodeConfigChange(selectedNodeData.id, "agent", e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                      >
                        <option value="claude">Claude</option>
                        <option value="chatgpt">ChatGPT</option>
                        <option value="gemini">Gemini</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">
                        Consensus Threshold: {selectedNodeData.config.consensusThreshold || 0.8}
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        value={(selectedNodeData.config.consensusThreshold || 0.8) * 100}
                        onChange={(e) =>
                          handleNodeConfigChange(
                            selectedNodeData.id,
                            "consensusThreshold",
                            parseInt(e.target.value) / 100
                          )
                        }
                        className="w-full accent-violet-500"
                      />
                    </div>
                  </>
                )}

                {selectedNodeData.type === "output" && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Format</label>
                    <select
                      value={selectedNodeData.config.format || "json"}
                      onChange={(e) =>
                        handleNodeConfigChange(selectedNodeData.id, "format", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                    >
                      <option value="json">JSON</option>
                      <option value="markdown">Markdown</option>
                      <option value="html">HTML</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Connections</label>
                  <div className="text-xs text-slate-500">
                    {selectedNodeData.connections.length > 0
                      ? selectedNodeData.connections.join(" → ")
                      : "No connections"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
