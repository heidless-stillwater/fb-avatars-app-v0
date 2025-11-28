
'use client';

import React, { useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  Tag,
  Edit,
  Trash2,
  Loader2,
  X,
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
import { Label } from '@/components/ui/label';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';

interface LibImageRecord {
  id: string;
  libImgCategory?: string;
}

type DialogState =
  | { type: 'rename'; category: string }
  | { type: 'delete'; category: string }
  | null;

export default function CategoryProcessor() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const libQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/avatarImgLib`));
  }, [firestore, user]);

  const { data: libImages, isLoading: libImagesLoading } = useCollection<LibImageRecord>(libQuery);

  const allCategories = useMemo(() => {
    if (!libImages) return [];
    const categories = libImages
      .map(img => img.libImgCategory)
      .filter((cat): cat is string => !!cat && cat.trim() !== '');
    return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
  }, [libImages]);

  const openDialog = (state: DialogState) => {
    if (state?.type === 'rename') {
        setNewCategoryName(state.category);
    } else {
        setNewCategoryName('');
    }
    setDialogState(state);
  };

  const closeDialog = () => {
    setDialogState(null);
  };

  const handleRenameCategory = async () => {
    if (dialogState?.type !== 'rename' || !user || !newCategoryName.trim()) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'New category name cannot be empty.' });
      return;
    }
    
    setIsLoadingAction(true);
    const oldCategoryName = dialogState.category;
    const finalNewName = newCategoryName.trim();

    if (oldCategoryName === finalNewName) {
        setIsLoadingAction(false);
        closeDialog();
        return;
    }
    
    try {
        const batch = writeBatch(firestore);
        const categoryQuery = query(
            collection(firestore, `users/${user.uid}/avatarImgLib`),
            where('libImgCategory', '==', oldCategoryName)
        );
        const snapshot = await getDocs(categoryQuery);

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { libImgCategory: finalNewName });
        });
        
        await batch.commit();
        toast({ title: 'Success', description: `Renamed category "${oldCategoryName}" to "${finalNewName}".` });
        closeDialog();
    } catch (error) {
        console.error("Category rename failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not rename category.' });
    } finally {
        setIsLoadingAction(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (dialogState?.type !== 'delete' || !user) return;
    
    setIsLoadingAction(true);
    const categoryToDelete = dialogState.category;
    
    try {
        const batch = writeBatch(firestore);
        const categoryQuery = query(
            collection(firestore, `users/${user.uid}/avatarImgLib`),
            where('libImgCategory', '==', categoryToDelete)
        );
        const snapshot = await getDocs(categoryQuery);
        
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { libImgCategory: '' }); // or delete(field) if desired
        });
        
        await batch.commit();
        toast({ title: 'Success', description: `Removed category "${categoryToDelete}" from all images.`});
        closeDialog();
    } catch (error) {
        console.error("Category delete failed:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete category.' });
    } finally {
        setIsLoadingAction(false);
    }
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Category Manager</CardTitle>
            <CardDescription>Rename or remove categories across your entire image library.</CardDescription>
        </CardHeader>
        <CardContent>
            {libImagesLoading ? (
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : allCategories.length > 0 ? (
                <div className="border rounded-md">
                    {allCategories.map((category, index) => (
                        <div key={category} className={`flex items-center p-3 ${index < allCategories.length - 1 ? 'border-b' : ''}`}>
                            <Tag className="mr-3 h-5 w-5 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium">{category}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog({ type: 'rename', category })}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog({ type: 'delete', category })}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-24 rounded-md border border-dashed text-sm text-muted-foreground">
                    <Tag className="h-8 w-8 mb-2" />
                    <p>No categories found. Assign categories to images to manage them here.</p>
                </div>
            )}
        </CardContent>

        {/* Rename Dialog */}
        <Dialog open={dialogState?.type === 'rename'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename Category "{dialogState?.type === 'rename' && dialogState.category}"</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName">New Category Name</Label>
                        <Input id="categoryName" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} disabled={isLoadingAction} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog} disabled={isLoadingAction}>Cancel</Button>
                    <Button onClick={handleRenameCategory} disabled={isLoadingAction || !newCategoryName.trim()}>
                        {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Rename'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={dialogState?.type === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will remove the category "{dialogState?.type === 'delete' && dialogState.category}" from all associated images. The images themselves will not be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog} disabled={isLoadingAction}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCategory} disabled={isLoadingAction} className="bg-destructive hover:bg-destructive/90">
                        {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Yes, Remove Category'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}
