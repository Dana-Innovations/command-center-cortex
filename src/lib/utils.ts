import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentPSTHour(): number {
  const now = new Date();
  const pstStr = now.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: "America/Los_Angeles",
  });
  const parts = pstStr.split(":");
  return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
}
