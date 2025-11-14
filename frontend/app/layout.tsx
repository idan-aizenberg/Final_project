import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/theme.css";
import { cn } from "@/lib/utils";
import { AppProviders } from "@/components/providers/app-providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetBrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "WeatherSight",
    template: "%s | WeatherSight",
  },
  description: "Probabilistic weather intelligence for climate-conscious operations.",
  icons: [{ url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(210 40% 98%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(222 47% 8%)" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans text-foreground antialiased", inter.variable, jetBrains.variable)}>
        <AppProviders>
          <div className="relative flex min-h-screen flex-col bg-background">
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-70 mix-blend-multiply">
              <div className="absolute inset-y-0 left-[-20%] w-[60%] rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/40" />
              <div className="absolute bottom-[-20%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-900/40" />
            </div>
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
