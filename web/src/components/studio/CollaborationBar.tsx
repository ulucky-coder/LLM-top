"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Activity,
  Lock,
  Unlock,
  Edit3,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  Bell,
  X,
  Circle,
} from "lucide-react";

interface UserPresence {
  session_id: string;
  user_id: string;
  display_name: string;
  avatar_color: string;
  status: "online" | "away" | "offline";
  current_tab?: string;
  current_resource_id?: string;
  last_seen_at: string;
  editing_resource_type?: string;
  editing_resource_id?: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_name?: string;
  details?: Record<string, unknown>;
  created_at: string;
  display_name?: string;
  avatar_color?: string;
}

interface EditLock {
  resource_type: string;
  resource_id: string;
  display_name?: string;
  expires_at: string;
}

interface CollaborationBarProps {
  currentTab: string;
  currentResourceId?: string;
  onLog?: (message: string) => void;
}

// Generate a unique browser ID
function getBrowserId(): string {
  if (typeof window === "undefined") return "server";

  let browserId = localStorage.getItem("llm_top_browser_id");
  if (!browserId) {
    browserId = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("llm_top_browser_id", browserId);
  }
  return browserId;
}

export function CollaborationBar({
  currentTab,
  currentResourceId,
  onLog,
}: CollaborationBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<"users" | "activity" | null>(null);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [locks, setLocks] = useState<EditLock[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("You");
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Register session on mount
  useEffect(() => {
    const register = async () => {
      const browserId = getBrowserId();
      const name = localStorage.getItem("llm_top_display_name") || "You";
      setDisplayName(name);

      try {
        const response = await fetch("/api/studio/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            browser_id: browserId,
            display_name: name,
          }),
        });

        const data = await response.json();
        if (data.success && data.data?.id) {
          setSessionId(data.data.id);
          onLog?.(`✓ Connected as ${name}`);
        }
      } catch (error) {
        console.error("Failed to register session:", error);
      }
    };

    register();

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        fetch("/api/studio/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "disconnect", session_id: sessionId }),
        }).catch(() => {});
      }
    };
  }, []);

  // Heartbeat to maintain presence
  useEffect(() => {
    if (!sessionId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/studio/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "heartbeat",
            session_id: sessionId,
            current_tab: currentTab,
            current_resource_id: currentResourceId,
          }),
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
      }
    };

    // Send immediately
    sendHeartbeat();

    // Then every 30 seconds
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [sessionId, currentTab, currentResourceId]);

  // Load presence data
  const loadPresence = useCallback(async () => {
    try {
      const response = await fetch("/api/studio/presence");
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users || []);
        setLocks(data.data.locks || []);
      }
    } catch (error) {
      console.error("Failed to load presence:", error);
    }
  }, []);

  // Load activity
  const loadActivity = useCallback(async () => {
    try {
      const response = await fetch("/api/studio/activity?limit=20");
      const data = await response.json();
      if (data.success) {
        setActivity(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load activity:", error);
    }
  }, []);

  // Load data periodically
  useEffect(() => {
    loadPresence();
    loadActivity();

    const interval = setInterval(() => {
      loadPresence();
      loadActivity();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [loadPresence, loadActivity]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <span className="text-emerald-400">+</span>;
      case "updated":
        return <Edit3 className="h-3 w-3 text-blue-400" />;
      case "deleted":
        return <span className="text-red-400">×</span>;
      case "tested":
        return <span className="text-violet-400">▶</span>;
      case "exported":
        return <span className="text-amber-400">↓</span>;
      case "imported":
        return <span className="text-amber-400">↑</span>;
      case "rollback":
        return <span className="text-orange-400">↺</span>;
      case "completed":
        return <span className="text-emerald-400">✓</span>;
      default:
        return <Circle className="h-2 w-2" />;
    }
  };

  const getActionText = (action: string) => {
    const texts: Record<string, string> = {
      created: "created",
      updated: "updated",
      deleted: "deleted",
      tested: "tested",
      exported: "exported",
      imported: "imported",
      rollback: "rolled back",
      completed: "completed",
    };
    return texts[action] || action;
  };

  const onlineUsers = users.filter((u) => u.status === "online");
  const awayUsers = users.filter((u) => u.status === "away");

  return (
    <div className="relative">
      {/* Collapsed Bar */}
      <div className="h-8 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-3">
        {/* Left: Active Users */}
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === "users" ? null : "users")}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          <div className="flex -space-x-1.5">
            {onlineUsers.slice(0, 4).map((user) => (
              <div
                key={user.session_id}
                className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-medium text-white"
                style={{ backgroundColor: user.avatar_color }}
                title={user.display_name}
              >
                {user.display_name[0].toUpperCase()}
              </div>
            ))}
            {onlineUsers.length > 4 && (
              <div className="w-5 h-5 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] text-white">
                +{onlineUsers.length - 4}
              </div>
            )}
          </div>
          <span>
            {onlineUsers.length} online
            {awayUsers.length > 0 && `, ${awayUsers.length} away`}
          </span>
          {activePanel === "users" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>

        {/* Center: Current locks warning */}
        {locks.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Lock className="h-3 w-3" />
            {locks.length} resource{locks.length > 1 ? "s" : ""} locked
          </div>
        )}

        {/* Right: Activity */}
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === "activity" ? null : "activity")}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Activity</span>
          {activePanel === "activity" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Expanded Panels */}
      {activePanel && (
        <div className="absolute top-8 left-0 right-0 bg-slate-900 border-b border-slate-700 shadow-xl z-40">
          {activePanel === "users" && (
            <div className="p-4 max-h-64 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Active Users</h3>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Online Users */}
                {onlineUsers.map((user) => (
                  <div
                    key={user.session_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50"
                  >
                    <div className="relative">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                        style={{ backgroundColor: user.avatar_color }}
                      >
                        {user.display_name[0].toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {user.display_name}
                        {user.session_id === sessionId && (
                          <span className="text-slate-500 ml-1">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        {user.editing_resource_id ? (
                          <>
                            <Edit3 className="h-3 w-3 text-amber-400" />
                            Editing {user.editing_resource_type}
                          </>
                        ) : user.current_tab ? (
                          <>
                            <Eye className="h-3 w-3" />
                            Viewing {user.current_tab}
                          </>
                        ) : (
                          "Online"
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Away Users */}
                {awayUsers.length > 0 && (
                  <>
                    <div className="text-xs text-slate-600 mt-3 mb-1">Away</div>
                    {awayUsers.map((user) => (
                      <div
                        key={user.session_id}
                        className="flex items-center gap-3 p-2 rounded-lg opacity-60"
                      >
                        <div className="relative">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                            style={{ backgroundColor: user.avatar_color }}
                          >
                            {user.display_name[0].toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-slate-400">{user.display_name}</div>
                          <div className="text-xs text-slate-600">
                            {formatTime(user.last_seen_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {users.length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    No active users
                  </div>
                )}
              </div>

              {/* Edit Locks */}
              {locks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Edit Locks
                  </div>
                  {locks.map((lock, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-amber-950/30 rounded text-xs"
                    >
                      <span className="text-amber-300">
                        {lock.resource_type}/{lock.resource_id}
                      </span>
                      <span className="text-slate-500">
                        by {lock.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activePanel === "activity" && (
            <div className="p-4 max-h-64 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Recent Activity</h3>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {activity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: entry.avatar_color }}
                    >
                      {entry.display_name?.[0].toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-300">
                        <span className="font-medium text-white">
                          {entry.display_name}
                        </span>{" "}
                        <span className="inline-flex items-center gap-1">
                          {getActionIcon(entry.action)}
                          {getActionText(entry.action)}
                        </span>{" "}
                        <span className="text-slate-400">{entry.resource_type}</span>
                        {entry.resource_name && (
                          <span className="text-violet-400"> "{entry.resource_name}"</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatTime(entry.created_at)}
                      </div>
                    </div>
                  </div>
                ))}

                {activity.length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
