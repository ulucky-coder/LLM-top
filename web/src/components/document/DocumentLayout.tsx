"use client";

import { useSessionStore } from "@/stores/sessionStore";
import { useUIStore } from "@/stores/uiStore";
import { AGENTS } from "@/lib/constants";
import { CollapsibleSection } from "./CollapsibleSection";
import { ExportToolbar } from "./ExportToolbar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, AlertCircle } from "lucide-react";

export function DocumentLayout() {
  const { currentSession } = useSessionStore();
  const { expandedSections, toggleSection } = useUIStore();

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Сессия не выбрана</h2>
          <p className="text-slate-400">
            Начните новый анализ или выберите сессию для просмотра в режиме документа
          </p>
        </div>
      </div>
    );
  }

  const { analyses, synthesis, metrics, task, taskType } = currentSession;
  const hasResults = analyses.length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Export Toolbar */}
      <ExportToolbar />

      {/* Document Content */}
      <article className="max-w-3xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {/* Title */}
        <header className="mb-8 pb-6 border-b border-slate-800">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Анализ: {task.slice(0, 50)}{task.length > 50 ? "..." : ""}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <Badge variant="outline" className="capitalize">{taskType}</Badge>
            <span>Session #{currentSession.id.slice(0, 8)}</span>
            {hasResults && (
              <Badge
                className={cn(
                  metrics.consensus >= 0.8 ? "bg-emerald-600" :
                  metrics.consensus >= 0.6 ? "bg-amber-600" : "bg-red-600"
                )}
              >
                {Math.round(metrics.consensus * 100)}% Consensus
              </Badge>
            )}
          </div>
        </header>

        {/* Input Section */}
        <CollapsibleSection
          id="input"
          title="Ввод"
          defaultExpanded={true}
          isExpanded={expandedSections.has("input")}
          onToggle={() => toggleSection("input")}
        >
          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{task}</p>
        </CollapsibleSection>

        {/* Agent Analyses */}
        {hasResults && (
          <CollapsibleSection
            id="agents"
            title={`Анализы агентов (${analyses.length})`}
            defaultExpanded={true}
            isExpanded={expandedSections.has("agents")}
            onToggle={() => toggleSection("agents")}
          >
            <div className="space-y-6">
              {analyses.map((analysis, index) => {
                const agent = AGENTS.find(
                  (a) => a.id === analysis.agent_name.toLowerCase() ||
                         a.name.toLowerCase() === analysis.agent_name.toLowerCase()
                );
                const confidencePercent = Math.round(analysis.confidence * 100);

                return (
                  <div key={analysis.agent_name} className="pb-6 border-b border-slate-800 last:border-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("w-3 h-3 rounded-full", agent?.color || "bg-slate-500")} />
                      <h4 className="font-semibold text-white">{analysis.agent_name}</h4>
                      <span className="text-sm text-slate-500">({agent?.role})</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-auto",
                          analysis.confidence >= 0.8 ? "border-emerald-500 text-emerald-400" :
                          analysis.confidence >= 0.6 ? "border-amber-500 text-amber-400" :
                          "border-red-500 text-red-400"
                        )}
                      >
                        {confidencePercent}% уверенность
                      </Badge>
                    </div>

                    <div className="prose prose-slate prose-invert max-w-none">
                      <p className="text-slate-300 whitespace-pre-wrap">{analysis.analysis}</p>
                    </div>

                    {analysis.key_points.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-slate-400 mb-2">Ключевые моменты</h5>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                          {analysis.key_points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.risks.length > 0 && (
                      <div className="mt-4 p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg">
                        <h5 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Выявленные риски
                        </h5>
                        <ul className="list-disc list-inside space-y-1 text-amber-200/80">
                          {analysis.risks.map((risk, i) => (
                            <li key={i}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Synthesis */}
        {synthesis?.summary && (
          <CollapsibleSection
            id="synthesis"
            title="Синтез"
            defaultExpanded={true}
            isExpanded={expandedSections.has("synthesis")}
            onToggle={() => toggleSection("synthesis")}
          >
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{synthesis.summary}</p>
          </CollapsibleSection>
        )}

        {/* Conclusions */}
        {synthesis && synthesis.conclusions.length > 0 && (
          <CollapsibleSection
            id="conclusions"
            title={`Выводы (${synthesis.conclusions.length})`}
            defaultExpanded={true}
            isExpanded={expandedSections.has("conclusions")}
            onToggle={() => toggleSection("conclusions")}
          >
            <ol className="space-y-4">
              {synthesis.conclusions.map((conclusion, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-slate-300">{conclusion.conclusion}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-sm">
                      <Badge variant="outline" className="border-violet-500 text-violet-400">
                        {conclusion.probability}
                      </Badge>
                      {conclusion.falsification_condition && (
                        <span className="text-slate-500">
                          Фальсифицируемо: {conclusion.falsification_condition}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CollapsibleSection>
        )}

        {/* Recommendations */}
        {synthesis && synthesis.recommendations.length > 0 && (
          <CollapsibleSection
            id="recommendations"
            title={`Рекомендации (${synthesis.recommendations.length})`}
            defaultExpanded={true}
            isExpanded={expandedSections.has("recommendations")}
            onToggle={() => toggleSection("recommendations")}
          >
            <div className="space-y-6">
              {synthesis.recommendations.map((rec, i) => (
                <div key={i} className="pb-4 border-b border-slate-800 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      {i === 0 && <span className="text-amber-400">⭐</span>}
                      {rec.option}
                    </h4>
                    {rec.score && (
                      <Badge variant="outline" className="border-slate-600">
                        Оценка: {rec.score}/10
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-300 mb-3">{rec.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {rec.pros.length > 0 && (
                      <div>
                        <span className="text-emerald-400 font-medium">Плюсы:</span>
                        <ul className="mt-1 space-y-1">
                          {rec.pros.map((pro, j) => (
                            <li key={j} className="text-slate-400">+ {pro}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {rec.cons.length > 0 && (
                      <div>
                        <span className="text-red-400 font-medium">Минусы:</span>
                        <ul className="mt-1 space-y-1">
                          {rec.cons.map((con, j) => (
                            <li key={j} className="text-slate-400">- {con}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-800 text-sm text-slate-500">
          <p>Создано в LLM-top Мульти-агентная система анализа</p>
          <p>Сессия: {currentSession.id} | Создано: {currentSession.createdAt.toLocaleString()}</p>
        </footer>
      </article>
    </div>
  );
}
