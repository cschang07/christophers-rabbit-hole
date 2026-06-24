// Minimal SSE frame parser for the hermes-agent chat/stream response, which
// the Next.js route handler pipes through unmodified (see
// src/app/api/chat/stream/route.ts). Frames are separated by a blank line;
// each frame carries an `event:` line and one or more `data:` lines.

export interface HermesSseEvent {
  event: string;
  data: unknown;
}

function parseFrame(frame: string): HermesSseEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
  }
  if (dataLines.length === 0) return null;
  const raw = dataLines.join("\n");
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return { event, data: raw };
  }
}

export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<HermesSseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex = buffer.indexOf("\n\n");
    while (sepIndex !== -1) {
      const frame = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const parsed = parseFrame(frame);
      if (parsed) yield parsed;
      sepIndex = buffer.indexOf("\n\n");
    }
  }
}
