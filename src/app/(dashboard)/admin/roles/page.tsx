
'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { 
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getRoles, saveRoles } from '@/lib/admin-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const ALL_MODULES = ["Dashboard", "Purchase", "Sales", "Finance", "Maintenance", "HR", "Reports", "Alerts", "Admin"];

type Role = {
  name: 'Admin' | 'Manager' | 'Staff';
  description: string;
  modules: string[];
};

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const fetchRoles = async () => {
        setIsLoading(true);
        const data = await getRoles();
        // Ensure all roles exist, even if the file is empty/missing one
        const roleNames: Role['name'][] = ['Admin', 'Manager', 'Staff'];
        const completeRoles = roleNames.map(name => {
            const existingRole = data.find((r: Role) => r.name === name);
            if (existingRole) return existingRole;
            return {
                name,
                description: `Default permissions for the ${name} role.`,
                modules: name === 'Admin' ? ALL_MODULES : []
            };
        });
        setRoles(completeRoles);
        setIsLoading(false);
    }

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleModuleChange = (roleName: Role['name'], moduleName: string) => {
        setRoles(prevRoles => prevRoles.map(role => {
            if (role.name === roleName) {
                 const newModules = role.modules.includes(moduleName)
                    ? role.modules.filter(m => m !== moduleName)
                    : [...role.modules, moduleName];
                return { ...role, modules: newModules };
            }
            return role;
        }));
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        const result = await saveRoles(roles);
        if (result.success) {
            toast({
                title: "Roles Updated",
                description: "The role permissions have been saved successfully.",
            });
            await fetchRoles(); // Re-fetch roles to ensure UI is in sync
        } else {
             toast({
                title: "Error",
                description: `Failed to save role permissions: ${result.error}`,
                variant: "destructive"
            });
        }
        setIsSaving(false);
    };

  return (
    <>
        <PageHeader 
            title="Roles & Permissions"
            description="Manage default module access for each user role."
        >
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
                {(isSaving || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <span className="lang-en">Save All Changes</span>
                <span className="lang-th">บันทึกการเปลี่ยนแปลงทั้งหมด</span>
            </Button>
        </PageHeader>
        
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <Card key={role.name}>
                        <CardHeader>
                            <CardTitle>{role.name}</CardTitle>
                            <CardDescription>
                                <span className="lang-en">Select the modules this role can access by default.</span>
                                <span className="lang-th">เลือกโมดูลที่บทบาทนี้สามารถเข้าถึงได้โดยค่าเริ่มต้น</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ALL_MODULES.map(moduleName => (
                                <div key={moduleName} className="flex items-center space-x-3 rounded-md border p-3">
                                    <Checkbox
                                        id={`${role.name}-${moduleName}`}
                                        checked={role.modules.includes(moduleName)}
                                        onCheckedChange={() => handleModuleChange(role.name, moduleName)}
                                        disabled={role.name === 'Admin' || isSaving}
                                    />
                                    <Label htmlFor={`${role.name}-${moduleName}`} className="font-normal text-sm">
                                        {moduleName}
                                    </Label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
    </>
  );
}
