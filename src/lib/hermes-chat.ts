// Server-side client for the hermes-agent api_server platform.
// Never import this from a Client Component — HERMES_API_KEY must stay on the server.

export interface HermesSession {
  id: string;
  source?: string;
  user_id?: string;
  model?: string;
  title?: string | null;
  started_at?: string;
  ended_at?: string | null;
  end_reason?: string | null;
  message_count?: number;
  tool_call_count?: number;
  input_tokens?: number;
  output_tokens?: number;
  parent_session_id?: string | null;
  last_active?: string;
  preview?: string | null;
  has_system_prompt?: boolean;
  has_model_config?: boolean;
}

export interface HermesMessage {
  id?: string;
  session_id?: string;
  role: string;
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown;
  tool_name?: string;
  timestamp?: string;
  finish_reason?: string;
}

class HermesChatError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function getConfig() {
  const baseUrl = process.env.HERMES_API_BASE_URL;
  const apiKey = process.env.HERMES_API_KEY;
  if (!baseUrl) throw new Error("HERMES_API_BASE_URL is not set");
  if (!apiKey) throw new Error("HERMES_API_KEY is not set");
  return { baseUrl, apiKey };
}

async function hermesFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { baseUrl, apiKey } = getConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers, cache: "no-store" });
}

async function parseJsonOrThrow(res: Response): Promise<any> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error?.message ?? `Hermes API request failed: ${res.status}`;
    throw new HermesChatError(message, res.status);
  }
  return body;
}

export async function listSessions(opts: { limit?: number; offset?: number } = {}): Promise<{
  sessions: HermesSession[];
  hasMore: boolean;
}> {
  const qs = new URLSearchParams();
  qs.set("source", "api_server");
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.offset) qs.set("offset", String(opts.offset));
  const body = await parseJsonOrThrow(await hermesFetch(`/api/sessions?${qs}`));
  return { sessions: body.data as HermesSession[], hasMore: Boolean(body.has_more) };
}

export async function createSession(opts: { title?: string } = {}): Promise<HermesSession> {
  const body = await parseJsonOrThrow(
    await hermesFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify(opts.title ? { title: opts.title } : {}),
    })
  );
  return body.session as HermesSession;
}

export async function renameSession(sessionId: string, title: string): Promise<HermesSession> {
  const body = await parseJsonOrThrow(
    await hermesFetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    })
  );
  return body.session as HermesSession;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await parseJsonOrThrow(
    await hermesFetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" })
  );
}

export async function getMessages(sessionId: string): Promise<HermesMessage[]> {
  const body = await parseJsonOrThrow(
    await hermesFetch(`/api/sessions/${encodeURIComponent(sessionId)}/messages`)
  );
  return body.data as HermesMessage[];
}

// Returns the raw SSE Response so the caller (a Route Handler) can stream the
// body straight through to the browser without re-parsing it.
export async function streamSessionChat(sessionId: string, message: string): Promise<Response> {
  const res = await hermesFetch(`/api/sessions/${encodeURIComponent(sessionId)}/chat/stream`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new HermesChatError(body?.error?.message ?? `Hermes chat stream failed: ${res.status}`, res.status);
  }
  return res;
}
