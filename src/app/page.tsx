"use client";

import { useState, useEffect } from "react";
import { UploadButton } from "@/components/upload-button";
import { FileList } from "@/components/file-list";
import type { FileInfo, UploadingFile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadingFileItem } from "@/components/uploading-file-item";

const getFileType = (fileName: string): FileInfo['type'] => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return 'other';

  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) return 'document';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return 'video';
  return 'other';
};


const initialFiles: FileInfo[] = [
  { id: '1', name: 'Annual-Report-2023.pdf', type: 'document', size: 2097152, uploadDate: new Date('2023-10-15') },
  { id: '2', name: 'product-demo.mp4', type: 'video', size: 52428800, uploadDate: new Date('2023-10-12') },
  { id: '3', name: 'company-logo.png', type: 'image', size: 157286, uploadDate: new Date('2023-10-11') },
  { id: '4', name: 'meeting-notes.txt', type: 'document', size: 10240, uploadDate: new Date('2023-10-09') },
];

export default function Home() {
  const [files, setFiles] = useState<FileInfo[]>(initialFiles);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const handleFileDelete = (id: string) => {
    setFiles(files.filter((file) => file.id !== id));
  };
  
  const handleFilesSelected = (selectedFiles: FileList) => {
    const newUploadingFiles: UploadingFile[] = Array.from(selectedFiles).map(file => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      progress: 0,
    }));
    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
  };

  useEffect(() => {
    if (uploadingFiles.length > 0) {
      const interval = setInterval(() => {
        setUploadingFiles(prevUploadingFiles => {
          const updatedFiles = prevUploadingFiles.map(file => {
            if (file.progress < 100) {
              const newProgress = file.progress + Math.round(Math.random() * 10) + 5;
              return { ...file, progress: Math.min(newProgress, 100) };
            }
            return file;
          });

          const completedFiles = updatedFiles.filter(file => file.progress === 100);
          const ongoingFiles = updatedFiles.filter(file => file.progress < 100);

          if (completedFiles.length > 0) {
            const newFiles: FileInfo[] = completedFiles.map(cf => ({
              id: cf.id,
              name: cf.name,
              size: cf.size,
              type: getFileType(cf.name),
              uploadDate: new Date(),
            }));
            setFiles(prev => [...newFiles, ...prev]);
          }

          if (ongoingFiles.length === 0 && completedFiles.length > 0) {
            clearInterval(interval);
          }
          
          return ongoingFiles;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [uploadingFiles.length]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">File Storage</CardTitle>
              <CardDescription>Upload, manage, and access your files.</CardDescription>
            </div>
            <UploadButton onFilesSelected={handleFilesSelected} />
          </CardHeader>
          <CardContent>
            {uploadingFiles.length > 0 && (
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold">Uploading...</h3>
                <div className="space-y-2">
                  {uploadingFiles.map(file => (
                    <UploadingFileItem key={file.id} file={file} />
                  ))}
                </div>
              </div>
            )}
            <FileList files={files} onDelete={handleFileDelete} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
