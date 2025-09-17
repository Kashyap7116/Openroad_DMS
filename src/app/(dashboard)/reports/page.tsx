"use client";

import { PageHeader } from "@/modules/shared/components/page-header";
import { ReportsClient } from "@/modules/shared/components/reports/reports-client";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Generate and export reports across all modules of your business."
      />
      <ReportsClient />
    </>
  );
}
