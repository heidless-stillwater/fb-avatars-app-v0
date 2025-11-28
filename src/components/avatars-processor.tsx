'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';

interface AvatarRecord {
    id: string;
    userId: string;
    avatarName: string;
    avatarPrompt?: string;
    avatarDesc?: string;
    avatarImg: string;
    timestamp: any;
}

export default function AvatarsProcessor() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [avatarName, setAvatarName] = useState('');
    const [avatarDesc, setAvatarDesc] = useState('');
    const [avatarPrompt, setAvatarPrompt] = useState('');

    const avatarsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/avatarRecords`));
    }, [firestore, user]);

    const { data: avatars, isLoading: avatarsLoading } = useCollection<AvatarRecord>(avatarsQuery);

    const handleAddAvatar = async () => {
        if (!avatarName.trim() || !user) return;
        
        // For now, using a placeholder image.
        const placeholderImg = `https://picsum.photos/seed/${Math.random()}/200/200`;

        const avatarData = {
            userId: user.uid,
            avatarName: avatarName,
            avatarDesc: avatarDesc,
            avatarPrompt: avatarPrompt,
            avatarImg: placeholderImg,
            timestamp: serverTimestamp(),
        };

        const avatarsCollection = collection(firestore, `users/${user.uid}/avatarRecords`);

        addDoc(avatarsCollection, avatarData)
            .then(() => {
                setAvatarName('');
                setAvatarDesc('');
                setAvatarPrompt('');
                toast({
                    title: 'Success',
                    description: 'Avatar created.',
                });
            })
            .catch((error) => {
                console.error('Error adding avatar: ', error);
                const permissionError = new FirestorePermissionError({
                    path: avatarsCollection.path,
                    operation: 'create',
                    requestResourceData: avatarData,
                });
                errorEmitter.emit('permission-error', permissionError);

                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not create avatar. Check permissions.',
                });
            });
    };

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Create Avatar</CardTitle>
                    <CardDescription>Fill in the details to create a new avatar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        placeholder="Avatar Name"
                        value={avatarName}
                        onChange={(e) => setAvatarName(e.target.value)}
                    />
                    <Textarea
                        placeholder="Avatar Description (optional)"
                        value={avatarDesc}
                        onChange={(e) => setAvatarDesc(e.target.value)}
                    />
                    <Textarea
                        placeholder="Avatar Prompt (optional)"
                        value={avatarPrompt}
                        onChange={(e) => setAvatarPrompt(e.target.value)}
                    />
                    <Button onClick={handleAddAvatar} disabled={!avatarName.trim()}>
                        <Plus className="mr-2 h-4 w-4" /> Create Avatar
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Your Avatars</CardTitle>
                    <CardDescription>A list of your created avatars.</CardDescription>
                </CardHeader>
                <CardContent>
                    {avatarsLoading && (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                    {!avatarsLoading && avatars && avatars.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {avatars.map((avatar) => (
                                <div key={avatar.id} className="flex flex-col items-center gap-2 text-center">
                                    <Image
                                        src={avatar.avatarImg}
                                        alt={avatar.avatarName}
                                        width={100}
                                        height={100}
                                        className="rounded-full"
                                    />
                                    <p className="font-medium text-sm truncate w-full">{avatar.avatarName}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !avatarsLoading && (
                            <div className="flex flex-col items-center justify-center h-48 rounded-md border border-dashed text-sm text-muted-foreground">
                                <UserCircle className="h-10 w-10 mb-2" />
                                <p>No avatars yet. Create one to get started!</p>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
