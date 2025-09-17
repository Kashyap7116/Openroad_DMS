
'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/modules/shared/components/ui/ui/chart";
import { BarChart, CartesianGrid, XAxis, Bar, YAxis, ResponsiveContainer,defs,linearGradient } from "recharts";
import { getAllVehicles } from "@/modules/vehicles/services/vehicle-actions";
import { useEffect, useState } from "react";

const initialChartData = [
  { month: "January", sales: 0 },
  { month: "February", sales: 0 },
  { month: "March", sales: 0 },
  { month: "April", sales: 0 },
  { month: "May", sales: 0 },
  { month: "June", sales: 0 },
  { month: "July", sales: 0 },
  { month: "August", sales: 0 },
  { month: "September", sales: 0 },
  { month: "October", sales: 0 },
  { month: "November", sales: 0 },
  { month: "December", sales: 0 },
];

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
};

export function SalesOverviewChart() {
    const [chartData, setChartData] = useState(initialChartData);

    useEffect(() => {
      async function fetchData() {
        const vehicles = await getAllVehicles();
        const salesByMonth = [...initialChartData];

        vehicles.forEach(v => {
          if (v.status === 'Sold' && v.sale_details?.sale_details?.sale_date) {
            const saleDate = new Date(v.sale_details.sale_details.sale_date);
            const monthIndex = saleDate.getMonth();
            salesByMonth[monthIndex].sales += v.sale_details.sale_details.sale_price;
          }
        });

        // Get current month and the 5 previous months
        const currentMonth = new Date().getMonth();
        const displayData = [];
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            displayData.push(salesByMonth[monthIndex]);
        }

        setChartData(displayData);
      }
      fetchData();
    }, []);

    return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer data={chartData}>
                 <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                />
                 <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `฿${Number(value) / 1000}k`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="sales" fill="url(#colorSales)" radius={8} />
            </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}




