
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/modules/shared/components/ui/ui/button';
import { Label } from '@/modules/shared/components/ui/ui/label';
import { Input } from '@/modules/shared/components/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shared/components/ui/ui/select';
import { Checkbox } from '@/modules/shared/components/ui/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getRoles } from '@/modules/admin/services/admin-actions';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/modules/auth/services/supabase-auth-actions';
import type { CreateUserData } from '@/modules/admin/services/supabase-admin-actions';

type UserFormData = CreateUserData;

const ALL_MODULES = ["Dashboard", "Purchase", "Sales", "Finance", "Maintenance", "HR", "Reports", "Alerts", "Admin"];

const initialFormData: UserFormData = {
  name: '',
  email: '',
  role: 'Staff',
  modules: [],
  status: 'Active',
  password: ''
};

interface UserFormProps {
    onSubmit: (data: UserFormData) => void;
    onCancel: () => void;
    initialData?: UserProfile | null;
}

export function UserForm({ onSubmit, onCancel, initialData }: UserFormProps) {
    const [formData, setFormData] = useState<UserFormData>(initialFormData);
    const [roles, setRoles] = useState<any[]>([]);
    const [isRolesLoading, setIsRolesLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchRoles() {
            setIsRolesLoading(true);
            const rolesData = await getRoles();
            setRoles(rolesData);
            setIsRolesLoading(false);
        }
        fetchRoles();
    }, []);

    useEffect(() => {
        if (initialData) {
            // Exclude fields when setting form data for editing
            const { user_id, created_at, last_login, image, ...editableData } = initialData;
            setFormData({ 
                ...editableData, 
                password: '',
                status: editableData.status as 'Active' | 'Inactive'
            });
        } else {
            // For new users, set default permissions for 'Staff' role
            const staffRole = roles.find(r => r.name === 'Staff');
            setFormData({ ...initialFormData, modules: staffRole?.modules || [] });
        }
    }, [initialData, roles]);

    const handleSelectChange = (id: keyof UserFormData, value: any) => {
        const newFormData = { ...formData, [id]: value };

        if (id === 'role') {
            const selectedRole = roles.find(r => r.name === value);
            if (selectedRole) {
                newFormData.modules = selectedRole.modules;
            }
        }
        
        setFormData(newFormData);
    };

    const handleModuleChange = (moduleName: string) => {
        setFormData(prev => {
            const newModules = prev.modules.includes(moduleName)
                ? prev.modules.filter(m => m !== moduleName)
                : [...prev.modules, moduleName];
            return { ...prev, modules: newModules };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            toast({
                title: "Validation Error",
                description: "Name and Email are required fields.",
                variant: "destructive"
            });
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid email address.",
                variant: "destructive"
            });
            return;
        }
        
        if (!initialData && !formData.password) {
            toast({
                title: "Validation Error",
                description: "Password is required for new users.",
                variant: "destructive"
            });
            return;
        }
        
        if (formData.password && formData.password.length < 6) {
            toast({
                title: "Validation Error",
                description: "Password must be at least 6 characters long.",
                variant: "destructive"
            });
            return;
        }
        
        onSubmit(formData);
    };
    
    if (isRolesLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name"><span className="lang-en">Full Name</span><span className="lang-th">ชื่อเต็ม</span></Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email"><span className="lang-en">Email / Username</span><span className="lang-th">อีเมล / ชื่อผู้ใช้</span></Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password"><span className="lang-en">Password</span><span className="lang-th">รหัสผ่าน</span></Label>
                    <Input id="password" type="password" placeholder={initialData ? "Leave blank to keep unchanged" : "Enter new password"} value={formData.password} onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="role"><span className="lang-en">Role</span><span className="lang-th">บทบาท</span></Label>
                    <Select onValueChange={(value) => handleSelectChange('role', value)} value={formData.role}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Staff"><span className="lang-en">Staff</span><span className="lang-th">พนักงาน</span></SelectItem>
                            <SelectItem value="Manager"><span className="lang-en">Manager</span><span className="lang-th">ผู้จัดการ</span></SelectItem>
                            <SelectItem value="Admin"><span className="lang-en">Admin</span><span className="lang-th">ผู้ดูแลระบบ</span></SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="status"><span className="lang-en">Status</span><span className="lang-th">สถานะ</span></Label>
                    <Select onValueChange={(value) => handleSelectChange('status', value as 'Active' | 'Inactive')} value={formData.status}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Active"><span className="lang-en">Active</span><span className="lang-th">ใช้งาน</span></SelectItem>
                            <SelectItem value="Inactive"><span className="lang-en">Inactive</span><span className="lang-th">ไม่ใช้งาน</span></SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label><span className="lang-en">Module Permissions (based on role, can be overridden)</span><span className="lang-th">สิทธิ์โมดูล (ตามบทบาท สามารถแก้ไขได้)</span></Label>
                <div className="p-4 border rounded-md grid grid-cols-2 md:grid-cols-3 gap-4">
                    {ALL_MODULES.map(moduleName => (
                        <div key={moduleName} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`module-${moduleName}`}
                                checked={formData.modules.includes(moduleName)}
                                onCheckedChange={() => handleModuleChange(moduleName)}
                                disabled={formData.role === 'Admin'}
                            />
                            <Label htmlFor={`module-${moduleName}`} className="font-normal">{moduleName}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}><span className="lang-en">Cancel</span><span className="lang-th">ยกเลิก</span></Button>
                <Button type="submit">
                    <span className="lang-en">{initialData ? 'Save Changes' : 'Create User'}</span>
                    <span className="lang-th">{initialData ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างผู้ใช้'}</span>
                </Button>
            </div>
        </form>
    );
}



