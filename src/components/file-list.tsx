"use client";

import { useState } from 'react';
import type { FileInfo } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, File as FileIcon, FileImage, FileText, FileVideo, MoreVertical, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';

interface FileListProps {
  files: FileInfo[];
  onDelete: (id: string) => void;
}

const getFileIcon = (type: FileInfo['type']) => {
  switch (type) {
    case 'image':
      return <FileImage className="h-5 w-5 text-muted-foreground" />;
    case 'document':
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    case 'video':
      return <FileVideo className="h-5 w-5 text-muted-foreground" />;
    default:
      return <FileIcon className="h-5 w-5 text-muted-foreground" />;
  }
};

export function FileList({ files, onDelete }: FileListProps) {
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const handleDelete = () => {
    if (fileToDelete) {
      onDelete(fileToDelete);
      setFileToDelete(null);
    }
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 pl-4"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Size</TableHead>
              <TableHead className="hidden md:table-cell">Upload Date</TableHead>
              <TableHead className="w-16 text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No files uploaded yet.
                </TableCell>
              </TableRow>
            )}
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="pl-4">{getFileIcon(file.type)}</TableCell>
                <TableCell className="font-medium truncate max-w-xs">{file.name}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatBytes(file.size)}</TableCell>
                <TableCell className="hidden md:table-cell">{format(file.uploadDate, 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Open file actions</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFileToDelete(file.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your file from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
