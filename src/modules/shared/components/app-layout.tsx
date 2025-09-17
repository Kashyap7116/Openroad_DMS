import type { UserProfile } from "@/modules/auth/services/supabase-auth-actions";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/modules/shared/components/ui/ui/sidebar";
import type { PropsWithChildren } from "react";
import RBACAppSidebar from "../../auth/components/app-sidebar-rbac";
import { AppHeader } from "./app-header";

export function AppLayout({
  children,
  user,
}: PropsWithChildren<{ user: UserProfile | null }>) {
  return (
    <SidebarProvider>
      <Sidebar>
        <RBACAppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader user={user} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
