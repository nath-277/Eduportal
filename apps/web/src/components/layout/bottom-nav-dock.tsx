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
  badge?: number;
}

interface BottomNavDockProps {
  primaryItems: NavItem[];
  expandedItems?: NavItem[];
  hiddenOnDesktop?: boolean;
}

function isItemActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isExpandTrigger(item: NavItem): boolean {
  return item.icon === Menu;
}

export function BottomNavDock({
  primaryItems,
  expandedItems = [],
  hiddenOnDesktop = false,
}: BottomNavDockProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const gridItems = expandedItems.filter(
    (i) => !i.label.toLowerCase().includes('logout') && !i.label.toLowerCase().includes('log out')
  );
  const logoutItem = expandedItems.find(
    (i) => i.label.toLowerCase().includes('logout') || i.label.toLowerCase().includes('log out')
  );

  const triggerItem = (item: NavItem) => {
    if (isExpandTrigger(item)) {
      setOpen(true);
      return;
    }
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]',
          'pb-[env(safe-area-inset-bottom)]',
          hiddenOnDesktop && 'md:hidden'
        )}
        aria-label="Primary"
      >
        <ul
          className="mx-auto grid max-w-md px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${primaryItems.length}, minmax(0, 1fr))` }}
        >
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const expand = isExpandTrigger(item);
            const active = expand ? open : isItemActive(pathname ?? '', item.href);
            const inner = (
              <span
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 ? (
                    <span
                      className={cn(
                        'absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground ring-2 ring-background',
                        active && 'bg-primary-foreground text-primary ring-primary',
                      )}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-[10px] leading-none">{item.label}</span>
              </span>
            );
            return (
              <li key={item.label} className="flex items-center justify-center">
                {item.href && !expand ? (
                  <Link href={item.href} className="block w-full" aria-current={active ? 'page' : undefined} title={item.label}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerItem(item)}
                    className="block w-full"
                    aria-current={active ? 'page' : undefined}
                    aria-expanded={expand ? open : undefined}
                    aria-haspopup={expand ? 'dialog' : undefined}
                    aria-label={expand ? 'Open more menu' : item.label}
                    title={expand ? 'More' : item.label}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
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

              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-sm font-semibold">More</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="grid grid-cols-2 gap-2 p-4">
                {gridItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname ?? '', item.href);
                  const inner = (
                    <span
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-muted'
                      )}
                    >
                      <span className="relative">
                        <Icon className="h-5 w-5" />
                        {item.badge && item.badge > 0 ? (
                          <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        ) : null}
                      </span>
                      <span>{item.label}</span>
                    </span>
                  );
                  return (
                    <li key={item.label}>
                      {item.onClick ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            item.onClick?.();
                          }}
                          className="block w-full"
                          title={item.label}
                        >
                          {inner}
                        </button>
                      ) : item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block w-full"
                          title={item.label}
                        >
                          {inner}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {logoutItem && (
                <div className="border-t border-border p-4 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      logoutItem.onClick?.();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive py-3 px-4 text-sm font-semibold transition"
                    title={logoutItem.label}
                  >
                    <logoutItem.icon className="h-5 w-5" />
                    <span>{logoutItem.label}</span>
                  </button>
                </div>
              )}

              <div className="h-[env(safe-area-inset-bottom)]" />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
