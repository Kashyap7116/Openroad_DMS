import { SalesOverviewChart } from "@/components/sales-overview-chart";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/modules/shared/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import { getAllVehicles } from "@/modules/vehicles/services/vehicle-actions";
import {
  BarChart,
  Car,
  DollarSign,
  LineChart,
  TrendingUp,
  Wrench,
} from "lucide-react";

async function getDashboardData() {
  const allVehicles = await getAllVehicles();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const vehiclesInStock = allVehicles.filter((v) => v.status !== "Sold").length;

  // Corrected Logic: Upcoming maintenance for the current month
  const upcomingMaintenance = allVehicles
    .flatMap((v) => v.maintenance_history || [])
    .filter((m) => {
      const serviceDate = new Date(m.service_date);
      return (
        m.status === "Processing" &&
        serviceDate.getFullYear() === currentYear &&
        serviceDate.getMonth() === currentMonth
      );
    }).length;

  // Fiscal period from 21st of last month to 20th of this month
  const startDate = new Date(currentYear, currentMonth - 1, 21);
  const endDate = new Date(currentYear, currentMonth, 20, 23, 59, 59, 999);

  const salesThisMonth = allVehicles.filter((v) => {
    if (!v.sale_details?.sale_details?.sale_date) return false;
    const saleDate = new Date(v.sale_details.sale_details.sale_date);
    return saleDate >= startDate && saleDate <= endDate;
  });

  const totalRevenue = salesThisMonth.reduce(
    (acc, v) => acc + (v.sale_details?.sale_details.sale_price || 0),
    0
  );
  const totalSales = salesThisMonth.length;

  const recentSales = allVehicles
    .filter((v) => v.status === "Sold")
    .sort(
      (a, b) =>
        new Date(b.sale_details.sale_details.sale_date).getTime() -
        new Date(a.sale_details.sale_details.sale_date).getTime()
    )
    .slice(0, 5);

  return {
    stats: {
      totalRevenue,
      totalSales,
      vehiclesInStock,
      upcomingMaintenance,
    },
    recentSales,
  };
}

export default async function DashboardPage() {
  const { stats, recentSales } = await getDashboardData();
  return (
    <>
      <PageHeader
        title="Welcome Back!"
        description="Here's a snapshot of your system's performance."
      />
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard
          title="Total Revenue (This Month)"
          value={`฿${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          iconBgColor="bg-green-100 dark:bg-green-900"
          iconColor="text-green-500 dark:text-green-300"
        />
        <StatCard
          title="Total Sales (This Month)"
          value={stats.totalSales.toString()}
          icon={BarChart}
          iconBgColor="bg-blue-100 dark:bg-blue-900"
          iconColor="text-blue-500 dark:text-blue-300"
        />
        <StatCard
          title="Vehicles in Stock"
          value={stats.vehiclesInStock.toString()}
          icon={Car}
          iconBgColor="bg-purple-100 dark:bg-purple-900"
          iconColor="text-purple-500 dark:text-purple-300"
        />
        <StatCard
          title="Upcoming Maintenance"
          value={stats.upcomingMaintenance.toString()}
          icon={Wrench}
          iconBgColor="bg-orange-100 dark:bg-orange-900"
          iconColor="text-orange-500 dark:text-orange-300"
        />
      </div>
      <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-6 w-6" />
              <span className="lang-en">Sales Overview</span>
              <span className="lang-th">ภาพรวมการขาย</span>
            </CardTitle>
            <CardDescription>
              <span className="lang-en">
                Monthly sales performance for the last 6 months.
              </span>
              <span className="lang-th">
                ผลการขายรายเดือนสำหรับ 6 เดือนที่ผ่านมา
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesOverviewChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              <span className="lang-en">Recent Sales</span>
              <span className="lang-th">การขายล่าสุด</span>
            </CardTitle>
            <CardDescription>
              <span className="lang-en">
                A list of the most recent vehicle sales.
              </span>
              <span className="lang-th">รายการขายรถยนต์ล่าสุด</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className="lang-en">Customer</span>
                    <span className="lang-th">ลูกค้า</span>
                  </TableHead>
                  <TableHead>
                    <span className="lang-en">Vehicle</span>
                    <span className="lang-th">ยานพาหนะ</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="lang-en">Amount</span>
                    <span className="lang-th">จำนวนเงิน</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="font-medium">
                          {sale.sale_details.buyer.name}
                        </div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {sale.sale_details.buyer.contact}
                        </div>
                      </TableCell>
                      <TableCell>{sale.vehicle}</TableCell>
                      <TableCell className="text-right">
                        ฿
                        {sale.sale_details.sale_details.sale_price.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      <span className="lang-en">No sales recorded yet.</span>
                      <span className="lang-th">ยังไม่มีการบันทึกการขาย</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
