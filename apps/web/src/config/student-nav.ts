import {
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  FolderOpen,
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

export const studentSidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/student/dashboard' },
  { icon: BookOpen, label: 'Courses', href: '/student/courses' },
  { icon: BarChart3, label: 'Results', href: '/student/results' },
  { icon: FolderOpen, label: 'Resources', href: '/student/resources' },
  { icon: MessageSquare, label: 'Forum', href: '/student/forum' },
  { icon: Bell, label: 'Notifications', href: '/student/notifications' },
  { icon: User, label: 'Profile', href: '/student/profile' },
];

export const studentDockPrimary: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/student/dashboard' },
  { icon: FolderOpen, label: 'Resources', href: '/student/resources' },
  { icon: MessageSquare, label: 'Forum', href: '/student/forum' },
  { icon: Menu, label: 'More', onClick: 'expand' },
];

export const studentDockExpanded: NavItem[] = [
  { icon: BookOpen, label: 'Courses', href: '/student/courses' },
  { icon: BarChart3, label: 'Results', href: '/student/results' },
  { icon: Bookmark, label: 'Saved', href: '/student/resources?saved=true' },
  { icon: User, label: 'Profile', href: '/student/profile' },
  { icon: Settings, label: 'Settings', href: '/student/settings' },
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

