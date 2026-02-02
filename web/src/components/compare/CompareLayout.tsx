"use client";

import { useState, useCallback, useMemo } from "react";
import { useSessionStore, Session } from "@/stores/sessionStore";
import { useUIStore } from "@/stores/uiStore";
import { SessionSelector } from "./SessionSelector";
import { SyncedScrollArea } from "./SyncedScrollArea";
import { DiffHighlighter, AgentConfidenceComparison } from "./DiffHighlighter";
import { AGENTS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GitCompare, Link2, Unlink2, Eye, EyeOff } from "lucide-react";

export function CompareLayout() {
  const { sessions, currentSession } = useSessionStore();
  const {
    compareSessionIds,
    setCompareSession,
    compareSyncScroll,
    toggleCompareSyncScroll,
    compareShowDiff,
    toggleCompareShowDiff,
  } = useUIStore();

  const [scrollTop, setScrollTop] = useState(0);

  // Find sessions by ID
  const allSessions = useMemo(() => {
    const list = [...sessions];
    if (currentSession && !list.find((s) => s.id === currentSession.id)) {
      list.unshift(currentSession);
    }
    return list;
  }, [sessions, currentSession]);

  const sessionA = allSessions.find((s) => s.id === compareSessionIds[0]) || null;
  const sessionB = allSessions.find((s) => s.id === compareSessionIds[1]) || null;

  const handleScroll = useCallback((top: number) => {
    setScrollTop(top);
  }, []);

  // No sessions available
  if (allSessions.filter((s) => s.analyses.length > 0).length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <GitCompare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Compare Sessions</h2>
          <p className="text-slate-400 max-w-md">
            Complete at least two analyses to compare sessions side by side.
            This feature helps identify differences in agent consensus, conclusions, and recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Session Selectors */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
              <SessionSelector
                value={compareSessionIds[0]}
                onChange={(id) => setCompareSession(0, id)}
                excludeId={compareSessionIds[1]}
                label="Session A"
              />
              <SessionSelector
                value={compareSessionIds[1]}
                onChange={(id) => setCompareSession(1, id)}
                excludeId={compareSessionIds[0]}
                label="Session B"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCompareSyncScroll}
                className={cn(
                  "border-slate-700",
                  compareSyncScroll && "bg-violet-600/20 border-violet-500"
                )}
                title="Sync scroll (S)"
              >
                {compareSyncScroll ? (
                  <Link2 className="h-4 w-4 mr-2" />
                ) : (
                  <Unlink2 className="h-4 w-4 mr-2" />
                )}
                Sync
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleCompareShowDiff}
                className={cn(
                  "border-slate-700",
                  compareShowDiff && "bg-violet-600/20 border-violet-500"
                )}
                title="Show diff (D)"
              >
                {compareShowDiff ? (
                  <Eye className="h-4 w-4 mr-2" />
                ) : (
                  <EyeOff className="h-4 w-4 mr-2" />
                )}
                Diff
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Diff Summary */}
      {sessionA && sessionB && compareShowDiff && (
        <div className="px-4 pt-4">
          <div className="max-w-6xl mx-auto">
            <DiffHighlighter
              sessionA={sessionA}
              sessionB={sessionB}
              showDiff={compareShowDiff}
            />
          </div>
        </div>
      )}

      {/* Comparison Panels */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-6xl mx-auto">
          {/* Session A */}
          <SyncedScrollArea
            syncEnabled={compareSyncScroll}
            scrollTop={scrollTop}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto pr-2"
          >
            <SessionPanel session={sessionA} label="A" otherSession={sessionB} showDiff={compareShowDiff} />
          </SyncedScrollArea>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-slate-800" />

          {/* Session B */}
          <SyncedScrollArea
            syncEnabled={compareSyncScroll}
            scrollTop={scrollTop}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto pr-2"
          >
            <SessionPanel session={sessionB} label="B" otherSession={sessionA} showDiff={compareShowDiff} />
          </SyncedScrollArea>
        </div>
      </div>
    </div>
  );
}

interface SessionPanelProps {
  session: Session | null;
  label: string;
  otherSession: Session | null;
  showDiff: boolean;
}

function SessionPanel({ session, label, otherSession, showDiff }: SessionPanelProps) {
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-slate-700 rounded-lg">
        <div className="text-center text-slate-500">
          <GitCompare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select Session {label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm py-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {label}
          </Badge>
          <span className="text-white font-medium">#{session.id.slice(0, 8)}</span>
          <Badge
            className={cn(
              "ml-auto",
              session.metrics.consensus >= 0.8 ? "bg-emerald-600" :
              session.metrics.consensus >= 0.6 ? "bg-amber-600" : "bg-red-600"
            )}
          >
            {Math.round(session.metrics.consensus * 100)}%
          </Badge>
        </div>
      </div>

      {/* Input */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <h4 className="text-sm text-slate-500 uppercase tracking-wider mb-2">Input</h4>
          <p className="text-slate-300 text-sm">{session.task}</p>
        </CardContent>
      </Card>

      {/* Agent Confidence Comparison */}
      {session.analyses.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <h4 className="text-sm text-slate-500 uppercase tracking-wider mb-3">Agent Confidence</h4>
            <AgentConfidenceComparison
              sessionA={label === "A" ? session : otherSession}
              sessionB={label === "B" ? session : otherSession}
              showDiff={showDiff && !!otherSession}
            />
          </CardContent>
        </Card>
      )}

      {/* Synthesis */}
      {session.synthesis?.summary && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <h4 className="text-sm text-slate-500 uppercase tracking-wider mb-2">Synthesis</h4>
            <p className="text-slate-300 text-sm">{session.synthesis.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Conclusions */}
      {session.synthesis?.conclusions && session.synthesis.conclusions.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <h4 className="text-sm text-slate-500 uppercase tracking-wider mb-3">
              Conclusions ({session.synthesis.conclusions.length})
            </h4>
            <ul className="space-y-2">
              {session.synthesis.conclusions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-slate-300">{c.conclusion}</p>
                    <Badge variant="outline" className="mt-1 text-xs border-violet-500 text-violet-400">
                      {c.probability}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {session.synthesis?.recommendations && session.synthesis.recommendations.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <h4 className="text-sm text-slate-500 uppercase tracking-wider mb-3">
              Recommendations ({session.synthesis.recommendations.length})
            </h4>
            <div className="space-y-3">
              {session.synthesis.recommendations.map((rec, i) => (
                <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white text-sm flex items-center gap-1">
                      {i === 0 && <span className="text-amber-400">⭐</span>}
                      {rec.option}
                    </span>
                    {rec.score && (
                      <Badge variant="outline" className="text-xs">{rec.score}/10</Badge>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs">{rec.description.slice(0, 100)}...</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <h4 className="text-sm text-slate-500 uppercase tracking-wider mb-2">Metrics</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-white">
                {session.metrics.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">Tokens</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                ${session.metrics.totalCost.toFixed(3)}
              </div>
              <div className="text-xs text-slate-500">Cost</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {session.analyses.length}
              </div>
              <div className="text-xs text-slate-500">Agents</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
