import type { UserRole } from '@eduportal/shared';

export type ThemeVariables = Record<`--${string}`, string>;

export const roleThemes: Record<UserRole, ThemeVariables> = {
  STUDENT: {
    '--primary': '217 91% 60%',
    '--primary-foreground': '0 0% 100%',
    '--accent': '189 94% 43%',
    '--ring': '217 91% 60%',
  },
  LECTURER: {
    '--primary': '160 84% 39%',
    '--primary-foreground': '0 0% 100%',
    '--accent': '173 80% 40%',
    '--ring': '160 84% 39%',
  },
  ADMIN: {
    '--primary': '271 91% 65%',
    '--primary-foreground': '0 0% 100%',
    '--accent': '263 70% 50%',
    '--ring': '271 91% 65%',
  },
};

export const defaultTheme: ThemeVariables = {
  '--primary': '222 47% 11%',
  '--primary-foreground': '210 40% 98%',
  '--accent': '210 40% 96%',
  '--ring': '222 47% 11%',
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
