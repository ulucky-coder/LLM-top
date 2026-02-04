"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface RealtimeEvent {
  type: string;
  data: Record<string, unknown>;
  event?: string;
}

export interface MetricEventData {
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
}

export interface LogEventData {
  level: "info" | "warning" | "error" | "success";
  message: string;
  agent_id?: string;
  session_id?: string;
  timestamp: string;
}

export interface AnalysisEventData {
  session_id: string;
  agent_id?: string;
  status?: string;
  timestamp: string;
}

interface UseRealtimeEventsOptions {
  onMetric?: (data: MetricEventData) => void;
  onLog?: (data: LogEventData) => void;
  onAnalysisStart?: (data: AnalysisEventData) => void;
  onAnalysisComplete?: (data: AnalysisEventData) => void;
  onAgentStart?: (data: AnalysisEventData) => void;
  onAgentComplete?: (data: AnalysisEventData) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const {
    onMetric,
    onLog,
    onAnalysisStart,
    onAnalysisComplete,
    onAgentStart,
    onAgentComplete,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/studio/events");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent;
        setLastEvent(parsed);

        // Route to appropriate handler based on event type
        if (parsed.type === "metric" && onMetric) {
          onMetric(parsed.data as unknown as MetricEventData);
        } else if (parsed.type === "log" && onLog) {
          onLog(parsed.data as unknown as LogEventData);
        } else if (parsed.type === "analysis_start" && onAnalysisStart) {
          onAnalysisStart(parsed.data as unknown as AnalysisEventData);
        } else if (parsed.type === "analysis_complete" && onAnalysisComplete) {
          onAnalysisComplete(parsed.data as unknown as AnalysisEventData);
        } else if (parsed.type === "agent_start" && onAgentStart) {
          onAgentStart(parsed.data as unknown as AnalysisEventData);
        } else if (parsed.type === "agent_complete" && onAgentComplete) {
          onAgentComplete(parsed.data as unknown as AnalysisEventData);
        }

        // Handle wildcard events (from eventEmitter.emit("*"))
        if (parsed.event) {
          const innerData = parsed.data as unknown as { type: string; data: unknown };
          if (innerData.type === "metric" && onMetric) {
            onMetric(innerData.data as unknown as MetricEventData);
          } else if (innerData.type === "log" && onLog) {
            onLog(innerData.data as unknown as LogEventData);
          } else if (innerData.type === "analysis_start" && onAnalysisStart) {
            onAnalysisStart(innerData.data as unknown as AnalysisEventData);
          } else if (innerData.type === "analysis_complete" && onAnalysisComplete) {
            onAnalysisComplete(innerData.data as unknown as AnalysisEventData);
          }
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      onDisconnect?.();
      eventSource.close();

      // Auto-reconnect
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };
  }, [
    onMetric,
    onLog,
    onAnalysisStart,
    onAnalysisComplete,
    onAgentStart,
    onAgentComplete,
    onConnect,
    onDisconnect,
    autoReconnect,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
  };
}
