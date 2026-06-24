'use client';

import { PomodoroProvider } from '@/context/pomodoro';
import { RecorderProvider } from '@/context/recorder';
import { AppSidebar } from '@/components/app-sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PomodoroProvider>
      <RecorderProvider>
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AppSidebar />
          <main className="prd-app min-w-0 flex-1">{children}</main>
        </div>
      </RecorderProvider>
    </PomodoroProvider>
  );
}
