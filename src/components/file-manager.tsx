

"use client";

import React, { useState, useMemo, useRef, ChangeEvent } from "react";
import Image from "next/image";
import {
  Folder,
  File as FileIcon,
  MoreVertical,
  Upload,
  FolderPlus,
  Download,
  Trash2,
  Edit,
  ChevronRight,
  HomeIcon,
  Loader2,
  List,
} from "lucide-react";
import { format } from "date-fns";
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from "@/firebase";
import { cn } from "@/lib/utils";
import { Grid, View } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export interface FileSystemNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  userId: string;
  size?: number;
  lastModified: Date | Timestamp;
  downloadURL?: string;
  storagePath?: string;
}

export interface FolderNode extends FileSystemNode {
  type: 'folder';
}

export interface FileNode extends FileSystemNode {
  type: 'file';
  fileType: string;
}


function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

type DialogState =
  | { type: "create_folder" }
  | { type: "rename"; node: FileSystemNode }
  | { type: "delete"; node: FileSystemNode }
  | null;

type ViewMode = "small" | "medium" | "large" | "extra-large" | "list";


const GridItem = ({ node, onNodeClick, onDownload, onOpenDialog } : { node: FileSystemNode, onNodeClick: (node: FileSystemNode) => void, onDownload: (node: FileNode) => void, onOpenDialog: (state: DialogState) => void }) => {
    const isImage = node.type === 'file' && (node as FileNode).fileType.startsWith('image/') && (node as FileNode).downloadURL;
    
    return (
        <Card 
            className="w-full cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => onNodeClick(node)}
        >
            <CardContent className="p-0">
                <div className="aspect-square w-full flex items-center justify-center bg-muted rounded-t-lg overflow-hidden relative">
                    {node.type === 'folder' ? (
                        <Folder className="w-1/2 h-1/2 text-muted-foreground" />
                    ) : isImage ? (
                        <Image 
                            src={(node as FileNode).downloadURL!} 
                            alt={node.name}
                            width={200}
                            height={200}
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <FileIcon className="w-1/2 h-1/2 text-muted-foreground" />
                    )}
                </div>
            </CardContent>
            <div className="p-2 sm:p-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="text-muted-foreground">
                        {node.type === 'folder' ? <Folder className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 truncate">
                        <p className="font-medium text-sm truncate" title={node.name}>{node.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {node.type === "file" && node.size ? formatBytes(node.size) : 'Folder'}
                        </p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {node.type === "file" && (
                            <DropdownMenuItem onSelect={() => onDownload(node as FileNode)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => onOpenDialog({ type: "rename", node })}>
                            <Edit className="mr-2 h-4 w-4" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => onOpenDialog({ type: "delete", node })}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    );
};

const ListItem = ({ node, onNodeClick, onDownload, onOpenDialog }: { node: FileSystemNode; onNodeClick: (node: FileSystemNode) => void; onDownload: (node: FileNode) => void; onOpenDialog: (state: DialogState) => void; }) => {
    const isImage = node.type === 'file' && (node as FileNode).fileType.startsWith('image/') && (node as FileNode).downloadURL;
    return (
      <div
        className="flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer group"
        onClick={() => onNodeClick(node)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 bg-muted rounded flex items-center justify-center">
            {isImage ? (
                <Image src={(node as FileNode).downloadURL!} alt={node.name} width={32} height={32} className="object-cover rounded w-full h-full"/>
            ) : node.type === "folder" ? (
                <Folder className="h-5 w-5 text-muted-foreground" />
            ) : (
                <FileIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <span className="truncate text-sm font-medium">{node.name}</span>
        </div>
        <div className="hidden sm:block text-sm text-muted-foreground w-48">
          {format(new Date(node.lastModified.toString()), "MMM dd, yyyy")}
        </div>
        <div className="hidden md:block text-sm text-muted-foreground w-32">
          {node.type === "file" && node.size ? formatBytes(node.size) : "—"}
        </div>
        <div className="ml-auto">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {node.type === "file" && (
                        <DropdownMenuItem onSelect={() => onDownload(node as FileNode)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => onOpenDialog({ type: "rename", node })}>
                        <Edit className="mr-2 h-4 w-4" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onSelect={() => onOpenDialog({ type: "delete", node })}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    );
};

const ListHeader = () => (
    <div className="flex items-center w-full px-2 py-1.5 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="flex-1 min-w-0 pl-11">
        <span className="text-sm font-semibold text-muted-foreground">Name</span>
      </div>
      <div className="hidden sm:block text-sm font-semibold text-muted-foreground w-48">
        Last Modified
      </div>
      <div className="hidden md:block text-sm font-semibold text-muted-foreground w-32">
        File Size
      </div>
      <div className="w-7 h-7 ml-auto" />
    </div>
);


export default function FileManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: number; name: string; progress: number }[]
  >([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<ViewMode>('small');

  const currentPathString = useMemo(
    () => (currentPath.length === 0 ? "/" : `/${currentPath.join("/")}`),
    [currentPath]
  );
  
  const foldersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/folders`),
      where("path", "==", currentPathString)
    );
  }, [firestore, user, currentPathString]);

  const filesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
        collection(firestore, `users/${user.uid}/files`),
        where("path", "==", currentPathString)
    );
  }, [firestore, user, currentPathString]);

  const { data: foldersData, isLoading: foldersLoading } = useCollection<FolderNode>(foldersQuery);
  const { data: filesData, isLoading: filesLoading } = useCollection<FileNode>(filesQuery);

  const currentNodes = useMemo(() => {
    const combined = [
        ...(foldersData || []).map(f => ({ ...f, lastModified: (f.lastModified as any)?.toDate ? (f.lastModified as any).toDate() : new Date() })),
        ...(filesData || []).map(f => ({ ...f, lastModified: (f.lastModified as any)?.toDate ? (f.lastModified as any).toDate() : new Date() }))
    ];

    return combined.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [foldersData, filesData]);


  const handleNodeClick = (node: FileSystemNode) => {
    if (node.type === "folder") {
      setCurrentPath([...currentPath, node.name]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  const handleOpenDialog = (state: DialogState) => {
    if (state?.type === "rename") {
      setInputValue(state.node.name);
    } else {
      setInputValue("");
    }
    setDialogState(state);
  };

  const closeDialog = () => {
    setDialogState(null);
    setInputValue("");
  };

  const handleCreateFolder = async () => {
    if (!inputValue.trim() || !user) return;
    
    const newFolder: Omit<FolderNode, 'id' | 'lastModified'> & { lastModified: any } = {
      name: inputValue,
      type: "folder",
      path: currentPathString,
      userId: user.uid,
      lastModified: serverTimestamp(),
    };
    try {
      await addDoc(collection(firestore, `users/${user.uid}/folders`), newFolder);
      toast({
        title: "Success",
        description: `Folder "${inputValue}" created.`,
      });
      closeDialog();
    } catch(e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Could not create folder.",
        variant: "destructive",
      });
    }
  };

  const handleRenameNode = async () => {
    if (dialogState?.type !== "rename" || !user) return;

    const originalNode = dialogState.node;
    const newName = inputValue;

    if (!newName.trim()) return;
    
    const collectionName = originalNode.type === 'folder' ? 'folders' : 'files';
    const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, originalNode.id);

    try {
      await updateDoc(docRef, { name: newName, lastModified: serverTimestamp() });
      toast({
        title: "Success",
        description: `Renamed "${originalNode.name}" to "${newName}".`,
      });
      closeDialog();
    } catch(e) {
        console.error(e);
        toast({
            title: "Error",
            description: "Could not rename item.",
            variant: "destructive",
        });
    }
  };

  const handleDeleteNode = async () => {
    if (dialogState?.type !== "delete" || !user) return;
    const nodeToDelete = dialogState.node;
    
    const collectionName = nodeToDelete.type === 'folder' ? 'folders' : 'files';
    const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, nodeToDelete.id);

    try {
      if (nodeToDelete.type === 'file' && nodeToDelete.storagePath) {
        await deleteObject(storageRef(storage, nodeToDelete.storagePath));
      }
      await deleteDoc(docRef);
      toast({
        title: "Success",
        description: `Deleted "${nodeToDelete.name}".`,
      });
      closeDialog();
    } catch(e) {
        console.error(e);
        toast({
            title: "Error",
            description: "Could not delete item.",
            variant: "destructive",
        });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    Array.from(files).forEach((file) => {
      const uploadId = Date.now() + Math.random();
      const newUploadingFile = { id: uploadId, name: file.name, progress: 0 };
      setUploadingFiles((prev) => [...prev, newUploadingFile]);
      
      const fileId = uuidv4();
      const filePath = `users/${user.uid}/files/${fileId}_${file.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId ? { ...f, progress: progress } : f
            )
          );
        },
        (error) => {
          console.error("Upload failed:", error);
          toast({
            title: "Upload Failed",
            description: `Could not upload ${file.name}.`,
            variant: "destructive",
          });
          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileDoc: Omit<FileNode, 'id' | 'lastModified'> & { lastModified: any } = {
            name: file.name,
            type: "file",
            path: currentPathString,
            userId: user.uid,
            size: file.size,
            fileType: file.type,
            lastModified: serverTimestamp(),
            downloadURL,
            storagePath: filePath,
          };
          try {
            await addDoc(collection(firestore, `users/${user.uid}/files`), fileDoc);
            toast({
              title: "Upload Complete",
              description: `File "${file.name}" has been uploaded.`,
            });
          } catch(e) {
             console.error("Error adding file to firestore:", e);
             toast({
                title: "Upload Failed",
                description: `Could not save ${file.name} metadata.`,
                variant: "destructive",
             });
          } finally {
            setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
          }
        }
      );
    });
    
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (node: FileNode) => {
    if (!node.downloadURL) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: `"${node.name}" has no download URL.`,
      });
      return;
    }
  
    try {
      toast({
        title: 'Download Started',
        description: `Downloading "${node.name}".`,
      });
  
      const response = await fetch(node.downloadURL);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const blob = await response.blob();
  
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = node.name;
  
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: `Could not download "${node.name}". See console for details.`,
      });
    }
  };

  const isLoading = foldersLoading || filesLoading;

  const viewClasses = {
      small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      large: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
      "extra-large": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      list: "flex flex-col gap-1",
  };

  const CurrentViewIcon = useMemo(() => {
    switch(view) {
        case 'list': return List;
        default: return Grid;
    }
  }, [view]);

  return (
    <TooltipProvider>
      <Card className="shadow-lg h-full flex flex-col">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Cloud Storage</CardTitle>
            <CardDescription>Manage your files and folders.</CardDescription>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <CurrentViewIcon />
                                <span className="sr-only">View Options</span>
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>View Options</p>
                    </TooltipContent>
                </Tooltip>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={view} onValueChange={(v) => setView(v as ViewMode)}>
                        <DropdownMenuRadioItem value="small">Small Grid</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="medium">Medium Grid</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="large">Large Grid</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="extra-large">Extra Large Grid</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog({ type: 'create_folder' })}>
                      <FolderPlus />
                      <span className="sr-only">New Folder</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>New Folder</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button size="icon" onClick={handleUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Upload />
                       <span className="sr-only">Upload</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Upload</p>
                </TooltipContent>
            </Tooltip>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto whitespace-nowrap py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleBreadcrumbClick(0)}
              disabled={currentPath.length === 0}
            >
              <HomeIcon className="h-4 w-4" />
            </Button>
            {currentPath.length > 0 && <ChevronRight className="h-4 w-4" />}
            {currentPath.map((part, index) => (
              <React.Fragment key={index}>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => handleBreadcrumbClick(index + 1)}
                  disabled={index === currentPath.length - 1}
                >
                  {part}
                </Button>
                {index < currentPath.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="flex-1 overflow-auto relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                {view === 'list' && currentNodes.length > 0 && <ListHeader />}
                <div className={cn("grid gap-4", viewClasses[view])}>
                    {currentNodes.map((node) => 
                        view === 'list' ? (
                            <ListItem
                                key={node.id}
                                node={node}
                                onNodeClick={handleNodeClick}
                                onDownload={handleDownload}
                                onOpenDialog={handleOpenDialog}
                            />
                        ) : (
                            <GridItem 
                                key={node.id} 
                                node={node}
                                onNodeClick={handleNodeClick}
                                onDownload={handleDownload}
                                onOpenDialog={handleOpenDialog}
                            />
                        )
                    )}
                </div>
              </>
            )}
            
            {uploadingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                    {uploadingFiles.map((file) => (
                      <div key={file.id} className="p-2 border rounded-lg">
                        <div className="flex items-center gap-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="font-medium flex-1 truncate">{file.name}</span>
                            <Progress value={file.progress} className="w-32" />
                            <span className="text-sm text-muted-foreground w-12 text-right">{file.progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                </div>
            )}

            {!isLoading && currentNodes.length === 0 && uploadingFiles.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    This folder is empty.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!dialogState && dialogState.type !== 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
         {dialogState?.type === 'create_folder' || dialogState?.type === 'rename' ? (
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{dialogState.type === 'rename' ? `Rename "${dialogState.node.name}"` : 'Create New Folder'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Name
                    </Label>
                    <Input
                    id="name"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="col-span-3"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                        e.preventDefault();
                        dialogState.type === 'rename' ? handleRenameNode() : handleCreateFolder();
                        }
                    }}
                    />
                </div>
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={dialogState.type === 'rename' ? handleRenameNode : handleCreateFolder}>
                    {dialogState.type === 'rename' ? 'Rename' : 'Create'}
                </Button>
                </DialogFooter>
            </DialogContent>
        ) : null}
      </Dialog>
      <AlertDialog open={!!dialogState && dialogState.type === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        {dialogState?.type === 'delete' ? (
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete "{dialogState.node.name}". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteNode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </TooltipProvider>
  );
}
