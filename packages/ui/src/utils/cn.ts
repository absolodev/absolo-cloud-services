import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge tailwind class names safely. Later conflicting utilities win, falsy
 * values are stripped. Use this for every `className` composition in this
 * package.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
