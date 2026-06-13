'use client';

import { useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';

export function BrandingLoader() {
  const { data } = useSettings();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (data?.portalLogoUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = data.portalLogoUrl;
    } else {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = '/favicon.ico';
      }
    }
  }, [data?.portalLogoUrl]);

  return null;
}
