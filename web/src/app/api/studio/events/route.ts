import { eventEmitter, StudioEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/studio/events - Server-Sent Events stream
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({
        type: "connected",
        data: { timestamp: new Date().toISOString() },
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Subscribe to all events
      const unsubscribe = eventEmitter.subscribe("*", (event: unknown) => {
        try {
          const msg = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(msg));
        } catch (error) {
          console.error("Error sending SSE message:", error);
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({
            type: "heartbeat",
            data: { timestamp: new Date().toISOString() },
          })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      // Handle client disconnect (this is a workaround since we can't detect it directly)
      // The stream will error when client disconnects
      return cleanup;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

// POST /api/studio/events - Emit event (for testing/debugging)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, data } = body as { event: string; data: StudioEvent };

    if (!event || !data) {
      return Response.json(
        { success: false, error: "Missing event or data" },
        { status: 400 }
      );
    }

    eventEmitter.emit(event, data);

    return Response.json({ success: true, message: "Event emitted" });
  } catch (error) {
    console.error("Error emitting event:", error);
    return Response.json(
      { success: false, error: "Failed to emit event" },
      { status: 500 }
    );
  }
}
