import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount into Indian currency format (e.g. ₹1,24,982)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format standard number with Indian digit grouping (e.g. 1,24,982)
 */
export function formatIndianNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}
