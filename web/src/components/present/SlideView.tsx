"use client";

import { Slide } from "./useSlideBuilder";
import { AGENTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Target, Lightbulb } from "lucide-react";

interface SlideViewProps {
  slide: Slide;
  slideNumber: number;
  totalSlides: number;
}

export function SlideView({ slide, slideNumber, totalSlides }: SlideViewProps) {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 lg:p-16">
      {/* Slide Content */}
      <div className="flex-1 flex flex-col justify-center">
        {slide.type === "title" && <TitleSlide slide={slide} />}
        {slide.type === "input" && <InputSlide slide={slide} />}
        {slide.type === "agent" && <AgentSlide slide={slide} />}
        {slide.type === "consensus" && <ConsensusSlide slide={slide} />}
        {slide.type === "synthesis" && <SynthesisSlide slide={slide} />}
        {slide.type === "conclusion" && <ConclusionSlide slide={slide} />}
        {slide.type === "recommendation" && <RecommendationSlide slide={slide} />}
      </div>

      {/* Slide Number */}
      <div className="text-center text-slate-500 text-sm">
        {slideNumber} / {totalSlides}
      </div>
    </div>
  );
}

function TitleSlide({ slide }: { slide: Slide }) {
  return (
    <div className="text-center">
      <div className="text-8xl mb-8">◈</div>
      <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
        {slide.title}
      </h1>
      {slide.subtitle && (
        <p className="text-xl lg:text-2xl text-violet-400">{slide.subtitle}</p>
      )}
    </div>
  );
}

function InputSlide({ slide }: { slide: Slide }) {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8">Задача анализа</h2>
      <div className="p-6 lg:p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
        <p className="text-xl lg:text-2xl text-slate-300 leading-relaxed whitespace-pre-wrap">
          {slide.content}
        </p>
      </div>
    </div>
  );
}

function AgentSlide({ slide }: { slide: Slide }) {
  const { analysis, agent, keyPoints, risks } = slide.data;
  const confidencePercent = Math.round(analysis.confidence * 100);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={cn("w-6 h-6 rounded-full", agent?.color || "bg-slate-500")} />
        <h2 className="text-3xl lg:text-4xl font-bold text-white">{slide.title}</h2>
        <Badge
          className={cn(
            "text-lg px-4 py-1",
            analysis.confidence >= 0.8 ? "bg-emerald-600" :
            analysis.confidence >= 0.6 ? "bg-amber-600" : "bg-red-600"
          )}
        >
          {confidencePercent}%
        </Badge>
      </div>

      {slide.subtitle && (
        <p className="text-xl text-slate-400 mb-8">{slide.subtitle}</p>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Key Points */}
        {keyPoints.length > 0 && (
          <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Ключевые моменты
            </h3>
            <ul className="space-y-3">
              {keyPoints.map((point: string, i: number) => (
                <li key={i} className="text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <div className="p-6 bg-amber-950/30 rounded-xl border border-amber-900/50">
            <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Выявленные риски
            </h3>
            <ul className="space-y-3">
              {risks.map((risk: string, i: number) => (
                <li key={i} className="text-amber-200/80 flex items-start gap-2">
                  <span className="text-amber-400 mt-1">⚠</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsensusSlide({ slide }: { slide: Slide }) {
  const { analyses, consensus } = slide.data;
  const consensusPercent = Math.round(consensus * 100);

  return (
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{slide.title}</h2>

      {/* Big Consensus Number */}
      <div className={cn(
        "text-8xl lg:text-9xl font-bold mb-8",
        consensus >= 0.8 ? "text-emerald-400" :
        consensus >= 0.6 ? "text-amber-400" : "text-red-400"
      )}>
        {consensusPercent}%
      </div>

      {/* Agent Confidence Bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {analyses.map((analysis: any) => {
          const agent = AGENTS.find(
            (a) => a.id === analysis.agent_name.toLowerCase() ||
                   a.name.toLowerCase() === analysis.agent_name.toLowerCase()
          );
          const conf = Math.round(analysis.confidence * 100);

          return (
            <div key={analysis.agent_name} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-3 h-3 rounded-full", agent?.color || "bg-slate-500")} />
                <span className="text-white font-medium">{analysis.agent_name}</span>
              </div>
              <Progress value={conf} className="h-2 mb-1" />
              <span className="text-sm text-slate-400">{conf}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SynthesisSlide({ slide }: { slide: Slide }) {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8">{slide.title}</h2>
      <div className="p-6 lg:p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
        <p className="text-xl lg:text-2xl text-slate-300 leading-relaxed whitespace-pre-wrap">
          {slide.content}
        </p>
      </div>
    </div>
  );
}

function ConclusionSlide({ slide }: { slide: Slide }) {
  const { conclusions } = slide.data;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <Target className="h-8 w-8 text-violet-400" />
        {slide.title}
      </h2>

      <div className="space-y-6">
        {conclusions.map((c: any, i: number) => (
          <div key={i} className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-xl text-white mb-2">{c.conclusion}</p>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="border-violet-500 text-violet-400">
                    {c.probability}
                  </Badge>
                  {c.falsification_condition && (
                    <span className="text-sm text-slate-500">
                      Falsifiable: {c.falsification_condition}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationSlide({ slide }: { slide: Slide }) {
  const { recommendations } = slide.data;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <Lightbulb className="h-8 w-8 text-amber-400" />
        {slide.title}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recommendations.slice(0, 4).map((rec: any, i: number) => (
          <div key={i} className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {i === 0 && <span className="text-amber-400">⭐</span>}
                {rec.option}
              </h3>
              {rec.score && (
                <Badge variant="outline" className="border-slate-600">
                  {rec.score}/10
                </Badge>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-3">{rec.description.slice(0, 150)}...</p>
            <div className="flex gap-4 text-xs">
              {rec.pros.length > 0 && (
                <span className="text-emerald-400">+{rec.pros.length} pros</span>
              )}
              {rec.cons.length > 0 && (
                <span className="text-red-400">-{rec.cons.length} cons</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
