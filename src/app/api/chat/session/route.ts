import { NextRequest, NextResponse } from "next/server";
import { deleteSession, renameSession } from "@/lib/hermes-chat";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing 'id'" }, { status: 400 });
    const session = await renameSession(id, String(body?.title ?? ""));
    return NextResponse.json({ session });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing 'id'" }, { status: 400 });
    await deleteSession(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
