import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: async () =>
      api.get<{
        portalName: string;
        displayName: string;
        facultyName: string;
        maxLoginAttempts: number;
        sessionExpiry: string;
        allowedEmailDomain: string;
        portalLogoUrl: string | null;
      }>('/settings'),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
