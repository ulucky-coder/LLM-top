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
    title: "Analysis Task",
    content: session.task,
    notes: "This is the original task that was analyzed by the agents.",
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
      notes: `Agent confidence: ${Math.round(analysis.confidence * 100)}%. Duration: ${analysis.duration?.toFixed(1)}s. Tokens: ${analysis.tokens?.toLocaleString()}.`,
    });
  });

  // 4. Consensus slide (if multiple agents)
  if (session.analyses.length > 1) {
    slides.push({
      id: "consensus",
      type: "consensus",
      title: "Consensus Analysis",
      subtitle: `${Math.round(session.metrics.consensus * 100)}% Agreement`,
      data: {
        analyses: session.analyses,
        consensus: session.metrics.consensus,
      },
      notes: "Shows the agreement level between all agents on key points.",
    });
  }

  // 5. Synthesis slide
  if (session.synthesis?.summary) {
    slides.push({
      id: "synthesis",
      type: "synthesis",
      title: "Synthesis",
      content: session.synthesis.summary,
      notes: "Combined analysis from all agents.",
    });
  }

  // 6. Conclusion slides
  if (session.synthesis?.conclusions && session.synthesis.conclusions.length > 0) {
    // Group conclusions or show individually based on count
    if (session.synthesis.conclusions.length <= 3) {
      slides.push({
        id: "conclusions",
        type: "conclusion",
        title: "Conclusions",
        data: {
          conclusions: session.synthesis.conclusions,
        },
        notes: `${session.synthesis.conclusions.length} key conclusions identified.`,
      });
    } else {
      // Show first 3 conclusions in first slide, rest in second
      slides.push({
        id: "conclusions-1",
        type: "conclusion",
        title: "Key Conclusions",
        data: {
          conclusions: session.synthesis.conclusions.slice(0, 3),
        },
        notes: "Primary conclusions from the analysis.",
      });

      if (session.synthesis.conclusions.length > 3) {
        slides.push({
          id: "conclusions-2",
          type: "conclusion",
          title: "Additional Conclusions",
          data: {
            conclusions: session.synthesis.conclusions.slice(3),
          },
          notes: "Additional conclusions from the analysis.",
        });
      }
    }
  }

  // 7. Recommendations slide
  if (session.synthesis?.recommendations && session.synthesis.recommendations.length > 0) {
    slides.push({
      id: "recommendations",
      type: "recommendation",
      title: "Recommendations",
      data: {
        recommendations: session.synthesis.recommendations,
      },
      notes: `${session.synthesis.recommendations.length} recommendations provided.`,
    });
  }

  return slides;
}
