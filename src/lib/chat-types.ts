// Client-safe types mirroring the relevant fields of HermesSession/HermesMessage
// (src/lib/hermes-chat.ts is server-only and must not be imported from the client).

export interface ChatSessionSummary {
  id: string;
  title?: string | null;
  preview?: string | null;
  last_active?: string;
  message_count?: number;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

// Subset of the fields used from the GET /api/chat/messages response.
export interface RawHermesMessage {
  id?: string;
  role: string;
  content?: string;
}

export function sessionLabel(session: ChatSessionSummary): string {
  return session.title?.trim() || session.preview?.trim() || "新對話";
}
