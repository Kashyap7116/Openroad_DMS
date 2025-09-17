
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/ui/card";
import { cn } from "@/modules/shared/utils/utils";

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  iconBgColor?: string;
  iconColor?: string;
  descriptionColor?: string;
};

const titleTranslations: { [key: string]: string } = {
    "Total Users": "ผู้ใช้ทั้งหมด",
    "Active Users": "ผู้ใช้ที่ใช้งาน",
    "Inactive Users": "ผู้ใช้ที่ไม่ใช้งาน",
    "Roles Defined": "บทบาทที่กำหนด",
    "Total Revenue (This Month)": "รายได้รวม (เดือนนี้)",
    "Total Sales (This Month)": "ยอดขายรวม (เดือนนี้)",
    "Vehicles in Stock": "ยานพาหนะในสต็อก",
    "Upcoming Maintenance": "การบำรุงรักษาที่จะมาถึง",
    "Vehicles Purchased": "ยานพาหนะที่ซื้อ",
    "Vehicles Sold": "ยานพาหนะที่ขาย",
    "Maintenance Expenses": "ค่าใช้จ่ายในการบำรุงรักษา",
    "HR Payouts": "การจ่ายเงินฝ่ายบุคคล",
    "Total Income": "รายได้รวม",
    "Total Expenses": "ค่าใช้จ่ายรวม",
    "Net Profit / Loss": "กำไร / ขาดทุนสุทธิ",
    "Office Expenses": "ค่าใช้จ่ายสำนักงาน",
};

export function StatCard({ title, value, icon: Icon, description, iconBgColor, iconColor, descriptionColor }: StatCardProps) {
  return (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center">
                <div className={cn("flex-shrink-0 p-3 rounded-lg", iconBgColor)}>
                     <Icon className={cn("h-6 w-6", iconColor)} />
                </div>
                <div className="ml-4 flex-grow">
                    <p className="text-sm font-medium text-muted-foreground truncate">
                        <span className="lang-en">{title}</span>
                        <span className="lang-th">{titleTranslations[title] || title}</span>
                    </p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
            </div>
            {description && (
                <p className={cn("text-xs text-muted-foreground mt-2 pl-1", descriptionColor)}>
                    <span className="lang-en">{description}</span>
                    <span className="lang-th">{description}</span>
                </p>
            )}
      </CardContent>
    </Card>
  );
}



