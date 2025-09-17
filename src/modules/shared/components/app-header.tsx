"use client";

import { Bell, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UserProfile } from "@/modules/auth/services/supabase-auth-actions";
import { signOut } from "@/modules/auth/services/supabase-auth-actions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/modules/shared/components/ui/ui/avatar";
import { Button } from "@/modules/shared/components/ui/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/ui/dropdown-menu";
import { SidebarTrigger } from "@/modules/shared/components/ui/ui/sidebar";
import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeToggleButton } from "../../../components/theme-toggle-button";

const pathToTitle: { [key: string]: string } = {
  "/dashboard": "Dashboard",
  "/purchase": "Purchase Management",
  "/sales": "Sales Management",
  "/finance": "Finance Management",
  "/maintenance": "Maintenance",
  "/hr/employees": "Employee Management",
  "/hr/attendance": "Attendance Management",
  "/hr/payroll": "Payroll Management",
  "/admin/users": "User Management",
  "/admin/roles": "Role Management",
  "/admin/logs": "Activity Logs",
  "/reports": "Reports & Analytics",
  "/alerts": "System Alerts",
  "/settings": "System Settings",
};

export function AppHeader({ user }: { user: UserProfile | null }) {
  const pathname = usePathname();

  // Find the most specific matching path
  const pageTitleKey =
    Object.keys(pathToTitle)
      .sort((a, b) => b.length - a.length) // Sort by length, longest first
      .find((path) => pathname.startsWith(path)) || "/dashboard";

  const pageTitle = pathToTitle[pageTitleKey];

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <SidebarTrigger className="md:hidden" />

      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-2xl">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggleButton />

        <Button variant="outline" size="icon" className="ml-2 h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="relative h-8 rounded-full"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={user?.image || ""}
                  alt={user?.name || "User"}
                />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
