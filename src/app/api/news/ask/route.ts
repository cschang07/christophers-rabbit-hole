import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest } from "next/server";
import { createSession, HermesChatError, streamSessionChat } from "@/lib/hermes-chat";
import { hostLabel } from "@/lib/news-gen";
import { parseSseStream } from "@/lib/parse-sse";
import { searchTavily } from "@/lib/tavily";
import type { Citation } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

interface GateResult {
  needsSearch: boolean;
  searchQuery: string | null;
}

async function gateRelevance(question: string, pageContext: string): Promise<GateResult> {
  const prompt = `判斷以下「使用者問題」是否能僅憑「頁面內容」回答。
- 能（答案就在頁面內容裡）→ needsSearch=false
- 不能（問到頁面外的事、更新的資訊、或頁面沒提到的細節）→ needsSearch=true，並給一句適合拿去搜尋的繁體中文查詢字串

【頁面內容】
${pageContext.slice(0, 6000)}

【使用者問題】
${question}`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            needsSearch: { type: Type.BOOLEAN },
            searchQuery: { type: Type.STRING, nullable: true },
          },
          required: ["needsSearch"],
        },
      },
    });
    const parsed = JSON.parse(result.text ?? "{}") as GateResult;
    return { needsSearch: Boolean(parsed.needsSearch), searchQuery: parsed.searchQuery ?? null };
  } catch {
    // Gate failure shouldn't block the answer — fall back to page-only context.
    return { needsSearch: false, searchQuery: null };
  }
}

function ndjson(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = String(body?.question ?? "").trim();
  const pageContext = String(body?.pageContext ?? "");
  if (!question) return Response.json({ error: "Missing 'question'" }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const gate = await gateRelevance(question, pageContext);

        let sourceBlock = "";
        const citations: Citation[] = [];
        if (gate.needsSearch && gate.searchQuery) {
          const sources = await searchTavily(gate.searchQuery, {
            topic: "news",
            maxResults: 6,
            days: 7,
          });
          sources.forEach((s, i) => {
            const id = `c${i + 1}`;
            citations.push({ id, label: hostLabel(s.url), url: s.url });
          });
          sourceBlock = sources
            .map(
              (s, i) =>
                `[c${i + 1}] ${s.title}${s.publishedDate ? ` (${s.publishedDate})` : ""}\n${s.content}\n來源：${s.url}`,
            )
            .join("\n\n");
        }

        controller.enqueue(ndjson({ type: "meta", citations }));

        const message = `你是新聞助理。只根據下方內容用繁體中文回答，分段清楚、可條列、重點 **粗體**。資訊不足就明說，不要捏造。

${
  sourceBlock
    ? "下方有「補充來源」可引用：引用到補充來源的句子，句末加 [c#]（# 對應來源編號）。沒引用補充來源的句子不要加標記。"
    : "本次沒有補充來源，絕對不要輸出任何 [c#] 標記。"
}

【頁面內容】
${pageContext}

${sourceBlock ? `【補充來源】\n${sourceBlock}\n` : ""}
【問題】
${question}`;

        // No title: each call is a throwaway grounding session, never browsed
        // by name, and Hermes rejects duplicate titles (collides on repeat
        // questions like "今天最值得注意的是哪一條？").
        const session = await createSession();
        const upstream = await streamSessionChat(session.id, message);

        for await (const { event, data } of parseSseStream(upstream.body!)) {
          if (event === "assistant.delta") {
            const delta = (data as { delta?: string }).delta ?? "";
            if (delta) controller.enqueue(ndjson({ type: "token", text: delta }));
          } else if (event === "error") {
            const msg = (data as { message?: string }).message ?? "發生錯誤，請稍後再試。";
            controller.enqueue(ndjson({ type: "error", message: msg }));
          }
        }

        controller.enqueue(ndjson({ type: "done" }));
      } catch (err) {
        console.error("[/api/news/ask]", err);
        const message =
          err instanceof HermesChatError
            ? "Hermes 暫時無法連線，請稍後再試。"
            : "伺服器暫時異常，請稍後再試。";
        controller.enqueue(ndjson({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
