'use client';

import { PomodoroProvider } from '@/context/pomodoro';
import { RecorderProvider } from '@/context/recorder';
import { ProductivitySidebar } from '@/components/productivity-sidebar';

export default function ProductivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <PomodoroProvider>
      <RecorderProvider>
        <div className="flex min-h-screen flex-col lg:flex-row">
          <ProductivitySidebar />
          <main className="prd-app min-w-0 flex-1">{children}</main>
        </div>
      </RecorderProvider>
    </PomodoroProvider>
  );
}
