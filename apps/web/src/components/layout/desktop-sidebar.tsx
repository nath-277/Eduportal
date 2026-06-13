'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { GraduationCap, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import type { User, UserRole } from '@eduportal/shared';

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

interface DesktopSidebarProps {
  items: SidebarItem[];
  role: UserRole;
  user: User;
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

export function DesktopSidebar({ items, role, user }: DesktopSidebarProps) {
  const pathname = usePathname();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  function handleLogout(): void {
    clearAuth();
    window.location.replace('/login');
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex sticky top-0 h-screen">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">EduPortal</p>
          <p className="text-xs text-muted-foreground">{roleLabel(role)} workspace</p>
        </div>
      </div>

      <div className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5" aria-label="Sidebar">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname ?? '', item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge && item.badge > 0 ? (
                  <Badge variant={active ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <Separator />
      <div className="space-y-3 p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="h-9 w-9">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullname} /> : null}
            <AvatarFallback>{initials(user.fullname)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user.fullname}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
