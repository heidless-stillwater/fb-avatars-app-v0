
'use client';

import React, { useState, useMemo, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import {
  MoreVertical,
  Upload,
  Plus,
  Trash2,
  Edit,
  Loader2,
  List,
  Grid,
  Image as ImageIcon,
  LayoutGrid,
  Filter,
  Download,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  useUser,
  useFirestore,
  useStorage,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface LibImageRecord {
  id: string;
  userId: string;
  libImgName: string;
  libImgCategory?: string;
  libImg: string;
  libImgDesc?: string;
  libImgStoragePath: string;
  timestamp: Timestamp;
}

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; record: LibImageRecord }
  | { type: 'delete'; record: LibImageRecord }
  | null;

type ViewMode = 'list' | 'grid' | 'small' | 'medium' | 'large' | 'extra-large';

const ImageGridItem = ({ record, onOpenDialog, onDownload }: { record: LibImageRecord, onOpenDialog: (state: DialogState) => void, onDownload: (record: LibImageRecord) => void }) => (
    <Card className="w-full group">
        <CardContent className="p-0">
            <div className="aspect-square w-full flex items-center justify-center bg-muted rounded-t-lg overflow-hidden relative">
                <Image 
                    src={record.libImg} 
                    alt={record.libImgName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover w-full h-full"
                />
            </div>
        </CardContent>
        <div className="p-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" title={record.libImgName}>{record.libImgName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {record.libImgCategory && <Badge variant="secondary" className='truncate'>{record.libImgCategory}</Badge>}
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onDownload(record)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onOpenDialog({ type: 'edit', record })}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onSelect={() => onOpenDialog({ type: 'delete', record })}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </Card>
);

const ImageListItem = ({ record, onOpenDialog, onDownload }: { record: LibImageRecord, onOpenDialog: (state: DialogState) => void, onDownload: (record: LibImageRecord) => void }) => (
    <div className="flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted group">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <Image src={record.libImg} alt={record.libImgName} width={40} height={40} className="object-cover rounded-md w-10 h-10"/>
            <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{record.libImgName}</p>
                <p className="truncate text-xs text-muted-foreground">{record.libImgDesc || 'No description'}</p>
            </div>
        </div>
         <div className="hidden md:block w-40">
            {record.libImgCategory && <Badge variant="outline">{record.libImgCategory}</Badge>}
        </div>
        <div className="hidden sm:block text-sm text-muted-foreground w-48">
          {record.timestamp ? format(record.timestamp.toDate(), "MMM dd, yyyy") : ''}
        </div>
        <div className="ml-auto">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onDownload(record)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </DropdownMenuItem>
                   <DropdownMenuItem onSelect={() => onOpenDialog({ type: 'edit', record })}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onSelect={() => onOpenDialog({ type: 'delete', record })}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
);


export default function ImgLibProcessor() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [view, setView] = useState<ViewMode>('small');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const [imageName, setImageName] = useState('');
  const [imageDesc, setImageDesc] = useState('');
  const [imageCategory, setImageCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const libQuery = useMemoFirebase(() => {
    if (!user) return null;
    const baseCollection = collection(firestore, `users/${user.uid}/avatarImgLib`);
    if(filterCategory) {
        return query(baseCollection, where('libImgCategory', '==', filterCategory), orderBy('timestamp', 'desc'));
    }
    return query(baseCollection, orderBy('timestamp', 'desc'));
  }, [firestore, user, filterCategory]);

  const { data: libImages, isLoading: libImagesLoading } = useCollection<LibImageRecord>(libQuery);

  const allCategories = useMemo(() => {
    if (!libImages) return [];
    const categories = libImages.map(img => img.libImgCategory).filter(Boolean) as string[];
    return [...new Set(categories)];
  }, [libImages]);

  const openDialog = (state: DialogState) => {
    if (state?.type === 'edit') {
        setImageName(state.record.libImgName);
        setImageDesc(state.record.libImgDesc || '');
        setImageCategory(state.record.libImgCategory || '');
        setImageFile(null);
    } else {
        setImageName('');
        setImageDesc('');
        setImageCategory('');
        setImageFile(null);
    }
    setDialogState(state);
  };

  const closeDialog = () => {
    setDialogState(null);
  };
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload an image file.',
        });
        return;
      }
      setImageFile(file);
    }
  };

  const handleDownload = async (record: LibImageRecord) => {
    if (!record.libImg) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Image URL is missing.',
      });
      return;
    }

    try {
      toast({
        title: 'Download Started',
        description: `Downloading "${record.libImgName}".`,
      });

      const response = await fetch(record.libImg);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = record.libImgName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: `Could not download "${record.libImgName}".`,
      });
    }
  };
  
  const uploadImage = async (file: File, userId: string): Promise<{ downloadURL: string, storagePath: string }> => {
    const storagePath = `users/${userId}/avatarImgLib/${uuidv4()}-${file.name}`;
    const fileStorageRef = storageRef(storage, storagePath);

    const uploadTask = uploadBytesResumable(fileStorageRef, file);
    setUploadProgress(0);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            reject, // on error
            async () => { // on success
                try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({ downloadURL: url, storagePath });
                } catch (e) {
                    reject(e);
                } finally {
                    setUploadProgress(null);
                }
            }
        );
    });
  };

  const handleSubmit = async () => {
    if (!user || !dialogState || !imageName.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Image name is required." });
      return;
    }
  
    if (dialogState.type === 'create' && !imageFile) {
      toast({ variant: "destructive", title: "Missing Information", description: "An image file is required for creation." });
      return;
    }
  
    setIsLoadingAction(true);
  
    try {
      let downloadURL: string | null = null;
      let storagePath: string | null = null;

      if (imageFile) {
          const uploadResult = await uploadImage(imageFile, user.uid);
          downloadURL = uploadResult.downloadURL;
          storagePath = uploadResult.storagePath;
      }

      if (dialogState.type === 'create') {
        if (!downloadURL || !storagePath) {
          throw new Error("Image upload failed, cannot create record.");
        }
        const libImageData = {
          userId: user.uid,
          libImgName: imageName,
          libImgDesc: imageDesc,
          libImgCategory: imageCategory,
          libImg: downloadURL,
          libImgStoragePath: storagePath,
          timestamp: serverTimestamp(),
        };
        await addDoc(collection(firestore, `users/${user.uid}/avatarImgLib`), libImageData);
        toast({ title: 'Success', description: 'Image added to library.' });
  
      } else if (dialogState.type === 'edit') {
        const docRef = doc(firestore, `users/${user.uid}/avatarImgLib`, dialogState.record.id);
        const updatedData: Partial<LibImageRecord> = {
          libImgName: imageName,
          libImgDesc: imageDesc,
          libImgCategory: imageCategory,
        };
  
        if (downloadURL && storagePath) {
          updatedData.libImg = downloadURL;
          updatedData.libImgStoragePath = storagePath;
        }

        await updateDoc(docRef, updatedData);
        toast({ title: 'Success', description: 'Image details updated.' });

        // If a new image was uploaded, delete the old one
        if (downloadURL && storagePath) {
            if (dialogState.record.libImgStoragePath) {
                const oldImageRef = storageRef(storage, dialogState.record.libImgStoragePath);
                await deleteObject(oldImageRef).catch(err => console.warn("Could not delete old image:", err));
            }
        }
      }

      closeDialog();
    } catch (error) {
      console.error("Library action failed:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save image to library.' });
    } finally {
      setIsLoadingAction(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (dialogState?.type !== 'delete' || !user) return;
    
    setIsLoadingAction(true);
    const recordToDelete = dialogState.record;

    try {
        const docRef = doc(firestore, `users/${user.uid}/avatarImgLib`, recordToDelete.id);
        await deleteDoc(docRef);

        if (recordToDelete.libImgStoragePath) {
            const imageRef = storageRef(storage, recordToDelete.libImgStoragePath);
            await deleteObject(imageRef);
        }

        toast({ title: 'Success', description: `Image "${recordToDelete.libImgName}" deleted from library.`});
        closeDialog();
    } catch (error) {
        console.error("Delete failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete image.' });
    } finally {
        setIsLoadingAction(false);
    }
  };

  const viewClasses: Record<ViewMode, string> = {
    list: "flex flex-col gap-1",
    grid: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    small: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
    medium: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    large: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    "extra-large": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  const CurrentViewIcon = useMemo(() => {
    switch(view) {
        case 'list': return List;
        default: return LayoutGrid;
    }
  }, [view]);


  return (
    <TooltipProvider>
      <Card>
      <CardHeader>
        <CardTitle>Image Library</CardTitle>
        <CardDescription>Manage your saved images. Organize them with categories and find them easily.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                  <DropdownMenu>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="outline">
                                      <Filter className='mr-2 h-4 w-4' />
                                      {filterCategory || 'All Categories'}
                                  </Button>
                              </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent><p>Filter by category</p></TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent>
                          <DropdownMenuLabel>Category</DropdownMenuLabel>
                          <DropdownMenuRadioGroup value={filterCategory || ''} onValueChange={(v) => setFilterCategory(v === '' ? null : v)}>
                              <DropdownMenuRadioItem value="">All Categories</DropdownMenuRadioItem>
                              <DropdownMenuSeparator/>
                              {allCategories.map(cat => <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>)}
                          </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className='flex gap-2'>
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <CurrentViewIcon className='h-4 w-4' />
                                        <span className="sr-only">View Options</span>
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>View Options</p></TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Display</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={view} onValueChange={(v) => setView(v as ViewMode)}>
                                <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="small">Small Grid</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="medium">Medium Grid</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="large">Large Grid</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="extra-large">Extra Large Grid</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button onClick={() => openDialog({ type: 'create' })}>
                                <Plus className="mr-2 h-4 w-4" /> Add Image
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Add a new image to the library</p></TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {libImagesLoading && (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            )}
            
            {!libImagesLoading && libImages && libImages.length > 0 ? (
                 view === 'list' ? (
                    <div className="flex flex-col gap-1 border rounded-lg p-2">
                        {libImages.map(image => <ImageListItem key={image.id} record={image} onOpenDialog={openDialog} onDownload={handleDownload} />)}
                    </div>
                 ) : (
                    <div className={cn("grid gap-4", viewClasses[view])}>
                        {libImages.map(image => <ImageGridItem key={image.id} record={image} onOpenDialog={openDialog} onDownload={handleDownload} />)}
                    </div>
                 )
            ) : (
                !libImagesLoading && (
                    <div className="flex flex-col items-center justify-center h-64 rounded-md border border-dashed text-sm text-muted-foreground">
                        <ImageIcon className="h-10 w-10 mb-2" />
                        <p>Your image library is empty.</p>
                         {filterCategory && <p className='text-xs mt-1'>Try selecting 'All Categories'.</p>}
                    </div>
                )
            )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogState?.type === 'create' || dialogState?.type === 'edit'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{dialogState?.type === 'create' ? 'Add New Image' : 'Edit Image Details'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="imageName">Image Name</Label>
                        <Input id="imageName" value={imageName} onChange={e => setImageName(e.target.value)} disabled={isLoadingAction} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="imageCategory">Category</Label>
                        <Input id="imageCategory" value={imageCategory} onChange={e => setImageCategory(e.target.value)} placeholder="e.g. Portraits, Landscapes (optional)" disabled={isLoadingAction} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="imageDesc">Description</Label>
                        <Textarea id="imageDesc" value={imageDesc} onChange={e => setImageDesc(e.target.value)} placeholder="A brief description (optional)" disabled={isLoadingAction} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="imageFile">
                            {dialogState?.type === 'create' ? 'Image File' : 'Replace Image (Optional)'}
                        </Label>
                        <Input id="imageFile" type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} disabled={isLoadingAction} />
                    </div>
                    {imageFile && <p className="text-sm text-muted-foreground">New image: {imageFile.name}</p>}
                    {uploadProgress !== null && <Progress value={uploadProgress} />}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog} disabled={isLoadingAction}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoadingAction || !imageName.trim() || (dialogState?.type === 'create' && !imageFile)}>
                        {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={dialogState?.type === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the image "{dialogState?.type === 'delete' && dialogState.record.libImgName}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}


    

    