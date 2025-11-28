'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Upload,
  Wand2,
  Download,
  History,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useStorage, useFirestore } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { transformImage } from '@/ai/flows/transform-image-flow';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const styleOptions = [
  'gothic style',
  'art deco style',
  'minimalistic style',
  'van gogh style',
  'rembrandt style',
  'cartoon style',
  'pop art style',
  'cosy & comfortable style',
];

export default function NanoProcessor() {
  const [originalImage, setOriginalImage] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [style, setStyle] = useState<string>('van gogh style');
  const [prompt, setPrompt] = useState<string>('van gogh style');
  const [testMode, setTestMode] = useState<boolean>(false);
  const [freestyle, setFreestyle] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const storage = useStorage();
  const firestore = useFirestore();

  useEffect(() => {
    if (!freestyle) {
      setPrompt(style);
    }
  }, [style, freestyle]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage({ url: reader.result as string, file });
        setTransformedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const dataUriToBlob = async (dataUri: string) => {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    return blob;
  };

  const handleTransform = async () => {
    if (!originalImage || !prompt.trim() || !user) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please upload an image and enter a prompt.',
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    setTransformedImage(null);
    setUploadProgress(0);

    try {
      // 1. Upload original image
      toast({ title: 'Step 1/4: Uploading Original Image...'});
      const originalFile = originalImage.file;
      const timestamp = Date.now();
      const originalFileNameForStorage = `${timestamp}-original-${originalFile.name}`;
      const originalStoragePath = `user-uploads/${user.uid}/${originalFileNameForStorage}`;
      const originalStorageRef = storageRef(storage, originalStoragePath);
      const originalUploadTask = uploadBytesResumable(originalStorageRef, originalFile);
      
      const originalImageUrl = await new Promise<string>((resolve, reject) => {
        originalUploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 50; // 0-50% progress
            setUploadProgress(progress);
          },
          reject,
          async () => {
            const url = await getDownloadURL(originalUploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
      toast({ title: 'Step 2/4: Transforming Image with AI...'});
      setUploadProgress(50);


      // 2. Transform the image
      const result = await transformImage({
        photoDataUri: originalImage.url,
        prompt: prompt,
        testMode: testMode,
      });
      setTransformedImage(result.transformedImageUrl);
      toast({ title: 'Step 3/4: Uploading Transformed Image...'});

      // 3. Upload transformed image
      const transformedBlob = await dataUriToBlob(result.transformedImageUrl);
      const transformedFileNameForStorage = `${timestamp}-transformed-${originalFile.name}`;
      const transformedStoragePath = `user-uploads/${user.uid}/${transformedFileNameForStorage}`;
      const transformedStorageRef = storageRef(storage, transformedStoragePath);
      const transformedUploadTask = uploadBytesResumable(transformedStorageRef, transformedBlob);

      const transformedImageUrl = await new Promise<string>((resolve, reject) => {
        transformedUploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = 50 + (snapshot.bytesTransferred / snapshot.totalBytes) * 50; // 50-100% progress
            setUploadProgress(progress);
          },
          reject,
          async () => {
            const url = await getDownloadURL(transformedUploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
      toast({ title: 'Step 4/4: Saving Record...'});

      // 4. Save record to Firestore
      const nanoRecordData = {
          userId: user.uid,
          originalImageUrl: originalImageUrl,
          transformedImageUrl: transformedImageUrl,
          originalStoragePath: originalStoragePath,
          transformedStoragePath: transformedStoragePath,
          originalFileName: originalFile.name,
          timestamp: serverTimestamp(),
      };
      const nanoRecordsCollection = collection(firestore, `users/${user.uid}/nanoRecords`);
      
      addDoc(nanoRecordsCollection, nanoRecordData)
        .catch(error => {
          console.error("Error creating nanoRecord: ", error);
           const permissionError = new FirestorePermissionError({
              path: nanoRecordsCollection.path,
              operation: 'create',
              requestResourceData: nanoRecordData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      toast({
        title: 'Transformation Complete!',
        description: 'Your image has been transformed and saved.',
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An error occurred during the process.');
      toast({
        variant: 'destructive',
        title: 'Process Failed',
        description: e.message || 'Could not complete the transformation process.',
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  const clearState = () => {
    setOriginalImage(null);
    setTransformedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload & Prompt</CardTitle>
          <CardDescription>
            Select an image and tell the AI how to change it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Original Image</Label>
            <div
              className="relative border-2 border-dashed border-muted rounded-lg p-4 text-center cursor-pointer hover:border-primary"
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {originalImage ? (
                <div className="relative">
                  <Image
                    src={originalImage.url}
                    alt="Original image"
                    width={400}
                    height={400}
                    className="rounded-md mx-auto max-h-60 w-auto"
                  />
                   { !isLoading &&
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={(e) => {
                        e.stopPropagation();
                        clearState();
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                   }
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <span>Click to upload or drag & drop</span>
                </div>
              )}
            </div>
             {uploadProgress !== null && <Progress value={uploadProgress} className="w-full mt-2" />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="style-select">Style</Label>
            <Select value={style} onValueChange={setStyle} disabled={isLoading || freestyle}>
              <SelectTrigger id="style-select">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Transformation Prompt</Label>
            <Input
              id="prompt"
              placeholder="e.g., make the sky purple, add a dragon"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading || !originalImage || !freestyle}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="test-mode"
                checked={testMode}
                onCheckedChange={(checked) => setTestMode(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="test-mode">Test mode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="freestyle-mode"
                checked={freestyle}
                onCheckedChange={(checked) => {
                  setFreestyle(checked as boolean);
                  if (!checked) {
                    setPrompt(style);
                  }
                }}
                disabled={isLoading}
              />
              <Label htmlFor="freestyle-mode">Freestyle</Label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
           <Button onClick={handleTransform} disabled={isLoading || !originalImage || !prompt.trim()}>
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Transform Image
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. View Result</CardTitle>
          <CardDescription>
            Your transformed image will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-square border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/50">
            {isLoading && (
              <div className='flex flex-col items-center gap-4 text-muted-foreground'>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p>Transforming in progress...</p>
              </div>
            )}
            {!isLoading && transformedImage && (
              <Image
                src={transformedImage}
                alt="Transformed image"
                width={500}
                height={500}
                className="rounded-md max-h-full w-auto"
              />
            )}
            {!isLoading && !transformedImage && !error && (
              <p className="text-muted-foreground">Awaiting transformation...</p>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Transformation Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button disabled={!transformedImage || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Save Image
          </Button>
          <Button variant="outline" disabled={isLoading}>
            <History className="mr-2 h-4 w-4" />
            View History
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
