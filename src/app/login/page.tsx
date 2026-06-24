import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h1 className="mb-8 font-serif text-2xl text-stone-900">
          Christopher Daily
        </h1>
        <LoginForm next={next?.startsWith("/") ? next : "/"} />
      </div>
    </div>
  );
}
