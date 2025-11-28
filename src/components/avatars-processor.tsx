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
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  uploadString,
  UploadTask,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import {
  MoreVertical,
  Upload,
  Plus,
  Download,
  Trash2,
  Edit,
  Loader2,
  List,
  Grid,
  UserCircle,
  Wand2,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Checkbox } from './ui/checkbox';
import { generateAvatar } from '@/ai/flows/generate-avatar-flow';

interface AvatarRecord {
  id: string;
  userId: string;
  avatarName: string;
  avatarPrompt?: string;
  avatarDesc?: string;
  avatarImg: string;
  avatarStoragePath: string;
  timestamp: Timestamp;
}

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; record: AvatarRecord }
  | { type: 'delete'; record: AvatarRecord }
  | null;

type ViewMode = 'list' | 'grid';

const AvatarGridItem = ({ record, onOpenDialog }: { record: AvatarRecord, onOpenDialog: (state: DialogState) => void }) => (
    <Card className="w-full group">
        <CardContent className="p-0">
            <div className="aspect-square w-full flex items-center justify-center bg-muted rounded-t-lg overflow-hidden relative">
                <Image 
                    src={record.avatarImg} 
                    alt={record.avatarName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover w-full h-full"
                />
            </div>
        </CardContent>
        <div className="p-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" title={record.avatarName}>{record.avatarName}</p>
                <p className="text-xs text-muted-foreground truncate" title={record.avatarDesc}>
                    {record.avatarDesc || 'No description'}
                </p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

const AvatarListItem = ({ record, onOpenDialog }: { record: AvatarRecord, onOpenDialog: (state: DialogState) => void }) => (
    <div className="flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted group">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <Image src={record.avatarImg} alt={record.avatarName} width={40} height={40} className="object-cover rounded-full w-10 h-10"/>
            <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{record.avatarName}</p>
                <p className="truncate text-xs text-muted-foreground">{record.avatarDesc || 'No description'}</p>
            </div>
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


export default function AvatarsProcessor() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [view, setView] = useState<ViewMode>('grid');

  const [avatarName, setAvatarName] = useState('');
  const [avatarDesc, setAvatarDesc] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [generateWithAI, setGenerateWithAI] = useState(false);
  const [testRun, setTestRun] = useState(false);

  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const avatarsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/avatarRecords`), orderBy('timestamp', 'desc'));
  }, [firestore, user]);

  const { data: avatars, isLoading: avatarsLoading } = useCollection<AvatarRecord>(avatarsQuery);

  const effectivePrompt = useMemo(() => {
    return avatarPrompt.trim() === '' ? avatarName : avatarPrompt;
  }, [avatarPrompt, avatarName]);

  const openDialog = (state: DialogState) => {
    if (state?.type === 'edit') {
        setAvatarName(state.record.avatarName);
        setAvatarDesc(state.record.avatarDesc || '');
        setAvatarPrompt(state.record.avatarPrompt || '');
        setAvatarFile(null);
    } else {
        setAvatarName('');
        setAvatarDesc('');
        setAvatarPrompt('');
        setAvatarFile(null);
    }
    setGenerateWithAI(false);
    setTestRun(false);
    setGeneratedAvatarUrl(null);
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
      setAvatarFile(file);
      setGeneratedAvatarUrl(null);
    }
  };
  
  const uploadImage = async (file: File | string, userId: string, fileName: string): Promise<{ downloadURL: string, storagePath: string }> => {
    const storagePath = `users/${userId}/avatarImages/${uuidv4()}-${fileName}`;
    const fileStorageRef = storageRef(storage, storagePath);

    setUploadProgress(0);

    if (typeof file === 'string') {
        // Handle data URL upload (no progress tracking)
        const uploadResult = await uploadString(fileStorageRef, file, 'data_url');
        setUploadProgress(100);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        setUploadProgress(null);
        return { downloadURL, storagePath };
    } else {
        // Handle File upload (with progress tracking)
        const uploadTask: UploadTask = uploadBytesResumable(fileStorageRef, file);

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
                        setUploadProgress(null);
                        resolve({ downloadURL: url, storagePath });
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });
    }
  };


  const handleGenWithAI = async () => {
    if (!effectivePrompt) {
        toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please enter a prompt or name to generate an image.'});
        return;
    }
    setIsGeneratingAI(true);
    try {
        if (testRun) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI delay
            if (dialogState?.type === 'edit') {
              setGeneratedAvatarUrl(dialogState.record.avatarImg);
            } else {
              setGeneratedAvatarUrl("https://picsum.photos/seed/test/512/512");
            }
            toast({ title: 'Success (Test Run)', description: 'Simulated AI image generation.' });
        } else {
            const result = await generateAvatar({ prompt: effectivePrompt });
            setGeneratedAvatarUrl(result.avatarImageUrl);
            setAvatarFile(null);
            toast({ title: 'Success', description: 'New avatar image generated.' });
        }
    } catch(err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'AI Generation Failed', description: 'Could not generate image from prompt.'});
    } finally {
        setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !dialogState || !avatarName.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Avatar name is required." });
      return;
    }
  
    if (dialogState.type === 'create' && !avatarFile && !generatedAvatarUrl) {
      toast({ variant: "destructive", title: "Missing Information", description: "An image is required for creation." });
      return;
    }
  
    setIsLoadingAction(true);
  
    try {
      const wasAIGenerated = !!generatedAvatarUrl;
      let downloadURL: string | null = null;
      let storagePath: string | null = null;

      if (avatarFile || generatedAvatarUrl) {
          const fileToUpload = generatedAvatarUrl || avatarFile!;
          const fileName = wasAIGenerated 
            ? `${effectivePrompt.substring(0, 20) || 'avatar'}.png` 
            : avatarFile!.name;
          const uploadResult = await uploadImage(fileToUpload, user.uid, fileName);
          downloadURL = uploadResult.downloadURL;
          storagePath = uploadResult.storagePath;
      }

      if (dialogState.type === 'create') {
        if (!downloadURL || !storagePath) {
          throw new Error("Image upload failed, cannot create record.");
        }
        const avatarData = {
          userId: user.uid,
          avatarName,
          avatarDesc,
          avatarPrompt: wasAIGenerated ? effectivePrompt : '',
          avatarImg: downloadURL,
          avatarStoragePath: storagePath,
          timestamp: serverTimestamp(),
        };
        await addDoc(collection(firestore, `users/${user.uid}/avatarRecords`), avatarData);
        toast({ title: 'Success', description: 'Avatar created.' });
  
      } else if (dialogState.type === 'edit') {
        const docRef = doc(firestore, `users/${user.uid}/avatarRecords`, dialogState.record.id);
        const updatedData: Partial<AvatarRecord> = {
          avatarName,
          avatarDesc,
          avatarPrompt: wasAIGenerated ? effectivePrompt : (avatarPrompt || ''),
        };
  
        if (downloadURL && storagePath) {
          updatedData.avatarImg = downloadURL;
          updatedData.avatarStoragePath = storagePath;
        }

        await updateDoc(docRef, updatedData);
        toast({ title: 'Success', description: 'Avatar updated.' });

        if (downloadURL && storagePath) {
            // Delete old image only if a new one was uploaded/generated and successfully saved
            if (dialogState.record.avatarStoragePath) {
                const oldImageRef = storageRef(storage, dialogState.record.avatarStoragePath);
                await deleteObject(oldImageRef).catch(err => console.warn("Could not delete old image:", err));
            }
        }
      }

      if (wasAIGenerated && downloadURL) {
          const libImgData = {
              userId: user.uid,
              libImgName: avatarName,
              libImg: downloadURL,
              libImgDesc: avatarDesc,
              timestamp: serverTimestamp(),
          };
          await addDoc(collection(firestore, `users/${user.uid}/avatarImgLib`), libImgData);
          toast({ title: 'Image saved to library' });
      }

      closeDialog();
    } catch (error) {
      console.error("Avatar action failed:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save avatar.' });
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
        const docRef = doc(firestore, `users/${user.uid}/avatarRecords`, recordToDelete.id);
        await deleteDoc(docRef);

        if (recordToDelete.avatarStoragePath) {
            const imageRef = storageRef(storage, recordToDelete.avatarStoragePath);
            await deleteObject(imageRef);
        }

        toast({ title: 'Success', description: `Avatar "${recordToDelete.avatarName}" deleted.`});
        closeDialog();
    } catch (error) {
        console.error("Delete failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete avatar.' });
    } finally {
        setIsLoadingAction(false);
    }
  };

  return (
    <TooltipProvider>
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                     {/* Potentially add search or filters here later */}
                </div>
                <div className='flex gap-2'>
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        {view === 'grid' ? <Grid /> : <List />}
                                        <span className="sr-only">View Options</span>
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>View Options</p></TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Display</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={view} onValueChange={(v) => setView(v as ViewMode)}>
                                <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button onClick={() => openDialog({ type: 'create' })}>
                                <Plus className="mr-2 h-4 w-4" /> New Avatar
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Create a new avatar</p></TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {avatarsLoading && (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            )}
            
            {!avatarsLoading && avatars && avatars.length > 0 ? (
                 view === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {avatars.map(avatar => <AvatarGridItem key={avatar.id} record={avatar} onOpenDialog={openDialog}/>)}
                    </div>
                 ) : (
                    <div className="flex flex-col gap-1 border rounded-lg p-2">
                        {avatars.map(avatar => <AvatarListItem key={avatar.id} record={avatar} onOpenDialog={openDialog} />)}
                    </div>
                 )
            ) : (
                !avatarsLoading && (
                    <div className="flex flex-col items-center justify-center h-64 rounded-md border border-dashed text-sm text-muted-foreground">
                        <UserCircle className="h-10 w-10 mb-2" />
                        <p>No avatars yet. Create one to get started!</p>
                    </div>
                )
            )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogState?.type === 'create' || dialogState?.type === 'edit'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{dialogState?.type === 'create' ? 'Create New Avatar' : 'Edit Avatar'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="avatarName">Avatar Name</Label>
                            <Input id="avatarName" value={avatarName} onChange={e => setAvatarName(e.target.value)} disabled={isLoadingAction} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatarDesc">Description</Label>
                            <Textarea id="avatarDesc" value={avatarDesc} onChange={e => setAvatarDesc(e.target.value)} placeholder="A brief description (optional)" disabled={isLoadingAction} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatarPrompt">Prompt</Label>
                            <Textarea id="avatarPrompt" value={avatarPrompt} onChange={e => setAvatarPrompt(e.target.value)} placeholder="The prompt used to generate this avatar (optional)" disabled={isLoadingAction} />
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="gen-with-ai" 
                                    checked={generateWithAI}
                                    onCheckedChange={(checked) => setGenerateWithAI(checked as boolean)}
                                    disabled={isLoadingAction}
                                />
                                <Label htmlFor="gen-with-ai">Generate Image with AI</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="test" 
                                    checked={testRun}
                                    onCheckedChange={(checked) => setTestRun(checked as boolean)}
                                    disabled={isLoadingAction || !generateWithAI}
                                />
                                <Label htmlFor="test">Test Run</Label>
                            </div>
                        </div>

                        {generateWithAI ? (
                            <div className="space-y-2">
                               <Button id="gen-but" onClick={handleGenWithAI} disabled={isGeneratingAI || isLoadingAction || !effectivePrompt.trim()} className="w-full">
                                    {isGeneratingAI ? <Loader2 className="animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    Gen with AI
                                </Button>
                            </div>
                        ) : (
                             <div className="space-y-2">
                                <Label htmlFor="avatarFile">
                                    {dialogState?.type === 'create' ? 'Image' : 'Replace Image (Optional)'}
                                </Label>
                                <Input id="avatarFile" type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} disabled={isLoadingAction} />
                             </div>
                        )}
                        {avatarFile && !generateWithAI && <p className="text-sm text-muted-foreground">New image: {avatarFile.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Image Preview</Label>
                        <div className="relative w-full aspect-square bg-muted rounded-md flex items-center justify-center overflow-hidden">
                            { (avatarFile || generatedAvatarUrl || (dialogState?.type === 'edit' && dialogState.record.avatarImg)) ?
                               <Image 
                                    src={generatedAvatarUrl || (avatarFile ? URL.createObjectURL(avatarFile) : dialogState?.type === 'edit' ? dialogState.record.avatarImg : '')} 
                                    alt="Avatar preview" 
                                    fill 
                                    className="object-cover"
                                />
                                : <UserCircle className="w-24 h-24 text-muted-foreground" />
                            }
                            {isGeneratingAI && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}
                        </div>
                        {uploadProgress !== null && <Progress value={uploadProgress} />}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog} disabled={isLoadingAction}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoadingAction || !avatarName.trim() || (dialogState?.type === 'create' && !avatarFile && !generatedAvatarUrl) || isGeneratingAI}>
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
                        This action will permanently delete the avatar "{dialogState?.type === 'delete' && dialogState.record.avatarName}".
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
    </TooltipProvider>
  );
}

    