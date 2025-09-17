
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/modules/shared/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/modules/shared/components/ui/ui/card";
import { Button } from "@/modules/shared/components/ui/ui/button";
import { PlusCircle, Trash2, Pencil, KeyRound, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/modules/shared/components/ui/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/modules/shared/components/ui/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui/ui/table";
import { Badge } from '@/modules/shared/components/ui/ui/badge';
import { cn } from '@/modules/shared/utils/utils';
import { useToast } from '@/hooks/use-toast';
import { UserForm } from '@/modules/admin/components/user-form';
import { 
  getSupabaseUsers, 
  createSupabaseUser, 
  updateSupabaseUser, 
  deleteSupabaseUser,
  type CreateUserData,
  type UpdateUserData 
} from '@/modules/admin/services/supabase-admin-actions';
import type { UserProfile } from '@/modules/auth/services/supabase-auth-actions';

export type UserRecord = UserProfile;

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UserRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const result = await getSupabaseUsers();
    if (result.success && result.users) {
      setUsers(result.users);
    } else {
      toast({
        title: "Error",
        description: `Failed to fetch users: ${result.error}`,
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFormSubmit = async (data: CreateUserData) => {
    setIsLoading(true);
    
    try {
      let result;
      
      if (editingRecord) {
        // Update existing user
        const updateData: UpdateUserData = {
          name: data.name,
          email: data.email,
          role: data.role,
          modules: data.modules,
          status: data.status,
        };
        
        // Only include password if it's provided
        if (data.password && data.password.trim() !== '') {
          updateData.password = data.password;
        }
        
        result = await updateSupabaseUser(editingRecord.user_id, updateData);
      } else {
        // Create new user
        result = await createSupabaseUser(data);
      }
      
      if (result.success) {
        await fetchUsers(); // Re-fetch the data
        toast({
          title: editingRecord ? "User Updated" : "User Created",
          description: `The user profile for ${data.name} has been saved successfully.`,
        });
        setIsFormOpen(false);
        setEditingRecord(null);
      } else {
        toast({
          title: "Error",
          description: `Failed to save user: ${result.error}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenForm = (record?: UserRecord | null) => {
    setEditingRecord(record || null);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
  };
  
  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
      setIsLoading(true);
      
      try {
        const result = await deleteSupabaseUser(recordToDelete);
        
        if (result.success) {
          await fetchUsers(); // Re-fetch the data
          toast({
            title: "User Deleted",
            description: "The user has been permanently deleted from both Supabase Auth and the profiles table.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to delete user: ${result.error}`,
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    setRecordToDelete(null);
  };

  return (
    <>
      <PageHeader
        title="User Management"
        description="Create, edit, and manage all system users and their permissions."
      >
         <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingRecord(null); }}>
             <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="lang-en">Add New User</span>
                    <span className="lang-th">เพิ่มผู้ใช้ใหม่</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                    <span className="lang-en">{editingRecord ? 'Edit User' : 'Create New User'}</span>
                    <span className="lang-th">{editingRecord ? 'แก้ไขผู้ใช้' : 'สร้างผู้ใช้ใหม่'}</span>
                </DialogTitle>
                <DialogDescription>
                    <span className="lang-en">{editingRecord ? 'Update the details and module access for this user.' : 'Fill out the form to create a new user account.'}</span>
                    <span className="lang-th">{editingRecord ? 'อัปเดตรายละเอียดและการเข้าถึงโมดูลสำหรับผู้ใช้นี้' : 'กรอกแบบฟอร์มเพื่อสร้างบัญชีผู้ใช้ใหม่'}</span>
                </DialogDescription>
              </DialogHeader>
               <UserForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => { setIsFormOpen(false); setEditingRecord(null); }}
                  initialData={editingRecord}
                />
            </DialogContent>
        </Dialog>
      </PageHeader>
      
      <Card>
          <CardHeader>
            <CardTitle>
                <span className="lang-en">System Users</span>
                <span className="lang-th">ผู้ใช้ระบบ</span>
            </CardTitle>
            <CardDescription>
                <span className="lang-en">A list of all users with access to the Openroad DMS.</span>
                <span className="lang-th">รายชื่อผู้ใช้ทั้งหมดที่สามารถเข้าถึง Openroad DMS</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><span className="lang-en">User</span><span className="lang-th">ผู้ใช้</span></TableHead>
                    <TableHead><span className="lang-en">Role</span><span className="lang-th">บทบาท</span></TableHead>
                    <TableHead><span className="lang-en">Accessible Modules</span><span className="lang-th">โมดูลที่เข้าถึงได้</span></TableHead>
                    <TableHead><span className="lang-en">Status</span><span className="lang-th">สถานะ</span></TableHead>
                    <TableHead className="text-center"><span className="lang-en">Actions</span><span className="lang-th">การกระทำ</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                        <TableRow key={user.user_id}>
                           <TableCell>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                           </TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="flex flex-wrap gap-1">
                                {user.modules.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(user.status === 'Active' ? 'text-green-700' : 'text-red-700')}>{user.status}</Badge>
                          </TableCell>
                          <td className="text-center space-x-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(user)}>
                                  <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(user.user_id)}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </td>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <span className="lang-en">No users found.</span>
                        <span className="lang-th">ไม่พบผู้ใช้</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
         <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                    <span className="lang-en">Are you absolutely sure?</span>
                    <span className="lang-th">คุณแน่ใจหรือไม่?</span>
                </AlertDialogTitle>
                <AlertDialogDescription>
                    <span className="lang-en">This action cannot be undone. This will permanently delete the user account.</span>
                    <span className="lang-th">การกระทำนี้ไม่สามารถยกเลิกได้ การดำเนินการนี้จะลบบัญชีผู้ใช้อย่างถาวร</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel><span className="lang-en">Cancel</span><span className="lang-th">ยกเลิก</span></AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                    <span className="lang-en">Delete User</span>
                    <span className="lang-th">ลบผู้ใช้</span>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}





