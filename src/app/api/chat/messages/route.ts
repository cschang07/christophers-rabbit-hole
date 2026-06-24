import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/hermes-chat";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing 'id'" }, { status: 400 });
  try {
    const messages = await getMessages(id);
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
