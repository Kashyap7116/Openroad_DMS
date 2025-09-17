"use client";

import { Bell, LogOut } from "lucide-react";
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

const pathToTitle: { [key: string]: { en: string; th: string } } = {
  "/dashboard": { en: "Dashboard", th: "แดชบอร์ด" },
  "/purchase": { en: "Purchase", th: "จัดซื้อ" },
  "/sales": { en: "Sales", th: "การขาย" },
  "/finance": { en: "Finance", th: "การเงิน" },
  "/maintenance": { en: "Maintenance", th: "ซ่อมบำรุง" },
  "/hr/employees": { en: "Employees", th: "พนักงาน" },
  "/hr/attendance": { en: "Attendance", th: "การเข้างาน" },
  "/hr/payroll": { en: "Payroll", th: "บัญชีเงินเดือน" },
  "/admin/dashboard": { en: "Admin Dashboard", th: "แดชบอร์ดผู้ดูแลระบบ" },
  "/admin/users": { en: "User Management", th: "จัดการผู้ใช้" },
  "/admin/roles": { en: "Roles & Permissions", th: "บทบาทและสิทธิ์" },
  "/admin/logs": { en: "Activity Logs", th: "บันทึกกิจกรรม" },
  "/reports": { en: "Reports", th: "รายงาน" },
  "/alerts": { en: "Alerts", th: "การแจ้งเตือน" },
  "/settings": { en: "Settings", th: "ตั้งค่า" },
};

export function AppHeader({ user }: { user: UserProfile | null }) {
  const pathname = usePathname();

  const pageTitleKey =
    Object.keys(pathToTitle).find((path) => pathname.startsWith(path)) ||
    "/dashboard";
  const title = pathToTitle[pageTitleKey];

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-xl font-semibold md:text-2xl font-headline">
          <span className="lang-en">{title.en}</span>
          <span className="lang-th">{title.th}</span>
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggleButton />
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user?.image || ""}
                  alt={user?.name || "User"}
                  data-ai-hint="profile picture"
                />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span className="lang-en">My Account</span>
              <span className="lang-th">บัญชีของฉัน</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem>
                <span className="lang-en">Settings</span>
                <span className="lang-th">ตั้งค่า</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem>
              <span className="lang-en">Support</span>
              <span className="lang-th">สนับสนุน</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>
                <span className="lang-en">Logout</span>
                <span className="lang-th">ออกจากระบบ</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
