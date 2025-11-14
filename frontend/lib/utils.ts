import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(...inputs));
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
