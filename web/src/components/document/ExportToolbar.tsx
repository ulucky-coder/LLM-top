"use client";

import { useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileJson, Printer, Copy, Check } from "lucide-react";

export function ExportToolbar() {
  const { currentSession } = useSessionStore();
  const [copied, setCopied] = useState(false);

  if (!currentSession) return null;

  const exportAsMarkdown = () => {
    const md = generateMarkdown(currentSession);
    downloadFile(md, `analysis-${currentSession.id.slice(0, 8)}.md`, "text/markdown");
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(currentSession, null, 2);
    downloadFile(json, `analysis-${currentSession.id.slice(0, 8)}.json`, "application/json");
  };

  const copyToClipboard = async () => {
    const md = generateMarkdown(currentSession);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const print = () => {
    window.print();
  };

  return (
    <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <span className="text-sm text-slate-400">Document Mode</span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="text-slate-400 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
              <DropdownMenuItem onClick={exportAsMarkdown} className="text-slate-300 hover:text-white hover:bg-slate-800">
                <FileText className="h-4 w-4 mr-2" />
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsJSON} className="text-slate-300 hover:text-white hover:bg-slate-800">
                <FileJson className="h-4 w-4 mr-2" />
                JSON (.json)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem onClick={print} className="text-slate-300 hover:text-white hover:bg-slate-800">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function generateMarkdown(session: any): string {
  const lines: string[] = [];

  lines.push(`# Analysis: ${session.task.slice(0, 100)}`);
  lines.push("");
  lines.push(`**Type:** ${session.taskType}`);
  lines.push(`**Session:** ${session.id}`);
  lines.push(`**Consensus:** ${Math.round(session.metrics.consensus * 100)}%`);
  lines.push(`**Created:** ${new Date(session.createdAt).toLocaleString()}`);
  lines.push("");

  lines.push("## Input");
  lines.push("");
  lines.push(session.task);
  lines.push("");

  if (session.analyses.length > 0) {
    lines.push("## Agent Analyses");
    lines.push("");

    for (const analysis of session.analyses) {
      lines.push(`### ${analysis.agent_name} (${Math.round(analysis.confidence * 100)}% confidence)`);
      lines.push("");
      lines.push(analysis.analysis);
      lines.push("");

      if (analysis.key_points.length > 0) {
        lines.push("**Key Points:**");
        for (const point of analysis.key_points) {
          lines.push(`- ${point}`);
        }
        lines.push("");
      }

      if (analysis.risks.length > 0) {
        lines.push("**Risks:**");
        for (const risk of analysis.risks) {
          lines.push(`- ${risk}`);
        }
        lines.push("");
      }
    }
  }

  if (session.synthesis) {
    if (session.synthesis.summary) {
      lines.push("## Synthesis");
      lines.push("");
      lines.push(session.synthesis.summary);
      lines.push("");
    }

    if (session.synthesis.conclusions.length > 0) {
      lines.push("## Conclusions");
      lines.push("");
      for (let i = 0; i < session.synthesis.conclusions.length; i++) {
        const c = session.synthesis.conclusions[i];
        lines.push(`${i + 1}. **${c.conclusion}** (${c.probability})`);
        if (c.falsification_condition) {
          lines.push(`   - Falsifiable: ${c.falsification_condition}`);
        }
      }
      lines.push("");
    }

    if (session.synthesis.recommendations.length > 0) {
      lines.push("## Recommendations");
      lines.push("");
      for (const rec of session.synthesis.recommendations) {
        lines.push(`### ${rec.option}${rec.score ? ` (Score: ${rec.score}/10)` : ""}`);
        lines.push("");
        lines.push(rec.description);
        lines.push("");
        if (rec.pros.length > 0) {
          lines.push("**Pros:**");
          for (const pro of rec.pros) {
            lines.push(`- ${pro}`);
          }
        }
        if (rec.cons.length > 0) {
          lines.push("**Cons:**");
          for (const con of rec.cons) {
            lines.push(`- ${con}`);
          }
        }
        lines.push("");
      }
    }
  }

  lines.push("---");
  lines.push("*Generated with LLM-top Multi-Agent Analysis System*");

  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
