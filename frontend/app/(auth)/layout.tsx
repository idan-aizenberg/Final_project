import type { ReactNode } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky inset-x-0 top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold">
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            <span>WeatherSight</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}

