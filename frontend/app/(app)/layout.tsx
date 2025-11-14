import type { ReactNode } from "react";

import { SideNav } from "@/components/layout/SideNav";
import { TopNav } from "@/components/layout/TopNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="flex flex-1 gap-0">
        <SideNav />
        <main className="flex-1 bg-background/70">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
