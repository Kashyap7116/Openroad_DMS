"use client";

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

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { t } = useTranslation();

  const menuItems = [
    { href: "/dashboard", label: t("Dashboard"), icon: LayoutDashboard },
    { href: "/purchase", label: t("Purchase"), icon: ShoppingCart },
    { href: "/sales", label: t("Sales"), icon: DollarSign },
    { href: "/finance", label: t("Finance"), icon: Banknote },
    { href: "/maintenance", label: t("Maintenance"), icon: Wrench },
  ];

  const hrMenuItems = [
    { href: "/hr/employees", label: t("Employees"), icon: User },
    { href: "/hr/attendance", label: t("Attendance"), icon: CalendarCheck },
    { href: "/hr/payroll", label: t("Payroll"), icon: FileText },
  ];

  const adminMenuItems = [
    { href: "/admin/dashboard", label: t("Dashboard"), icon: LayoutDashboard },
    { href: "/admin/users", label: t("Users"), icon: Users },
    { href: "/admin/roles", label: t("Roles"), icon: Shield },
    { href: "/admin/logs", label: t("Logs"), icon: Clock },
  ];

  const bottomMenuItems = [
    { href: "/reports", label: t("Reports"), icon: BarChart },
    { href: "/alerts", label: t("Alerts"), icon: AlertTriangle },
  ];

  const isActive = (href: string) => {
    return pathname === href;
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
                  tooltip={{ children: item.label }}
                >
                  <div>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <Collapsible defaultOpen={isHrActive}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton isSubmenu={true} isActive={isHrActive}>
                  <Users className="h-5 w-5" />
                  <span>{t("HR")}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
            <CollapsibleContent className="pl-8 data-[state=closed]:animate-none">
              <SidebarMenu>
                {hrMenuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        variant="ghost"
                        className="justify-start"
                      >
                        <div>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenu>
        <SidebarMenu className="mt-auto">
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={{ children: item.label }}
                >
                  <div>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <Collapsible defaultOpen={isAdminActive}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton isSubmenu={true} isActive={isAdminActive}>
                  <Shield className="h-5 w-5" />
                  <span>{t("Admin")}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
            <CollapsibleContent className="pl-8 data-[state=closed]:animate-none">
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        variant="ghost"
                        className="justify-start"
                      >
                        <div>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center gap-3 p-2">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src="https://picsum.photos/100"
              alt="@shadcn"
              data-ai-hint="profile picture"
            />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div
            className={cn("flex flex-col", state === "collapsed" && "hidden")}
          >
            <span className="font-semibold text-sm">John Doe</span>
            <span className="text-xs text-muted-foreground">
              john.doe@openroad.com
            </span>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
