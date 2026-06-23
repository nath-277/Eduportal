import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  LineChart,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Upload,
  User,
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

export const lecturerSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/lecturer/dashboard' },
  { icon: BookOpen, label: 'My courses', href: '/lecturer/courses' },
  { icon: BarChart3, label: 'Results', href: '/lecturer/results/upload' },
  { icon: Upload, label: 'Resources', href: '/lecturer/resources/upload' },
  { icon: Megaphone, label: 'Announcements', href: '/lecturer/announcements' },
  { icon: MessageSquare, label: 'Discussions', href: '/lecturer/forum' },
  { icon: LineChart, label: 'Analytics', href: '/lecturer/analytics' },
  { icon: User, label: 'Profile', href: '/lecturer/profile' },
];

export const lecturerDockPrimary: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/lecturer/dashboard' },
  { icon: Upload, label: 'Upload', href: '/lecturer/results/upload' },
  { icon: MessageSquare, label: 'Forum', href: '/lecturer/forum' },
  { icon: Menu, label: 'More', onClick: 'expand' },
];

export const lecturerDockExpanded: NavItem[] = [
  { icon: BarChart3, label: 'Upload results', href: '/lecturer/results/upload' },
  { icon: Upload, label: 'Upload resources', href: '/lecturer/resources/upload' },
  { icon: LineChart, label: 'Analytics', href: '/lecturer/analytics' },
  { icon: BookOpen, label: 'My courses', href: '/lecturer/courses' },
  { icon: Megaphone, label: 'Announcements', href: '/lecturer/announcements' },
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
