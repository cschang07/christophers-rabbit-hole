"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-stone-500">
          密碼
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-colors focus:border-teal-600"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-stone-900 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "登入中..." : "登入"}
      </button>
    </form>
  );
}
