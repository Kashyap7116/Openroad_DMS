
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/modules/shared/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shared/components/ui/ui/card';
import { Button } from '@/modules/shared/components/ui/ui/button';
import { Input } from '@/modules/shared/components/ui/ui/input';
import { Label } from '@/modules/shared/components/ui/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/modules/shared/components/ui/ui/avatar';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/modules/auth/services/supabase-auth-actions';
import { updateProfileAction } from '@/modules/auth/services/profile-actions';
import type { UserProfile } from '@/modules/auth/services/supabase-auth-actions';

function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function SettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [name, setName] = useState('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchUser() {
            setIsLoading(true);
            const userData = await getCurrentUser();
            if (userData) {
                setUser(userData);
                setName(userData.name);
                setImagePreview(userData.image || null);
            }
            setIsLoading(false);
        }
        fetchUser();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewImageFile(file);
            const dataUri = await fileToDataUri(file);
            setImagePreview(dataUri);
        }
    };

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsSaving(true);
        
        try {
            const formData = new FormData();
            formData.append('name', name);
            
            if (newImageFile) {
                formData.append('image', newImageFile);
            }

            const result = await updateProfileAction(formData);

            if (result.success && result.user) {
                setUser(result.user);
                setName(result.user.name);
                setImagePreview(result.user.image || null);
                setNewImageFile(null);

                toast({
                    title: 'Profile Updated',
                    description: 'Your profile has been updated successfully.',
                });
                // Force a reload to update sidebar/header state.
                window.location.reload(); 
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to update profile.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Profile update error:', error);
            toast({
                title: 'Error',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }

        setIsSaving(false);
    };

    if (isLoading || !user) {
        return (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <>
            <PageHeader
                title="Settings"
                description="Manage your account and profile settings."
            />
            <Card>
                <CardHeader>
                    <CardTitle><span className="lang-en">Profile</span><span className="lang-th">โปรไฟล์</span></CardTitle>
                    <CardDescription><span className="lang-en">This is how others will see you on the site.</span><span className="lang-th">นี่คือวิธีที่คนอื่นจะเห็นคุณในเว็บไซต์</span></CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={imagePreview || ''} alt={user.name} data-ai-hint="profile picture" />
                            <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button asChild variant="outline">
                            <label htmlFor="profile-picture-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                <span className="lang-en">Change Picture</span>
                                <span className="lang-th">เปลี่ยนรูปภาพ</span>
                            </label>
                        </Button>
                        <Input id="profile-picture-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name"><span className="lang-en">Full Name</span><span className="lang-th">ชื่อเต็ม</span></Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email"><span className="lang-en">Email</span><span className="lang-th">อีเมล</span></Label>
                            <Input id="email" type="email" value={user.email} disabled />
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <span className="lang-en">Save Changes</span>
                            <span className="lang-th">บันทึกการเปลี่ยนแปลง</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}




