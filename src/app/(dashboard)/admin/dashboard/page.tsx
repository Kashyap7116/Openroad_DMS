
import { PageHeader } from "@/modules/shared/components/page-header";
import { 
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/modules/shared/components/ui/ui/card";
import { StatCard } from "@/components/stat-card";
import { User, Shield, UserCheck, UserX, Activity } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import { getAdminDashboardData } from "@/modules/admin/services/admin-actions";
import { Badge } from "@/modules/shared/components/ui/ui/badge";

export default async function AdminDashboardPage() {
  const { stats, recentLogs } = await getAdminDashboardData();

  return (
    <>
        <PageHeader 
            title="Admin Dashboard"
            description="An overview of user activity and system settings."
        />
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 mb-8">
            <StatCard title="Total Users" value={stats.totalUsers.toString()} icon={User} />
            <StatCard title="Active Users" value={stats.activeUsers.toString()} icon={UserCheck} iconColor="text-green-500" />
            <StatCard title="Inactive Users" value={stats.inactiveUsers.toString()} icon={UserX} iconColor="text-red-500"/>
            <StatCard title="Roles Defined" value={stats.totalRoles.toString()} icon={Shield} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>
                    <span className="lang-en">Recent Activity Log</span>
                    <span className="lang-th">บันทึกกิจกรรมล่าสุด</span>
                </CardTitle>
                <CardDescription>
                    <span className="lang-en">A preview of the most recent user actions across the system.</span>
                    <span className="lang-th">ตัวอย่างการดำเนินการล่าสุดของผู้ใช้ในระบบ</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <span className="lang-en">Timestamp</span>
                                <span className="lang-th">เวลา</span>
                            </TableHead>
                            <TableHead>
                                <span className="lang-en">User</span>
                                <span className="lang-th">ผู้ใช้</span>
                            </TableHead>
                            <TableHead>
                                <span className="lang-en">Module</span>
                                <span className="lang-th">โมดูล</span>
                            </TableHead>
                            <TableHead>
                                <span className="lang-en">Action</span>
                                <span className="lang-th">การดำเนินการ</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentLogs.map((log) => (
                            <TableRow key={log.log_id}>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{log.user_id}</TableCell>
                                <TableCell><Badge variant="outline">{log.module}</Badge></TableCell>
                                <TableCell>{log.action}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </>
  );
}




