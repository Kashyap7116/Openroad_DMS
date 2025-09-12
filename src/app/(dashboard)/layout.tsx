
import { AppLayout } from "@/components/app-layout";
import { getCurrentUser } from "@/lib/supabase-auth-actions";
import type { PropsWithChildren } from "react";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const user = await getCurrentUser();
  return <AppLayout user={user}>{children}</AppLayout>;
}
