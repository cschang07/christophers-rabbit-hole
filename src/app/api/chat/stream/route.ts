import { NextRequest } from "next/server";
import { HermesChatError, streamSessionChat } from "@/lib/hermes-chat";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const message = String(body?.message ?? "");
  if (!id) return Response.json({ error: "Missing 'id'" }, { status: 400 });
  if (!message.trim()) {
    return Response.json({ error: "Missing 'message' field" }, { status: 400 });
  }

  try {
    const upstream = await streamSessionChat(id, message);
    // Pipe the hermes-agent SSE body straight through to the browser.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof HermesChatError) {
      if (err.status >= 500) {
        return Response.json({ error: "Hermes 目前無法連線，請稍後再試。" }, { status: 503 });
      }
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "伺服器暫時異常，請稍後再試。" }, { status: 500 });
  }
}
