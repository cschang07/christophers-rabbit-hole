import { ProductivitySidebar } from "@/components/productivity-sidebar";

export default function ProductivityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <ProductivitySidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
