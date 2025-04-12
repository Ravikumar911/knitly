'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Wallet,
  Settings,
} from 'lucide-react';

import {
  Sidebar as UISidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@workspace/ui/components/sidebar';

const navigationItems = [
  {
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
    label: 'Dashboard',
  },
  {
    href: '/transactions',
    icon: <Receipt size={20} />,
    label: 'Transactions',
  },
  {
    href: '/categories',
    icon: <Tags size={20} />,
    label: 'Categories',
  },
  {
    href: '/accounts',
    icon: <Wallet size={20} />,
    label: 'Accounts',
  },
  {
    href: '/settings',
    icon: <Settings size={20} />,
    label: 'Settings',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <UISidebar>
        <SidebarHeader className="flex h-14 items-center px-4">
          <span className="text-lg font-semibold">Fintracker</span>
          <SidebarTrigger className="ml-auto" />
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </UISidebar>
    </SidebarProvider>
  );
} 