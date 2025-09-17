"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/shared/components/ui/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/modules/shared/components/ui/ui/sidebar";
import {
  AlertTriangle,
  BarChart,
  CalendarCheck,
  Car,
  ChevronRight,
  DollarSign,
  FileText,
  LayoutDashboard,
  Shield,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Logo = () => (
  <div className="flex items-center gap-2 px-4 py-2">
    <div className="flex items-center">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-md flex items-center justify-center">
        <Car className="w-4 h-4 text-white" />
      </div>
      <span className="ml-2 text-xl font-bold text-foreground">
        OpenRoad DMS
      </span>
    </div>
  </div>
);

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const mainMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/purchase", label: "Purchase", icon: ShoppingCart },
    { href: "/sales", label: "Sales", icon: DollarSign },
    { href: "/finance", label: "Finance", icon: DollarSign },
    { href: "/maintenance", label: "Maintenance", icon: Wrench },
  ];

  const hrMenuItems = [
    { href: "/hr/employees", label: "Employees", icon: Users },
    { href: "/hr/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/hr/payroll", label: "Payroll", icon: FileText },
  ];

  const bottomMenuItems = [
    { href: "/reports", label: "Reports", icon: BarChart },
    { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  ];

  const adminMenuItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/roles", label: "Roles", icon: Shield },
    { href: "/admin/logs", label: "Logs", icon: FileText },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>

      <SidebarContent>
        {/* Main Menu Items - No header */}
        <div className="px-3 py-2">
          <SidebarMenu>
            {mainMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  className="w-full justify-start"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {/* HR Menu with Dropdown */}
        <div className="px-3 py-2">
          <SidebarMenu>
            <Collapsible className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="w-full justify-start">
                    <Users className="h-4 w-4" />
                    <span>HR</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {hrMenuItems.map((item) => (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isActive(item.href)}
                          className="w-full justify-start"
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </div>

        {/* Spacer to push bottom items down */}
        <div className="flex-1" />

        {/* Bottom Menu Items - Reports and Alerts */}
        <div className="px-3 py-2">
          <SidebarMenu>
            {bottomMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  className="w-full justify-start"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {/* Admin Menu with Dropdown at Bottom */}
        <div className="px-3 py-2">
          <SidebarMenu>
            <Collapsible className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="w-full justify-start">
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {adminMenuItems.map((item) => (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isActive(item.href)}
                          className="w-full justify-start"
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2">
          <div className="text-sm text-muted-foreground">
            © 2024 OpenRoad DMS
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
