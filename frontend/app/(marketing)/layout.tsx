import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
