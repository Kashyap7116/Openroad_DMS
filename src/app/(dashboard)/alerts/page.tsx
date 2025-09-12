
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { AlertsClient } from "./alerts-client";

export default function AlertsPage() {
  return (
    <>
      <PageHeader
        title="Alerts & Notifications"
        description="Review AI-based alerts for documents and contracts."
      >
        <Button size="sm" variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          <span className="lang-en">Alert Settings</span>
          <span className="lang-th">ตั้งค่าการแจ้งเตือน</span>
        </Button>
      </PageHeader>
      <AlertsClient />
    </>
  );
}
