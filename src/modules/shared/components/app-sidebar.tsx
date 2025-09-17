"use client";

import type { UserRecord } from "@/app/(dashboard)/admin/users/page";
import { useTranslation } from "@/hooks/use-translation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/modules/shared/components/ui/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/shared/components/ui/ui/collapsible";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/modules/shared/components/ui/ui/sidebar";
import { cn } from "@/modules/shared/utils/utils";
import {
  AlertTriangle,
  Banknote,
  BarChart,
  CalendarCheck,
  Car,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  Shield,
  ShoppingCart,
  User,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Logo = () => (
  <svg
    width="180"
    height="32"
    viewBox="0 0 180 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-foreground dark:text-primary-foreground"
  >
    <defs>
      <linearGradient id="sidebar-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" className="stop-color-1" />
        <stop offset="50%" className="stop-color-2" />
        <stop offset="100%" className="stop-color-3" />
      </linearGradient>
    </defs>
    <style>
      {`
        .stop-color-1 { stop-color: #333 }
        .stop-color-2 { stop-color: #888 }
        .stop-color-3 { stop-color: #333 }
        .dark .stop-color-1 { stop-color: #eee }
        .dark .stop-color-2 { stop-color: #fff }
        .dark .stop-color-3 { stop-color: #eee }
      `}
    </style>
    <g transform="scale(0.8) skewX(-15)">
      <path d="M0 0 L12 0 L0 40 Z" fill="#8ab4f8" />
      <path d="M14 0 L26 0 L14 40 Z" fill="#004488" />
      <path d="M28 0 L40 0 L28 40 Z" fill="#DB4437" />
    </g>
    <text
      x="40"
      y="22"
      fontFamily="serif"
      fontSize="18"
      fill="url(#sidebar-grad)"
      fontWeight="600"
      className="tracking-wider"
    >
      OPENROAD
    </text>
  </svg>
);

export function AppSidebar({ user }: { user: UserRecord | null }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { t } = useTranslation();

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/purchase", label: "Purchase", icon: ShoppingCart },
    { href: "/sales", label: "Sales", icon: DollarSign },
    { href: "/finance", label: "Finance", icon: Banknote },
    { href: "/maintenance", label: "Maintenance", icon: Wrench },
  ];

  const hrMenuItems = [
    { href: "/hr/employees", label: "Employees", icon: User },
    { href: "/hr/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/hr/payroll", label: "Payroll", icon: FileText },
  ];

  const adminMenuItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/roles", label: "Roles", icon: Shield },
    { href: "/admin/logs", label: "Logs", icon: Clock },
  ];

  const bottomMenuItems = [
    { href: "/reports", label: "Reports", icon: BarChart },
    { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  ];

  const isActive = (href: string) => {
    // Exact match for dashboard, prefix for others
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const isHrActive = hrMenuItems.some((item) => pathname.startsWith(item.href));
  const isAdminActive = adminMenuItems.some((item) =>
    pathname.startsWith(item.href)
  );

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-background dark:bg-sidebar-background rounded-lg p-2 flex items-center justify-center">
            {state === "expanded" ? (
              <Logo />
            ) : (
              <Car className="h-6 w-6 text-primary" />
            )}
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={{ children: t(item.label) }}
                >
                  <div>
                    <item.icon className="h-5 w-5" />
                    <span>{t(item.label)}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <Collapsible defaultOpen={isHrActive}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton isSubmenu={true} isActive={isHrActive}>
                  <Users className="h-5 w-5" />
                  <span>{t("HR")}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 data-[state=closed]:animate-none">
                <div className="space-y-1 mt-1">
                  {hrMenuItems.map((item) => (
                    <div key={item.href}>
                      <Link href={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href)}
                          variant="ghost"
                          className="justify-start"
                        >
                          <div>
                            <item.icon className="h-4 w-4" />
                            <span>{t(item.label)}</span>
                          </div>
                        </SidebarMenuButton>
                      </Link>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="mt-auto">
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={{ children: t(item.label) }}
                >
                  <div>
                    <item.icon className="h-5 w-5" />
                    <span>{t(item.label)}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <Collapsible defaultOpen={isAdminActive}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton isSubmenu={true} isActive={isAdminActive}>
                  <Shield className="h-5 w-5" />
                  <span>{t("Admin")}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 data-[state=closed]:animate-none">
                <div className="space-y-1 mt-1">
                  {adminMenuItems.map((item) => (
                    <div key={item.href}>
                      <Link href={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.href)}
                          variant="ghost"
                          className="justify-start"
                        >
                          <div>
                            <item.icon className="h-4 w-4" />
                            <span>{t(item.label)}</span>
                          </div>
                        </SidebarMenuButton>
                      </Link>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center gap-3 p-2">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user?.image || ""}
              alt={user?.name || "User"}
              data-ai-hint="profile picture"
            />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div
            className={cn("flex flex-col", state === "collapsed" && "hidden")}
          >
            <span className="font-semibold text-sm">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
