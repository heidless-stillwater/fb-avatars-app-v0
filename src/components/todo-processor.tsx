'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


interface Todo {
    id: string;
    text: string;
    completed: boolean;
    createdAt: any;
}

export default function TodoProcessor() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [newTodo, setNewTodo] = useState('');

    const todosQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/todos`));
    }, [firestore, user]);

    const { data: todos, isLoading: todosLoading } = useCollection<Todo>(todosQuery);

    const handleAddTodo = async () => {
        if (!newTodo.trim() || !user) return;
        const todoData = {
            text: newTodo,
            completed: false,
            createdAt: serverTimestamp(),
            userId: user.uid,
        };

        const todosCollection = collection(firestore, `users/${user.uid}/todos`);

        addDoc(todosCollection, todoData)
            .then(() => {
                setNewTodo('');
                toast({
                    title: 'Success',
                    description: 'Todo added.',
                });
            })
            .catch((error) => {
                console.error('Error adding todo: ', error);
                const permissionError = new FirestorePermissionError({
                    path: todosCollection.path,
                    operation: 'create',
                    requestResourceData: todoData,
                });
                errorEmitter.emit('permission-error', permissionError);

                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not add todo. Check permissions.',
                });
            });
    };

    const handleDeleteTodo = async (todoId: string) => {
        if (!user) return;
        const todoDocRef = doc(firestore, `users/${user.uid}/todos`, todoId);
        deleteDoc(todoDocRef)
            .then(() => {
                toast({
                    title: 'Success',
                    description: 'Todo deleted.',
                });
            })
            .catch((error) => {
                console.error('Error deleting todo: ', error);
                 const permissionError = new FirestorePermissionError({
                    path: todoDocRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not delete todo. Check permissions.',
                });
            });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Todos</CardTitle>
                <CardDescription>Add, manage, and complete your tasks.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
                    <Input
                        type="text"
                        placeholder="e.g. Learn Firebase"
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddTodo();
                            }
                        }}
                    />
                    <Button onClick={handleAddTodo} disabled={!newTodo.trim()}>
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>

                {todosLoading && (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}

                {!todosLoading && todos && todos.length > 0 ? (
                    <ul className="space-y-2">
                        {todos.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)).map((todo) => (
                            <li key={todo.id} className="flex items-center justify-between rounded-md bg-muted p-3">
                                <span>{todo.text}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTodo(todo.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !todosLoading && (
                        <div className="flex items-center justify-center h-48 rounded-md border border-dashed text-sm text-muted-foreground">
                            <p>No todos yet. Add one to get started!</p>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}
