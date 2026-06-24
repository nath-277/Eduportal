'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { LogOut, ChevronLeft, BookOpen, HelpCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import type { User, UserRole } from '@eduportal/shared';
import { Logo } from '@/components/ui/logo';
import { useSettings } from '@/hooks/use-settings';

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

interface DesktopSidebarProps {
  items: readonly SidebarItem[];
  role: UserRole;
  user: User;
  onOpenUserGuide?: () => void;
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function roleLabel(role: UserRole): string {
  if (role === 'STUDENT') return 'Student';
  if (role === 'LECTURER') return 'Lecturer';
  return 'Administrator';
}

function initials(fullname: string): string {
  return fullname
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function DesktopSidebar({ items, role, user, onOpenUserGuide }: DesktopSidebarProps) {
  const pathname = usePathname();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: settings } = useSettings();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
      if (collapsed) {
        const t = setTimeout(() => setIsCollapsed(true), 0);
        return () => clearTimeout(t);
      }
    }
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

  const hasLogo = !!settings?.portalLogoUrl;
  const portalName = settings?.portalName || 'EduPortal';

  function handleLogout(): void {
    clearAuth();
    window.location.replace('/login');
  }

  return (
    <aside className={cn(
      "hidden shrink-0 flex-col border-r border-border bg-card md:flex sticky top-0 h-screen transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className={cn(
        "flex h-16 items-center border-b border-border px-4",
        isCollapsed ? "justify-center" : "justify-between gap-2"
      )}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden",
                hasLogo ? "" : "bg-primary text-primary-foreground"
              )}>
                <Logo className={hasLogo ? "h-9 w-9" : "h-9 w-9 p-1.5"} iconClassName="h-5 w-5" />
              </div>
              <div className="leading-tight truncate">
                <p className="text-sm font-semibold truncate">{portalName}</p>
                <p className="text-xs text-muted-foreground truncate">{roleLabel(role)} workspace</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden p-0 hover:bg-muted",
              hasLogo ? "" : "bg-primary text-primary-foreground"
            )}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Logo className={hasLogo ? "h-9 w-9" : "h-9 w-9 p-1.5"} iconClassName="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 px-2 py-3 overflow-y-auto">
        <nav className="flex flex-col gap-0.5" aria-label="Sidebar">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname ?? '', item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                title={item.label}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                  isCollapsed ? 'justify-center' : 'justify-between'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!isCollapsed && item.badge && item.badge > 0 ? (
                  <Badge variant={active ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                    {item.badge}
                  </Badge>
                ) : null}
                {isCollapsed && item.badge && item.badge > 0 ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto px-2 pb-2 space-y-0.5">
        {!isCollapsed && (
          <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Help</p>
        )}
        <button
          type="button"
          onClick={onOpenUserGuide}
          className={cn(
            'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-foreground/80 hover:bg-muted hover:text-foreground',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
          title="User Guide"
          aria-label="User Guide"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          {!isCollapsed && <span className="truncate">User Guide</span>}
        </button>
        <Link
          href="/support"
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-foreground/80 hover:bg-muted hover:text-foreground',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
          title="Support"
          aria-label="Support"
        >
          <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          {!isCollapsed && <span className="truncate">Support</span>}
        </Link>
      </div>

      <Separator />
      <div className={cn("space-y-3 p-3", isCollapsed ? "flex flex-col items-center" : "")}>
        <div className={cn("flex items-center gap-3 rounded-lg w-full", isCollapsed ? "justify-center p-0" : "p-2")}>
          <Avatar className="h-9 w-9" title={user.fullname}>
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullname} /> : null}
            <AvatarFallback>{initials(user.fullname)}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">{user.fullname}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("justify-start gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive", isCollapsed ? "h-9 w-9 justify-center p-0" : "w-full")}
          onClick={handleLogout}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Log out</span>}
        </Button>
      </div>
    </aside>
  );
}
