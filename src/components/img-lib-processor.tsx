
'use client';

import React, { useState, useMemo, useRef, ChangeEvent, useEffect } from 'react';
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
  writeBatch,
  getDocs,
  deleteField,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { format, formatISO } from 'date-fns';
import {
  MoreVertical,
  Plus,
  Trash2,
  Edit,
  Loader2,
  List,
  Image as ImageIcon,
  LayoutGrid,
  Filter,
  Download,
  Upload,
  Save,
  DownloadCloud,
  Wand2,
  ChevronDown,
  AlertTriangle,
  FolderSync,
} from 'lucide-react';
import JSZip from 'jszip';


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
  DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
  useFirebase,
} from '@/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { suggestCategory } from '@/ai/flows/suggest-category-flow';


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

interface CategoryRecord {
  id: string;
  name: string;
}

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; record: LibImageRecord }
  | { type: 'delete'; record: LibImageRecord }
  | { type: 'restore' }
  | { type: 'clear-categories' }
  | { type: 'bulk-categorize' }
  | null;

type ViewMode = 'list' | 'grid' | 'small' | 'medium' | 'large' | 'extra-large';

const dataUrlFromImageUrl = async (imageUrl: string): Promise<string> => {
    // Check if the URL is already a data URI
    if (imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const BulkCategorizeDialog = ({ onOpenChange, imagesToCategorize }: { onOpenChange: (open: boolean) => void, imagesToCategorize: LibImageRecord[] }) => {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [suggestedCategory, setSuggestedCategory] = useState('');
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const currentImage = imagesToCategorize[currentIndex];

    useEffect(() => {
        if (currentImage) {
            setIsCategorizing(true);
            setSuggestedCategory('');
            dataUrlFromImageUrl(currentImage.libImg)
                .then(photoDataUri => suggestCategory({ photoDataUri }))
                .then(result => {
                    setSuggestedCategory(result.category);
                })
                .catch(err => {
                    console.error("Error suggesting category for bulk process:", err);
                    toast({ variant: 'destructive', title: 'AI Suggestion Failed' });
                })
                .finally(() => setIsCategorizing(false));
        }
    }, [currentImage, toast]);

    const handleSave = async (andClose: boolean) => {
        if (!currentImage || !suggestedCategory.trim() || !user) return;
        
        setIsSaving(true);
        try {
            const docRef = doc(firestore, `users/${user.uid}/avatarImgLib`, currentImage.id);
            await updateDoc(docRef, { libImgCategory: suggestedCategory.trim() });
            
            toast({ title: "Category Saved!", description: `"${currentImage.libImgName}" is now in "${suggestedCategory.trim()}".`});

            if (andClose || currentIndex >= imagesToCategorize.length - 1) {
                onOpenChange(false);
            } else {
                setCurrentIndex(prev => prev + 1);
            }
        } catch (error) {
            console.error("Error saving category:", error);
            toast({ variant: 'destructive', title: 'Save Failed' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSkip = () => {
        if (currentIndex >= imagesToCategorize.length - 1) {
            onOpenChange(false);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    if (!currentImage) {
        return null;
    }

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bulk Categorize ({currentIndex + 1} / {imagesToCategorize.length})</DialogTitle>
                    <DialogDescription>Review the suggested category or enter your own.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="relative w-full aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                        <Image src={currentImage.libImg} alt={currentImage.libImgName} fill className="object-contain" sizes="50vw" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bulk-category">Suggested Category</Label>
                        {isCategorizing ? (
                             <div className="flex items-center gap-2 h-10">
                                <Loader2 className="h-4 w-4 animate-spin"/>
                                <span>Getting AI suggestion...</span>
                            </div>
                        ) : (
                            <Input id="bulk-category" value={suggestedCategory} onChange={e => setSuggestedCategory(e.target.value)} disabled={isSaving} />
                        )}
                    </div>
                </div>
                <DialogFooter className="grid grid-cols-2 sm:flex sm:flex-row sm:justify-end sm:space-x-2 gap-2">
                    <Button variant="secondary" onClick={handleSkip} disabled={isSaving}>Skip</Button>
                    <Button onClick={() => handleSave(false)} disabled={isSaving || isCategorizing || !suggestedCategory.trim()}>
                        {(isSaving && !isCategorizing) ? <Loader2 className="animate-spin" /> : 'Save & Next'}
                    </Button>
                     <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving || isCategorizing || !suggestedCategory.trim()}>Save & Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

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
                  {record.libImgCategory && record.libImgCategory !== 'uncategorized' && <Badge variant="secondary" className='truncate'>{record.libImgCategory}</Badge>}
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
            {record.libImgCategory && record.libImgCategory !== 'uncategorized' && <Badge variant="outline">{record.libImgCategory}</Badge>}
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
  const [imageCategory, setImageCategory] = useState('uncategorized');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const libQuery = useMemoFirebase(() => {
    if (!user) return null;
    const baseCollection = collection(firestore, `users/${user.uid}/avatarImgLib`);
    if(filterCategory && filterCategory !== 'all') {
        return query(baseCollection, where('libImgCategory', '==', filterCategory), orderBy('timestamp', 'desc'));
    }
    return query(baseCollection, orderBy('timestamp', 'desc'));
  }, [firestore, user, filterCategory]);

  const allLibImagesQuery = useMemoFirebase(() => {
    if(!user) return null;
    return query(collection(firestore, `users/${user.uid}/avatarImgLib`));
  }, [firestore, user]);

  const { data: libImages, isLoading: libImagesLoading } = useCollection<LibImageRecord>(libQuery);
  const { data: allLibImages, isLoading: allLibImagesLoading } = useCollection<LibImageRecord>(allLibImagesQuery);

  const uncategorizedImages = useMemo(() => allLibImages?.filter(img => !img.libImgCategory || img.libImgCategory === 'uncategorized') || [], [allLibImages]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/categories`), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: allCategories, isLoading: categoriesLoading } = useCollection<CategoryRecord>(categoriesQuery);

  const sortedCategories = useMemo(() => {
    return allCategories?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  }, [allCategories]);


  const openDialog = (state: DialogState) => {
    if (state?.type === 'edit') {
        setImageName(state.record.libImgName);
        setImageDesc(state.record.libImgDesc || '');
        setImageCategory(state.record.libImgCategory || 'uncategorized');
        setImageFile(null);
    } else if (state?.type !== 'clear-categories' && state?.type !== 'bulk-categorize') {
        setImageName('');
        setImageDesc('');
        setImageCategory('uncategorized');
        setImageFile(null);
        setRestoreFile(null);
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
      
      const fileExtension = record.libImg.split('.').pop()?.split('?')[0] || 'jpg';
      link.download = `${record.libImgName}.${fileExtension}`;

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

  const handleDownloadAll = async () => {
    if (!allLibImages || allLibImages.length === 0) {
        toast({ variant: 'destructive', title: 'No Images', description: 'There are no images in the library to download.'});
        return;
    }

    setIsLoadingAction(true);
    toast({ title: 'Preparing Download', description: `Compressing ${allLibImages.length} images... This may take a moment.`});

    try {
        const zip = new JSZip();
        
        const imagePromises = allLibImages.map(async (image) => {
            const response = await fetch(image.libImg);
            if (!response.ok) {
                console.warn(`Failed to fetch image: ${image.libImgName}`);
                return;
            }
            const blob = await response.blob();
            const fileExtension = image.libImg.split('.').pop()?.split('?')[0] || 'jpg';
            const fileName = `${image.libImgCategory ? `${image.libImgCategory}/` : ''}${image.libImgName}.${fileExtension}`;
            zip.file(fileName, blob);
        });

        await Promise.all(imagePromises);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `image-library-backup-${formatISO(new Date(), { representation: 'date' })}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast({ title: 'Download Ready!', description: 'Your image library has been downloaded as a ZIP file.' });

    } catch (error) {
        console.error('Download all error:', error);
        toast({ variant: 'destructive', title: 'Download All Failed', description: 'Could not create ZIP file.' });
    } finally {
        setIsLoadingAction(false);
    }
};

  const handleBackup = () => {
    if (!allLibImages || allLibImages.length === 0) {
        toast({ variant: 'destructive', title: 'Backup Failed', description: 'There are no images in the library to back up.'});
        return;
    }

    const backupData = allLibImages.map(img => ({
        ...img,
        timestamp: img.timestamp.toDate().toISOString() // Convert Firestore Timestamp to ISO string
    }));

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-library-backup-${formatISO(new Date(), { representation: 'date' })}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Backup Successful', description: `${allLibImages.length} image records have been saved.`});
  };

  const handleRestoreFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
        setRestoreFile(file);
    } else {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select a valid JSON backup file.' });
        setRestoreFile(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile || !user) {
        toast({ variant: 'destructive', title: 'Restore Failed', description: 'Please select a backup file to restore.' });
        return;
    }
    
    setIsLoadingAction(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const content = e.target?.result;
            if (typeof content !== 'string') throw new Error("Failed to read file content.");

            const backupData: any[] = JSON.parse(content);
            
            if (!Array.isArray(backupData)) throw new Error("Invalid backup format: not an array.");
            
            const batch = writeBatch(firestore);
            const collectionRef = collection(firestore, `users/${user.uid}/avatarImgLib`);
            let count = 0;

            backupData.forEach(item => {
                if (item.libImgName && item.libImg && item.userId) { 
                    const docRef = doc(collectionRef); 
                    const restoredItem = {
                        ...item,
                        userId: user.uid, 
                        timestamp: new Date(item.timestamp) 
                    };
                    delete restoredItem.id; 
                    batch.set(docRef, restoredItem);
                    count++;
                }
            });
            
            await batch.commit();

            toast({ title: 'Restore Successful', description: `Restored ${count} image records. The page will now reload.` });
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error: any) {
            console.error("Restore error:", error);
            toast({ variant: 'destructive', title: 'Restore Failed', description: error.message || 'Could not process backup file.' });
        } finally {
            setIsLoadingAction(false);
            closeDialog();
        }
    };
    
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Error Reading File', description: 'Could not read the selected backup file.' });
        setIsLoadingAction(false);
    };

    reader.readAsText(restoreFile);
  };
  
  const handleClearAllCategories = async () => {
    if (!user) return;

    setIsLoadingAction(true);
    try {
        const batch = writeBatch(firestore);
        const q = query(collection(firestore, `users/${user.uid}/avatarImgLib`));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            toast({ title: 'No Images Found', description: 'There are no images in the library to update.'});
            setIsLoadingAction(false);
            closeDialog();
            return;
        }
        
        snapshot.docs.forEach(docToUpdate => {
            batch.update(docToUpdate.ref, { libImgCategory: deleteField() });
        });

        await batch.commit();
        toast({ title: 'Success', description: `Cleared categories for ${snapshot.size} image(s).` });
    } catch (error) {
        console.error("Failed to clear categories:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not clear all categories.' });
    } finally {
        setIsLoadingAction(false);
        closeDialog();
    }
  };

    const handleSuggestCategory = async () => {
      if (dialogState?.type !== 'edit' && !imageFile) {
        toast({ variant: 'destructive', title: 'No Image', description: 'Please provide an image to categorize.' });
        return;
      }
      setIsCategorizing(true);
      try {
        let dataUri = '';
        if (imageFile) {
           dataUri = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
        } else if (dialogState?.type === 'edit') {
            dataUri = await dataUrlFromImageUrl(dialogState.record.libImg);
        }

        if (!dataUri) {
            throw new Error('Could not get image data.');
        }

        const result = await suggestCategory({ photoDataUri: dataUri });
        setImageCategory(result.category);
        toast({ title: 'Suggestion Ready!', description: `AI suggested the category: "${result.category}".` });

      } catch (err) {
        console.error('Failed to suggest category:', err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not get category suggestion from AI.' });
      } finally {
        setIsCategorizing(false);
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
            reject, 
            async () => { 
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
      
      const finalImageCategory = imageCategory;

      if (dialogState.type === 'create') {
        if (!downloadURL || !storagePath) {
          throw new Error("Image upload failed, cannot create record.");
        }
        const libImageData = {
          userId: user.uid,
          libImgName: imageName,
          libImgDesc: imageDesc,
          libImgCategory: finalImageCategory,
          libImg: downloadURL,
          libImgStoragePath: storagePath,
          timestamp: serverTimestamp(),
        };
        await addDoc(collection(firestore, `users/${user.uid}/avatarImgLib`), libImageData);
        toast({ title: 'Success', description: 'Image added to library.' });
  
      } else if (dialogState.type === 'edit') {
        const docRef = doc(firestore, `users/${user.uid}/avatarImgLib`, dialogState.record.id);
        const updatedData: Partial<Omit<LibImageRecord, 'id'>> = {
          libImgName: imageName,
          libImgDesc: imageDesc,
          libImgCategory: finalImageCategory,
        };
  
        if (downloadURL && storagePath) {
          updatedData.libImg = downloadURL;
          updatedData.libImgStoragePath = storagePath;
        }

        await updateDoc(docRef, updatedData);
        
        toast({ title: 'Success', description: 'Image record updated.' });

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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className='flex gap-2 items-center flex-wrap'>
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Filter className='mr-2 h-4 w-4' />
                                        {filterCategory === 'all' || !filterCategory ? 'All Categories' : filterCategory}
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Filter by category</p></TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Category</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={filterCategory || 'all'} onValueChange={(v) => setFilterCategory(v)}>
                                <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                                <DropdownMenuSeparator/>
                                {categoriesLoading ? <DropdownMenuItem disabled>Loading...</DropdownMenuItem> :
                                    sortedCategories.map(cat => <DropdownMenuRadioItem key={cat.id} value={cat.name}>{cat.name}</DropdownMenuRadioItem>)
                                }
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Tooltip>
                      <TooltipTrigger asChild>
                           <Button variant="outline" onClick={() => openDialog({ type: 'bulk-categorize' })} disabled={uncategorizedImages.length === 0}>
                              <FolderSync className="mr-2 h-4 w-4" />
                              Bulk Categorize (AI)
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Review AI category suggestions for all uncategorized images.</p></TooltipContent>
                  </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="outline" size="icon" onClick={handleDownloadAll} disabled={allLibImagesLoading || !allLibImages || allLibImages.length === 0 || isLoadingAction}>
                                {isLoadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Download All as ZIP</p></TooltipContent>
                    </Tooltip>

                     <DropdownMenu>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon">
                                          <ChevronDown className="h-4 w-4" />
                                          <span className="sr-only">Advanced Options</span>
                                      </Button>
                                  </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Advanced Options</p></TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent>
                              <DropdownMenuItem onClick={handleBackup} disabled={allLibImagesLoading || !allLibImages || allLibImages.length === 0}>
                                  <Save className="mr-2 h-4 w-4" />
                                  Backup to JSON
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => openDialog({ type: 'restore' })}>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Restore from JSON
                              </DropdownMenuItem>
                               <DropdownMenuSeparator />
                               <DropdownMenuItem className="text-destructive" onClick={() => openDialog({ type: 'clear-categories' })}>
                                  <AlertTriangle className="mr-2 h-4 w-4" />
                                  Clear All Categories
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                </div>
                <div className='flex gap-2 self-end sm:self-center'>
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
                         {filterCategory && filterCategory !== 'all' && <p className='text-xs mt-1'>Try selecting 'All Categories'.</p>}
                    </div>
                )
            )}
        </div>

        {/* Create/Edit/Restore Dialog */}
        <Dialog open={!!dialogState && (dialogState.type === 'create' || dialogState.type === 'edit' || dialogState.type === 'restore')} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {dialogState?.type === 'create' ? 'Add New Image' : 
                         dialogState?.type === 'edit' ? 'Edit Image Details' :
                         'Restore Library from Backup'}
                    </DialogTitle>
                    {dialogState?.type === 'restore' && (
                        <DialogDescription>
                            Select a JSON backup file. This will add all images from the file to your current library. It will not delete existing images.
                        </DialogDescription>
                    )}
                </DialogHeader>
                {dialogState?.type === 'restore' ? (
                    <div className='py-4 space-y-4'>
                        <div className="space-y-2">
                            <Label htmlFor="restoreFile">Backup File (.json)</Label>
                            <Input id="restoreFile" type="file" accept="application/json" onChange={handleRestoreFileChange} disabled={isLoadingAction} />
                        </div>
                        {restoreFile && <p className="text-sm text-muted-foreground">Selected: {restoreFile.name}</p>}
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="imageName">Image Name</Label>
                            <Input id="imageName" value={imageName} onChange={e => setImageName(e.target.value)} disabled={isLoadingAction} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="imageCategory">Category</Label>
                            <div className="flex items-center gap-2">
                                <Select value={imageCategory} onValueChange={setImageCategory} disabled={isLoadingAction}>
                                    <SelectTrigger id="imageCategory">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                        {categoriesLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                        sortedCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)
                                        }
                                    </SelectContent>
                                </Select>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={handleSuggestCategory}
                                            disabled={isCategorizing || isLoadingAction || (!imageFile && dialogState?.type !== 'edit')}
                                        >
                                            {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Suggest Category (AI)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
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
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog} disabled={isLoadingAction}>Cancel</Button>
                     {dialogState?.type === 'restore' ? (
                        <Button onClick={handleRestore} disabled={isLoadingAction || !restoreFile}>
                            {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Restore'}
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isLoadingAction || !imageName.trim() || (dialogState?.type === 'create' && !imageFile)}>
                            {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Save'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {dialogState?.type === 'bulk-categorize' && (
            <BulkCategorizeDialog 
                imagesToCategorize={uncategorizedImages}
                onOpenChange={(isOpen) => !isOpen && closeDialog()}
            />
        )}

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
      
      {/* Clear Categories Confirmation Dialog */}
      <AlertDialog open={dialogState?.type === 'clear-categories'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to clear all categories?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will remove the category field for every image in your library. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog} disabled={isLoadingAction}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllCategories} disabled={isLoadingAction} className="bg-destructive hover:bg-destructive/90">
                        {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Yes, Clear All Categories'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}

    