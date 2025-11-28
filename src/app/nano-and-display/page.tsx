'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import NanoProcessor from '@/components/nano-processor';
import NanoGallery from '@/components/nano-gallery';
import { Separator } from '@/components/ui/separator';

export default function NanoAndDisplayPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Image Transformation</CardTitle>
          <CardDescription>
            Upload an image and use AI to transform it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NanoProcessor />
        </CardContent>
      </Card>
      <Separator />
      <NanoGallery />
    </div>
  );
}
