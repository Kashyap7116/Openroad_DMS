import { getCurrentUser } from "@/modules/auth/services/supabase-auth-actions";
import { AppLayout } from "@/modules/shared/components/app-layout";
import type { PropsWithChildren } from "react";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const user = await getCurrentUser();
  return <AppLayout user={user}>{children}</AppLayout>;
}
