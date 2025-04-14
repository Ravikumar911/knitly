"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Wallet,
  Settings,
  Command,
  LifeBuoy,
  Send,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@workspace/ui/components/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        {
          title: "Analytics",
          url: "/dashboard/analytics",
        },
        {
          title: "Reports",
          url: "/dashboard/reports",
        },
      ],
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: Receipt,
      items: [
        {
          title: "All Transactions",
          url: "/transactions",
        },
        {
          title: "Recurring",
          url: "/transactions/recurring",
        },
        {
          title: "Scheduled",
          url: "/transactions/scheduled",
        },
      ],
    },
    {
      title: "Categories",
      url: "/categories",
      icon: Tags,
      items: [
        {
          title: "Manage Categories",
          url: "/categories",
        },
        {
          title: "Rules",
          url: "/categories/rules",
        },
      ],
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: Wallet,
      items: [
        {
          title: "All Accounts",
          url: "/accounts",
        },
        {
          title: "Link Account",
          url: "/accounts/link",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "/settings",
        },
        {
          title: "Profile",
          url: "/settings/profile",
        },
        {
          title: "Notifications",
          url: "/settings/notifications",
        },
        {
          title: "Security",
          url: "/settings/security",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Help & Support",
      url: "/support",
      icon: LifeBuoy,
    },
    {
      title: "Send Feedback",
      url: "/feedback",
      icon: Send,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">slash.cash</span>
                  <span className="truncate text-xs">Personal Finance</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
