import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { eventEmitter } from "@/lib/events";

const DEFAULT_USER_ID = "default";

// Random avatar colors
const AVATAR_COLORS = [
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#3B82F6", // blue
  "#EF4444", // red
  "#06B6D4", // cyan
  "#84CC16", // lime
];

export interface UserPresence {
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

export interface EditLock {
  id: string;
  user_id: string;
  session_id: string;
  resource_type: string;
  resource_id: string;
  locked_at: string;
  expires_at: string;
  display_name?: string;
}

// GET /api/studio/presence - Get active users and locks
export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id") || DEFAULT_USER_ID;
  const resourceType = searchParams.get("resource_type");
  const resourceId = searchParams.get("resource_id");

  if (!supabase) {
    return NextResponse.json({
      success: true,
      data: {
        users: getMockPresence(),
        locks: [],
      },
      source: "mock",
    });
  }

  try {
    // Get active users
    const { data: users, error: usersError } = await supabase
      .from("llm_top_active_users")
      .select("*")
      .eq("user_id", userId);

    if (usersError) throw usersError;

    // Get edit locks
    let locksQuery = supabase
      .from("llm_top_edit_locks")
      .select(`
        *,
        session:llm_top_sessions(display_name)
      `)
      .gt("expires_at", new Date().toISOString());

    if (resourceType) {
      locksQuery = locksQuery.eq("resource_type", resourceType);
    }
    if (resourceId) {
      locksQuery = locksQuery.eq("resource_id", resourceId);
    }

    const { data: locks, error: locksError } = await locksQuery;
    if (locksError) throw locksError;

    // Format locks with display names
    const formattedLocks = (locks || []).map((lock) => ({
      ...lock,
      display_name: (lock.session as { display_name?: string })?.display_name || "Unknown",
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        locks: formattedLocks,
      },
      source: "database",
    });
  } catch (error) {
    console.error("Error fetching presence:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch presence" },
      { status: 500 }
    );
  }
}

// POST /api/studio/presence - Register session, update presence, or manage locks
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  const body = await request.json();
  const { action = "heartbeat" } = body;

  if (!supabase) {
    return NextResponse.json({
      success: true,
      data: { session_id: `mock-${Date.now()}` },
      message: "Action completed (mock)",
    });
  }

  try {
    switch (action) {
      case "register": {
        const {
          user_id = DEFAULT_USER_ID,
          display_name,
          browser_id,
        } = body;

        if (!browser_id) {
          return NextResponse.json(
            { success: false, error: "browser_id required" },
            { status: 400 }
          );
        }

        // Upsert session
        const { data, error } = await supabase
          .from("llm_top_sessions")
          .upsert(
            {
              user_id,
              display_name: display_name || `User ${browser_id.slice(0, 4)}`,
              browser_id,
              avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
              status: "online",
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "user_id,browser_id" }
          )
          .select()
          .single();

        if (error) throw error;

        // Emit presence event
        eventEmitter.emit("presence", {
          type: "user_joined",
          data: {
            session_id: data.id,
            display_name: data.display_name,
            avatar_color: data.avatar_color,
          },
        });

        return NextResponse.json({
          success: true,
          data,
          message: "Session registered",
        });
      }

      case "heartbeat": {
        const { session_id, current_tab, current_resource_id } = body;

        if (!session_id) {
          return NextResponse.json(
            { success: false, error: "session_id required" },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = {
          last_seen_at: new Date().toISOString(),
          status: "online",
        };

        if (current_tab !== undefined) {
          updateData.current_tab = current_tab;
        }
        if (current_resource_id !== undefined) {
          updateData.current_resource_id = current_resource_id;
        }

        const { error } = await supabase
          .from("llm_top_sessions")
          .update(updateData)
          .eq("id", session_id);

        if (error) throw error;

        // Also extend any active locks
        await supabase
          .from("llm_top_edit_locks")
          .update({ expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() })
          .eq("session_id", session_id);

        return NextResponse.json({
          success: true,
          message: "Heartbeat received",
        });
      }

      case "acquire_lock": {
        const { session_id, user_id = DEFAULT_USER_ID, resource_type, resource_id } = body;

        if (!session_id || !resource_type || !resource_id) {
          return NextResponse.json(
            { success: false, error: "session_id, resource_type, resource_id required" },
            { status: 400 }
          );
        }

        // Check for existing lock
        const { data: existingLock } = await supabase
          .from("llm_top_edit_locks")
          .select("*, session:llm_top_sessions(display_name)")
          .eq("resource_type", resource_type)
          .eq("resource_id", resource_id)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (existingLock && existingLock.session_id !== session_id) {
          return NextResponse.json({
            success: false,
            error: "Resource is locked",
            locked_by: {
              session_id: existingLock.session_id,
              display_name: (existingLock.session as { display_name?: string })?.display_name,
              expires_at: existingLock.expires_at,
            },
          }, { status: 409 });
        }

        // Create or update lock
        const { data: lock, error } = await supabase
          .from("llm_top_edit_locks")
          .upsert(
            {
              user_id,
              session_id,
              resource_type,
              resource_id,
              locked_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            },
            { onConflict: "resource_type,resource_id" }
          )
          .select()
          .single();

        if (error) throw error;

        // Get session info for event
        const { data: session } = await supabase
          .from("llm_top_sessions")
          .select("display_name")
          .eq("id", session_id)
          .single();

        // Emit lock event
        eventEmitter.emit("presence", {
          type: "lock_acquired",
          data: {
            resource_type,
            resource_id,
            locked_by: session?.display_name || "Unknown",
            session_id,
          },
        });

        return NextResponse.json({
          success: true,
          data: lock,
          message: "Lock acquired",
        });
      }

      case "release_lock": {
        const { session_id, resource_type, resource_id } = body;

        if (!session_id || !resource_type || !resource_id) {
          return NextResponse.json(
            { success: false, error: "session_id, resource_type, resource_id required" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("llm_top_edit_locks")
          .delete()
          .eq("session_id", session_id)
          .eq("resource_type", resource_type)
          .eq("resource_id", resource_id);

        if (error) throw error;

        // Emit unlock event
        eventEmitter.emit("presence", {
          type: "lock_released",
          data: {
            resource_type,
            resource_id,
            session_id,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Lock released",
        });
      }

      case "disconnect": {
        const { session_id } = body;

        if (!session_id) {
          return NextResponse.json(
            { success: false, error: "session_id required" },
            { status: 400 }
          );
        }

        // Release all locks
        await supabase
          .from("llm_top_edit_locks")
          .delete()
          .eq("session_id", session_id);

        // Mark session as offline
        await supabase
          .from("llm_top_sessions")
          .update({ status: "offline" })
          .eq("id", session_id);

        // Emit leave event
        eventEmitter.emit("presence", {
          type: "user_left",
          data: { session_id },
        });

        return NextResponse.json({
          success: true,
          message: "Disconnected",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Presence action error:", error);
    return NextResponse.json(
      { success: false, error: "Action failed" },
      { status: 500 }
    );
  }
}

function getMockPresence(): UserPresence[] {
  return [
    {
      session_id: "mock-1",
      user_id: "default",
      display_name: "You",
      avatar_color: "#8B5CF6",
      status: "online",
      current_tab: "prompts",
      last_seen_at: new Date().toISOString(),
    },
    {
      session_id: "mock-2",
      user_id: "default",
      display_name: "Alex",
      avatar_color: "#10B981",
      status: "online",
      current_tab: "experiments",
      last_seen_at: new Date(Date.now() - 30000).toISOString(),
    },
    {
      session_id: "mock-3",
      user_id: "default",
      display_name: "Sam",
      avatar_color: "#F59E0B",
      status: "away",
      current_tab: "monitoring",
      last_seen_at: new Date(Date.now() - 180000).toISOString(),
    },
  ];
}
