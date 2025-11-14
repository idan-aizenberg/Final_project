import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">WeatherSight</p>
          <p>Probabilistic weather intelligence for climate-sensitive industries.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up" className="hover:text-foreground">
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
