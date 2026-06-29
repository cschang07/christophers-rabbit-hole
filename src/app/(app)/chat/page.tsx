import { redirect } from "next/navigation";

// Chat now lives at the root path. Keep /chat working for old links.
export default function ChatPage() {
  redirect("/");
}
