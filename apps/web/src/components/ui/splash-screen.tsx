'use client';

import { motion } from 'framer-motion';
import { Logo } from './logo';
import { useSettings } from '@/hooks/use-settings';

interface SplashScreenProps {
  label?: string;
}

export function SplashScreen({ label = 'Loading secure environment' }: SplashScreenProps) {
  const { data } = useSettings();

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden select-none">
      {/* Immersive background glowing blobs */}
      <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_70%)] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12),transparent_70%)] blur-[100px] pointer-events-none" />
      
      {/* Content wrapper */}
      <div className="relative flex flex-col items-center justify-center text-center px-4">
        {/* Animated Brand Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          className="relative"
        >
          <motion.div
            animate={{
              scale: [1, 1.04, 1],
              opacity: [0.9, 1, 0.9],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-violet-600 shadow-2xl shadow-primary/25"
          >
            <Logo className="h-12 w-12 text-white shrink-0" iconClassName="h-12 w-12 text-white shrink-0" />
            
            {/* Ambient soft glow ring */}
            <span className="absolute -inset-1.5 rounded-[30px] bg-gradient-to-br from-primary to-violet-600 opacity-20 blur-md pointer-events-none" />
          </motion.div>
        </motion.div>

        {/* Text Details with Slide-up Animations */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-6 flex flex-col items-center"
        >
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">
            {data?.portalName || 'EduPortal'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium max-w-[280px]">
            {data?.displayName || 'Your University Companion'}
          </p>
        </motion.div>

        {/* Premium Indeterminate Progress Loader */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <div className="relative w-48 h-[3px] bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute top-0 bottom-0 left-0 w-2/3 bg-gradient-to-r from-primary via-blue-500 to-violet-600 rounded-full"
            />
          </div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground/80 animate-pulse">
            {label}
          </p>
        </motion.div>
      </div>

      {/* Decorative Brand Footer */}
      <div className="absolute bottom-6 flex items-center justify-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
          Protected Session
        </p>
      </div>
    </div>
  );
}
