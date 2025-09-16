
'use client';

import React from 'react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

// Enhanced URL safe check: allow only data image URLs and strictly local vehicle uploads.
const isSafeFileUrl = (url: string) => {
    if (!url || typeof url !== "string") return false;
    // Allow only data:image URLs (safe for img src/href)
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(url)) return true;

    // Optionally, allow relative URLs to /uploads/vehicles/ (no traversal, no protocol)
    if (/^\/uploads\/vehicles\/[a-zA-Z0-9._-]+\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(url)) return true;

    // Also allow Next.js optimized images (for preview)
    if (/^\/_next\/image\?url=%2Fuploads%2Fvehicles%2F[a-zA-Z0-9._-]+\.(jpg|jpeg|png|gif|webp)&w=\d+&q=\d+$/i.test(url)) return true;

    // Use browser/native URL API to parse other URLs; reject if it parses as absolute and not one of the above.
    try {
        const parsed = new URL(url, window.location.origin);
        // Disallow URLs with protocols other than blank, 'http', or 'https' and not pointing to our own origin
        if (parsed.origin !== window.location.origin) return false;
        // Prevent protocol-relative (starts with //) or absolute
        if (url.startsWith('//') || /^[a-zA-Z]{2,10}:/.test(url)) return false;
    } catch {
        // If parsing fails, it's not a valid URL
        return false;
    }
    // Disallow anything containing suspicious escape or traversal sequences
    if (
        url.includes('\\') || url.includes('..') ||
        url.includes('%2f') || url.includes('%2F') || url.includes('%5c') || url.includes('%5C') ||
        url.includes(' ')
    ) {
        return false;
    }
    // Otherwise: only allow if path starts with /uploads/vehicles/
    if (url.startsWith('/uploads/vehicles/')) return true;
    return false;
};

const renderFilePreview = (file: any, name?: string) => {
    if (!file) return <p className="text-sm text-muted-foreground"><span className="lang-en">Not provided</span><span className="lang-th">ไม่ได้ให้ไว้</span></p>;
    
    const fileUrl = typeof file === 'string' ? file : file.preview;
    const fileName = typeof file === 'string' ? file.split('/').pop() || name || 'Uploaded File' : file.name;
    const isImage = typeof file === 'string' ? (file.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) : file?.type?.startsWith('image');

    return (
        <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {isSafeFileUrl(fileUrl) && typeof fileUrl === "string" && fileUrl.startsWith('/uploads/vehicles/') ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate" title={fileName}>{fileName}</a>
            ) : (
                <span className="text-sm text-muted-foreground" title={fileName}>{fileName}</span>
            )}
            {isImage && isSafeFileUrl(fileUrl) && fileUrl && <Image src={fileUrl} alt="preview" width={40} height={40} className="rounded-md object-cover" />}
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
