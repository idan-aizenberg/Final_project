"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BarChart3, BellDot, Bookmark, Gauge, Home, MapPinned, Settings, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchTypeDialog } from "@/components/shared/SearchTypeDialog";
import { cn } from "@/lib/utils";
import { useTier } from "@/hooks/useTier";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/search", label: "Search", icon: MapPinned },
  { href: "/saved-searches", label: "Saved Searches", icon: Bookmark },
  { href: "/results", label: "Results", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: BellDot },
  { href: "/pricing", label: "Pricing", icon: Gauge },
  { href: "/account", label: "Account", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();
  const { isAdmin } = useTier();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  return (
    <aside className="hidden w-64 flex-col border-r border-border/60 bg-background/60 px-4 py-6 md:flex">
      <nav aria-label="Application" className="flex flex-1 flex-col gap-1 text-sm">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          
          // Handle Search nav item differently - open dialog instead of navigate
          if (href === "/search") {
            return (
              <Button
                key={href}
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-2xl px-4 py-3",
                  active && "bg-primary/10 text-primary hover:bg-primary/10"
                )}
                onClick={() => setSearchDialogOpen(true)}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </Button>
            );
          }
          
          return (
            <Link key={href} href={href as any} aria-current={active ? "page" : undefined}>
              <Button
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-2xl px-4 py-3",
                  active && "bg-primary/10 text-primary hover:bg-primary/10"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </Button>
            </Link>
          );
        })}
        {isAdmin && (
          <Link href={"/admin" as any} className="pt-4" aria-current={pathname.startsWith("/admin") ? "page" : undefined}>
            <Button
              variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
              className={cn(
                "flex w-full items-center justify-start gap-3 rounded-2xl px-4 py-3",
                pathname.startsWith("/admin") && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10"
              )}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <span>Admin Console</span>
            </Button>
          </Link>
        )}
      </nav>
      <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <span>Forecast confidence</span>
        </div>
        <p className="mt-2 leading-relaxed">
          WeatherSight highlights uncertainty with probabilistic ranges and severe weather signals tailored to your tier.
        </p>
      </div>
      
      {/* Search Type Dialog */}
      <SearchTypeDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />
    </aside>
  );
}
