'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import { BrandingLoader } from '@/components/layout/branding-loader';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [client] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={client}>
      <BrandingLoader />
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
