"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

type BreadcrumbItem = {
  href: string;
  label: string;
};

// Define exact breadcrumb paths for each route
const ROUTE_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ href: "/", label: "Dashboard" }],
  "/transactions": [
    { href: "/", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
  ],
  "/transactions/new": [
    { href: "/", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/transactions/new", label: "New Transaction" },
  ],
  "/transactions/recurring": [
    { href: "/", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/transactions/recurring", label: "Recurring Transactions" },
  ],
  "/settings": [
    { href: "/", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
  ],
  "/settings/profile": [
    { href: "/", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
    { href: "/settings/profile", label: "Profile" },
  ],
  "/settings/billing": [
    { href: "/", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
    { href: "/settings/billing", label: "Billing" },
  ],
  "/settings/notifications": [
    { href: "/", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
    { href: "/settings/notifications", label: "Notifications" },
  ],
};

export function RouteBreadcrumb() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    return ROUTE_BREADCRUMBS[pathname] || [];
  }, [pathname]);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => {
          const isLastItem = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={breadcrumb.href}>
              <BreadcrumbItem key={breadcrumb.href}>
                {isLastItem ? (
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={breadcrumb.href}>
                    {breadcrumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index !== breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })} 
      </BreadcrumbList>
    </Breadcrumb>
  );
}
