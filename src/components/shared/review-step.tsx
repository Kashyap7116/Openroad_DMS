
'use client';

import React from 'react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

const renderFilePreview = (file: any, name?: string) => {
    if (!file) return <p className="text-sm text-muted-foreground"><span className="lang-en">Not provided</span><span className="lang-th">ไม่ได้ให้ไว้</span></p>;
    
    const fileUrl = typeof file === 'string' ? file : file.preview;
    const fileName = typeof file === 'string' ? file.split('/').pop() || name || 'Uploaded File' : file.name;
    const isImage = typeof file === 'string' ? (file.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) : file?.type?.startsWith('image');

    return (
        <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate" title={fileName}>{fileName}</a>
            {isImage && fileUrl && <Image src={fileUrl} alt="preview" width={40} height={40} className="rounded-md object-cover" />}
        </div>
    );
};

export const ReviewItem = ({ label, value, isBold = false, className = '' }: { label: string; value?: string | React.ReactNode, isBold?: boolean, className?: string }) => (
    <div className={cn("flex flex-col", className)}>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className={cn("text-sm", isBold && "font-bold")}>{value || '-'}</div>
    </div>
);

export const ReviewSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h3 className="text-lg font-semibold border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {children}
        </div>
    </div>
);

export { renderFilePreview };
