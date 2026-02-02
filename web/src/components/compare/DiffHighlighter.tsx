"use client";

import { useMemo } from "react";
import { Session, AgentAnalysis } from "@/stores/sessionStore";
import { AGENTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, AlertTriangle } from "lucide-react";

interface DiffHighlighterProps {
  sessionA: Session | null;
  sessionB: Session | null;
  showDiff: boolean;
}

interface DiffResult {
  field: string;
  valueA: string | number;
  valueB: string | number;
  change: "increase" | "decrease" | "same" | "different";
  percentChange?: number;
}

export function DiffHighlighter({ sessionA, sessionB, showDiff }: DiffHighlighterProps) {
  const diffs = useMemo(() => {
    if (!sessionA || !sessionB || !showDiff) return [];

    const results: DiffResult[] = [];

    // Compare consensus
    const consensusDiff = sessionB.metrics.consensus - sessionA.metrics.consensus;
    results.push({
      field: "Consensus",
      valueA: Math.round(sessionA.metrics.consensus * 100),
      valueB: Math.round(sessionB.metrics.consensus * 100),
      change: consensusDiff > 0.01 ? "increase" : consensusDiff < -0.01 ? "decrease" : "same",
      percentChange: Math.round(consensusDiff * 100),
    });

    // Compare total cost
    const costDiff = sessionB.metrics.totalCost - sessionA.metrics.totalCost;
    results.push({
      field: "Total Cost",
      valueA: sessionA.metrics.totalCost,
      valueB: sessionB.metrics.totalCost,
      change: costDiff > 0.001 ? "increase" : costDiff < -0.001 ? "decrease" : "same",
    });

    // Compare conclusions count
    const conclusionsA = sessionA.synthesis?.conclusions.length || 0;
    const conclusionsB = sessionB.synthesis?.conclusions.length || 0;
    results.push({
      field: "Conclusions",
      valueA: conclusionsA,
      valueB: conclusionsB,
      change: conclusionsB > conclusionsA ? "increase" : conclusionsB < conclusionsA ? "decrease" : "same",
    });

    // Compare recommendations count
    const recsA = sessionA.synthesis?.recommendations.length || 0;
    const recsB = sessionB.synthesis?.recommendations.length || 0;
    results.push({
      field: "Recommendations",
      valueA: recsA,
      valueB: recsB,
      change: recsB > recsA ? "increase" : recsB < recsA ? "decrease" : "same",
    });

    return results;
  }, [sessionA, sessionB, showDiff]);

  if (!showDiff || !sessionA || !sessionB) return null;

  return (
    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg mb-4">
      <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Differences Detected
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {diffs.map((diff) => (
          <DiffBadge key={diff.field} diff={diff} />
        ))}
      </div>
    </div>
  );
}

function DiffBadge({ diff }: { diff: DiffResult }) {
  const Icon = {
    increase: ArrowUp,
    decrease: ArrowDown,
    same: Minus,
    different: AlertTriangle,
  }[diff.change];

  const colorClass = {
    increase: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    decrease: "text-red-400 bg-red-500/10 border-red-500/30",
    same: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    different: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  }[diff.change];

  return (
    <div className={cn("p-2 rounded border", colorClass)}>
      <div className="flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">{diff.field}</span>
      </div>
      <div className="text-sm">
        {typeof diff.valueA === "number" && typeof diff.valueB === "number" ? (
          <>
            {diff.field === "Total Cost" ? (
              <span>${diff.valueA.toFixed(3)} → ${diff.valueB.toFixed(3)}</span>
            ) : diff.field === "Consensus" ? (
              <span>{diff.valueA}% → {diff.valueB}%</span>
            ) : (
              <span>{diff.valueA} → {diff.valueB}</span>
            )}
          </>
        ) : (
          <span className="truncate">{String(diff.valueA)} → {String(diff.valueB)}</span>
        )}
      </div>
    </div>
  );
}

// Agent confidence comparison
export function AgentConfidenceComparison({
  sessionA,
  sessionB,
  showDiff,
}: {
  sessionA: Session | null;
  sessionB: Session | null;
  showDiff: boolean;
}) {
  if (!sessionA || !sessionB) return null;

  const agentComparisons = AGENTS.map((agent) => {
    const analysisA = sessionA.analyses.find(
      (a) => a.agent_name.toLowerCase() === agent.id || a.agent_name.toLowerCase() === agent.name.toLowerCase()
    );
    const analysisB = sessionB.analyses.find(
      (a) => a.agent_name.toLowerCase() === agent.id || a.agent_name.toLowerCase() === agent.name.toLowerCase()
    );

    const confA = analysisA?.confidence || 0;
    const confB = analysisB?.confidence || 0;
    const diff = confB - confA;

    return {
      agent,
      confA: Math.round(confA * 100),
      confB: Math.round(confB * 100),
      diff: Math.round(diff * 100),
      hasA: !!analysisA,
      hasB: !!analysisB,
    };
  });

  return (
    <div className="space-y-2">
      {agentComparisons.map((comp) => (
        <div key={comp.agent.id} className="flex items-center gap-3 p-2 bg-slate-900/30 rounded">
          <div className={cn("w-3 h-3 rounded-full", comp.agent.color)} />
          <span className="text-sm text-white flex-1">{comp.agent.name}</span>

          <div className="flex items-center gap-2 text-sm">
            <span className={cn("w-12 text-right", !comp.hasA && "text-slate-600")}>
              {comp.hasA ? `${comp.confA}%` : "—"}
            </span>

            {showDiff && comp.hasA && comp.hasB && (
              <span className={cn(
                "w-16 text-center text-xs px-1.5 py-0.5 rounded",
                comp.diff > 0 ? "bg-emerald-500/20 text-emerald-400" :
                comp.diff < 0 ? "bg-red-500/20 text-red-400" :
                "bg-slate-500/20 text-slate-400"
              )}>
                {comp.diff > 0 ? "+" : ""}{comp.diff}%
              </span>
            )}

            <span className={cn("w-12 text-right", !comp.hasB && "text-slate-600")}>
              {comp.hasB ? `${comp.confB}%` : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
