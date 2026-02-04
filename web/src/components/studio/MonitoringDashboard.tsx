"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Bell,
  Filter,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  return (
    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-2 rounded-lg", color)}>{icon}</div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              change >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          >
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{title}</div>
    </div>
  );
}

const MOCK_LOGS = [
  { time: "10:23:45", level: "error", message: "OpenAI rate limit exceeded", agent: "chatgpt" },
  { time: "10:22:12", level: "success", message: "Analysis completed successfully", agent: "all" },
  { time: "10:20:33", level: "warning", message: "DeepSeek response timeout, retrying...", agent: "deepseek" },
  { time: "10:18:05", level: "success", message: "Session created: abc-123", agent: "system" },
  { time: "10:15:22", level: "info", message: "User started new analysis", agent: "system" },
  { time: "10:12:44", level: "success", message: "Synthesis completed", agent: "claude" },
  { time: "10:08:19", level: "error", message: "Invalid JSON in response", agent: "gemini" },
  { time: "10:05:33", level: "success", message: "Analysis completed successfully", agent: "all" },
];

const AGENT_USAGE = [
  { name: "ChatGPT", tokens: 112450, cost: 1.68, percentage: 45, color: "bg-emerald-500" },
  { name: "Claude", tokens: 87320, cost: 1.31, percentage: 35, color: "bg-amber-500" },
  { name: "Gemini", tokens: 29940, cost: 0.15, percentage: 12, color: "bg-blue-500" },
  { name: "DeepSeek", tokens: 19982, cost: 0.04, percentage: 8, color: "bg-violet-500" },
];

export function MonitoringDashboard() {
  const [timeRange, setTimeRange] = useState("24h");
  const [logFilter, setLogFilter] = useState<"all" | "error" | "warning" | "success">("all");

  const filteredLogs = MOCK_LOGS.filter(
    (log) => logFilter === "all" || log.level === logFilter
  );

  return (
    <div className="p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Monitoring Dashboard</h2>
          <p className="text-sm text-slate-400">Real-time system metrics and logs</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <Button variant="outline" size="sm" className="border-slate-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value="147"
          change={23}
          icon={<Zap className="h-5 w-5 text-white" />}
          color="bg-violet-600"
        />
        <MetricCard
          title="Total Tokens"
          value="245,892"
          change={45}
          icon={<BarChart3 className="h-5 w-5 text-white" />}
          color="bg-blue-600"
        />
        <MetricCard
          title="Total Cost"
          value="$4.23"
          change={12}
          icon={<DollarSign className="h-5 w-5 text-white" />}
          color="bg-emerald-600"
        />
        <MetricCard
          title="Errors"
          value="3"
          change={-50}
          icon={<AlertTriangle className="h-5 w-5 text-white" />}
          color="bg-red-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Token Usage by Agent */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-medium text-white mb-4">Token Usage by Agent</h3>
          <div className="space-y-3">
            {AGENT_USAGE.map((agent) => (
              <div key={agent.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-300">{agent.name}</span>
                  <span className="text-slate-400">
                    {agent.tokens.toLocaleString()} ({agent.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", agent.color)}
                    style={{ width: `${agent.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Cost</span>
              <span className="text-white font-medium">$3.18</span>
            </div>
          </div>
        </div>

        {/* Response Time */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <h3 className="text-sm font-medium text-white mb-4">Average Response Time</h3>
          <div className="space-y-3">
            {[
              { name: "ChatGPT", time: "2.3s", status: "good" },
              { name: "Claude", time: "3.1s", status: "good" },
              { name: "Gemini", time: "1.8s", status: "excellent" },
              { name: "DeepSeek", time: "4.5s", status: "warning" },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{agent.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">{agent.time}</span>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      agent.status === "excellent" && "bg-emerald-500",
                      agent.status === "good" && "bg-blue-500",
                      agent.status === "warning" && "bg-amber-500"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Average</span>
              <span className="text-white font-medium">2.9s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-slate-900 rounded-lg border border-slate-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-medium text-white">Recent Logs</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["all", "error", "warning", "success"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setLogFilter(filter)}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-colors",
                    logFilter === filter
                      ? "bg-violet-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-slate-400">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <div className="divide-y divide-slate-800 max-h-64 overflow-auto">
          {filteredLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2 text-sm hover:bg-slate-800/50">
              <span className="text-xs text-slate-500 font-mono w-20">{log.time}</span>
              <div className="w-20">
                {log.level === "error" && (
                  <Badge className="bg-red-600 text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
                {log.level === "warning" && (
                  <Badge className="bg-amber-600 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Warn
                  </Badge>
                )}
                {log.level === "success" && (
                  <Badge className="bg-emerald-600 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                )}
                {log.level === "info" && (
                  <Badge className="bg-blue-600 text-xs">Info</Badge>
                )}
              </div>
              <span className="flex-1 text-slate-300">{log.message}</span>
              <Badge variant="outline" className="text-xs border-slate-700">
                {log.agent}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-400" />
            Active Alerts
          </h3>
          <Button variant="outline" size="sm" className="h-7 border-slate-700">
            Configure Alerts
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-red-950/30 border border-red-900/50 rounded">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <div className="flex-1">
              <p className="text-sm text-red-300">OpenAI rate limit approaching (85%)</p>
              <p className="text-xs text-red-400/70">Triggered 2 hours ago</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-red-400">
              Dismiss
            </Button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-950/30 border border-amber-900/50 rounded">
            <Clock className="h-4 w-4 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm text-amber-300">DeepSeek response time increased (4.5s avg)</p>
              <p className="text-xs text-amber-400/70">Triggered 30 minutes ago</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-amber-400">
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
