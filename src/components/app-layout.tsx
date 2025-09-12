

import type { PropsWithChildren } from "react";
import RBACAppSidebar from "./app-sidebar-rbac";
import { AppHeader } from "./app-header";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import type { UserProfile } from "@/lib/supabase-auth-actions";

export function AppLayout({ children, user }: PropsWithChildren<{user: UserProfile | null}>) {
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

    