import { Session, AgentAnalysis, Conclusion, Recommendation } from "@/stores/sessionStore";
import { AGENTS } from "@/lib/constants";

export interface Slide {
  id: string;
  type: "title" | "input" | "agent" | "consensus" | "synthesis" | "conclusion" | "recommendation";
  title: string;
  subtitle?: string;
  content?: string;
  data?: any;
  notes?: string;
}

export function useSlideBuilder(session: Session | null): Slide[] {
  if (!session) return [];

  const slides: Slide[] = [];

  // 1. Title slide
  slides.push({
    id: "title",
    type: "title",
    title: session.task.slice(0, 80) + (session.task.length > 80 ? "..." : ""),
    subtitle: `${session.taskType.charAt(0).toUpperCase() + session.taskType.slice(1)} Analysis`,
    notes: `Session #${session.id.slice(0, 8)} | Consensus: ${Math.round(session.metrics.consensus * 100)}%`,
  });

  // 2. Input slide
  slides.push({
    id: "input",
    type: "input",
    title: "Задача анализа",
    content: session.task,
    notes: "Исходная задача, проанализированная агентами.",
  });

  // 3. Agent slides (1 per agent)
  session.analyses.forEach((analysis, index) => {
    const agent = AGENTS.find(
      (a) => a.id === analysis.agent_name.toLowerCase() ||
             a.name.toLowerCase() === analysis.agent_name.toLowerCase()
    );

    slides.push({
      id: `agent-${index}`,
      type: "agent",
      title: analysis.agent_name,
      subtitle: agent?.role || "AI Agent",
      data: {
        analysis,
        agent,
        confidence: analysis.confidence,
        keyPoints: analysis.key_points.slice(0, 5),
        risks: analysis.risks.slice(0, 3),
      },
      notes: `Уверенность агента: ${Math.round(analysis.confidence * 100)}%. Время: ${analysis.duration?.toFixed(1)}с. Токенов: ${analysis.tokens?.toLocaleString()}.`,
    });
  });

  // 4. Consensus slide (if multiple agents)
  if (session.analyses.length > 1) {
    slides.push({
      id: "consensus",
      type: "consensus",
      title: "Анализ консенсуса",
      subtitle: `${Math.round(session.metrics.consensus * 100)}% согласие`,
      data: {
        analyses: session.analyses,
        consensus: session.metrics.consensus,
      },
      notes: "Показывает уровень согласия между агентами по ключевым вопросам.",
    });
  }

  // 5. Synthesis slide
  if (session.synthesis?.summary) {
    slides.push({
      id: "synthesis",
      type: "synthesis",
      title: "Синтез",
      content: session.synthesis.summary,
      notes: "Объединённый анализ от всех агентов.",
    });
  }

  // 6. Conclusion slides
  if (session.synthesis?.conclusions && session.synthesis.conclusions.length > 0) {
    // Group conclusions or show individually based on count
    if (session.synthesis.conclusions.length <= 3) {
      slides.push({
        id: "conclusions",
        type: "conclusion",
        title: "Выводы",
        data: {
          conclusions: session.synthesis.conclusions,
        },
        notes: `Выявлено ${session.synthesis.conclusions.length} ключевых выводов.`,
      });
    } else {
      // Show first 3 conclusions in first slide, rest in second
      slides.push({
        id: "conclusions-1",
        type: "conclusion",
        title: "Ключевые выводы",
        data: {
          conclusions: session.synthesis.conclusions.slice(0, 3),
        },
        notes: "Основные выводы анализа.",
      });

      if (session.synthesis.conclusions.length > 3) {
        slides.push({
          id: "conclusions-2",
          type: "conclusion",
          title: "Дополнительные выводы",
          data: {
            conclusions: session.synthesis.conclusions.slice(3),
          },
          notes: "Дополнительные выводы анализа.",
        });
      }
    }
  }

  // 7. Recommendations slide
  if (session.synthesis?.recommendations && session.synthesis.recommendations.length > 0) {
    slides.push({
      id: "recommendations",
      type: "recommendation",
      title: "Рекомендации",
      data: {
        recommendations: session.synthesis.recommendations,
      },
      notes: `Предоставлено ${session.synthesis.recommendations.length} рекомендаций.`,
    });
  }

  return slides;
}
