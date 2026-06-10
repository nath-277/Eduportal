import type { UserRole } from '@eduportal/shared';

export type ThemeVariables = Record<`--${string}`, string>;

export const roleThemes: Record<UserRole, ThemeVariables> = {
  STUDENT: {
    '--primary-light': 'oklch(0.55 0.18 250)', // Sapphire Blue
    '--primary-dark': 'oklch(0.68 0.16 250)',
    '--primary-foreground-light': 'oklch(0.99 0.002 0)',
    '--primary-foreground-dark': 'oklch(0.10 0.01 250)',
    '--accent-light': 'oklch(0.95 0.018 250)',
    '--accent-dark': 'oklch(0.20 0.02 250)',
    '--accent-foreground-light': 'oklch(0.55 0.18 250)',
    '--accent-foreground-dark': 'oklch(0.70 0.14 250)',
    '--ring-light': 'oklch(0.55 0.18 250)',
    '--ring-dark': 'oklch(0.68 0.16 250)',
  },
  LECTURER: {
    '--primary-light': 'oklch(0.55 0.15 160)', // Teal/Emerald
    '--primary-dark': 'oklch(0.68 0.13 160)',
    '--primary-foreground-light': 'oklch(0.99 0.002 0)',
    '--primary-foreground-dark': 'oklch(0.10 0.01 160)',
    '--accent-light': 'oklch(0.95 0.015 160)',
    '--accent-dark': 'oklch(0.19 0.02 160)',
    '--accent-foreground-light': 'oklch(0.55 0.15 160)',
    '--accent-foreground-dark': 'oklch(0.68 0.13 160)',
    '--ring-light': 'oklch(0.55 0.15 160)',
    '--ring-dark': 'oklch(0.68 0.13 160)',
  },
  ADMIN: {
    '--primary-light': 'oklch(0.52 0.20 285)', // Purple/Violet
    '--primary-dark': 'oklch(0.65 0.18 285)',
    '--primary-foreground-light': 'oklch(0.99 0.002 0)',
    '--primary-foreground-dark': 'oklch(0.10 0.01 285)',
    '--accent-light': 'oklch(0.95 0.018 285)',
    '--accent-dark': 'oklch(0.20 0.02 285)',
    '--accent-foreground-light': 'oklch(0.52 0.20 285)',
    '--accent-foreground-dark': 'oklch(0.65 0.18 285)',
    '--ring-light': 'oklch(0.52 0.20 285)',
    '--ring-dark': 'oklch(0.65 0.18 285)',
  },
};

export const defaultTheme: ThemeVariables = {
  '--primary-light': 'oklch(0.25 0.02 245)', // Deep Slate Blue
  '--primary-dark': 'oklch(0.70 0.12 245)',
  '--primary-foreground-light': 'oklch(0.99 0.002 0)',
  '--primary-foreground-dark': 'oklch(0.10 0.01 245)',
  '--accent-light': 'oklch(0.96 0.01 245)',
  '--accent-dark': 'oklch(0.20 0.02 245)',
  '--accent-foreground-light': 'oklch(0.25 0.02 245)',
  '--accent-foreground-dark': 'oklch(0.70 0.12 245)',
  '--ring-light': 'oklch(0.25 0.02 245)',
  '--ring-dark': 'oklch(0.70 0.12 245)',
};

export function applyTheme(theme: ThemeVariables): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(key, value);
  }
}

export function clearTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of Object.keys({ ...defaultTheme, ...roleThemes.STUDENT, ...roleThemes.LECTURER, ...roleThemes.ADMIN })) {
    root.style.removeProperty(key);
  }
}
