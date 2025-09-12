
'use client';

import { ReportsClient } from '@/components/reports/reports-client';
import { PageHeader } from '@/components/page-header';

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
