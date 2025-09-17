
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from "@/modules/shared/components/page-header";
import { StatCard } from '@/components/stat-card';
import { DollarIcon } from '@/components/icons/dollar-icon';
import { EmployeeFinanceClient } from '@/modules/finance/components/employee-finance-client';
import { VehicleFinanceClient } from "@/modules/finance/components/vehicle-finance-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/modules/shared/components/ui/ui/tabs';
import { getFinanceSummary } from '@/modules/finance/services/finance-actions';
import { Skeleton } from '@/modules/shared/components/ui/ui/skeleton';
import { Briefcase } from 'lucide-react';

type SummaryData = {
  total_income: number;
  total_expenses: number;
  net_profit_loss: number;
  total_office_expenses: number;
};

const StatCardSkeleton = () => (
    <div className="p-4 border rounded-lg">
        <div className="flex items-center">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="ml-4 space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-6 w-[100px]" />
            </div>
        </div>
    </div>
);

export default function FinancePage() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const data = await getFinanceSummary();
    setSummaryData(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <PageHeader
        title="Financial Management"
        description="Track income, expenses, and overall financial health for the current period (21st to 20th)."
      />
      
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
        {isLoading || !summaryData ? (
            <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </>
        ) : (
            <>
                <StatCard
                  title="Total Income"
                  value={`฿${summaryData.total_income.toLocaleString('en-US')}`}
                  icon={DollarIcon}
                  iconBgColor="bg-green-100 dark:bg-green-900"
                  iconColor="text-green-500 dark:text-green-300"
                />
                <StatCard
                  title="Total Expenses"
                  value={`฿${summaryData.total_expenses.toLocaleString('en-US')}`}
                  icon={DollarIcon}
                  iconBgColor="bg-red-100 dark:bg-red-900"
                  iconColor="text-red-500 dark:text-red-300"
                />
                 <StatCard
                  title="Office Expenses"
                  value={`฿${summaryData.total_office_expenses.toLocaleString('en-US')}`}
                  icon={Briefcase}
                  iconBgColor="bg-yellow-100 dark:bg-yellow-900"
                  iconColor="text-yellow-500 dark:text-yellow-300"
                />
                <StatCard
                  title="Net Profit / Loss"
                  value={`฿${summaryData.net_profit_loss.toLocaleString('en-US')}`}
                  icon={DollarIcon}
                  iconBgColor={summaryData.net_profit_loss >= 0 ? "bg-blue-100 dark:bg-blue-900" : "bg-orange-100 dark:bg-orange-900"}
                  iconColor={summaryData.net_profit_loss >= 0 ? "text-blue-500 dark:text-blue-300" : "text-orange-500 dark:text-orange-300"}
                />
            </>
        )}
      </div>

       <Tabs defaultValue="vehicle-finance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vehicle-finance">Vehicle Finance</TabsTrigger>
          <TabsTrigger value="employee-finance">Employee Finance</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicle-finance">
            <VehicleFinanceClient onDataUpdate={fetchData} />
        </TabsContent>
        <TabsContent value="employee-finance">
            <EmployeeFinanceClient onDataUpdate={fetchData} />
        </TabsContent>
      </Tabs>
    </>
  );
}





