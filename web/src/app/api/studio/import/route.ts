import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const DEFAULT_USER_ID = "default";

// Validation schemas
interface ImportedConfig {
  version: string;
  exported_at?: string;
  user_id?: string;
  type: "full" | "prompts" | "configs" | "pipelines" | "experiments";
  data: {
    prompts?: ImportedPrompt[];
    agent_configs?: ImportedAgentConfig[];
    pipelines?: ImportedPipeline[];
    experiments?: ImportedExperiment[];
  };
}

interface ImportedPrompt {
  agent_id: string;
  prompt_type: string;
  content: string;
}

interface ImportedAgentConfig {
  agent_id: string;
  name?: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  enabled?: boolean;
}

interface ImportedPipeline {
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
}

interface ImportedExperiment {
  name: string;
  description?: string;
  agent_id: string;
  sample_size?: number;
  metrics_to_track?: string[];
  variants?: {
    name: string;
    prompt_content: string;
    traffic_percentage?: number;
  }[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    prompts: number;
    configs: number;
    pipelines: number;
    experiments: number;
  };
}

// POST /api/studio/import - Import configurations
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id") || DEFAULT_USER_ID;
  const mode = searchParams.get("mode") || "merge"; // merge, replace, validate-only
  const dryRun = searchParams.get("dry_run") === "true";

  try {
    const contentType = request.headers.get("content-type") || "";
    let importData: ImportedConfig;

    // Parse input based on content type
    if (contentType.includes("application/json")) {
      importData = await request.json();
    } else if (contentType.includes("text/plain") || contentType.includes("application/x-yaml")) {
      const text = await request.text();
      importData = parseYaml(text);
    } else {
      // Try to detect format from content
      const text = await request.text();
      try {
        importData = JSON.parse(text);
      } catch {
        importData = parseYaml(text);
      }
    }

    // Validate the imported data
    const validation = validateImport(importData);

    if (mode === "validate-only" || dryRun) {
      return NextResponse.json({
        success: true,
        validation,
        message: "Validation complete",
      });
    }

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        validation,
        error: "Validation failed",
      }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        validation,
        message: "Import simulated (no database)",
        imported: validation.summary,
      });
    }

    // Perform the import
    const results = {
      prompts: { imported: 0, skipped: 0, errors: 0 },
      configs: { imported: 0, skipped: 0, errors: 0 },
      pipelines: { imported: 0, skipped: 0, errors: 0 },
      experiments: { imported: 0, skipped: 0, errors: 0 },
    };

    // Import prompts
    if (importData.data.prompts && importData.data.prompts.length > 0) {
      for (const prompt of importData.data.prompts) {
        try {
          if (mode === "replace") {
            // Delete existing first
            await supabase
              .from("llm_top_prompts")
              .delete()
              .eq("user_id", userId)
              .eq("agent_id", prompt.agent_id)
              .eq("prompt_type", prompt.prompt_type);
          }

          const { error } = await supabase.from("llm_top_prompts").upsert(
            {
              user_id: userId,
              agent_id: prompt.agent_id,
              prompt_type: prompt.prompt_type,
              content: prompt.content,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,agent_id,prompt_type" }
          );

          if (error) {
            results.prompts.errors++;
          } else {
            results.prompts.imported++;
          }
        } catch {
          results.prompts.errors++;
        }
      }
    }

    // Import agent configs
    if (importData.data.agent_configs && importData.data.agent_configs.length > 0) {
      for (const config of importData.data.agent_configs) {
        try {
          if (mode === "replace") {
            await supabase
              .from("llm_top_agent_configs")
              .delete()
              .eq("user_id", userId)
              .eq("agent_id", config.agent_id);
          }

          const { error } = await supabase.from("llm_top_agent_configs").upsert(
            {
              user_id: userId,
              agent_id: config.agent_id,
              name: config.name || config.agent_id,
              model: config.model,
              temperature: config.temperature ?? 0.3,
              max_tokens: config.max_tokens ?? 4096,
              enabled: config.enabled ?? true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,agent_id" }
          );

          if (error) {
            results.configs.errors++;
          } else {
            results.configs.imported++;
          }
        } catch {
          results.configs.errors++;
        }
      }
    }

    // Import pipelines
    if (importData.data.pipelines && importData.data.pipelines.length > 0) {
      for (const pipeline of importData.data.pipelines) {
        try {
          if (mode === "replace") {
            await supabase
              .from("llm_top_pipelines")
              .delete()
              .eq("user_id", userId)
              .eq("name", pipeline.name);
          }

          const { error } = await supabase.from("llm_top_pipelines").insert({
            user_id: userId,
            name: pipeline.name,
            description: pipeline.description,
            nodes: pipeline.nodes,
            edges: pipeline.edges,
          });

          if (error) {
            // Try update if insert fails
            const { error: updateError } = await supabase
              .from("llm_top_pipelines")
              .update({
                description: pipeline.description,
                nodes: pipeline.nodes,
                edges: pipeline.edges,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
              .eq("name", pipeline.name);

            if (updateError) {
              results.pipelines.errors++;
            } else {
              results.pipelines.imported++;
            }
          } else {
            results.pipelines.imported++;
          }
        } catch {
          results.pipelines.errors++;
        }
      }
    }

    // Import experiments
    if (importData.data.experiments && importData.data.experiments.length > 0) {
      for (const exp of importData.data.experiments) {
        try {
          // Create experiment
          const { data: newExp, error: expError } = await supabase
            .from("llm_top_experiments")
            .insert({
              user_id: userId,
              name: exp.name,
              description: exp.description,
              agent_id: exp.agent_id,
              sample_size: exp.sample_size ?? 10,
              metrics_to_track: exp.metrics_to_track ?? ["quality", "latency", "cost"],
              status: "draft",
            })
            .select("id")
            .single();

          if (expError || !newExp) {
            results.experiments.errors++;
            continue;
          }

          // Create variants
          if (exp.variants && exp.variants.length > 0) {
            const variantData = exp.variants.map((v, i) => ({
              experiment_id: newExp.id,
              name: v.name || `Variant ${String.fromCharCode(65 + i)}`,
              prompt_content: v.prompt_content,
              traffic_percentage: v.traffic_percentage ?? Math.floor(100 / exp.variants!.length),
            }));

            await supabase.from("llm_top_experiment_variants").insert(variantData);
          }

          results.experiments.imported++;
        } catch {
          results.experiments.errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      validation,
      results,
      message: "Import completed",
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, error: "Import failed: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}

// Simple YAML parser (for basic structures)
function parseYaml(text: string): ImportedConfig {
  const lines = text.split("\n");
  const result: Record<string, unknown> = {};
  const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: result, indent: -1 }];
  let currentKey = "";
  let multilineValue = "";
  let inMultiline = false;
  let multilineIndent = 0;

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) {
      if (inMultiline) {
        multilineValue += "\n";
      }
      continue;
    }

    const indent = line.search(/\S/);

    // Handle multiline strings
    if (inMultiline) {
      if (indent > multilineIndent) {
        multilineValue += (multilineValue ? "\n" : "") + line.slice(multilineIndent + 2);
        continue;
      } else {
        // End of multiline
        const parent = stack[stack.length - 1].obj;
        parent[currentKey] = multilineValue;
        inMultiline = false;
        multilineValue = "";
      }
    }

    // Pop stack for dedented lines
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const content = line.trim();
    const parent = stack[stack.length - 1].obj;

    // Array item
    if (content.startsWith("- ")) {
      const value = content.slice(2).trim();
      if (!Array.isArray(parent[currentKey])) {
        parent[currentKey] = [];
      }

      if (value.includes(": ")) {
        // Object in array
        const obj: Record<string, unknown> = {};
        const [k, v] = value.split(/:\s*(.+)/);
        obj[k] = parseValue(v);
        (parent[currentKey] as unknown[]).push(obj);
        stack.push({ obj: obj, indent });
      } else if (value) {
        (parent[currentKey] as unknown[]).push(parseValue(value));
      } else {
        // Start of object in array
        const obj: Record<string, unknown> = {};
        (parent[currentKey] as unknown[]).push(obj);
        stack.push({ obj: obj, indent });
      }
      continue;
    }

    // Key-value pair
    const colonIndex = content.indexOf(":");
    if (colonIndex > 0) {
      const key = content.slice(0, colonIndex).trim();
      const value = content.slice(colonIndex + 1).trim();

      if (value === "" || value === ">") {
        // Nested object or empty
        parent[key] = {};
        stack.push({ obj: parent[key] as Record<string, unknown>, indent });
        currentKey = key;
      } else if (value === "|") {
        // Multiline string
        inMultiline = true;
        multilineIndent = indent;
        multilineValue = "";
        currentKey = key;
      } else if (value === "[]") {
        parent[key] = [];
        currentKey = key;
      } else if (value === "{}") {
        parent[key] = {};
      } else {
        parent[key] = parseValue(value);
      }
      currentKey = key;
    }
  }

  // Handle final multiline value
  if (inMultiline && multilineValue) {
    const parent = stack[stack.length - 1].obj;
    parent[currentKey] = multilineValue;
  }

  return result as unknown as ImportedConfig;
}

function parseValue(value: string): unknown {
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.match(/^-?\d+$/)) return parseInt(value, 10);
  if (value.match(/^-?\d+\.\d+$/)) return parseFloat(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    // Simple array parsing
    const inner = value.slice(1, -1);
    if (!inner.trim()) return [];
    return inner.split(",").map((item) => parseValue(item.trim()));
  }
  return value;
}

function validateImport(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const summary = { prompts: 0, configs: 0, pipelines: 0, experiments: 0 };

  if (!data || typeof data !== "object") {
    errors.push("Invalid import data: expected object");
    return { valid: false, errors, warnings, summary };
  }

  const config = data as ImportedConfig;

  // Check version
  if (!config.version) {
    warnings.push("Missing version field, assuming compatible format");
  }

  // Check data object
  if (!config.data || typeof config.data !== "object") {
    errors.push("Missing or invalid 'data' field");
    return { valid: false, errors, warnings, summary };
  }

  // Validate prompts
  if (config.data.prompts) {
    if (!Array.isArray(config.data.prompts)) {
      errors.push("'prompts' must be an array");
    } else {
      for (const [i, prompt] of config.data.prompts.entries()) {
        if (!prompt.agent_id) errors.push(`Prompt ${i}: missing agent_id`);
        if (!prompt.prompt_type) errors.push(`Prompt ${i}: missing prompt_type`);
        if (!prompt.content) errors.push(`Prompt ${i}: missing content`);
        if (prompt.agent_id && prompt.prompt_type && prompt.content) {
          summary.prompts++;
        }
      }
    }
  }

  // Validate agent configs
  if (config.data.agent_configs) {
    if (!Array.isArray(config.data.agent_configs)) {
      errors.push("'agent_configs' must be an array");
    } else {
      for (const [i, cfg] of config.data.agent_configs.entries()) {
        if (!cfg.agent_id) errors.push(`Config ${i}: missing agent_id`);
        if (!cfg.model) errors.push(`Config ${i}: missing model`);
        if (cfg.agent_id && cfg.model) {
          summary.configs++;
        }
      }
    }
  }

  // Validate pipelines
  if (config.data.pipelines) {
    if (!Array.isArray(config.data.pipelines)) {
      errors.push("'pipelines' must be an array");
    } else {
      for (const [i, pipeline] of config.data.pipelines.entries()) {
        if (!pipeline.name) errors.push(`Pipeline ${i}: missing name`);
        if (!Array.isArray(pipeline.nodes)) warnings.push(`Pipeline ${i}: nodes is not an array`);
        if (!Array.isArray(pipeline.edges)) warnings.push(`Pipeline ${i}: edges is not an array`);
        if (pipeline.name) {
          summary.pipelines++;
        }
      }
    }
  }

  // Validate experiments
  if (config.data.experiments) {
    if (!Array.isArray(config.data.experiments)) {
      errors.push("'experiments' must be an array");
    } else {
      for (const [i, exp] of config.data.experiments.entries()) {
        if (!exp.name) errors.push(`Experiment ${i}: missing name`);
        if (!exp.agent_id) errors.push(`Experiment ${i}: missing agent_id`);
        if (exp.variants && !Array.isArray(exp.variants)) {
          errors.push(`Experiment ${i}: variants must be an array`);
        }
        if (exp.name && exp.agent_id) {
          summary.experiments++;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}
