'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Paperclip, X } from 'lucide-react';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';


import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from '@/components/ui/progress';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain'
];


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  message: z
    .string()
    .min(10, { message: 'Message must be at least 10 characters.' })
    .max(500, { message: 'Message must be less than 500 characters.' }),
  attachment: z
    .custom<FileList>()
    .refine((files) => files === undefined || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
    .refine(
      (files) => files === undefined || files.length === 0 || ALLOWED_FILE_TYPES.includes(files[0].type),
      "Only .jpg, .png, .gif, .pdf, and .txt files are allowed."
    )
    .optional()
});

type ContactFormValue = z.infer<typeof formSchema>;

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<ContactFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
          form.setError('attachment', { type: 'manual', message: 'Max file size is 10MB.' });
          return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          form.setError('attachment', { type: 'manual', message: 'Invalid file type.' });
          return;
      }
      setAttachment(file);
      form.clearErrors('attachment');
    }
  };

  const onSubmit = async (data: ContactFormValue) => {
    setLoading(true);

    try {
        let attachmentUrl: string | null = null;
        let attachmentFileName: string | null = null;
        
        if (attachment) {
            setUploadProgress(0);
            const messageId = uuidv4();
            const filePath = `fb-7-message-attachments/${messageId}/${attachment.name}`;
            const fileStorageRef = storageRef(storage, filePath);
            const uploadTask = uploadBytesResumable(fileStorageRef, attachment);

            attachmentUrl = await new Promise<string>((resolve, reject) => {
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        console.error("Upload failed:", error);
                        toast({
                            title: "Upload Failed",
                            description: `Could not upload attachment.`,
                            variant: "destructive",
                        });
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    }
                );
            });
            attachmentFileName = attachment.name;
        }

        setUploadProgress(null);
        
        const messageData = {
          name: data.name,
          email: data.email,
          message: data.message,
          createdAt: serverTimestamp(),
          ...(attachmentUrl && { attachmentUrl }),
          ...(attachmentFileName && { attachmentFileName }),
        };
        
        const messagesCollection = collection(firestore, `fb-7-messages`);

        await addDoc(messagesCollection, messageData);
        
        toast({
          title: 'Message Sent!',
          description: "Thanks for reaching out. We'll get back to you soon.",
        });
        form.reset();
        setAttachment(null);

    } catch(error) {
        console.error('Error sending message: ', error);
        const permissionError = new FirestorePermissionError({
            path: 'fb-7-messages',
            operation: 'create',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);

        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not send message. Please try again.',
        });
    } finally {
        setLoading(false);
        setUploadProgress(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your Name"
                  disabled={loading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  disabled={loading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="How can we help you?"
                  className="min-h-[120px]"
                  disabled={loading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="attachment"
          render={() => (
            <FormItem>
              <FormLabel>Attachment (Optional)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    id="attachment"
                    type="file"
                    className="pl-10"
                    onChange={handleFileChange}
                    disabled={loading || !!attachment}
                  />
                  <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </FormControl>
              {attachment && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <p className='flex-1 truncate'>{attachment.name}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        setAttachment(null);
                        form.setValue('attachment', undefined);
                        const fileInput = document.getElementById('attachment') as HTMLInputElement;
                        if(fileInput) fileInput.value = '';
                    }} disabled={loading}>
                        <X className="h-4 w-4"/>
                    </Button>
                </div>
              )}
              {uploadProgress !== null && <Progress value={uploadProgress} className="w-full mt-2" />}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            'Send Message'
          )}
        </Button>
      </form>
    </Form>
  );
}
