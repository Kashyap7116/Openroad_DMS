
'use client';

import React from 'react';
import Image from 'next/image';
import { UploadCloud, FileText, X } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

type FileWithPreview = File & { preview: string };

interface FileUploadProps {
  name: string;
  file?: FileWithPreview | string | null;
  files?: (FileWithPreview | string)[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index?: number) => void;
  accept?: string;
  isMultiple?: boolean;
  className?: string;
}

export function FileUpload({ name, file, files, onFileChange, onRemove, accept = 'application/pdf, image/*', isMultiple = false, className }: FileUploadProps) {
  if (isMultiple) {
    return (
        <div>
            <label htmlFor={name} className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                </div>
                <Input id={name} type="file" className="hidden" onChange={onFileChange} multiple={isMultiple} accept={accept}/>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
                {files?.map((f, index) => {
                    const previewUrl = typeof f === 'string' ? f : f.preview;
                    const fileName = typeof f === 'string' ? f.split('/').pop() || `Uploaded File ${index+1}` : f.name;
                    const isImage = typeof f === 'string' ? (f.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f)) : f?.type?.startsWith('image');

                    return (
                        <div key={index} className="relative w-24 h-24 border rounded-md p-1">
                            {isImage ?
                                <Image src={previewUrl} alt="preview" fill style={{objectFit:"cover"}} className="rounded-md" />
                                : <FileText className="w-12 h-12 text-muted-foreground mx-auto mt-4"/>
                            }
                            <p className="text-[10px] truncate absolute bottom-0 left-0 right-0 bg-black/50 text-white p-1" title={fileName}>{fileName}</p>
                            <Button variant="destructive" size="icon" type="button" className="absolute top-0 right-0 h-6 w-6" onClick={() => onRemove(index)}><X className="h-4 w-4"/></Button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
  }

  // Single file upload
  const fileUrl = typeof file === 'string' ? file : file?.preview;
  const fileName = typeof file === 'string' ? file.split('/').pop() || 'Uploaded File' : file?.name;
  const isImage = file && (typeof file === 'string' ? (file.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) : file?.type?.startsWith('image'));

  if (fileUrl) {
    return (
      <div className="mt-2 flex items-center gap-2 p-2 border rounded-md h-24">
        <div className="relative w-16 h-16 flex-shrink-0">
          {isImage ? (
            <Image src={fileUrl} alt="preview" fill style={{ objectFit: "cover" }} className="rounded-md" />
          ) : (
            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-grow overflow-hidden">
          <p className="text-sm font-medium truncate" title={fileName || ""}>{fileName}</p>
          {file && typeof file !== 'string' && 'size' in file && (
            <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
          )}
        </div>
        <Button variant="ghost" size="icon" type="button" className="text-destructive hover:bg-destructive/10 h-8 w-8 flex-shrink-0" onClick={() => onRemove()}>
          <X className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <label htmlFor={name} className="relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800">
      <div className="flex flex-col items-center justify-center text-center">
        <UploadCloud className="w-6 h-6 mb-2 text-gray-500" />
        <p className="text-xs text-gray-500"><span className="font-semibold">Click to upload</span></p>
      </div>
      <Input id={name} name={name} type="file" className="hidden" onChange={onFileChange} accept={accept} />
    </label>
  );
};
