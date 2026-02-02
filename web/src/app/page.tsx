"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type TaskType = "strategy" | "research" | "investment" | "development" | "audit";

interface AgentAnalysis {
  agent_name: string;
  confidence: number;
  analysis: string;
  key_points?: string[];
}

interface Conclusion {
  conclusion: string;
  probability: string;
}

interface Recommendation {
  option: string;
  description: string;
  pros?: string[];
  cons?: string[];
}

interface AnalysisResult {
  task: string;
  analyses: AgentAnalysis[];
  synthesis: {
    summary?: string;
    conclusions: Conclusion[];
    recommendations: Recommendation[];
    consensus_level: number;
  };
}

const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { value: "strategy", label: "Стратегия", description: "Рынки, конкуренты, бизнес-решения" },
  { value: "research", label: "Исследование", description: "Глубокий анализ любой темы" },
  { value: "investment", label: "Инвестиции", description: "Оценка проектов, риски, ROI" },
  { value: "development", label: "Разработка", description: "Архитектура, технические решения" },
  { value: "audit", label: "Аудит", description: "Проверка методологии, поиск ошибок" },
];

const AGENTS = [
  { id: "chatgpt", name: "ChatGPT", role: "Логика", color: "bg-green-500" },
  { id: "claude", name: "Claude", role: "Методология", color: "bg-purple-500" },
  { id: "gemini", name: "Gemini", role: "Альтернативы", color: "bg-blue-500" },
  { id: "deepseek", name: "DeepSeek", role: "Математика", color: "bg-orange-500" },
];

export default function Home() {
  const [task, setTask] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("strategy");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!task.trim()) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setActiveAgents([]);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 90));
    }, 1000);

    const agentInterval = setInterval(() => {
      setActiveAgents((prev) => {
        if (prev.length >= 4) return prev;
        const next = AGENTS[prev.length]?.id;
        return next ? [...prev, next] : prev;
      });
    }, 3000);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          task_type: taskType,
          max_iterations: 2,
        }),
      });

      clearInterval(progressInterval);
      clearInterval(agentInterval);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setProgress(100);
      setActiveAgents(data.analyses.map((a: AgentAnalysis) => a.agent_name.toLowerCase()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      clearInterval(progressInterval);
      clearInterval(agentInterval);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl">🧠</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">LLM-top</h1>
              <p className="text-xs text-slate-400">Мульти-агентный анализ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  activeAgents.includes(agent.id) || activeAgents.includes(agent.name.toLowerCase())
                    ? agent.color
                    : "bg-slate-700"
                }`}
                title={agent.name}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Input Section */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Новый анализ
            </CardTitle>
            <CardDescription>
              4 AI-агента проанализируют задачу с разных сторон и выработают консенсус
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Опишите задачу для анализа..."
              className="min-h-32 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              disabled={isAnalyzing}
            />

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-48">
                <label className="text-sm text-slate-400 mb-2 block">Тип анализа</label>
                <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {TASK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-800">
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-slate-400">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={runAnalysis}
                disabled={isAnalyzing || !task.trim()}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-8"
              >
                {isAnalyzing ? (
                  <>
                    <span className="animate-spin mr-2">⚡</span>
                    Анализ...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Анализировать
                  </>
                )}
              </Button>
            </div>

            {/* Progress */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Прогресс анализа</span>
                  <span className="text-slate-400">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex gap-2 flex-wrap">
                  {AGENTS.map((agent) => (
                    <Badge
                      key={agent.id}
                      variant={activeAgents.includes(agent.id) ? "default" : "outline"}
                      className={`transition-all duration-300 ${
                        activeAgents.includes(agent.id)
                          ? `${agent.color} text-white border-transparent`
                          : "border-slate-700 text-slate-500"
                      }`}
                    >
                      {agent.name}
                      {activeAgents.includes(agent.id) && " ✓"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-400">
                ❌ {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Card */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    Результаты анализа
                  </CardTitle>
                  <Badge
                    className={`text-lg px-4 py-1 ${
                      result.synthesis.consensus_level >= 0.8
                        ? "bg-green-600"
                        : result.synthesis.consensus_level >= 0.6
                        ? "bg-yellow-600"
                        : "bg-orange-600"
                    }`}
                  >
                    Консенсус: {Math.round(result.synthesis.consensus_level * 100)}%
                  </Badge>
                </div>
                <CardDescription className="text-slate-400">
                  Задача: {result.task.substring(0, 100)}...
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="conclusions" className="space-y-4">
              <TabsList className="bg-slate-900 border border-slate-800">
                <TabsTrigger value="conclusions" className="data-[state=active]:bg-violet-600">
                  Выводы
                </TabsTrigger>
                <TabsTrigger value="agents" className="data-[state=active]:bg-violet-600">
                  Агенты
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="data-[state=active]:bg-violet-600">
                  Рекомендации
                </TabsTrigger>
              </TabsList>

              {/* Conclusions */}
              <TabsContent value="conclusions" className="space-y-4">
                {result.synthesis.conclusions.map((conclusion, i) => (
                  <Card key={i} className="bg-slate-900/50 border-slate-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-white mb-2">{conclusion.conclusion}</p>
                          <Badge variant="outline" className="border-violet-600 text-violet-400">
                            Вероятность: {conclusion.probability}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Agents */}
              <TabsContent value="agents" className="grid gap-4 md:grid-cols-2">
                {result.analyses.map((analysis) => {
                  const agent = AGENTS.find(
                    (a) => a.name.toLowerCase() === analysis.agent_name.toLowerCase()
                  );
                  return (
                    <Card key={analysis.agent_name} className="bg-slate-900/50 border-slate-800">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${agent?.color || "bg-slate-600"}`} />
                            <CardTitle className="text-white text-lg">{analysis.agent_name}</CardTitle>
                          </div>
                          <Badge variant="outline" className="border-slate-600">
                            {Math.round(analysis.confidence * 100)}%
                          </Badge>
                        </div>
                        <CardDescription>{agent?.role}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-300 text-sm line-clamp-6">
                          {analysis.analysis.substring(0, 500)}...
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              {/* Recommendations */}
              <TabsContent value="recommendations" className="space-y-4">
                {result.synthesis.recommendations.map((rec, i) => (
                  <Card key={i} className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <span className="text-violet-400">💡</span>
                        {rec.option}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300 mb-4">{rec.description}</p>
                      {rec.pros && rec.pros.length > 0 && (
                        <div className="mb-2">
                          <span className="text-green-400 text-sm font-medium">Плюсы:</span>
                          <ul className="text-slate-400 text-sm ml-4">
                            {rec.pros.map((pro, j) => (
                              <li key={j}>+ {pro}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {rec.cons && rec.cons.length > 0 && (
                        <div>
                          <span className="text-red-400 text-sm font-medium">Минусы:</span>
                          <ul className="text-slate-400 text-sm ml-4">
                            {rec.cons.map((con, j) => (
                              <li key={j}>- {con}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty State */}
        {!result && !isAnalyzing && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-2">Готов к анализу</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Введите задачу выше, и 4 AI-агента проведут глубокий анализ с разных точек зрения
            </p>
            <Separator className="my-8 bg-slate-800" />
            <div className="flex justify-center gap-8 text-slate-500 text-sm flex-wrap">
              {AGENTS.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${agent.color}`} />
                  <span>{agent.name}</span>
                  <span className="text-slate-600">• {agent.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-16">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          LLM-top • Мульти-агентная аналитическая система • 4 AI = 1 консенсус
        </div>
      </footer>
    </div>
  );
}
