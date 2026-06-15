'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Share, Download, Smartphone, ArrowUpRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('ServiceWorker registration failed: ', err);
      });
    }

    // 2. Detect mobile and standalone status
    const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Check standalone mode
    const checkStandalone = 
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true) || 
      window.matchMedia('(display-mode: standalone)').matches;

    const t = setTimeout(() => {
      setIsMobile(checkMobile);
      setIsStandalone(checkStandalone);
    }, 0);

    // 3. Listen to beforeinstallprompt event (Chrome/Android)
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  };

  const isDev = process.env.NODE_ENV === 'development';
  const forceInstall = typeof window !== 'undefined' && window.location.search.includes('force_install=true');

  // If the user is on mobile and not running the PWA in standalone mode, block with install instructions
  if (isMobile && !isStandalone && (!isDev || forceInstall)) {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 p-6 text-white overflow-y-auto">
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_50%)]" />
        
        <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            {/* Pulsing app icon */}
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/20 animate-pulse">
              <Smartphone className="h-10 w-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">
              Install EduPortal App
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              To proceed and access your university dashboard, please add the EduPortal web app to your Home Screen.
            </p>
          </div>

          <div className="my-6 border-t border-slate-800" />

          {/* Dynamic Platform-based Instructions */}
          {isIOS ? (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold">Instructions for Safari on iOS:</p>
              <ol className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">1</span>
                  <span>Tap the <strong className="text-white">Share</strong> button <Share className="inline h-4 w-4 text-violet-400 mx-0.5" /> in Safari&apos;s bottom toolbar.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">2</span>
                  <span>Scroll down the options list and tap <strong className="text-white">Add to Home Screen</strong> <ArrowUpRight className="inline h-4 w-4 text-fuchsia-400 mx-0.5" />.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">3</span>
                  <span>Confirm the app name and launch the app directly from your mobile home screen.</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold">Instructions for Android:</p>
              
              {deferredPrompt ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-300">
                    Your browser supports instant installation. Tap below to install directly:
                  </p>
                  <Button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/20 py-5 text-base font-semibold"
                  >
                    <Download className="h-5 w-5" />
                    Install App Now
                  </Button>
                </div>
              ) : (
                <ol className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">1</span>
                    <span>Tap the browser menu button (three dots <MoreVertical className="inline h-4 w-4 text-slate-400" />) in the top-right corner.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">2</span>
                    <span>Select <strong className="text-white">Install App</strong> or <strong className="text-white">Add to Home screen</strong>.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">3</span>
                    <span>Confirm installation and open it natively from your app drawer.</span>
                  </li>
                </ol>
              )}
            </div>
          )}

          <div className="mt-6 text-center text-[10px] text-slate-500">
            Running standalone ensures offline caching, native performance, and fullscreen layouts.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
