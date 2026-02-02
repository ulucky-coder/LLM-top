"use client";

import { useSessionStore, Session } from "@/stores/sessionStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SessionSelectorProps {
  value: string | null;
  onChange: (sessionId: string | null) => void;
  excludeId?: string | null;
  label: string;
}

export function SessionSelector({ value, onChange, excludeId, label }: SessionSelectorProps) {
  const { sessions, currentSession } = useSessionStore();

  // Combine current session with history, excluding the specified ID
  const allSessions = [
    ...(currentSession ? [currentSession] : []),
    ...sessions.filter((s) => s.id !== currentSession?.id),
  ].filter((s) => s.id !== excludeId && s.analyses.length > 0);

  return (
    <div className="w-full">
      <label className="text-sm text-slate-400 mb-2 block">{label}</label>
      <Select value={value || ""} onValueChange={(v) => onChange(v || null)}>
        <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
          <SelectValue placeholder="Выберите сессию" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
          {allSessions.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Нет завершённых сессий
            </div>
          ) : (
            allSessions.map((session) => (
              <SelectItem
                key={session.id}
                value={session.id}
                className="text-white hover:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs shrink-0",
                      session.metrics.consensus >= 0.8 ? "border-emerald-500 text-emerald-400" :
                      session.metrics.consensus >= 0.6 ? "border-amber-500 text-amber-400" :
                      "border-red-500 text-red-400"
                    )}
                  >
                    {Math.round(session.metrics.consensus * 100)}%
                  </Badge>
                  <div className="truncate">
                    <span className="text-white">#{session.id.slice(0, 8)}</span>
                    <span className="text-slate-400 ml-2">
                      {session.task.slice(0, 30)}{session.task.length > 30 ? "..." : ""}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
