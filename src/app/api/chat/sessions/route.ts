import { NextRequest, NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/hermes-chat";

export async function GET() {
  try {
    const { sessions, hasMore } = await listSessions({ limit: 100 });
    return NextResponse.json({ sessions, hasMore });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await createSession({ title: body?.title });
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
