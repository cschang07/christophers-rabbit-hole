import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { question, articleContext } = await req.json();

  const systemPrompt = `你是一位財經分析助理，專門回答關於以下文章的問題。請根據文章內容回答，用繁體中文。

排版要求：
- 分段清楚，段落之間空一行
- 若列舉多點，使用項目符號列表（每行以 - 開頭）
- 重點詞彙可用 **粗體** 標示
- 保持簡潔，避免冗長

文章內容：
${articleContext}`;

  const stream = await ai.models.generateContentStream({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: question }] }],
    config: { systemInstruction: systemPrompt },
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
