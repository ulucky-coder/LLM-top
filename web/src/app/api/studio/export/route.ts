import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const DEFAULT_USER_ID = "default";

// Export configuration types
export interface ExportedConfig {
  version: string;
  exported_at: string;
  user_id: string;
  type: "full" | "prompts" | "configs" | "pipelines" | "experiments";
  data: {
    prompts?: ExportedPrompt[];
    agent_configs?: ExportedAgentConfig[];
    pipelines?: ExportedPipeline[];
    experiments?: ExportedExperiment[];
  };
  metadata?: {
    source: string;
    description?: string;
  };
}

interface ExportedPrompt {
  agent_id: string;
  prompt_type: string;
  content: string;
  version?: number;
}

interface ExportedAgentConfig {
  agent_id: string;
  name: string;
  model: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
}

interface ExportedPipeline {
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
}

interface ExportedExperiment {
  name: string;
  description?: string;
  agent_id: string;
  sample_size: number;
  metrics_to_track: string[];
  variants: {
    name: string;
    prompt_content: string;
    traffic_percentage: number;
  }[];
}

// GET /api/studio/export - Export configurations
export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id") || DEFAULT_USER_ID;
  const type = (searchParams.get("type") || "full") as ExportedConfig["type"];
  const format = searchParams.get("format") || "json"; // json or yaml
  const agentId = searchParams.get("agent_id"); // optional filter

  const exportData: ExportedConfig = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    user_id: userId,
    type,
    data: {},
    metadata: {
      source: "LLM-top Control Plane",
    },
  };

  try {
    // Export prompts
    if (type === "full" || type === "prompts") {
      if (supabase) {
        let query = supabase
          .from("llm_top_prompts")
          .select("agent_id, prompt_type, content, version")
          .eq("user_id", userId);

        if (agentId) {
          query = query.eq("agent_id", agentId);
        }

        const { data } = await query;
        exportData.data.prompts = data || [];
      } else {
        exportData.data.prompts = getDefaultPrompts();
      }
    }

    // Export agent configs
    if (type === "full" || type === "configs") {
      if (supabase) {
        let query = supabase
          .from("llm_top_agent_configs")
          .select("agent_id, name, model, temperature, max_tokens, enabled")
          .eq("user_id", userId);

        if (agentId) {
          query = query.eq("agent_id", agentId);
        }

        const { data } = await query;
        exportData.data.agent_configs = data || [];
      } else {
        exportData.data.agent_configs = getDefaultConfigs();
      }
    }

    // Export pipelines
    if (type === "full" || type === "pipelines") {
      if (supabase) {
        const { data } = await supabase
          .from("llm_top_pipelines")
          .select("name, description, nodes, edges")
          .eq("user_id", userId);

        exportData.data.pipelines = data || [];
      } else {
        exportData.data.pipelines = [];
      }
    }

    // Export experiments (without runs, just definitions)
    if (type === "full" || type === "experiments") {
      if (supabase) {
        let expQuery = supabase
          .from("llm_top_experiments")
          .select("id, name, description, agent_id, sample_size, metrics_to_track")
          .eq("user_id", userId);

        if (agentId) {
          expQuery = expQuery.eq("agent_id", agentId);
        }

        const { data: experiments } = await expQuery;

        if (experiments && experiments.length > 0) {
          const experimentsWithVariants = await Promise.all(
            experiments.map(async (exp) => {
              const { data: variants } = await supabase
                .from("llm_top_experiment_variants")
                .select("name, prompt_content, traffic_percentage")
                .eq("experiment_id", exp.id);

              return {
                name: exp.name,
                description: exp.description,
                agent_id: exp.agent_id,
                sample_size: exp.sample_size,
                metrics_to_track: exp.metrics_to_track,
                variants: variants || [],
              };
            })
          );
          exportData.data.experiments = experimentsWithVariants;
        } else {
          exportData.data.experiments = [];
        }
      } else {
        exportData.data.experiments = [];
      }
    }

    // Format output
    if (format === "yaml") {
      const yamlContent = convertToYaml(exportData);
      return new NextResponse(yamlContent, {
        headers: {
          "Content-Type": "application/x-yaml",
          "Content-Disposition": `attachment; filename="llm-top-config-${type}-${new Date().toISOString().split("T")[0]}.yaml"`,
        },
      });
    }

    // JSON format (default)
    const jsonContent = JSON.stringify(exportData, null, 2);
    return new NextResponse(jsonContent, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="llm-top-config-${type}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, error: "Export failed" },
      { status: 500 }
    );
  }
}

// Simple YAML converter (for basic structures)
function convertToYaml(obj: unknown, indent = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "string") {
    // Multi-line strings
    if (obj.includes("\n")) {
      const lines = obj.split("\n").map((line) => `${spaces}  ${line}`).join("\n");
      return `|\n${lines}`;
    }
    // Strings that need quoting
    if (obj.match(/[:#\[\]{},"'|>]/)) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj
      .map((item) => {
        const value = convertToYaml(item, indent + 1);
        if (typeof item === "object" && item !== null) {
          return `${spaces}- ${value.trim().replace(/^\n/, "")}`;
        }
        return `${spaces}- ${value}`;
      })
      .join("\n");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, value]) => {
        const yamlValue = convertToYaml(value, indent + 1);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${yamlValue}`;
        }
        if (Array.isArray(value) && value.length > 0) {
          return `${spaces}${key}:\n${yamlValue}`;
        }
        return `${spaces}${key}: ${yamlValue}`;
      })
      .join("\n");
  }

  return String(obj);
}

function getDefaultPrompts(): ExportedPrompt[] {
  return [
    {
      agent_id: "chatgpt",
      prompt_type: "system",
      content: "Ты логический аналитик...",
      version: 1,
    },
    {
      agent_id: "claude",
      prompt_type: "system",
      content: "Ты системный архитектор...",
      version: 1,
    },
    {
      agent_id: "gemini",
      prompt_type: "system",
      content: "Ты генератор альтернатив...",
      version: 1,
    },
    {
      agent_id: "deepseek",
      prompt_type: "system",
      content: "Ты формальный аналитик...",
      version: 1,
    },
  ];
}

function getDefaultConfigs(): ExportedAgentConfig[] {
  return [
    { agent_id: "chatgpt", name: "ChatGPT", model: "gpt-4o", temperature: 0.3, max_tokens: 4096, enabled: true },
    { agent_id: "claude", name: "Claude", model: "claude-3-5-sonnet-20241022", temperature: 0.3, max_tokens: 4096, enabled: true },
    { agent_id: "gemini", name: "Gemini", model: "gemini-2.0-flash", temperature: 0.5, max_tokens: 4096, enabled: true },
    { agent_id: "deepseek", name: "DeepSeek", model: "deepseek-chat", temperature: 0.2, max_tokens: 4096, enabled: true },
  ];
}
