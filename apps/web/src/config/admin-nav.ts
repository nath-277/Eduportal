import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarRange,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  ShieldAlert,
  Users,
  ArrowUpCircle,
  Star,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  icon: LucideIcon;
  label: string;
  href: string;
  onClick?: never;
}

export interface NavAction {
  icon: LucideIcon;
  label: string;
  href?: never;
  onClick: 'expand' | 'logout';
}

export type SidebarItem = NavLink;
export type NavItem = NavLink | NavAction;

export const adminSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Building2, label: 'Departments', href: '/admin/departments' },
  { icon: CalendarRange, label: 'Sessions', href: '/admin/sessions' },
  { icon: BookOpen, label: 'Courses', href: '/admin/courses' },
  { icon: ClipboardCheck, label: 'Results', href: '/admin/results' },
  { icon: ArrowUpCircle, label: 'Promotions', href: '/admin/promotions' },
  { icon: Star, label: 'Platform Feedback', href: '/admin/feedback' },
  { icon: Megaphone, label: 'Announcements', href: '/admin/announcements' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: ShieldAlert, label: 'Audit Logs', href: '/admin/logs' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export const adminDockPrimary: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/admin/dashboard' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Bell, label: 'Alerts', href: '/admin/notifications' },
  { icon: ShieldAlert, label: 'Logs', href: '/admin/logs' },
  { icon: Menu, label: 'More', onClick: 'expand' },
];

export const adminDockExpanded: NavItem[] = [
  { icon: Building2, label: 'Departments', href: '/admin/departments' },
  { icon: CalendarRange, label: 'Sessions', href: '/admin/sessions' },
  { icon: BookOpen, label: 'Courses', href: '/admin/courses' },
  { icon: ClipboardCheck, label: 'Results', href: '/admin/results' },
  { icon: ArrowUpCircle, label: 'Promotions', href: '/admin/promotions' },
  { icon: Star, label: 'Feedback', href: '/admin/feedback' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
  { icon: LogOut, label: 'Logout', onClick: 'logout' },
];

export function toSidebarItems(items: SidebarItem[]): Array<{
  icon: LucideIcon;
  label: string;
  href: string;
}> {
  return items.map((i) => ({ icon: i.icon, label: i.label, href: i.href }));
}

export function toDockItems(
  items: NavItem[],
  handlers: { onLogout: () => void },
): Array<{
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
}> {
  return items.map((i) => {
    if (i.onClick === 'logout') {
      return { icon: i.icon, label: i.label, onClick: handlers.onLogout };
    }
    return { icon: i.icon, label: i.label, href: i.href };
  });
}
