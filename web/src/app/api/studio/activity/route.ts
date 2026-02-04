import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { eventEmitter } from "@/lib/events";

const DEFAULT_USER_ID = "default";

export interface ActivityEntry {
  id: string;
  user_id: string;
  session_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  details?: Record<string, unknown>;
  created_at: string;
  display_name?: string;
  avatar_color?: string;
}

// GET /api/studio/activity - Get activity feed
export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id") || DEFAULT_USER_ID;
  const resourceType = searchParams.get("resource_type");
  const resourceId = searchParams.get("resource_id");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!supabase) {
    return NextResponse.json({
      success: true,
      data: getMockActivity(),
      source: "mock",
    });
  }

  try {
    let query = supabase
      .from("llm_top_activity")
      .select(`
        *,
        session:llm_top_sessions(display_name, avatar_color)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (resourceId) {
      query = query.eq("resource_id", resourceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Format with session info
    const formatted = (data || []).map((entry) => ({
      ...entry,
      display_name: (entry.session as { display_name?: string })?.display_name || "System",
      avatar_color: (entry.session as { avatar_color?: string })?.avatar_color || "#8B5CF6",
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      source: "database",
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

// POST /api/studio/activity - Log activity
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  const body = await request.json();
  const {
    user_id = DEFAULT_USER_ID,
    session_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    details,
  } = body;

  if (!action || !resource_type) {
    return NextResponse.json(
      { success: false, error: "action and resource_type required" },
      { status: 400 }
    );
  }

  // Emit real-time activity event
  eventEmitter.emit("activity", {
    type: "activity",
    data: {
      action,
      resource_type,
      resource_id,
      resource_name,
      details,
      timestamp: new Date().toISOString(),
    },
  });

  if (!supabase) {
    return NextResponse.json({
      success: true,
      message: "Activity logged (mock)",
    });
  }

  try {
    const { data, error } = await supabase
      .from("llm_top_activity")
      .insert({
        user_id,
        session_id,
        action,
        resource_type,
        resource_id,
        resource_name,
        details,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: "Activity logged",
    });
  } catch (error) {
    console.error("Error logging activity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log activity" },
      { status: 500 }
    );
  }
}

function getMockActivity(): ActivityEntry[] {
  const now = new Date();
  return [
    {
      id: "mock-1",
      user_id: "default",
      action: "updated",
      resource_type: "prompt",
      resource_name: "ChatGPT System Prompt",
      details: { field: "content", agent_id: "chatgpt" },
      created_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      display_name: "You",
      avatar_color: "#8B5CF6",
    },
    {
      id: "mock-2",
      user_id: "default",
      action: "created",
      resource_type: "experiment",
      resource_name: "Prompt Clarity Test",
      details: { agent_id: "chatgpt", variants: 2 },
      created_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      display_name: "Alex",
      avatar_color: "#10B981",
    },
    {
      id: "mock-3",
      user_id: "default",
      action: "tested",
      resource_type: "prompt",
      resource_name: "Claude Critique Prompt",
      details: { tokens: 1250, latency_ms: 2300 },
      created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      display_name: "Sam",
      avatar_color: "#F59E0B",
    },
    {
      id: "mock-4",
      user_id: "default",
      action: "exported",
      resource_type: "config",
      resource_name: "Full Configuration",
      details: { format: "json", type: "full" },
      created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      display_name: "You",
      avatar_color: "#8B5CF6",
    },
    {
      id: "mock-5",
      user_id: "default",
      action: "rollback",
      resource_type: "version",
      resource_name: "Gemini System Prompt v2",
      details: { from_version: 3, to_version: 2 },
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      display_name: "Alex",
      avatar_color: "#10B981",
    },
    {
      id: "mock-6",
      user_id: "default",
      action: "completed",
      resource_type: "experiment",
      resource_name: "Temperature Test",
      details: { winner: "Variant B", quality_improvement: "+12%" },
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      display_name: "Sam",
      avatar_color: "#F59E0B",
    },
  ];
}
