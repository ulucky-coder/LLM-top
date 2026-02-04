// Server-Sent Events (SSE) event system for real-time updates

type EventHandler = (data: unknown) => void;

interface EventEmitter {
  handlers: Map<string, Set<EventHandler>>;
  subscribe: (event: string, handler: EventHandler) => () => void;
  emit: (event: string, data: unknown) => void;
}

// Global event emitter (singleton for the server)
const globalForEvents = globalThis as unknown as {
  eventEmitter: EventEmitter | undefined;
};

function createEventEmitter(): EventEmitter {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    handlers,
    subscribe(event: string, handler: EventHandler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);

      // Return unsubscribe function
      return () => {
        handlers.get(event)?.delete(handler);
      };
    },
    emit(event: string, data: unknown) {
      handlers.get(event)?.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
      // Also emit to wildcard subscribers
      handlers.get("*")?.forEach((handler) => {
        try {
          handler({ event, data });
        } catch (error) {
          console.error(`Error in wildcard handler:`, error);
        }
      });
    },
  };
}

export const eventEmitter =
  globalForEvents.eventEmitter ?? createEventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.eventEmitter = eventEmitter;
}

// Event types for type safety
export interface MetricEvent {
  type: "metric";
  data: {
    agent_id: string;
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    latency_ms?: number;
    status: "success" | "error" | "timeout";
    error_message?: string;
    session_id?: string;
    timestamp: string;
  };
}

export interface LogEvent {
  type: "log";
  data: {
    level: "info" | "warning" | "error" | "success";
    message: string;
    agent_id?: string;
    session_id?: string;
    timestamp: string;
  };
}

export interface AnalysisEvent {
  type: "analysis_start" | "analysis_complete" | "agent_start" | "agent_complete";
  data: {
    session_id: string;
    agent_id?: string;
    status?: string;
    timestamp: string;
  };
}

export type StudioEvent = MetricEvent | LogEvent | AnalysisEvent;

// Helper functions to emit typed events
export function emitMetric(data: MetricEvent["data"]) {
  eventEmitter.emit("metric", {
    type: "metric",
    data: { ...data, timestamp: data.timestamp || new Date().toISOString() },
  });
}

export function emitLog(data: LogEvent["data"]) {
  eventEmitter.emit("log", {
    type: "log",
    data: { ...data, timestamp: data.timestamp || new Date().toISOString() },
  });
}

export function emitAnalysis(
  type: AnalysisEvent["type"],
  data: Omit<AnalysisEvent["data"], "timestamp">
) {
  eventEmitter.emit("analysis", {
    type,
    data: { ...data, timestamp: new Date().toISOString() },
  });
}
