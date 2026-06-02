'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@eduportal/shared';

const COOKIE_NAME = 'eduportal-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

function writeCookie(token: string | null): void {
  if (typeof document === 'undefined') return;
  if (token) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        writeCookie(token);
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        writeCookie(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (patch) =>
        set((state) =>
          state.user ? { user: { ...state.user, ...patch } } : state
        ),
    }),
    {
      name: 'eduportal-auth',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return window.localStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) writeCookie(state.token);
      },
    }
  )
);

export function readAuthTokenFromCookie(): string | null {
  return readCookie();
}
