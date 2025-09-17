import { AppSidebar } from "@/app/app-sidebar";
import { getCurrentUser } from "@/modules/auth/services/supabase-auth-actions";
import { AppHeader } from "@/modules/shared/components/app-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/modules/shared/components/ui/ui/sidebar";
import type { PropsWithChildren } from "react";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const user = await getCurrentUser();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader user={user} />
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
