
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/modules/shared/components/ui/ui/card';
import { StatCard } from '@/components/stat-card';
import { Car, Wrench, Users, DollarSign, BarChartHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { ReportStats, MonthlySalesData, ExpenseBreakdownData } from '@/modules/shared/services/reports-actions';

interface ReportsDashboardProps {
  stats: ReportStats;
  monthlySales: MonthlySalesData[];
  expenseBreakdown: ExpenseBreakdownData[];
}

const COLORS = ["#10B981", "#3B82F6", "#F97316"];

export function ReportsDashboard({ stats, monthlySales, expenseBreakdown }: ReportsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard title="Vehicles Purchased" value={stats.totalPurchased.toString()} icon={Car} />
        <StatCard title="Vehicles Sold" value={stats.totalSold.toString()} icon={DollarSign} />
        <StatCard title="Maintenance Expenses" value={`฿${stats.totalMaintenanceCost.toLocaleString()}`} icon={Wrench} />
        <StatCard title="HR Payouts" value={`฿${stats.totalHRPayout.toLocaleString()}`} icon={Users} />
      </div>
       <Card>
        <CardHeader>
            <CardTitle>
                <span className="lang-en">Financial Overview</span>
                <span className="lang-th">ภาพรวมทางการเงิน</span>
            </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
             <StatCard title="Total Income" value={`฿${stats.totalIncome.toLocaleString()}`} icon={TrendingUp} iconColor="text-green-500"/>
             <StatCard title="Total Expenses" value={`฿${stats.totalExpense.toLocaleString()}`} icon={TrendingDown} iconColor="text-red-500"/>
             <StatCard title="Net Profit / Loss" value={`฿${stats.netProfit.toLocaleString()}`} icon={BarChartHorizontal} iconColor={stats.netProfit >= 0 ? "text-green-500" : "text-red-500"}/>
        </CardContent>
       </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
                <span className="lang-en">Monthly Purchases vs. Sales</span>
                <span className="lang-th">ยอดซื้อเทียบกับยอดขายรายเดือน</span>
            </CardTitle>
            <CardDescription>
                <span className="lang-en">Performance over the current year.</span>
                <span className="lang-th">ผลการดำเนินงานในปีปัจจุบัน</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySales}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="purchase" fill="#3B82F6" name="Purchases" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" fill="#10B981" name="Sales" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
                <span className="lang-en">Expense Breakdown</span>
                <span className="lang-th">รายละเอียดค่าใช้จ่าย</span>
            </CardTitle>
            <CardDescription>
                <span className="lang-en">Distribution of major expense categories.</span>
                <span className="lang-th">การกระจายของหมวดหมู่ค่าใช้จ่ายหลัก</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




