"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Compass, LogOut, User, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, signOut, loading } = useAuth();

  // Dynamic links based on user tier - Docs only for enterprise
  const primaryLinks = [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
    ...(userProfile?.subscription_tier === 'enterprise' 
      ? [{ href: "/docs", label: "Docs", external: true }] 
      : []
    ),
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/' as any);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'professional':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'enterprise':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'standard':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

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
              href={link.href as any}
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
          
          {!loading && user && userProfile ? (
            // Authenticated user menu
            <>
              <Link href="/dashboard" className="hidden md:block">
                <Button variant="ghost" className="rounded-full">
                  Dashboard
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">{userProfile.email.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{userProfile.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Subscription</span>
                      <Badge variant="outline" className={cn("text-xs", getTierColor(userProfile.subscription_tier))}>
                        {userProfile.subscription_tier.charAt(0).toUpperCase() + userProfile.subscription_tier.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/account')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            // Not authenticated - show sign in/get started
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" className="rounded-full" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button className="rounded-full" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          )}
          
          <Button className="md:hidden" size="icon" variant="ghost" aria-label="Open navigation">
            <Building2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
