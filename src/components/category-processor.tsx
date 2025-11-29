
'use client';

import React, { useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Tag,
  Edit,
  Trash2,
  Loader2,
  Plus,
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';

interface CategoryRecord {
  id: string;
  name: string;
  userId: string;
}

type DialogState =
  | { type: 'create' }
  | { type: 'rename'; category: CategoryRecord }
  | { type: 'delete'; category: CategoryRecord }
  | null;

export default function CategoryProcessor() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [categoryName, setCategoryName] = useState('');
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const categoriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/categories`), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: categories, isLoading: categoriesLoading } = useCollection<CategoryRecord>(categoriesQuery);

  const sortedCategories = useMemo(() => {
    return categories?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  }, [categories]);

  const openDialog = (state: DialogState) => {
    if (state?.type === 'rename') {
        setCategoryName(state.category.name);
    } else {
        setCategoryName('');
    }
    setDialogState(state);
  };

  const closeDialog = () => {
    setDialogState(null);
  };

  const handleCreateCategory = async () => {
    if (!user || !categoryName.trim()) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'Category name cannot be empty.' });
      return;
    }
    setIsLoadingAction(true);
    try {
      const newCategory = {
        name: categoryName.trim(),
        userId: user.uid,
      };
      await addDoc(collection(firestore, `users/${user.uid}/categories`), newCategory);
      toast({ title: 'Success', description: 'Category created.' });
      closeDialog();
    } catch (error) {
      console.error("Category creation failed:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create category.' });
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleRenameCategory = async () => {
    if (dialogState?.type !== 'rename' || !user || !categoryName.trim()) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'New category name cannot be empty.' });
      return;
    }
    
    setIsLoadingAction(true);
    const oldCategory = dialogState.category;
    const newName = categoryName.trim();

    if (oldCategory.name === newName) {
        setIsLoadingAction(false);
        closeDialog();
        return;
    }
    
    try {
        const batch = writeBatch(firestore);
        
        // Update the category document itself
        const categoryDocRef = doc(firestore, `users/${user.uid}/categories`, oldCategory.id);
        batch.update(categoryDocRef, { name: newName });
        
        // Find all images with the old category and update them
        const imagesQuery = query(
            collection(firestore, `users/${user.uid}/avatarImgLib`),
            where('libImgCategory', '==', oldCategory.name)
        );
        const snapshot = await getDocs(imagesQuery);

        snapshot.docs.forEach(docToUpdate => {
            batch.update(docToUpdate.ref, { libImgCategory: newName });
        });
        
        await batch.commit();
        toast({ title: 'Success', description: `Renamed category and updated ${snapshot.size} image(s).` });
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

        // Delete the category document
        const categoryDocRef = doc(firestore, `users/${user.uid}/categories`, categoryToDelete.id);
        batch.delete(categoryDocRef);
        
        // Find all images with the category and unset it
        const imagesQuery = query(
            collection(firestore, `users/${user.uid}/avatarImgLib`),
            where('libImgCategory', '==', categoryToDelete.name)
        );
        const snapshot = await getDocs(imagesQuery);
        
        snapshot.docs.forEach(docToUpdate => {
            batch.update(docToUpdate.ref, { libImgCategory: 'uncategorized' });
        });
        
        await batch.commit();
        toast({ title: 'Success', description: `Deleted category and updated ${snapshot.size} image(s).`});
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
        <CardHeader className='flex-row items-center justify-between'>
          <div>
            <CardTitle className="text-base font-semibold">Category Manager</CardTitle>
          </div>
          <Button onClick={() => openDialog({ type: 'create' })} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </CardHeader>
        <CardContent>
            {categoriesLoading ? (
                <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : sortedCategories.length > 0 ? (
                <div className="border rounded-md">
                    {sortedCategories.map((category, index) => (
                        <div key={category.id} className={`flex items-center p-2 ${index < sortedCategories.length - 1 ? 'border-b' : ''}`}>
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium truncate">{category.name}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog({ type: 'rename', category })}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog({ type: 'delete', category })}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-24 rounded-md border border-dashed text-sm text-muted-foreground">
                    <Tag className="h-8 w-8 mb-2" />
                    <p>No categories found.</p>
                </div>
            )}
        </CardContent>

        {/* Create/Rename Dialog */}
        <Dialog open={dialogState?.type === 'create' || dialogState?.type === 'rename'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {dialogState?.type === 'create' ? 'Create New Category' : `Rename Category "${dialogState?.type === 'rename' && dialogState.category.name}"`}
                    </DialogTitle>
                     <DialogDescription>
                        {dialogState?.type === 'rename' && 'This will update the category name for all associated images.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName">Category Name</Label>
                        <Input id="categoryName" value={categoryName} onChange={e => setCategoryName(e.target.value)} disabled={isLoadingAction} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog} disabled={isLoadingAction}>Cancel</Button>
                    <Button onClick={dialogState?.type === 'create' ? handleCreateCategory : handleRenameCategory} disabled={isLoadingAction || !categoryName.trim()}>
                        {isLoadingAction ? <Loader2 className="animate-spin" /> : (dialogState?.type === 'create' ? 'Create' : 'Rename')}
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
                        This will permanently delete the category "{dialogState?.type === 'delete' && dialogState.category.name}" and remove it from all associated images. The images themselves will not be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={closeDialog} disabled={isLoadingAction}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCategory} disabled={isLoadingAction} className="bg-destructive hover:bg-destructive/90">
                        {isLoadingAction ? <Loader2 className="animate-spin" /> : 'Yes, Delete Category'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}
