"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTier } from "@/hooks/useTier";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs", external: true },
];

export function TopNav() {
  const pathname = usePathname();
  const { tier } = useTier();

  return (
    <header className="sticky inset-x-0 top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2 text-base">
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            <span>WeatherSight</span>
          </Link>
        </div>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-medium md:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "bg-muted text-foreground"
              )}
              aria-current={pathname === link.href ? "page" : undefined}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dashboard" className="hidden md:block">
            <Button variant="ghost" className="rounded-full">
              Dashboard ({tier.charAt(0).toUpperCase() + tier.slice(1)})
            </Button>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" className="rounded-full" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button className="rounded-full" asChild>
              <Link href="/search">Get Started</Link>
            </Button>
          </div>
          <Button className="md:hidden" size="icon" variant="ghost" aria-label="Open navigation">
            <Building2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
