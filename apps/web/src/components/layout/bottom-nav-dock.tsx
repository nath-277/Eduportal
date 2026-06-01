'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BottomNavDockProps {
  primaryItems: NavItem[];
  expandedItems?: NavItem[];
}

function isItemActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavDock({ primaryItems, expandedItems = [] }: BottomNavDockProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const visible = primaryItems.slice(0, 4);
  const menuItem: NavItem = { icon: Menu, label: 'Menu' };

  function triggerItem(item: NavItem): void {
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
  }

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]',
          'pb-[env(safe-area-inset-bottom)]'
        )}
        aria-label="Primary"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 px-2 py-2">
          {visible.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname ?? '', item.href);
            const inner = (
              <span
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] leading-none">{item.label}</span>
              </span>
            );
            return (
              <li key={item.label} className="flex items-center justify-center">
                {item.href && !item.onClick ? (
                  <Link href={item.href} className="block w-full" aria-current={active ? 'page' : undefined}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerItem(item)}
                    className="block w-full"
                    aria-current={active ? 'page' : undefined}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
          <li className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                open
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-label={menuItem.label}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] leading-none">{menuItem.label}</span>
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
          >
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-t-3xl border-t border-border bg-background shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) {
                  setOpen(false);
                }
              }}
            >
              <div className="flex justify-center pb-2 pt-3">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2">
                <h2 className="text-base font-semibold">More</h2>
                <button
                  type="button"
                  aria-label="Close"
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
                {expandedItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname ?? '', item.href);
                  const inner = (
                    <span
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-sm font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-card text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs">{item.label}</span>
                    </span>
                  );
                  return (
                    <div key={item.label}>
                      {item.href && !item.onClick ? (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            triggerItem(item);
                            setOpen(false);
                          }}
                          className="block w-full"
                        >
                          {inner}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
